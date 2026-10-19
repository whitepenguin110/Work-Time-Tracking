import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Coins,
  Edit2,
  Trash2,
  TrendingUp,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType, getBengaliErrorMessage } from '../services/firebase';
import { Task, Category, TaskStatus } from '../types';
import { TaskModal } from './TaskModal';
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
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'pending', 'in_progress', 'completed'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorNotification, setErrorNotification] = useState<{ message: string; indexUrl: string | null } | null>(null);

  // 1. Fetch Categories for user's department
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
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('ownerUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const list: Task[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Task);
        });
        // Sort descending by workDate / createdAt
        list.sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));
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
    let completed = 0;
    let thisMonthIncentive = 0;
    let allTimeIncentive = 0;

    tasks.forEach((t) => {
      total++;
      if (t.status === 'pending') pending++;
      else if (t.status === 'in_progress') inProgress++;
      else if (t.status === 'completed') {
        completed++;
        const amount = t.incentiveAmount || 0;
        allTimeIncentive += amount;

        // Check if submitDate or workDate is in current month
        const refDate = t.submitDate || t.workDate || '';
        if (refDate.startsWith(currentMonthStr)) {
          thisMonthIncentive += amount;
        }
      }
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      thisMonthIncentive,
      allTimeIncentive,
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
      if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

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

  // Save new or edited task
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      if (taskToEdit) {
        const docRef = doc(db, 'tasks', taskToEdit.id);
        await updateDoc(docRef, {
          ...taskData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdAt: new Date().toISOString(),
        });
      }
      setIsTaskModalOpen(false);
      setTaskToEdit(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'tasks');
    }
  };

  // Quick status toggle directly on card
  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    try {
      const docRef = doc(db, 'tasks', task.id);
      let incentive = 0;
      let submitDate = task.submitDate || '';

      if (newStatus === 'completed') {
        // If it was already completed with locked amount, keep it; else get category incentive
        if (task.incentiveAmount && task.incentiveAmount > 0) {
          incentive = task.incentiveAmount;
        } else {
          const cat = categories.find((c) => c.id === task.categoryId);
          incentive = cat?.incentive || 0;
        }
        submitDate = submitDate || getTodayDateString();
      } else {
        // Moving away from completed removes incentive
        incentive = 0;
      }

      await updateDoc(docRef, {
        status: newStatus,
        incentiveAmount: incentive,
        submitDate: newStatus === 'completed' ? submitDate : '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  // Delete task
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      setTaskToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const monthOptions = getPastMonthsOptions(12);

  return (
    <div className="space-y-6">
      {/* Friendly Bengali Error Alert (Permission-Denied or Missing Index) */}
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

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg shadow-emerald-900/10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-md mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            স্বাগতম, {profile?.name || user?.displayName || 'ডিজাইনার'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            আপনার কাজের তালিকা ও ইনসেনটিভ হিসাব
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            প্রতিটি কাজ সম্পন্ন করুন এবং সাথে সাথেই অর্জিত ইনসেনটিভ জমা হতে দেখুন
          </p>
        </div>

        <button
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-emerald-800 font-semibold text-sm shadow-md hover:bg-emerald-50 active:scale-95 transition shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          নতুন কাজ যোগ করুন
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* মোট কাজ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">মোট কাজ</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {toBengaliNumber(stats.total)}
          </p>
          <span className="text-[11px] text-slate-400">সকল সময়ের</span>
        </div>

        {/* পেন্ডিং */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">পেন্ডিং</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {toBengaliNumber(stats.pending)}
          </p>
          <span className="text-[11px] text-slate-400">অপেক্ষমাণ কাজ</span>
        </div>

        {/* চলমান */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">চলমান</p>
            <Clock className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {toBengaliNumber(stats.inProgress)}
          </p>
          <span className="text-[11px] text-slate-400">কাজ শুরু হয়েছে</span>
        </div>

        {/* সম্পন্ন */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">সম্পন্ন</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {toBengaliNumber(stats.completed)}
          </p>
          <span className="text-[11px] text-slate-400">ইনসেনটিভ প্রযোজ্য</span>
        </div>

        {/* এই মাসের ইনসেনটিভ */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              চলতি মাসের ইনসেনটিভ
            </p>
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 truncate">
            {formatBengaliCurrency(stats.thisMonthIncentive)}
          </p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            {formatBengaliMonthYear(currentMonthStr)}
          </span>
        </div>

        {/* সব সময়ের ইনসেনটিভ */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-teal-800 dark:text-teal-300 font-semibold">
              সর্বমোট ইনসেনটিভ
            </p>
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1 truncate">
            {formatBengaliCurrency(stats.allTimeIncentive)}
          </p>
          <span className="text-[11px] text-teal-600/80 dark:text-teal-400/80">
            শুরু থেকে আজ পর্যন্ত
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
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
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
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task List / Table */}
      {loadingTasks ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            কাজের তালিকা লোড হচ্ছে...
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            কোনো কাজ পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || selectedMonth !== 'all'
              ? 'আপনার নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো কাজ নেই। ফিল্টার পরিবর্তন করে দেখুন।'
              : 'আপনি এখনও কোনো কাজ যোগ করেননি। ওপরের "নতুন কাজ যোগ করুন" বোতামে চাপ দিন।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const overdueInfo = checkIsOverdue(task.dueDate, task.status);

            return (
              <div
                key={task.id}
                className={`group p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs hover:shadow-md ${
                  overdueInfo.isOverdue
                    ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
                    : task.status === 'completed'
                    ? 'border-emerald-200/70 dark:border-emerald-950/60'
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

                      {/* Overdue Warning Badge */}
                      {overdueInfo.isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" />
                          ডেডলাইন পার হয়েছে ({toBengaliNumber(overdueInfo.daysOverdue)} দিন বিলম্ব)
                        </span>
                      )}

                      {/* Incentive Badge */}
                      {task.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ইনসেনটিভ: {formatBengaliCurrency(task.incentiveAmount)}
                        </span>
                      )}
                    </div>

                    {/* Task Title */}
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                      {task.name}
                    </h3>

                    {/* Dates metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        শুরু: <strong>{formatBengaliDate(task.workDate)}</strong>
                      </span>
                      <span>
                        ডেডলাইন: <strong className={overdueInfo.isOverdue ? 'text-red-600 dark:text-red-400' : ''}>{formatBengaliDate(task.dueDate)}</strong>
                      </span>
                      {task.submitDate && (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          জমা: <strong>{formatBengaliDate(task.submitDate)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Optional Note */}
                    {task.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                        <strong className="text-slate-700 dark:text-slate-200">নোট:</strong> {task.note}
                      </p>
                    )}
                  </div>

                  {/* Right: Quick Status Control & Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 justify-between lg:justify-end">
                    {/* Status switcher */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(task, 'pending')}
                        title="পেন্ডিং করুন"
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                          task.status === 'pending'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        পেন্ডিং
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(task, 'in_progress')}
                        title="চলমান করুন"
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                          task.status === 'in_progress'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        চলমান
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(task, 'completed')}
                        title="সম্পন্ন করুন (ইনসেনটিভ যুক্ত হবে)"
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                          task.status === 'completed'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        সম্পন্ন
                      </button>
                    </div>

                    {/* Edit & Delete actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setTaskToDelete(task)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Add / Edit Modal */}
      {profile && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          onSave={handleSaveTask}
          taskToEdit={taskToEdit}
          categories={categories}
          userDepartment={profile.department}
          ownerUid={user?.uid || ''}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                কাজটি কি মুছে ফেলতে চান?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                "{taskToDelete.name}" কাজটি স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={confirmDeleteTask}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? 'মোছা হচ্ছে...' : 'হ্যাঁ, মুছুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
