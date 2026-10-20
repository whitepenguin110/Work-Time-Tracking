import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Coins,
  AlertTriangle,
  Palette,
  Video,
  Sparkles,
  Tag,
  UserCheck,
  UserX,
  Sliders,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { Task, Category, TaskStatus, Department, UserProfile, DEPARTMENTS, TaskUrgency } from '../types';
import {
  formatBengaliCurrency,
  getTodayDateString,
  toBengaliNumber
} from '../utils/bengali';
import { useAuth } from '../context/AuthContext';
import { getBengaliErrorMessage } from '../services/firebase';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  taskToEdit?: Task | null;
  categories: Category[];
  users: UserProfile[];
  isAdmin: boolean;
  defaultDepartment?: Department;
}

// ইনসেন্টিভ প্রি-সেট রেঞ্জ: ২০ থেকে ১০০ পর্যন্ত
const INCENTIVE_PRESETS = [
  20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  categories,
  users,
  defaultDepartment = 'graphic',
}) => {
  const { user: currentAuthUser, profile: currentAuthProfile } = useAuth();

  const [department, setDepartment] = useState<Department>(defaultDepartment);
  
  // অ্যাসাইনমেন্ট অপশন: কাউকে এখনই অ্যাসাইন না করে তালিকাভুক্ত রাখার সুবিধা
  const [isUnassigned, setIsUnassigned] = useState(false);
  const [assignedToUid, setAssignedToUid] = useState<string>('');

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [urgency, setUrgency] = useState<TaskUrgency>('medium');
  
  // ক্যাটাগরি হাতে লেখার ইনপুট
  const [categoryName, setCategoryName] = useState('');
  
  // ইনসেন্টিভ মেথড: 'preset' | 'chart' | 'custom'
  const [incentiveMode, setIncentiveMode] = useState<'preset' | 'chart' | 'custom'>('preset');
  const [incentiveSelect, setIncentiveSelect] = useState<string>('50');
  const [customIncentive, setCustomIncentive] = useState<string>('50');
  const [selectedChartId, setSelectedChartId] = useState<string>('');

  const [workDate, setWorkDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [submitDate, setSubmitDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // বিভাগ অনুযায়ী সক্রিয় সদস্য তালিকা
  const departmentMembers = useMemo(() => {
    return users.filter((u) => u.department === department && u.active);
  }, [users, department]);

  // বর্তমান বিভাগের চার্ট রেট তালিকা
  const departmentChartRates = useMemo(() => {
    return categories.filter((c) => c.department === department && (c.incentive !== undefined));
  }, [categories, department]);

  // কুইক ক্যাটাগরি সাজেশন (ডিফল্ট ও পূর্বে ব্যবহৃত)
  const defaultDepartmentSuggestions: Record<Department, string[]> = {
    graphic: [
      'ইউটিউব থাম্বনেইল',
      'সোশ্যাল মিডিয়া ব্যানার',
      'পোস্টার ও ফ্লায়ার',
      'লোগো ও আইকন',
      'ফেসবুক কভার'
    ],
    video: [
      'রিলস / শর্টস এডিটিং',
      'পূর্ণাঙ্গ ভিডিও এডিটিং',
      'কালার গ্রেডিং ও অডিও',
      'ইউটিউব ভিডিও এডিটিং',
      'সাবটাইটেল ও মোশন'
    ]
  };

  const existingCategoryNames = useMemo(() => {
    return Array.from(
      new Set([
        ...defaultDepartmentSuggestions[department],
        ...categories.filter((c) => c.department === department).map((c) => c.name)
      ])
    );
  }, [department, categories]);

  // ইনিশিয়ালাইজেশন
  useEffect(() => {
    if (taskToEdit) {
      const taskDept = taskToEdit.department || defaultDepartment;
      setDepartment(taskDept);
      
      const hasAssignee = Boolean(taskToEdit.assignedToUid && taskToEdit.assignedToUid.trim() !== '');
      setIsUnassigned(!hasAssignee);
      setAssignedToUid(taskToEdit.assignedToUid || '');

      setName(taskToEdit.name || '');
      setClientName(taskToEdit.clientName || '');
      setUrgency(taskToEdit.urgency || 'medium');
      setCategoryName(taskToEdit.categoryName || '');
      setWorkDate(taskToEdit.workDate || getTodayDateString());
      setDueDate(taskToEdit.dueDate || getTodayDateString());
      setStatus(taskToEdit.status || 'pending');
      setSubmitDate(taskToEdit.submitDate || '');
      setNote(taskToEdit.note || '');

      const incVal = taskToEdit.incentiveAmount || 0;
      
      // চার্ট রেটের সাথে মিলে কি না দেখি
      const matchedChart = categories.find(
        (c) => c.department === taskDept && c.incentive === incVal && (c.name === taskToEdit.categoryName || c.id === taskToEdit.categoryId)
      );

      if (matchedChart) {
        setIncentiveMode('chart');
        setSelectedChartId(matchedChart.id);
        setCustomIncentive(String(incVal));
        setIncentiveSelect(String(incVal));
      } else if (INCENTIVE_PRESETS.includes(incVal)) {
        setIncentiveMode('preset');
        setIncentiveSelect(String(incVal));
        setCustomIncentive(String(incVal));
      } else {
        setIncentiveMode('custom');
        setIncentiveSelect('others');
        setCustomIncentive(String(incVal || '50'));
      }
    } else {
      setDepartment(defaultDepartment);
      setName('');
      setClientName('');
      setUrgency('medium');
      setCategoryName('');
      const today = getTodayDateString();
      setWorkDate(today);
      setDueDate(today);
      setStatus('pending');
      setSubmitDate('');
      setNote('');

      // ডিফল্ট ইনসেন্টিভ ৫০
      setIncentiveMode('preset');
      setIncentiveSelect('50');
      setCustomIncentive('50');
      setSelectedChartId('');

      // সক্রিয় সদস্য থাকলে তাকে ডিফল্ট করা, না থাকলে unassigned রাখা
      const firstMember = users.find((u) => u.department === defaultDepartment && u.active);
      if (firstMember) {
        setIsUnassigned(false);
        setAssignedToUid(firstMember.id);
      } else {
        setIsUnassigned(true);
        setAssignedToUid('');
      }
    }
    setErrorMsg(null);
  }, [taskToEdit, isOpen, defaultDepartment, users, categories]);

  // বিভাগ পরিবর্তন হলে
  const handleDepartmentChange = (newDept: Department) => {
    setDepartment(newDept);
    setSelectedChartId('');
    const members = users.filter((u) => u.department === newDept && u.active);
    if (members.length > 0 && !isUnassigned) {
      setAssignedToUid(members[0].id);
    } else if (members.length === 0) {
      setIsUnassigned(true);
      setAssignedToUid('');
    }
  };

  if (!isOpen) return null;

  // হিসাবকৃত বর্তমান চূড়ান্ত ইনসেন্টিভ পরিমাণ
  const currentCalculatedIncentive = (() => {
    if (incentiveMode === 'custom') {
      return Math.max(0, Number(customIncentive) || 0);
    }
    if (incentiveMode === 'chart') {
      const found = departmentChartRates.find((c) => c.id === selectedChartId);
      return found ? found.incentive : Math.max(0, Number(customIncentive) || 0);
    }
    // preset
    if (incentiveSelect === 'others') {
      return Math.max(0, Number(customIncentive) || 0);
    }
    if (incentiveSelect === 'chart') {
      const found = departmentChartRates.find((c) => c.id === selectedChartId);
      return found ? found.incentive : Math.max(0, Number(customIncentive) || 0);
    }
    return Number(incentiveSelect) || 0;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('কাজের নাম লিখুন।');
      return;
    }
    if (!isUnassigned && !assignedToUid) {
      setErrorMsg('কাকে কাজটি অ্যাসাইন করবেন তা নির্বাচন করুন অথবা "এখনই কাউকে অ্যাসাইন করবেন না" অপশনটি বেছে নিন।');
      return;
    }
    if (!categoryName.trim()) {
      setErrorMsg('ক্যাটাগরির নাম লিখে দিন অথবা চার্ট রেট/সাজেশন থেকে বেছে নিন।');
      return;
    }

    const finalIncentiveAmount = currentCalculatedIncentive;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const assignedUser = !isUnassigned ? users.find((u) => u.id === assignedToUid) : null;
      const assigneeName = isUnassigned
        ? 'কাউকে অ্যাসাইন করা হয়নি'
        : (assignedUser?.name || taskToEdit?.assignedToName || 'কর্মী');
      const assigneeEmail = isUnassigned ? '' : (assignedUser?.email || taskToEdit?.assignedToEmail || '');
      const actualUid = isUnassigned ? '' : assignedToUid;

      // ক্যাটাগরি আইডি তৈরি
      const sanitizedCatId =
        (incentiveMode === 'chart' && selectedChartId) ||
        taskToEdit?.categoryId ||
        categoryName.trim().toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]/g, '_') ||
        `cat_${Date.now()}`;

      // ফায়ারবেসের জন্য সম্পূর্ণ নিরাপদ পে-লোড
      const taskPayload: Omit<Task, 'id' | 'createdAt'> = {
        ownerUid: actualUid,
        assignedToUid: actualUid,
        assignedToName: assigneeName,
        assignedToEmail: assigneeEmail,
        createdByUid: currentAuthUser?.uid || '',
        createdByName: currentAuthProfile?.name || currentAuthUser?.displayName || 'অ্যাডমিন',
        createdByEmail: currentAuthUser?.email || '',
        name: name.trim(),
        clientName: clientName.trim(),
        urgency: urgency || 'medium',
        categoryId: sanitizedCatId,
        categoryName: categoryName.trim(),
        department,
        workDate,
        dueDate,
        status,
        submitDate: status === 'completed' ? (submitDate || getTodayDateString()) : '',
        incentiveAmount: finalIncentiveAmount,
        approvalStatus: taskToEdit?.approvalStatus || (status === 'completed' ? 'pending_approval' : 'not_submitted'),
        note: note.trim(),
      };

      if (taskToEdit?.approvedByEmail) {
        taskPayload.approvedByEmail = taskToEdit.approvedByEmail;
      }
      if (taskToEdit?.approvedByName) {
        taskPayload.approvedByName = taskToEdit.approvedByName;
      }
      if (taskToEdit?.approvedAt) {
        taskPayload.approvedAt = taskToEdit.approvedAt;
      }
      if (taskToEdit?.rejectionReason) {
        taskPayload.rejectionReason = taskToEdit.rejectionReason;
      }

      // Optimistically close modal immediately for fast UX so user never sees 'সংযোগ হচ্ছে...' stuck
      onClose();
      onSave(taskPayload).catch((err: unknown) => {
        console.error('Error saving task:', err);
      });
    } catch (err: unknown) {
      console.error('Error saving task:', err);
      const { message } = getBengaliErrorMessage(err);
      setErrorMsg(message || 'কাজ সংরক্ষণ করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{taskToEdit ? 'কাজ সম্পাদনা করুন' : 'নতুন কাজ সংযোগ করুন'}</span>
              {isUnassigned && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  অ্যাসাইন ছাড়া
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              কাজ তৈরি করে সরাসরি কোনো কর্মীকে অ্যাসাইন করতে পারেন অথবা পরে অ্যাসাইনের জন্য রেখে দিতে পারেন
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ১) বিভাগ নির্বাচন */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ১. কাজের বিভাগ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={Boolean(taskToEdit) || currentAuthProfile?.adminDepartmentScope === 'video'}
                onClick={() => handleDepartmentChange('graphic')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  department === 'graphic'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                } ${currentAuthProfile?.adminDepartmentScope === 'video' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Palette className="w-3.5 h-3.5 text-pink-500" />
                <span>গ্রাফিক ডিজাইন</span>
              </button>

              <button
                type="button"
                disabled={Boolean(taskToEdit) || currentAuthProfile?.adminDepartmentScope === 'graphic'}
                onClick={() => handleDepartmentChange('video')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  department === 'video'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                } ${currentAuthProfile?.adminDepartmentScope === 'graphic' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Video className="w-3.5 h-3.5 text-blue-500" />
                <span>ভিডিও এডিটিং ও প্রোডাকশন</span>
              </button>
            </div>
          </div>

          {/* ২) অ্যাসাইনমেন্ট অপশন (এখনই অ্যাসাইন না করার সুবিধাসহ) */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {isUnassigned ? (
                  <UserX className="w-4 h-4 text-amber-500" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                )}
                <span>২. টিম মেম্বার অ্যাসাইনমেন্ট</span>
              </label>

              {/* আন-অ্যাসাইনড টগল চেকবক্স */}
              <label className="inline-flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-amber-400 transition">
                <input
                  type="checkbox"
                  checked={isUnassigned}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsUnassigned(checked);
                    if (checked) {
                      setAssignedToUid('');
                    } else {
                      const firstMember = users.find((u) => u.department === department && u.active);
                      setAssignedToUid(firstMember?.id || '');
                    }
                  }}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={isUnassigned ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-400'}>
                  এখনই কাউকে অ্যাসাইন না করে রাখুন
                </span>
              </label>
            </div>

            {isUnassigned ? (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>অ্যাসাইন ছাড়া যুক্ত হচ্ছে:</strong> কাজটি সরাসরি মূল কাজের তালিকায় যুক্ত হবে। অ্যাডমিন পরবর্তীতে যেকোনো সময় সুবিধাজনক কোনো সদস্যকে কাজটি অ্যাসাইন করতে পারবেন।
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={assignedToUid}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__unassigned__') {
                      setIsUnassigned(true);
                      setAssignedToUid('');
                    } else {
                      setAssignedToUid(val);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                >
                  <option value="__unassigned__">⚠️ কাউকে অ্যাসাইন করবেন না (Unassigned - পরে অ্যাসাইন করবেন)</option>
                  {departmentMembers.length === 0 ? (
                    <option value="" disabled>এই বিভাগে কোনো সক্রিয় সদস্য পাওয়া যায়নি</option>
                  ) : (
                    departmentMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        👤 {m.name} ({m.email})
                      </option>
                    ))
                  )}
                </select>
                {departmentMembers.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    টিপ: এই বিভাগে কোনো সদস্য না থাকলেও আপনি উপরে আন-অ্যাসাইনড টিক দিয়ে কাজ সংরক্ষণ করতে পারবেন।
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ৩) কাজের নাম */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ৩. কাজের নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: জুমার খুতবার হাইলাইট রিলস এডিট বা প্রধান কভার ডিজাইন"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* ৪) কাজ প্রদানকারী ব্যক্তি / ক্লায়েন্ট */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>কাজটি কোন ব্যক্তি দিচ্ছেন তার নাম / ক্লায়েন্ট</span>
              <span className="text-[10px] text-slate-400 font-normal">ঐচ্ছিক</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="যেমন: রফিক সাহেব / তানভীর ভাই / মার্কেটিং টিম..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* ৫) কাজের জরুরিত্ব (Urgency Level - ৩টি স্তর ও ৩টি কালার) */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>কাজের জরুরিত্ব (Urgency Level) <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">কাজের অগ্রাধিকার স্তর বেছে নিন</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* খুব জরুরি - লাল */}
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`py-2.5 px-3 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                  urgency === 'urgent'
                    ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400'
                    : 'bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${urgency === 'urgent' ? 'bg-white' : 'bg-red-500'} animate-pulse`} />
                  <span>খুব জরুরি</span>
                </div>
                <span className={`text-[10px] mt-1 font-medium ${urgency === 'urgent' ? 'text-red-100' : 'text-red-600 dark:text-red-400'}`}>
                  সবার আগে করণীয়
                </span>
              </button>

              {/* মাঝারি জরুরি - হলুদ/অ্যাম্বার */}
              <button
                type="button"
                onClick={() => setUrgency('medium')}
                className={`py-2.5 px-3 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                  urgency === 'medium'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${urgency === 'medium' ? 'bg-white' : 'bg-amber-500'}`} />
                  <span>মাঝারি জরুরি</span>
                </div>
                <span className={`text-[10px] mt-1 font-medium ${urgency === 'medium' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
                  স্বাভাবিক গতিতে
                </span>
              </button>

              {/* সাধারণ কাজ - সবুজ */}
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`py-2.5 px-3 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                  urgency === 'normal'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                    : 'bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${urgency === 'normal' ? 'bg-white' : 'bg-emerald-500'}`} />
                  <span>সাধারণ কাজ</span>
                </div>
                <span className={`text-[10px] mt-1 font-medium ${urgency === 'normal' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  জরুরি নয় তবে করতে হবে
                </span>
              </button>
            </div>
          </div>

          {/* ৪) ক্যাটাগরি (হাতে লিখে দিবে) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>
                ৪. ক্যাটাগরি (হাতে লিখে দিন) <span className="text-red-500">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                সরাসরি টাইপ করুন বা নিচের চার্ট/ট্যাগ থেকে নিন
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="যেমন: থাম্বনেইল, সোশ্যাল মিডিয়া পোস্ট, রিলস এডিটিং, লোগো ডিজাইন..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
              <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* দ্রুত সাজেশনের জন্য ক্লিকযোগ্য ট্যাগ */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> কুইক সাজেশন:
              </span>
              {existingCategoryNames.slice(0, 5).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCategoryName(suggestion)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* ৫) ইনসেন্টিভ অ্যামাউন্ট (চার্ট রেট, প্রিসেট ও কাস্টম অপশন) */}
          <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span>৫. ইনসেন্টিভ অ্যামাউন্ট নির্ধারণ <span className="text-red-500">*</span></span>
              </label>

              {/* ৩টি অপশন সুইচ করার বাটন: প্রিসেট | চার্ট রেট | কাস্টম */}
              <div className="flex items-center p-1 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setIncentiveMode('preset')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    incentiveMode === 'preset'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  প্রিসেট (২০-১০০)
                </button>

                <button
                  type="button"
                  onClick={() => setIncentiveMode('chart')}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    incentiveMode === 'chart'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  চার্ট রেট
                </button>

                <button
                  type="button"
                  onClick={() => setIncentiveMode('custom')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    incentiveMode === 'custom'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  ইচ্ছেমতো (Custom)
                </button>
              </div>
            </div>

            {/* অপশন ১: চার্ট রেট থেকে নির্বাচন */}
            {incentiveMode === 'chart' && (
              <div className="space-y-2 animate-fadeIn bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {DEPARTMENTS[department].label} বিভাগের সংরক্ষিত রেট চার্ট থেকে বেছে নিন:
                </label>
                <select
                  value={selectedChartId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedChartId(id);
                    const item = departmentChartRates.find((c) => c.id === id);
                    if (item) {
                      setCustomIncentive(String(item.incentive));
                      setIncentiveSelect(String(item.incentive));
                      if (!categoryName.trim()) {
                        setCategoryName(item.name);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- চার্ট রেট তালিকা থেকে নির্বাচন করুন --</option>
                  {departmentChartRates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {formatBengaliCurrency(item.incentive)}
                    </option>
                  ))}
                </select>

                {selectedChartId && (
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> চার্ট থেকে রেট যুক্ত হয়েছে
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const item = departmentChartRates.find((c) => c.id === selectedChartId);
                        if (item) setCategoryName(item.name);
                      }}
                      className="text-emerald-600 dark:text-emerald-400 underline font-medium hover:text-emerald-800"
                    >
                      ক্যাটাগরি হিসেবে কাজের নাম সেট করুন
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* অপশন ২: প্রিসেট ড্রপডাউন (২০ থেকে ১০০ এবং আদার্স) */}
            {incentiveMode === 'preset' && (
              <div className="space-y-2 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      স্ট্যান্ডার্ড ড্রপডাউন নির্বাচন (২০ থেকে ১০০):
                    </label>
                    <select
                      value={incentiveSelect}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIncentiveSelect(val);
                        if (val === 'others') {
                          setIncentiveMode('custom');
                        } else if (val === 'chart') {
                          setIncentiveMode('chart');
                        } else {
                          setCustomIncentive(val);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {INCENTIVE_PRESETS.map((amount) => (
                        <option key={amount} value={String(amount)}>
                          {toBengaliNumber(amount)} টাকা ({formatBengaliCurrency(amount)})
                        </option>
                      ))}
                      <option value="chart" className="font-bold text-teal-600">
                        📊 চার্ট রেট থেকে নির্বাচন করুন
                      </option>
                      <option value="others" className="font-bold text-emerald-600">
                        ✍️ আদার্স (নিজের ইচ্ছেমতন অ্যামাউন্ট লিখুন)
                      </option>
                    </select>
                  </div>

                  {incentiveSelect === 'others' && (
                    <div>
                      <label className="block text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                        ইচ্ছেমতো টাকার পরিমাণ:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={customIncentive}
                          onChange={(e) => setCustomIncentive(e.target.value)}
                          placeholder="যেমন: ১৫০"
                          required
                          className="w-full pl-3 pr-8 py-2 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none">
                          ৳
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* অপশন ৩: সরাসরি নিজের ইচ্ছামতন অ্যামাউন্ট টাইপ করার বক্স */}
            {incentiveMode === 'custom' && (
              <div className="space-y-2 animate-fadeIn bg-white dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  নিজের ইচ্ছামতো যেকোনো ইনসেন্টিভ অ্যামাউন্ট লিখে দিন (টাকা):
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={customIncentive}
                    onChange={(e) => {
                      setCustomIncentive(e.target.value);
                      setIncentiveSelect('others');
                    }}
                    placeholder="যেমন: ১২০, ১৫০, ২৫০ ইত্যাদি"
                    required
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none">
                    ৳
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  যেকোনো বিশেষ বা অতিরিক্ত কাজের জন্য নির্ধারিত চার্টের বাইরেও আপনি ইচ্ছামতো অ্যামাউন্ট নির্ধারণ করতে পারেন।
                </p>
              </div>
            )}

            {/* বর্তমান চূড়ান্ত ইনসেন্টিভ প্রিভিউ */}
            <div className="flex items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  চূড়ান্ত ইনসেন্টিভ রেট:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-200 text-sm font-black">
                    {formatBengaliCurrency(currentCalculatedIncentive)}
                  </strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                (অ্যাডমিন অ্যাপ্রুভ করলে প্রদেয়)
              </span>
            </div>
          </div>

          {/* ৬ ও ৭) কাজের তারিখ ও ডেডলাইন */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ৬. কাজের শুরুর তারিখ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ৭. শেষ সময় (ডেডলাইন) <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          {/* ৮) নির্দেশনা, র' ফাইল লিংক বা নোট */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ৮. নির্দেশনা, র' ফাইল লিংক বা নোট (ঐচ্ছিক)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="গুগল ড্রাইভ লিংক, রুটিন নির্দেশনা বা কাজের বিবরণী..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'সংরক্ষণ হচ্ছে...'
              ) : taskToEdit ? (
                'আপডেট সেভ করুন'
              ) : isUnassigned ? (
                'কাজের তালিকায় যুক্ত করুন (অ্যাসাইন ছাড়া)'
              ) : (
                'কাজ সংযোগ ও অ্যাসাইন করুন'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
