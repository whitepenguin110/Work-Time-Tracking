import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  FileText,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coins,
  Search,
  Filter,
  Palette,
  Video,
  Briefcase,
  Layers,
  ChevronDown,
  Eye,
  X,
  FileCheck2,
  CalendarRange,
  Loader2,
  Building2,
  Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, Task, Department, DEPARTMENTS } from '../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  formatBengaliDate,
  ReportPeriod,
  getPeriodDateRange,
  getTodayDateString,
  checkIsOverdue
} from '../utils/bengali';

import { useAuth } from '../context/AuthContext';

export const AdminAllTasksReport: React.FC = () => {
  const { profile } = useAuth();
  const adminScope = profile?.adminDepartmentScope || 'all';

  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('1_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedMemberUid, setSelectedMemberUid] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    adminScope === 'graphic' ? 'graphic' : adminScope === 'video' ? 'video' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (adminScope === 'graphic') setSelectedDepartment('graphic');
    if (adminScope === 'video') setSelectedDepartment('video');
  }, [adminScope]);

  // Scoped tasks and users based on logged in admin
  const tasks = useMemo(() => {
    if (adminScope === 'graphic') return rawTasks.filter((t) => t.department === 'graphic');
    if (adminScope === 'video') return rawTasks.filter((t) => t.department === 'video');
    return rawTasks;
  }, [rawTasks, adminScope]);

  const users = useMemo(() => {
    if (adminScope === 'graphic') return rawUsers.filter((u) => u.department === 'graphic');
    if (adminScope === 'video') return rawUsers.filter((u) => u.department === 'video');
    return rawUsers;
  }, [rawUsers, adminScope]);

  // PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Task details modal
  const [inspectedTask, setInspectedTask] = useState<Task | null>(null);

  // Hidden container for capturing PDF
  const reportPrintRef = useRef<HTMLDivElement>(null);

  // 1. Fetch users & tasks in real-time
  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => uList.push({ id: d.id, ...d.data() } as UserProfile));
        setRawUsers(uList);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubTasks = onSnapshot(
      collection(db, 'tasks'),
      (snap) => {
        const tList: Task[] = [];
        snap.forEach((d) => tList.push({ id: d.id, ...d.data() } as Task));
        // Sort newest first
        tList.sort((a, b) => {
          const dateA = a.workDate || a.createdAt || '';
          const dateB = b.workDate || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });
        setRawTasks(tList);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'tasks');
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubTasks();
    };
  }, []);

  // Compute period boundaries
  const periodInfo = useMemo(() => {
    return getPeriodDateRange(selectedPeriod, customStartDate, customEndDate);
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Selected member profile
  const selectedMemberProfile = useMemo(() => {
    if (selectedMemberUid === 'all') return null;
    return users.find((u) => u.id === selectedMemberUid) || null;
  }, [selectedMemberUid, users]);

  // Filter tasks based on all criteria and compute stats in a single pass
  const { filteredTasks, stats } = useMemo(() => {
    const filtered: typeof tasks = [];
    let inProgressCount = 0;
    let pendingCount = 0;
    let pendingApprovalCount = 0;
    let completedApprovedCount = 0;
    let totalIncentive = 0;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      // 1. Date filter (workDate or submitDate or createdAt)
      const taskDate = t.workDate || (t.createdAt ? t.createdAt.slice(0, 10) : '');
      if (taskDate) {
        if (taskDate < periodInfo.startDate || taskDate > periodInfo.endDate) {
          continue;
        }
      }

      // 2. Member filter
      if (selectedMemberUid !== 'all') {
        const matchesMember =
          t.assignedToUid === selectedMemberUid || t.ownerUid === selectedMemberUid;
        if (!matchesMember) continue;
      }

      // 3. Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'in_progress' && t.status !== 'in_progress') continue;
        if (selectedStatus === 'pending' && t.status !== 'pending') continue;
        if (selectedStatus === 'pending_approval' && t.approvalStatus !== 'pending_approval')
          continue;
        if (
          selectedStatus === 'completed' &&
          !(t.status === 'completed' && t.approvalStatus === 'approved')
        )
          continue;
      }

      // 4. Department filter
      if (selectedDepartment !== 'all' && t.department !== selectedDepartment) {
        continue;
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.name?.toLowerCase().includes(q);
        const catMatch = t.categoryName?.toLowerCase().includes(q);
        const memberMatch =
          t.assignedToName?.toLowerCase().includes(q) ||
          t.assignedToEmail?.toLowerCase().includes(q);
        if (!titleMatch && !catMatch && !memberMatch) continue;
      }

      // If it passes all filters, add to array and compute stats
      filtered.push(t);

      if (t.status === 'in_progress') {
        inProgressCount++;
      } else if (t.status === 'completed' && t.approvalStatus === 'pending_approval') {
        pendingApprovalCount++;
      } else if (t.status === 'pending') {
        pendingCount++;
      } else if (t.status === 'completed' && t.approvalStatus === 'approved') {
        completedApprovedCount++;
      }
      totalIncentive += t.incentiveAmount || 0;
    }

    return {
      filteredTasks: filtered,
      stats: {
        totalCount: filtered.length,
        inProgressCount,
        pendingCount,
        pendingApprovalCount,
        completedApprovedCount,
        totalIncentive
      }
    };
  }, [
    tasks,
    periodInfo,
    selectedMemberUid,
    selectedStatus,
    selectedDepartment,
    searchQuery
  ]);

  // PDF Generator Function
  const handleDownloadPDF = async () => {
    if (!reportPrintRef.current) return;
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      // Allow DOM to fully settle
      await new Promise((resolve) => setTimeout(resolve, 250));

      const element = reportPrintRef.current;
      const width = element.offsetWidth || 800;
      const height = element.offsetHeight || element.scrollHeight || 1000;

      const canvas = await toCanvas(element, {
        pixelRatio: 2, // 2x scale for crisp Bengali typography
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

      // Additional pages if report is long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      // Generate filename based on filters
      const periodLabelClean = selectedPeriod.replace('_', '-');
      const memberNameClean = selectedMemberProfile
        ? selectedMemberProfile.name.replace(/\s+/g, '_')
        : 'Team';
      const fileName = `Kajer_Hishab_Report_${memberNameClean}_${periodLabelClean}_${getTodayDateString()}.pdf`;

      pdf.save(fileName);

      setPdfSuccessMessage('পিডিএফ সফলভাবে আপনার ডিভাইসে ডাউনলোড হয়েছে!');
      setTimeout(() => setPdfSuccessMessage(null), 5000);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('পিডিএফ জেনারেট করার সময় সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              অ্যাডমিন ড্যাশবোর্ড রিপোর্ট
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              সম্পূর্ণ কাজের তালিকা ও PDF রিপোর্ট
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              টিমের কতটি কাজ আছে, কতটি কাজ বর্তমানে চলছে তা একনজরে পর্যবেক্ষণ করুন। ১ মাস, ২
              মাস, ৩ মাস, ৫ মাস অথবা গোটা বছরের কাজের সম্পূর্ণ রিপোর্ট নির্দিষ্ট সদস্যভিত্তিক
              সরাসরি <strong>PDF আকারে ডাউনলোড</strong> করুন।
            </p>
          </div>

          {/* Prominent PDF Download Button */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf || filteredTasks.length === 0}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
                filteredTasks.length === 0
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : isGeneratingPdf
                  ? 'bg-emerald-700 text-white cursor-wait'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  পিডিএফ প্রস্তুত হচ্ছে...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  PDF রিপোর্ট ডাউনলোড করুন
                </>
              )}
            </button>
          </div>
        </div>

        {/* Success alert message */}
        {pdfSuccessMessage && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Overview Metrics (কতটি কাজ আছে, কতটি কাজ চলছে, ইত্যাদি) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">মোট কাজের সংখ্যা</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {toBengaliNumber(stats.totalCount)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">ফিল্টারকৃত মোট কাজ</p>
          </div>
        </div>

        {/* In Progress Tasks (কতটি কাজ চলছে) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-blue-200 dark:border-blue-900/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs font-semibold">চলমান কাজ</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
              {toBengaliNumber(stats.inProgressCount)}
            </div>
            <p className="text-[11px] text-blue-500/80 mt-0.5">বর্তমানে কাজ চলছে</p>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-amber-200 dark:border-amber-900/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold">পেন্ডিং ও অপেক্ষারত</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
              {toBengaliNumber(stats.pendingCount)}
            </div>
            <p className="text-[11px] text-amber-600/80 mt-0.5">অনুমোদনের অপেক্ষায়</p>
          </div>
        </div>

        {/* Completed & Approved Tasks */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-emerald-200 dark:border-emerald-900/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold">সম্পন্ন হওয়া কাজ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {toBengaliNumber(stats.completedApprovedCount)}
            </div>
            <p className="text-[11px] text-emerald-600/80 mt-0.5">সফলভাবে সমাপ্ত</p>
          </div>
        </div>

        {/* Total Incentive */}
        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-purple-200 dark:border-purple-900/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-xs font-semibold">মোট ইনসেন্টিভ</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatBengaliCurrency(stats.totalIncentive)}
            </div>
            <p className="text-[11px] text-purple-600/80 mt-0.5">নির্ধারিত ইনসেন্টিভ</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (সময়কাল, সদস্য, স্ট্যাটাস, বিভাগ, সার্চ) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>রিপোর্ট ফিল্টার ও সময়সীমা নির্বাচন</span>
          </div>
          <span className="text-xs text-slate-500">
            বর্তমান সময়কাল:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {periodInfo.label}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Time Period Selector (১ মাস, ২ মাস, ৩ মাস, ৫ মাস, গোটা বছর) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              কাজের সময়কাল
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="1_month">১ মাসের রিপোর্ট (বিগত ১ মাস)</option>
              <option value="2_months">২ মাসের রিপোর্ট (বিগত ২ মাস)</option>
              <option value="3_months">৩ মাসের রিপোর্ট (বিগত ৩ মাস / ত্রৈমাসিক)</option>
              <option value="5_months">৫ মাসের রিপোর্ট (একসাথে ৫ মাস)</option>
              <option value="1_year">গোটা বছরের রিপোর্ট (বিগত ১২ মাস / ১ বছর)</option>
              <option value="all">সব সময় (অল টাইম রেকর্ড)</option>
              <option value="custom">কাস্টম তারিখ সীমা নির্বাচন</option>
            </select>
          </div>

          {/* 2. Specific Member Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              নির্দিষ্ট সদস্যের রিপোর্ট
            </label>
            <select
              value={selectedMemberUid}
              onChange={(e) => setSelectedMemberUid(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">সকল টিম সদস্য (সম্মিলিত রিপোর্ট)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.department === 'graphic' ? 'গ্রাফিক্স' : 'ভিডিও'}) — {u.email}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              কাজের স্ট্যাটাস
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">সকল স্ট্যাটাস</option>
              <option value="in_progress">চলমান কাজ (কাজ চলছে)</option>
              <option value="pending">পেন্ডিং কাজ (শুরু হয়নি)</option>
              <option value="pending_approval">অনুমোদনের অপেক্ষায় (রিভিউতে)</option>
              <option value="completed">সম্পন্ন হওয়া কাজ</option>
            </select>
          </div>

          {/* 4. Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              বিভাগ / ডিপার্টমেন্ট
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">সকল বিভাগ</option>
              <option value="graphic">গ্রাফিক্স ডিজাইন (Graphic Design)</option>
              <option value="video">ভিডিও এডিটিং ও প্রোডাকশন (Video Editing)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs (shown when 'custom' selected) */}
        {selectedPeriod === 'custom' && (
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 animate-fade-in">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              শুরুর তারিখ:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              শেষের তারিখ:
            </span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {/* Live Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="কাজের নাম, ক্যাটাগরি বা সদস্যের নাম/ইমেইল দিয়ে সার্চ করুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Interactive Task List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              কাজের বিস্তারিত তালিকা ({toBengaliNumber(filteredTasks.length)} টি কাজ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedMemberProfile ? (
                <span>
                  সদস্য:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {selectedMemberProfile.name}
                  </strong>{' '}
                  ({selectedMemberProfile.email})
                </span>
              ) : (
                <span>টিমের সকল সদস্যের কাজ প্রদর্শিত হচ্ছে</span>
              )}
            </p>
          </div>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf || filteredTasks.length === 0}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            PDF ডাউনলোড
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">কাজের ডাটা লোড হচ্ছে...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium">নির্বাচিত ফিল্টারে কোনো কাজ পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500">
              অনুগ্রহ করে অন্য সময়সীমা বা অন্য কোনো ফিল্টার নির্বাচন করুন
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-center w-12">নং</th>
                  <th className="px-4 py-3">কাজের নাম ও ক্যাটাগরি</th>
                  <th className="px-4 py-3">দায়িত্বপ্রাপ্ত সদস্য</th>
                  <th className="px-4 py-3">তারিখ ও ডিউ ডেট</th>
                  <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">ইনসেন্টিভ</th>
                  <th className="px-4 py-3">অনুমোদনকারী</th>
                  <th className="px-4 py-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((task, idx) => {
                  const overdue = checkIsOverdue(task.dueDate, task.status);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* SL */}
                      <td className="px-4 py-3 text-center font-medium text-slate-400">
                        {toBengaliNumber(idx + 1)}
                      </td>

                      {/* Title & Category */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {task.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {task.categoryName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              task.department === 'graphic'
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {task.department === 'graphic' ? (
                              <Palette className="w-2.5 h-2.5" />
                            ) : (
                              <Video className="w-2.5 h-2.5" />
                            )}
                            {task.department === 'graphic' ? 'গ্রাফিক্স' : 'ভিডিও'}
                          </span>
                        </div>
                      </td>

                      {/* Member */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {task.assignedToName || 'অনির্ধারিত'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {task.assignedToEmail || ''}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3">
                        <div className="text-slate-700 dark:text-slate-300">
                          কাজ: {formatBengaliDate(task.workDate)}
                        </div>
                        <div
                          className={`text-[11px] ${
                            overdue.isOverdue
                              ? 'text-rose-600 font-semibold'
                              : 'text-slate-400'
                          }`}
                        >
                          ডিউ: {formatBengaliDate(task.dueDate)}
                          {overdue.isOverdue &&
                            ` (${toBengaliNumber(overdue.daysOverdue)} দিন বাকি)`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        {task.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3 h-3 animate-spin" />
                            চলমান
                          </span>
                        ) : task.approvalStatus === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            সম্পন্ন কাজ
                          </span>
                        ) : task.approvalStatus === 'pending_approval' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            অনুমোদনের অপেক্ষায়
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            পেন্ডিং
                          </span>
                        )}
                      </td>

                      {/* Incentive */}
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBengaliCurrency(task.incentiveAmount)}
                      </td>

                      {/* Approved By */}
                      <td className="px-4 py-3">
                        {task.approvedByEmail ? (
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                              {task.approvedByEmail}
                            </span>
                            {task.approvedAt && (
                              <div className="text-[10px] text-slate-400">
                                {formatBengaliDate(task.approvedAt.slice(0, 10))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setInspectedTask(task)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="বিস্তারিত দেখুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Details Modal (Inspection) */}
      {inspectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                কাজের পূর্ণাঙ্গ বিবরণ
              </h3>
              <button
                onClick={() => setInspectedTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400">কাজের শিরোনাম:</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {inspectedTask.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400">ক্যাটাগরি:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {inspectedTask.categoryName}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">ইনসেন্টিভ:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatBengaliCurrency(inspectedTask.incentiveAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400">দায়িত্বপ্রাপ্ত সদস্য:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {inspectedTask.assignedToName || 'অনির্ধারিত'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {inspectedTask.assignedToEmail}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">বিভাগ:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {inspectedTask.department === 'graphic'
                      ? 'গ্রাফিক্স ডিজাইন'
                      : 'ভিডিও এডিটিং'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-slate-400">কাজের তারিখ:</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {formatBengaliDate(inspectedTask.workDate)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">ডিউ ডেট:</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {formatBengaliDate(inspectedTask.dueDate)}
                  </p>
                </div>
              </div>

              {inspectedTask.note && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <span className="text-xs font-semibold text-slate-500">কাজের নোট/নির্দেশনা:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                    {inspectedTask.note}
                  </p>
                </div>
              )}

              {inspectedTask.approvedByEmail && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    অনুমোদনকারী অ্যাডমিন:
                  </span>
                  <p className="text-xs text-emerald-800 dark:text-emerald-200 font-medium mt-0.5">
                    {inspectedTask.approvedByEmail}
                  </p>
                  {inspectedTask.approvedAt && (
                    <p className="text-[10px] text-emerald-600/80 mt-0.5">
                      অনুমোদনের তারিখ: {formatBengaliDate(inspectedTask.approvedAt.slice(0, 10))}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectedTask(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          OFF-SCREEN / EXPORT CONTAINER FOR PDF GENERATION
          This element is captured by html2canvas into a crisp A4 printable PDF
          ========================================================================= */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={reportPrintRef}
          style={{
            width: '800px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hind Siliguri", sans-serif',
            padding: '36px 40px',
            boxSizing: 'border-box'
          }}
        >
          {/* PDF Header */}
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
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#065f46',
                  margin: '0 0 6px 0'
                }}
              >
                কাজের হিসাব
              </h1>
              <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 4px 0', fontWeight: '600' }}>
                সম্পূর্ণ কাজের তালিকা ও কার্যবিবরণী রিপোর্ট
              </p>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                {selectedMemberProfile
                  ? `সদস্য: ${selectedMemberProfile.name} (${selectedMemberProfile.email}) | বিভাগ: ${
                      selectedMemberProfile.department === 'graphic'
                        ? 'গ্রাফিক্স ডিজাইন'
                        : 'ভিডিও এডিটিং'
                    }`
                  : 'টিম ওভারভিউ রিপোর্ট (সকল সদস্য)'}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '6px'
                }}
              >
                {periodInfo.label}
              </div>
              <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>
                রিপোর্ট তৈরির তারিখ: {formatBengaliDate(getTodayDateString())}
              </p>
            </div>
          </div>

          {/* PDF KPI Summary Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
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
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                মোট কাজ
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#0f172a',
                  marginTop: '4px'
                }}
              >
                {toBengaliNumber(stats.totalCount)} টি
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
              <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: '600' }}>
                চলমান কাজ
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#1d4ed8',
                  marginTop: '4px'
                }}
              >
                {toBengaliNumber(stats.inProgressCount)} টি
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '10px', color: '#d97706', fontWeight: '600' }}>
                পেন্ডিং কাজ
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#b45309',
                  marginTop: '4px'
                }}
              >
                {toBengaliNumber(stats.pendingCount)} টি
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
              <div style={{ fontSize: '10px', color: '#059669', fontWeight: '600' }}>
                সম্পন্ন হওয়া কাজ
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#047857',
                  marginTop: '4px'
                }}
              >
                {toBengaliNumber(stats.completedApprovedCount)} টি
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '10px', color: '#7e22ce', fontWeight: '600' }}>
                অনুমোদনের অপেক্ষায়
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#6b21a8',
                  marginTop: '4px'
                }}
              >
                {toBengaliNumber(stats.pendingApprovalCount)} টি
              </div>
            </div>
          </div>

          {/* PDF Table - Pure task & status reporting without incentives */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10px',
              marginBottom: '28px'
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '8px 6px', textAlign: 'center', width: '30px' }}>নং</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>কাজের বিবরণ ও ক্যাটাগরি</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>সদস্য</th>
                <th style={{ padding: '8px 8px', textAlign: 'center' }}>তারিখ</th>
                <th style={{ padding: '8px 8px', textAlign: 'center' }}>অবস্থা</th>
                <th style={{ padding: '8px 8px', textAlign: 'left' }}>অনুমোদনকারী</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t, idx) => {
                let statusBadgeBg = '#f1f5f9';
                let statusBadgeColor = '#475569';
                let statusLabel = 'পেন্ডিং';

                if (t.status === 'in_progress') {
                  statusBadgeBg = '#dbeafe';
                  statusBadgeColor = '#1e40af';
                  statusLabel = 'চলমান';
                } else if (t.approvalStatus === 'approved') {
                  statusBadgeBg = '#d1fae5';
                  statusBadgeColor = '#065f46';
                  statusLabel = 'সম্পন্ন কাজ';
                } else if (t.approvalStatus === 'pending_approval') {
                  statusBadgeBg = '#fef3c7';
                  statusBadgeColor = '#92400e';
                  statusLabel = 'অনুমোদনের অপেক্ষায়';
                }

                const isEven = idx % 2 === 0;

                return (
                  <tr
                    key={t.id}
                    style={{
                      backgroundColor: isEven ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 4px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontWeight: '600'
                      }}
                    >
                      {toBengaliNumber(idx + 1)}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{t.name}</div>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {t.categoryName} ({t.department === 'graphic' ? 'গ্রাফিক্স' : 'ভিডিও'})
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ fontWeight: '600', color: '#334155' }}>
                        {t.assignedToName || '—'}
                      </div>
                      <div style={{ fontSize: '8px', color: '#94a3b8' }}>
                        {t.assignedToEmail || ''}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', color: '#475569' }}>
                      {formatBengaliDate(t.workDate)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          backgroundColor: statusBadgeBg,
                          color: statusBadgeColor
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', fontSize: '9px', color: '#475569' }}>
                      {t.approvedByEmail || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PDF Footer & Signatures */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              fontSize: '10px',
              color: '#64748b'
            }}
          >
            <div>
              <p style={{ margin: '0 0 2px 0' }}>
                * এই রিপোর্টটি "কাজের হিসাব" ম্যানেজমেন্ট প্ল্যাটফর্ম থেকে প্রস্তুতকৃত।
              </p>
              <p style={{ margin: 0 }}>
                সিস্টেম আইডি: AI-STUDIO-{getTodayDateString()}
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '160px',
                  borderTop: '1px solid #475569',
                  marginBottom: '6px'
                }}
              />
              <p style={{ margin: 0, fontWeight: 'bold', color: '#0f172a' }}>
                অ্যাডমিন স্বাক্ষর ও সিলমোহর
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
