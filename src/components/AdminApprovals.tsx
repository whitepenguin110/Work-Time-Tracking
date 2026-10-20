import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Coins,
  ShieldCheck,
  User,
  Plus,
  Calendar,
  Layers,
  Search,
  MessageSquare,
  FileCheck,
  RotateCcw,
  Palette,
  Video,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  FileText,
  UserX,
  UserCheck
} from 'lucide-react';
import { db, handleFirestoreError, OperationType, getBengaliErrorMessage } from '../services/firebase';
import { Task, UserProfile, Category, Department, DEPARTMENTS } from '../types';
import { useAuth } from '../context/AuthContext';
import { TaskModal } from './TaskModal';
import { AdminViewTab } from './Navbar';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  formatBengaliDate,
  getCurrentMonthString,
  getPastMonthsOptions,
  formatBengaliMonthYear
} from '../utils/bengali';

interface AdminApprovalsProps {
  onNavigateTab?: (tab: AdminViewTab) => void;
}

export const AdminApprovals: React.FC<AdminApprovalsProps> = ({ onNavigateTab }) => {
  const { user, profile } = useAuth();
  const adminScope = profile?.adminDepartmentScope || 'all';

  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'pending_approval' | 'approved' | 'in_progress' | 'all'
  const [activeFilter, setActiveFilter] = useState<'pending_approval' | 'in_progress' | 'approved' | 'all'>('pending_approval');
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    adminScope === 'graphic' ? 'graphic' : adminScope === 'video' ? 'video' : 'all'
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep departmentFilter aligned with adminScope
  useEffect(() => {
    if (adminScope === 'graphic') {
      setDepartmentFilter('graphic');
    } else if (adminScope === 'video') {
      setDepartmentFilter('video');
    }
  }, [adminScope]);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Revision Modal
  const [taskForRevision, setTaskForRevision] = useState<Task | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch tasks
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tasks'),
      (snap) => {
        const list: Task[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Task));
        // Sort descending by workDate or createdAt
        list.sort((a, b) => (b.workDate || b.createdAt || '').localeCompare(a.workDate || a.createdAt || ''));
        setRawTasks(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tasks');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Fetch users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as UserProfile));
        setRawUsers(list);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Filter tasks strictly by adminScope
  const tasks = useMemo(() => {
    if (adminScope === 'graphic') {
      return rawTasks.filter((t) => t.department === 'graphic');
    }
    if (adminScope === 'video') {
      return rawTasks.filter((t) => t.department === 'video');
    }
    return rawTasks;
  }, [rawTasks, adminScope]);

  // Filter team members strictly by adminScope
  const users = useMemo(() => {
    if (adminScope === 'graphic') {
      return rawUsers.filter((u) => u.department === 'graphic');
    }
    if (adminScope === 'video') {
      return rawUsers.filter((u) => u.department === 'video');
    }
    return rawUsers;
  }, [rawUsers, adminScope]);

  // 3. Fetch categories
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
        setCategories(list);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  // 1. Approve task - records WHICH ADMIN approved it and when
  const handleApproveTask = async (task: Task) => {
    if (!user) return;
    setIsProcessingAction(true);
    try {
      const adminName = profile?.name || user.displayName || 'অ্যাডমিন';
      const adminEmail = user.email || '';

      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        status: 'completed',
        approvalStatus: 'approved',
        approvedByEmail: adminEmail,
        approvedByName: adminName,
        approvedAt: new Date().toISOString(),
        rejectionReason: '',
      });

      showNotification('success', `কাজটি সফলভাবে অনুমোদন করা হয়েছে এবং এটি সম্পন্ন কাজের তালিকায় যুক্ত হয়েছে! অনুমোদনকারী: ${adminName}।`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'অনুমোদন প্রক্রিয়া সম্পন্ন করা যায়নি।');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 2. Request Revision
  const handleSendRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForRevision || !revisionNote.trim()) return;

    setIsProcessingAction(true);
    try {
      const taskRef = doc(db, 'tasks', taskForRevision.id);
      await updateDoc(taskRef, {
        status: 'in_progress',
        approvalStatus: 'rejected',
        rejectionReason: revisionNote.trim(),
      });

      showNotification('success', `"${taskForRevision.name}" কাজের জন্য সংশোধনের নির্দেশনা পাঠানো হয়েছে।`);
      setTaskForRevision(null);
      setRevisionNote('');
    } catch (err) {
      console.error(err);
      showNotification('error', 'নির্দেশনা পাঠানো সম্ভব হয়নি।');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // 3. Delete Task
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete.id));
      showNotification('success', 'কাজটি সফলভাবে মুছে ফেলা হয়েছে।');
      setTaskToDelete(null);
    } catch (err) {
      console.error(err);
      showNotification('error', 'কাজ মোছা সম্ভব হয়নি।');
    } finally {
      setIsDeleting(false);
    }
  };

  // Counts
  const unassignedCount = useMemo(() => {
    return tasks.filter((t) => !t.assignedToUid || t.assignedToUid.trim() === '').length;
  }, [tasks]);

  const pendingApprovalCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'completed' && t.approvalStatus === 'pending_approval').length;
  }, [tasks]);

  const approvedCount = useMemo(() => {
    return tasks.filter((t) => t.approvalStatus === 'approved').length;
  }, [tasks]);

  const inProgressCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'in_progress' || t.status === 'pending').length;
  }, [tasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Department filter
      if (departmentFilter !== 'all' && t.department !== departmentFilter) {
        return false;
      }

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (t.assignedToUid && t.assignedToUid.trim() !== '') return false;
        } else if (t.assignedToUid !== assigneeFilter) {
          return false;
        }
      }

      // Status tab filter
      if (activeFilter === 'pending_approval') {
        if (t.approvalStatus !== 'pending_approval' && !(t.status === 'completed' && !t.approvalStatus)) {
          return false;
        }
      } else if (activeFilter === 'approved') {
        if (t.approvalStatus !== 'approved') return false;
      } else if (activeFilter === 'in_progress') {
        if (t.status !== 'in_progress' && t.status !== 'pending') return false;
      }

      // Urgency filter
      if (urgencyFilter !== 'all' && (t.urgency || 'medium') !== urgencyFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.name.toLowerCase().includes(q);
        const matchClient = (t.clientName || '').toLowerCase().includes(q);
        const matchUser = (t.assignedToName || '').toLowerCase().includes(q) || (t.assignedToEmail || '').toLowerCase().includes(q);
        const matchCat = (t.categoryName || '').toLowerCase().includes(q);
        const matchNote = (t.note || '').toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchUser && !matchCat && !matchNote) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize urgent tasks at the top among active/pending tasks
      const aIsActive = a.status !== 'completed';
      const bIsActive = b.status !== 'completed';
      if (aIsActive && bIsActive) {
        const urgencyWeight: Record<string, number> = { urgent: 3, medium: 2, normal: 1 };
        const uA = urgencyWeight[a.urgency || 'medium'] || 2;
        const uB = urgencyWeight[b.urgency || 'medium'] || 2;
        if (uA !== uB) return uB - uA;
      }
      return (b.workDate || b.createdAt || '').localeCompare(a.workDate || a.createdAt || '');
    });
  }, [tasks, activeFilter, departmentFilter, assigneeFilter, urgencyFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white shadow-xl shadow-emerald-950/20">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            অ্যাডমিন ওয়ার্কফ্লো
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            নতুন কাজ সংযোগ ও সদস্যদের অ্যাসাইন করুন
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            ডিজাইনার বা এডিটরদের কাজ অ্যাসাইন করুন, তাদের অগ্রগতি দেখুন এবং সম্পন্ন কাজ অনুমোদন করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('all_tasks')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-900/50 hover:bg-emerald-950/70 border border-emerald-400/40 text-white font-semibold text-xs sm:text-sm shadow-md backdrop-blur-sm transition shrink-0"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              সম্পূর্ণ কাজের তালিকা ও PDF
            </button>
          )}

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-900 font-bold text-xs sm:text-sm shadow-lg hover:bg-slate-50 active:scale-95 transition shrink-0"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            নতুন কাজ সংযোগ ও অ্যাসাইন করুন
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 animate-fade-in ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {notificationMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div
          onClick={() => setActiveFilter('pending_approval')}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
            activeFilter === 'pending_approval'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              অনুমোদনের অপেক্ষায়
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {toBengaliNumber(pendingApprovalCount)} টি
          </p>
          <span className="text-[11px] text-slate-400">অ্যাডমিন অনুমোদন প্রয়োজন</span>
          {pendingApprovalCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </div>

        <div
          onClick={() => setActiveFilter('in_progress')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'in_progress'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              চলমান ও পেন্ডিং কাজ
            </span>
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {toBengaliNumber(inProgressCount)} টি
          </p>
          <span className="text-[11px] text-slate-400">সদস্যরা কাজ করছেন</span>
        </div>

        <div
          onClick={() => setActiveFilter('approved')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'approved'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              সম্পন্ন হওয়া কাজ
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {toBengaliNumber(approvedCount)} টি
          </p>
          <span className="text-[11px] text-slate-400">অনুমোদন সম্পন্ন হয়েছে</span>
        </div>

        <div
          onClick={() => {
            if (assigneeFilter === 'unassigned') {
              setAssigneeFilter('all');
            } else {
              setAssigneeFilter('unassigned');
              setActiveFilter('all');
            }
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
            assigneeFilter === 'unassigned'
              ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              অ্যাসাইন ছাড়া কাজ
            </span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
            {toBengaliNumber(unassignedCount)} টি
          </p>
          <span className="text-[11px] text-slate-400">সদস্য নির্বাচন বাকি</span>
          {unassignedCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          )}
        </div>

        <div
          onClick={() => {
            setActiveFilter('all');
            setAssigneeFilter('all');
          }}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'all' && assigneeFilter === 'all'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
              মোট কাজের হিসাব
            </span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
            {toBengaliNumber(tasks.length)} টি
          </p>
          <span className="text-[11px] text-slate-400">সকল কাজ মিলিয়ে</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কাজের নাম, অ্যাসাইন করা কর্মীর নাম বা ক্যাটাগরি..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">সকল বিভাগ</option>
              <option value="graphic">🎨 গ্রাফিক ডিজাইন</option>
              <option value="video">🎬 ভিডিও এডিটিং</option>
            </select>
          </div>

          {/* Member Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="all">সকল সদস্য</option>
              <option value="unassigned" className="font-bold text-amber-600">
                ⚠️ কাউকে অ্যাসাইন করা হয়নি ({toBengaliNumber(unassignedCount)})
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">কাজের তথ্য লোড হচ্ছে...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <FileCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            কোনো কাজ পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {activeFilter === 'pending_approval'
              ? 'এই মুহূর্তে অনুমোদনের অপেক্ষায় থাকা কোনো কাজ নেই।'
              : 'নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো কাজ নেই। নতুন কাজ যোগ করতে ওপরের বোতাম ব্যবহার করুন।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isPendingApproval = task.status === 'completed' && task.approvalStatus === 'pending_approval';
            const isApproved = task.approvalStatus === 'approved';

            return (
              <div
                key={task.id}
                className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition shadow-xs ${
                  isPendingApproval
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/20'
                    : isApproved
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Task details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {task.categoryName}
                      </span>

                      {/* Department Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {task.department === 'graphic' ? (
                          <Palette className="w-3 h-3 text-pink-500" />
                        ) : (
                          <Video className="w-3 h-3 text-blue-500" />
                        )}
                        {DEPARTMENTS[task.department]?.label}
                      </span>

                      {/* Approval Status Badge */}
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
                      ) : task.approvalStatus === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          সংশোধন প্রয়োজন
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {task.status === 'in_progress' ? 'চলমান' : 'পেন্ডিং'}
                        </span>
                      )}

                      {/* Incentive Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                        <Coins className="w-3.5 h-3.5" />
                        {formatBengaliCurrency(task.incentiveAmount)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {task.name}
                    </h3>

                    {/* Assignee & Dates info */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap pt-0.5">
                      {!task.assignedToUid ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
                          <UserX className="w-3.5 h-3.5 text-amber-600" />
                          কাউকে অ্যাসাইন করা হয়নি (Unassigned)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          অ্যাসাইন করা কর্মী: <strong>{task.assignedToName || 'সদস্য'}</strong> {task.assignedToEmail ? `(${task.assignedToEmail})` : ''}
                        </span>
                      )}

                      <span>শুরু: <strong>{formatBengaliDate(task.workDate)}</strong></span>
                      <span>ডেডলাইন: <strong>{formatBengaliDate(task.dueDate)}</strong></span>

                      {task.submitDate && (
                        <span className="text-emerald-600 font-semibold">
                          জমা দিয়েছেন: {formatBengaliDate(task.submitDate)}
                        </span>
                      )}
                    </div>

                    {/* Note / Instruction */}
                    {task.note && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <strong>কাজের নির্দেশনা/নোট:</strong> {task.note}
                      </p>
                    )}

                    {/* Who approved it */}
                    {task.approvedByEmail && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>অনুমোদন করেছেন অ্যাডমিন:</strong> {task.approvedByName || task.approvedByEmail} ({task.approvedByEmail})
                          {task.approvedAt && ` • ${formatBengaliDate(task.approvedAt.slice(0, 10))}`}
                        </span>
                      </div>
                    )}

                    {/* Rejection / Revision reason */}
                    {task.rejectionReason && (
                      <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
                        <strong>সংশোধনের নির্দেশনা:</strong> {task.rejectionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 justify-end flex-wrap">
                    {/* Unassigned quick assign button */}
                    {!task.assignedToUid && (
                      <button
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsTaskModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-sm transition"
                        title="এই কাজটি কোনো সদস্যকে অ্যাসাইন করুন"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        এখনই অ্যাসাইন করুন
                      </button>
                    )}

                    {/* Approve button */}
                    {isPendingApproval && (
                      <button
                        onClick={() => handleApproveTask(task)}
                        disabled={isProcessingAction}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        অনুমোদন করুন (Approve)
                      </button>
                    )}

                    {/* Request revision button */}
                    {isPendingApproval && (
                      <button
                        onClick={() => {
                          setTaskForRevision(task);
                          setRevisionNote('');
                        }}
                        disabled={isProcessingAction}
                        className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 text-xs font-semibold transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        সংশোধন দিন
                      </button>
                    )}

                    {/* Edit Task details */}
                    <button
                      onClick={() => {
                        setTaskToEdit(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="কাজের তথ্য পরিবর্তন করুন"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Task */}
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      title="কাজ মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal for Creating or Editing Task */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={async (payload) => {
          try {
            // Clean undefined fields to ensure Firestore setDoc/updateDoc never errors
            const cleanPayload = Object.fromEntries(
              Object.entries(payload).filter(([_, v]) => v !== undefined)
            );

            if (taskToEdit) {
              await updateDoc(doc(db, 'tasks', taskToEdit.id), {
                ...cleanPayload,
                updatedAt: new Date().toISOString(),
              });
              showNotification('success', 'কাজ সফলভাবে আপডেট করা হয়েছে।');
            } else {
              const newRef = doc(collection(db, 'tasks'));
              await setDoc(newRef, {
                ...cleanPayload,
                createdAt: new Date().toISOString(),
              });
              showNotification('success', 'নতুন কাজ সফলভাবে তৈরি ও কর্মীকে অ্যাসাইন করা হয়েছে।');
            }
          } catch (err) {
            console.error('Error saving task:', err);
            const { message } = getBengaliErrorMessage(err);
            showNotification('error', message || 'কাজ সংযোগ করা সম্ভব হয়নি।');
            throw err;
          }
        }}
        taskToEdit={taskToEdit}
        categories={categories}
        users={users}
        isAdmin={true}
      />

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                কাজটি মুছে ফেলতে চান?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                "{taskToDelete.name}" কাজটি স্থায়ীভাবে ডেটাবেস থেকে মুছে ফেলা হবে।
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
                {isDeleting ? 'মোছা হচ্ছে...' : 'মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Reason Modal */}
      {taskForRevision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              কাজের সংশোধনের নির্দেশনা দিন
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              "{taskForRevision.name}" কাজে কী কী পরিবর্তন বা সংশোধন প্রয়োজন তা কর্মীকে লিখে জানান:
            </p>

            <form onSubmit={handleSendRevision} className="space-y-4">
              <textarea
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="যেমন: কালার গ্রেডিং কিছুটা অ্যাডজাস্ট করুন, ফন্ট সাইজ বড় করুন..."
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTaskForRevision(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isProcessingAction ? 'পাঠানো হচ্ছে...' : 'নির্দেশনা পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
