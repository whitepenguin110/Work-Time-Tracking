import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Send,
  Download,
  FileText,
  Loader2,
  CalendarRange,
  X,
  Palette,
  Video,
  Award
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
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
  formatBengaliMonthYear,
  ReportPeriod,
  getPeriodDateRange
} from '../utils/bengali';

export const UserDashboard: React.FC = () => {
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Filters for main dashboard list
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Submission modal when marking complete
  const [taskToSubmit, setTaskToSubmit] = useState<Task | null>(null);
  const [submissionNote, setSubmissionNote] = useState<string>('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Individual PDF Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('1_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Hidden print reference for PDF generation
  const reportPrintRef = useRef<HTMLDivElement>(null);

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

  const currentMonthStr = getCurrentMonthString();

  // Overall Statistics for Dashboard
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
          allTimeApprovedIncentive += (t.incentiveAmount || 0);

          const taskMonth = (t.approvedAt || t.submitDate || t.workDate || '').slice(0, 7);
          if (taskMonth === currentMonthStr) {
            thisMonthApprovedIncentive += (t.incentiveAmount || 0);
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

  // Filtered task list for main dashboard
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

  // Report Period Date Range Calculation
  const reportRangeInfo = useMemo(() => {
    return getPeriodDateRange(reportPeriod, customStartDate, customEndDate);
  }, [reportPeriod, customStartDate, customEndDate]);

  // Filtered tasks specifically for the Individual PDF Report
  const reportTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Date filter
      const taskDate = t.workDate || (t.createdAt ? t.createdAt.slice(0, 10) : '');
      if (taskDate) {
        if (taskDate < reportRangeInfo.startDate || taskDate > reportRangeInfo.endDate) {
          return false;
        }
      }

      // Status filter
      if (reportStatusFilter === 'completed' && t.approvalStatus !== 'approved') {
        return false;
      }
      if (reportStatusFilter === 'pending_approval' && (t.status !== 'completed' || t.approvalStatus !== 'pending_approval')) {
        return false;
      }
      if (reportStatusFilter === 'in_progress' && t.status !== 'in_progress') {
        return false;
      }
      if (reportStatusFilter === 'pending' && t.status !== 'pending') {
        return false;
      }

      return true;
    });
  }, [tasks, reportRangeInfo, reportStatusFilter]);

  // Report Stats for the selected period
  const reportStats = useMemo(() => {
    let total = reportTasks.length;
    let approvedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let pendingApprovalCount = 0;
    let totalApprovedIncentive = 0;
    let totalPotentialIncentive = 0;

    reportTasks.forEach((t) => {
      const inc = t.incentiveAmount || 0;
      totalPotentialIncentive += inc;

      if (t.approvalStatus === 'approved') {
        approvedCount++;
        totalApprovedIncentive += inc;
      } else if (t.status === 'completed' && t.approvalStatus === 'pending_approval') {
        pendingApprovalCount++;
      } else if (t.status === 'in_progress') {
        inProgressCount++;
      } else if (t.status === 'pending') {
        pendingCount++;
      }
    });

    return {
      total,
      approvedCount,
      inProgressCount,
      pendingCount,
      pendingApprovalCount,
      totalApprovedIncentive,
      totalPotentialIncentive
    };
  }, [reportTasks]);

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

  // PDF Generator for Member Individual Report
  const handleDownloadReportPDF = async () => {
    if (!reportPrintRef.current) return;
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      // Allow DOM to settle
      await new Promise((resolve) => setTimeout(resolve, 250));

      const element = reportPrintRef.current;
      const width = element.offsetWidth || 800;
      const height = element.offsetHeight || element.scrollHeight || 1000;

      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        width,
        height
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const memberNameClean = (profile?.name || user?.displayName || 'Member').replace(/\s+/g, '_');
      const periodLabelClean = reportPeriod.replace('_', '-');
      const fileName = `Kajer_Report_${memberNameClean}_${periodLabelClean}_${getTodayDateString()}.pdf`;

      pdf.save(fileName);
      setPdfSuccessMessage('আপনার কাজের ব্যক্তিগত রিপোর্ট সফলভাবে PDF আকারে ডাউনলোড হয়েছে!');
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Member PDF Generation Error:', err);
      alert('পিডিএফ রিপোর্ট তৈরি করার সময় সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingPdf(false);
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

      {/* PDF Success Banner */}
      {pdfSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="text-white hover:text-emerald-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-950/10">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            স্বাগতম, {profile?.name || user?.displayName || 'সদস্য'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            আপনার অ্যাসাইন করা কাজের তালিকা ও অগ্রগতি
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm">
            অ্যাডমিন থেকে পাওয়া কাজগুলোর বর্তমান অবস্থা (পেন্ডিং / চলমান / সম্পূর্ণ) আপডেট করুন ও কাজের রিপোর্ট ডাউনলোড করুন
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs space-y-1">
            <p className="text-emerald-100 font-medium">বিভাগ:</p>
            <p className="text-sm font-bold text-white">
              {profile?.department === 'graphic' ? '🎨 গ্রাফিক ডিজাইন' : '🎬 ভিডিও এডিটিং ও প্রোডাকশন'}
            </p>
          </div>

          {/* Individual Report Download Button */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer shrink-0"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>ব্যক্তিগত কাজের PDF রিপোর্ট</span>
            <Download className="w-3.5 h-3.5 text-emerald-600" />
          </button>
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
          <span className="text-[11px] text-slate-400">জমা দেওয়া হয়েছে</span>
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

            {/* Quick Report Download Trigger */}
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-semibold transition"
              title="ব্যক্তিগত কাজের মাসিক বা বাৎসরিক PDF রিপোর্ট তৈরি করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF রিপোর্ট</span>
            </button>

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
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Task Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {task.categoryName}
                      </span>

                      {/* Approval / Progress Status Badge */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          সম্পন্ন হয়েছে (অনুমোদিত)
                        </span>
                      ) : isPendingApproval ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                          <Clock className="w-3 h-3" />
                          অনুমোদনের জন্য পাঠানো হয়েছে
                        </span>
                      ) : isRevision ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                          <AlertCircle className="w-3 h-3" />
                          ⚠️ সংশোধনের জন্য এসেছে
                        </span>
                      ) : task.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          <Clock className="w-3 h-3" />
                          চলমান
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          পেন্ডিং
                        </span>
                      )}

                      {/* Overdue Warning */}
                      {overdueInfo.isOverdue && !isApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                          <AlertCircle className="w-3 h-3" />
                          {toBengaliNumber(overdueInfo.daysOverdue)} দিন অতিক্রান্ত
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {task.name}
                    </h3>

                    {/* Metadata: Dates & Incentive */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {task.workDate && (
                        <span>
                          <strong>কাজের তারিখ:</strong> {formatBengaliDate(task.workDate)}
                        </span>
                      )}
                      {task.dueDate && (
                        <span>
                          <strong>জমা দেওয়ার শেষ সময়:</strong> {formatBengaliDate(task.dueDate)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Coins className="w-3.5 h-3.5" />
                        ইনসেনটিভ: {formatBengaliCurrency(task.incentiveAmount)}
                      </span>
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

                    {/* Who approved it */}
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
                        {isApproved ? 'অনুমোদিত' : isPendingApproval ? 'জমা দেওয়া হয়েছে' : 'সম্পূর্ণ হয়েছে'}
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
                  {isSubmittingTask ? 'জমা দেওয়া হচ্ছে...' : 'অনুমোদনের জন্য জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          INDIVIDUAL PDF REPORT MODAL (REQUIREMENT 5: ১ মাস, ২ মাস, ১ বছর বাৎসরিক PDF)
      ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-5 animate-fade-in my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    ব্যক্তিগত কাজের PDF রিপোর্ট ডাউনলোড
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    আপনার সম্পন্ন ও চলমান কাজের বিস্তারিত রিপোর্ট মাসিক বা বাৎসরিক মেয়াদে ডাউনলোড করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Profile Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  {(profile?.name || user?.displayName || 'M')[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {profile?.name || user?.displayName}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {user?.email}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                {profile?.department === 'graphic' ? '🎨 গ্রাফিক ডিজাইন' : '🎬 ভিডিও এডিটিং'}
              </span>
            </div>

            {/* Period Selection Controls */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                রিপোর্টের সময়কাল বা মেয়াদ নির্বাচন করুন:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReportPeriod('1_month')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === '1_month'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">১ মাসের রিপোর্ট</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">বিগত ১ মাস</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriod('2_months')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === '2_months'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">২ মাসের রিপোর্ট</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">বিগত ২ মাস</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriod('3_months')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === '3_months'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">৩ মাসের রিপোর্ট</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">বিগত ৩ মাস / ত্রৈমাসিক</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriod('5_months')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === '5_months'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">৫ মাসের রিপোর্ট</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">বিগত ৫ মাস</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriod('1_year')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === '1_year'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">১ বছরের রিপোর্ট (বাৎসরিক)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">বিগত ১২ মাস</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportPeriod('all')}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                    reportPeriod === 'all'
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-bold">সম্পূর্ণ সময় (All-Time)</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">শুরু থেকে আজ পর্যন্ত</span>
                </button>
              </div>

              {/* Custom Date Range Picker */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setReportPeriod('custom')}
                  className={`text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                    reportPeriod === 'custom'
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold underline'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>অথবা নির্দিষ্ট কাস্টম তারিখ সীমা বেছে নিন</span>
                </button>

                {reportPeriod === 'custom' && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        শুরুর তারিখ:
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        শেষ তারিখ:
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Filter for Report */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                কাজের ধরন বা স্ট্যাটাস:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    reportStatusFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  সকল কাজ ({toBengaliNumber(tasks.length)})
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    reportStatusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  শুধু সম্পন্ন কাজ ({toBengaliNumber(stats.approved)})
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('in_progress')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    reportStatusFilter === 'in_progress'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  চলমান কাজ ({toBengaliNumber(stats.inProgress)})
                </button>
                <button
                  type="button"
                  onClick={() => setReportStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    reportStatusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                  }`}
                >
                  পেন্ডিং কাজ ({toBengaliNumber(stats.pending)})
                </button>
              </div>
            </div>

            {/* Live Preview Metrics for this Report */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200">
                  {reportRangeInfo.label}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {formatBengaliDate(reportRangeInfo.startDate)} হতে {formatBengaliDate(reportRangeInfo.endDate)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700 text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">নির্বাচিত কাজের সংখ্যা</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {toBengaliNumber(reportStats.total)} টি
                  </p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700 text-center">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">সম্পন্ন হওয়া কাজ</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {toBengaliNumber(reportStats.approvedCount)} টি
                  </p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700 text-center">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">চলমান / অপেক্ষমাণ</p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                    {toBengaliNumber(reportStats.inProgressCount + reportStats.pendingApprovalCount)} টি
                  </p>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700 text-center">
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">মোট অনুমোদিত ইনসেনটিভ</p>
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatBengaliCurrency(reportStats.totalApprovedIncentive)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                disabled={isGeneratingPdf}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={handleDownloadReportPDF}
                disabled={isGeneratingPdf || reportTasks.length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>পিডিএফ তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>পিডিএফ রিপোর্ট ডাউনলোড করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          HIDDEN PRINTABLE CONTAINER FOR MEMBER INDIVIDUAL PDF
          Using pure inline CSS and standard HEX colors (#ffffff, #0f172a, etc.)
          to completely prevent any html2canvas / oklch color parsing errors!
      ========================================================================= */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          zIndex: -100
        }}
        aria-hidden="true"
      >
        <div
          ref={reportPrintRef}
          style={{
            width: '800px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            padding: '36px',
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Bengali", sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div
            style={{
              borderBottom: '2px solid #059669',
              paddingBottom: '20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#059669',
                  marginBottom: '4px'
                }}
              >
                কাজের হিসাব — সদস্যের ব্যক্তিগত কাজের রিপোর্ট
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                সদস্যের অর্জিত কাজের বিবরণী ও ইনসেনটিভ হিসাব
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
              <div>রিপোর্ট তৈরির তারিখ: {formatBengaliDate(getTodayDateString())}</div>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                {reportRangeInfo.label}
              </div>
            </div>
          </div>

          {/* Member Profile Block */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                সদস্যের নাম ও তথ্য
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>
                {profile?.name || user?.displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                ইমেইল: {user?.email}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                বিভাগ / ডিপার্টমেন্ট
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#059669', marginTop: '2px' }}>
                {profile?.department === 'graphic' ? 'গ্রাফিক ডিজাইন' : 'ভিডিও এডিটিং'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                তারিখ সীমা: {formatBengaliDate(reportRangeInfo.startDate)} হতে {formatBengaliDate(reportRangeInfo.endDate)}
              </div>
            </div>
          </div>

          {/* Report Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                মোট অ্যাসাইন কাজ
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                {toBengaliNumber(reportStats.total)} টি
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '600' }}>
                চলমান কাজ
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1d4ed8', marginTop: '4px' }}>
                {toBengaliNumber(reportStats.inProgressCount)} টি
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                সম্পন্ন হওয়া কাজ
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#047857', marginTop: '4px' }}>
                {toBengaliNumber(reportStats.approvedCount)} টি
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>
                মোট অর্জিত ইনসেনটিভ
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534', marginTop: '4px' }}>
                {formatBengaliCurrency(reportStats.totalApprovedIncentive)}
              </div>
            </div>
          </div>

          {/* Table Header & Content */}
          <div style={{ marginBottom: '32px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#059669', color: '#ffffff' }}>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857', width: '35px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857' }}>কাজের নাম</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857', width: '120px' }}>ক্যাটাগরি</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857', width: '90px' }}>তারিখ</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857', width: '85px', textAlign: 'center' }}>স্ট্যাটাস</th>
                  <th style={{ padding: '8px 10px', border: '1px solid #047857', width: '95px', textAlign: 'right' }}>ইনসেনটিভ</th>
                </tr>
              </thead>
              <tbody>
                {reportTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#64748b',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      এই সময়সীমার মধ্যে কোনো কাজ পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  reportTasks.map((t, idx) => {
                    const isApproved = t.approvalStatus === 'approved';
                    const isPendingApproval = t.status === 'completed' && t.approvalStatus === 'pending_approval';

                    let statusText = 'পেন্ডিং';
                    let statusBg = '#fffbeb';
                    let statusColor = '#b45309';

                    if (isApproved) {
                      statusText = 'সম্পন্ন (অনুমোদিত)';
                      statusBg = '#ecfdf5';
                      statusColor = '#047857';
                    } else if (isPendingApproval) {
                      statusText = 'অনুমোদনের অপেক্ষায়';
                      statusBg = '#faf5ff';
                      statusColor = '#6b21a8';
                    } else if (t.status === 'in_progress') {
                      statusText = 'চলমান';
                      statusBg = '#eff6ff';
                      statusColor = '#1d4ed8';
                    } else if (t.approvalStatus === 'rejected') {
                      statusText = 'সংশোধনে';
                      statusBg = '#fef2f2';
                      statusColor = '#b91c1c';
                    }

                    return (
                      <tr
                        key={t.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0'
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center',
                            color: '#64748b'
                          }}
                        >
                          {toBengaliNumber(idx + 1)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            fontWeight: '600',
                            color: '#0f172a'
                          }}
                        >
                          {t.name}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            color: '#475569'
                          }}
                        >
                          {t.categoryName}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            color: '#475569'
                          }}
                        >
                          {t.workDate ? formatBengaliDate(t.workDate) : '—'}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'center'
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              backgroundColor: statusBg,
                              color: statusColor
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #e2e8f0',
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: isApproved ? '#047857' : '#64748b'
                          }}
                        >
                          {formatBengaliCurrency(t.incentiveAmount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                  <td
                    colSpan={5}
                    style={{
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'right',
                      color: '#0f172a'
                    }}
                  >
                    মোট অর্জিত ইনসেনটিভ (অনুমোদিত কাজসমূহ):
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'right',
                      fontSize: '13px',
                      color: '#059669'
                    }}
                  >
                    {formatBengaliCurrency(reportStats.totalApprovedIncentive)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature & Disclaimer Footer */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '11px',
              color: '#64748b'
            }}
          >
            <div style={{ textAlign: 'center', width: '180px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '30px' }} />
              <div style={{ marginTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                সদস্যের স্বাক্ষর
              </div>
              <div>{profile?.name || user?.displayName}</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>
              <div>সিস্টেম জেনারেটেড রিপোর্ট • কাজের হিসাব অ্যাপ্লিকেশন</div>
              <div>https://kajer-hishab.app</div>
            </div>

            <div style={{ textAlign: 'center', width: '180px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', paddingBottom: '30px' }} />
              <div style={{ marginTop: '6px', fontWeight: 'bold', color: '#0f172a' }}>
                বিভাগীয় প্রধান / অ্যাডমিনের স্বাক্ষর
              </div>
              <div>অনুমোদিত কর্তৃপক্ষ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
