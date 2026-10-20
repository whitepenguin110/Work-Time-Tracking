import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import {
  Search,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Coins,
  TrendingUp,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  User,
  MessageSquare,
  CheckCircle,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, getBengaliErrorMessage } from '../services/firebase';
import { Task, Category, TaskStatus, ApprovalStatus } from '../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  formatBengaliDate,
  getCurrentMonthString,
  getPastMonthsOptions,
  checkIsOverdue,
  getTodayDateString,
  formatBengaliMonthYear
} from '../utils/bengali';

export const UserDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submission modal when marking complete
  const [taskToSubmit, setTaskToSubmit] = useState<Task | null>(null);
  const [submissionNote, setSubmissionNote] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [errorNotification, setErrorNotification] = useState<{ message: string; indexUrl: string | null } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // 1. Fetch Categories
  useEffect(() => {
    if (!user) return;
    const catCol = collection(db, 'categories');
    const unsubscribe = onSnapshot(
      catCol,
      (snapshot) => {
        const catList: Category[] = [];
        snapshot.forEach((d) => {
          catList.push({ id: d.id, ...d.data() } as Category);
        });
        setCategories(catList);
      },
      (error) => {
        const parsed = getBengaliErrorMessage(error);
        setErrorNotification(parsed);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // 2. Real-time tasks subscription for current user
  useEffect(() => {
    if (!user) return;
    setLoadingTasks(true);

    // Look for tasks assigned to this user
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assignedToUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const list: Task[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Task);
        });
        // Sort descending by workDate or createdAt
        list.sort((a, b) => (b.workDate || b.createdAt || '').localeCompare(a.workDate || a.createdAt || ''));
        setTasks(list);
        setLoadingTasks(false);
        setErrorNotification(null);
      },
      (error) => {
        const parsed = getBengaliErrorMessage(error);
        setErrorNotification(parsed);
        setLoadingTasks(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Calculations for stats
  const currentMonthStr = getCurrentMonthString();

  const stats = useMemo(() => {
    let total = 0;
    let pending = 0;
    let inProgress = 0;
    let pendingApproval = 0;
    let approved = 0;
    let thisMonthApprovedIncentive = 0;
    let allTimeApprovedIncentive = 0;
    let pendingIncentive = 0;

    tasks.forEach((t) => {
      total++;
      if (t.status === 'pending') {
        pending++;
      } else if (t.status === 'in_progress') {
        inProgress++;
      } else if (t.status === 'completed') {
        if (t.approvalStatus === 'approved') {
          approved++;
          const amount = t.incentiveAmount || 0;
          allTimeApprovedIncentive += amount;

          const refDate = t.approvedAt ? t.approvedAt.slice(0, 7) : (t.submitDate || t.workDate || '').slice(0, 7);
          if (refDate === currentMonthStr) {
            thisMonthApprovedIncentive += amount;
          }
        } else {
          // Awaiting approval
          pendingApproval++;
          pendingIncentive += (t.incentiveAmount || 0);
        }
      }
    });

    return {
      total,
      pending,
      inProgress,
      pendingApproval,
      approved,
      thisMonthApprovedIncentive,
      allTimeApprovedIncentive,
      pendingIncentive,
    };
  }, [tasks, currentMonthStr]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Month filter: match workDate or submitDate
      if (selectedMonth !== 'all') {
        const m1 = (t.workDate || '').slice(0, 7);
        const m2 = (t.submitDate || '').slice(0, 7);
        if (m1 !== selectedMonth && m2 !== selectedMonth) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'in_progress' && t.status !== 'in_progress') return false;
      if (statusFilter === 'pending_approval' && (t.status !== 'completed' || t.approvalStatus !== 'pending_approval')) return false;
      if (statusFilter === 'approved' && t.approvalStatus !== 'approved') return false;

      // Search query
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase().trim();
        const nameMatch = t.name.toLowerCase().includes(queryLower);
        const catMatch = (t.categoryName || '').toLowerCase().includes(queryLower);
        const noteMatch = (t.note || '').toLowerCase().includes(queryLower);
        if (!nameMatch && !catMatch && !noteMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, selectedMonth, statusFilter, searchQuery]);

  // Member updates status: "পেন্ডিং" or "চলমান"
  const handleSetSimpleStatus = async (task: Task, newStatus: 'pending' | 'in_progress') => {
    if (task.status === newStatus && task.approvalStatus !== 'rejected') return;
    try {
      const docRef = doc(db, 'tasks', task.id);
      await updateDoc(docRef, {
        status: newStatus,
        approvalStatus: 'not_submitted',
        submitDate: '',
      });
      showToast(newStatus === 'in_progress' ? 'কাজের স্ট্যাটাস "চলমান" করা হয়েছে।' : 'কাজের স্ট্যাটাস "পেন্ডিং" করা হয়েছে।');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  // Member opens completion submission dialog
  const handleOpenSubmitDialog = (task: Task) => {
    setTaskToSubmit(task);
    setSubmissionNote(task.note || '');
  };

  // Member submits task as completed
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToSubmit) return;
    setIsSubmittingTask(true);
    try {
      const docRef = doc(db, 'tasks', taskToSubmit.id);
      const today = getTodayDateString();

      await updateDoc(docRef, {
        status: 'completed',
        approvalStatus: 'pending_approval',
        submitDate: today,
        note: submissionNote.trim(),
      });

      showToast('কাজটি সফলভাবে সম্পন্ন হিসেবে অ্যাডমিনের কাছে জমা দেওয়া হয়েছে!');
      setTaskToSubmit(null);
      setSubmissionNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskToSubmit.id}`);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const monthOptions = getPastMonthsOptions(12);

  return (
    <div className="space-y-6">
      {/* Friendly Bengali Error Alert */}
      {errorNotification && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs shadow-xs space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorNotification.message}</span>
          </div>
          {errorNotification.indexUrl && (
            <div className="pt-1">
              <a
                href={errorNotification.indexUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-xs transition"
              >
                <span>ফায়ারবেসে ইনডেক্স তৈরি করুন</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-950/10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            স্বাগতম, {profile?.name || user?.displayName || 'সদস্য'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            আপনার অ্যাসাইন করা কাজের তালিকা ও অগ্রগতি
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            অ্যাডমিন থেকে পাওয়া কাজগুলোর বর্তমান অবস্থা (পেন্ডিং / চলমান / সম্পূর্ণ) আপডেট করুন
          </p>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs space-y-1 shrink-0">
          <p className="text-emerald-100 font-medium">বিভাগ:</p>
          <p className="text-sm font-bold text-white">
            {profile?.department === 'graphic' ? '🎨 গ্রাফিক ডিজাইন' : '🎬 ভিডিও এডিটিং ও প্রোডাকশন'}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* মোট অ্যাসাইন করা কাজ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">অ্যাসাইন করা কাজ</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {toBengaliNumber(stats.total)}
          </p>
          <span className="text-[11px] text-slate-400">অ্যাডমিন কর্তৃক প্রাপ্ত</span>
        </div>

        {/* পেন্ডিং */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">পেন্ডিং কাজ</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {toBengaliNumber(stats.pending)}
          </p>
          <span className="text-[11px] text-slate-400">শুরু করা বাকি</span>
        </div>

        {/* চলমান */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">চলমান কাজ</p>
            <Clock className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {toBengaliNumber(stats.inProgress)}
          </p>
          <span className="text-[11px] text-slate-400">বর্তমানে চলছে</span>
        </div>

        {/* অনুমোদনের অপেক্ষায় */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">অনুমোদনের অপেক্ষায়</p>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {toBengaliNumber(stats.pendingApproval)}
          </p>
          <span className="text-[11px] text-slate-400">জমা দেওয়া হয়েছে</span>
        </div>

        {/* সম্পন্ন হওয়া কাজ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">সম্পন্ন হওয়া কাজ</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {toBengaliNumber(stats.approved)}
          </p>
          <span className="text-[11px] text-slate-400">অনুমোদন সম্পন্ন হয়েছে</span>
        </div>

        {/* চলতি মাসের অনুমোদিত ইনসেনটিভ */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold truncate">
              চলতি মাসের ইনসেনটিভ
            </p>
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate">
            {formatBengaliCurrency(stats.thisMonthApprovedIncentive)}
          </p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            {formatBengaliMonthYear(currentMonthStr)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কাজের নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">সকল মাস</option>
                <option value={currentMonthStr}>চলতি মাস ({formatBengaliMonthYear(currentMonthStr)})</option>
                {monthOptions
                  .filter((m) => m.value !== currentMonthStr)
                  .map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                সব
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                পেন্ডিং
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                চলমান
              </button>
              <button
                onClick={() => setStatusFilter('pending_approval')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'pending_approval'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                অপেক্ষমাণ
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                সম্পন্ন কাজ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loadingTasks ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            আপনার কাজের তালিকা লোড হচ্ছে...
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            কোনো অ্যাসাইন করা কাজ নেই
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || selectedMonth !== 'all'
              ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো কাজ পাওয়া যায়নি।'
              : 'অ্যাডমিন অ্যাকাউন্ট থেকে নতুন কাজ অ্যাসাইন করলে তা সরাসরি আপনার এখানে দেখতে পাবেন।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdueInfo = checkIsOverdue(task.dueDate, task.status);
            const isApproved = task.approvalStatus === 'approved';
            const isPendingApproval = task.status === 'completed' && task.approvalStatus === 'pending_approval';
            const isRevision = task.approvalStatus === 'rejected';

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs hover:shadow-md ${
                  isApproved
                    ? 'border-emerald-200/80 dark:border-emerald-950/60'
                    : isPendingApproval
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10'
                    : isRevision
                    ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                    : overdueInfo.isOverdue
                    ? 'border-red-300 dark:border-red-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Task Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Category Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {task.categoryName}
                      </span>

                      {/* Status Badges */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5" />
                          সম্পন্ন হওয়া কাজ
                        </span>
                      ) : isPendingApproval ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          অ্যাডমিন অনুমোদনের অপেক্ষায়
                        </span>
                      ) : isRevision ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          সংশোধন প্রয়োজন
                        </span>
                      ) : task.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          ⚡ কাজ চলমান
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          ⏳ অপেক্ষমাণ (পেন্ডিং)
                        </span>
                      )}

                      {/* Overdue Warning */}
                      {overdueInfo.isOverdue && !isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                          <AlertCircle className="w-3.5 h-3.5" />
                          ডেডলাইন পার হয়েছে ({toBengaliNumber(overdueInfo.daysOverdue)} দিন বিলম্ব)
                        </span>
                      )}

                      {/* Incentive Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ইনসেনটিভ: {formatBengaliCurrency(task.incentiveAmount)}
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {task.name}
                    </h3>

                    {/* Assigned by Admin & Dates */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {task.createdByEmail && (
                        <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          অ্যাসাইন করেছেন: <strong>{task.createdByName || task.createdByEmail}</strong>
                        </span>
                      )}

                      <span>
                        শুরু: <strong>{formatBengaliDate(task.workDate)}</strong>
                      </span>
                      <span>
                        ডেডলাইন: <strong className={overdueInfo.isOverdue && !isApproved ? 'text-red-600 dark:text-red-400' : ''}>{formatBengaliDate(task.dueDate)}</strong>
                      </span>
                      {task.submitDate && (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          জমা দিয়েছেন: <strong>{formatBengaliDate(task.submitDate)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Admin Instructions or Note */}
                    {task.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200">নির্দেশনা / ড্রাইভ লিংক:</strong> {task.note}
                      </p>
                    )}

                    {/* Revision Note from Admin */}
                    {isRevision && task.rejectionReason && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          অ্যাডমিনের সংশোধনের নির্দেশনা:
                        </p>
                        <p className="pl-5 leading-relaxed">{task.rejectionReason}</p>
                      </div>
                    )}

                    {/* Who approved it (CRITICAL USER REQUIREMENT) */}
                    {isApproved && task.approvedByEmail && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>অনুমোদন করেছেন:</strong> {task.approvedByName || task.approvedByEmail} ({task.approvedByEmail})
                          {task.approvedAt && ` • ${formatBengaliDate(task.approvedAt.slice(0, 10))}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Progress Status Inputs (পেন্ডিং / চলমান / সম্পূর্ণ) */}
                  <div className="flex flex-col items-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      আপনার কাজের স্ট্যাটাস ইনপুট দিন:
                    </p>

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                      {/* 1. পেন্ডিং */}
                      <button
                        type="button"
                        onClick={() => handleSetSimpleStatus(task, 'pending')}
                        disabled={isApproved}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          task.status === 'pending'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        } disabled:opacity-50`}
                      >
                        ⏳ পেন্ডিং
                      </button>

                      {/* 2. চলমান */}
                      <button
                        type="button"
                        onClick={() => handleSetSimpleStatus(task, 'in_progress')}
                        disabled={isApproved}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          task.status === 'in_progress'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        } disabled:opacity-50`}
                      >
                        ⚡ চলমান
                      </button>

                      {/* 3. সম্পূর্ণ হয়েছে */}
                      <button
                        type="button"
                        onClick={() => handleOpenSubmitDialog(task)}
                        disabled={isApproved}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                          task.status === 'completed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        } disabled:opacity-50`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isApproved ? 'অনুমোদিত' : isPendingApproval ? 'জমা দেওয়া হয়েছে' : 'সম্পূর্ণ হয়েছে'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Work Dialog (When member marks completed) */}
      {taskToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                কাজটি কি সম্পন্ন হয়েছে?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                "{taskToSubmit.name}" কাজটি সম্পূর্ণ হিসেবে জমা দিলে অ্যাডমিন সেটি রিভিউ ও অনুমোদন করবেন।
              </p>
            </div>

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  সমাপ্ত কাজের ড্রাইভ লিংক বা নোট (ঐচ্ছিক)
                </label>
                <textarea
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="যেমন: গুগল ড্রাইভের ফাইনাল এক্সপোর্ট লিংক বা কোনো অতিরিক্ত তথ্য..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Coins className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  অ্যাডমিন অনুমোদন করার সাথে সাথেই আপনার ইনসেনটিভ (<strong>{formatBengaliCurrency(taskToSubmit.incentiveAmount)}</strong>) অর্জিত হিসেবে জমা হবে।
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskToSubmit(null)}
                  disabled={isSubmittingTask}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmittingTask ? 'জমা দেওয়া হচ্ছে...' : 'অনুমোদনের জন্য জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
