import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, AlertTriangle, Coins, Calendar, FileText } from 'lucide-react';
import { Task, Category, TaskStatus, Department } from '../types';
import {
  formatBengaliCurrency,
  getTodayDateString,
  toBengaliNumber
} from '../utils/bengali';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  taskToEdit?: Task | null;
  categories: Category[];
  userDepartment: Department;
  ownerUid: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  categories,
  userDepartment,
  ownerUid,
}) => {
  // Filter active categories for user's department
  // If editing an existing task whose category might have been deactivated, also keep that category available
  const availableCategories = categories.filter(
    (c) => c.department === userDepartment && (c.active || c.id === taskToEdit?.categoryId)
  );

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [workDate, setWorkDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [submitDate, setSubmitDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync form when modal opens or editing task changes
  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name);
      setCategoryId(taskToEdit.categoryId);
      setWorkDate(taskToEdit.workDate);
      setDueDate(taskToEdit.dueDate);
      setStatus(taskToEdit.status);
      setSubmitDate(taskToEdit.submitDate || '');
      setNote(taskToEdit.note || '');
    } else {
      setName('');
      setCategoryId(availableCategories.length > 0 ? availableCategories[0].id : '');
      const today = getTodayDateString();
      setWorkDate(today);
      setDueDate(today);
      setStatus('pending');
      setSubmitDate('');
      setNote('');
    }
    setErrorMsg(null);
  }, [taskToEdit, isOpen, availableCategories.length]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // When status changes to "completed", auto-set submit date to today if empty
  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    if (newStatus === 'completed' && !submitDate) {
      setSubmitDate(getTodayDateString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('কাজের নাম দিন।');
      return;
    }
    if (!categoryId) {
      setErrorMsg('একটি ক্যাটাগরি বেছে নিন।');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Calculate incentiveAmount
      let finalIncentiveAmount = 0;
      if (status === 'completed') {
        if (taskToEdit && taskToEdit.status === 'completed' && taskToEdit.categoryId === categoryId) {
          // If task was already completed and category didn't change, retain existing locked amount
          finalIncentiveAmount = taskToEdit.incentiveAmount;
        } else {
          // Lock current category incentive rate
          finalIncentiveAmount = selectedCategory?.incentive || 0;
        }
      } else {
        // Not completed -> 0
        finalIncentiveAmount = 0;
      }

      const taskPayload: Omit<Task, 'id' | 'createdAt'> = {
        ownerUid,
        name: name.trim(),
        categoryId,
        categoryName: selectedCategory?.name || 'অজ্ঞাত ক্যাটাগরি',
        department: userDepartment,
        workDate,
        dueDate,
        status,
        submitDate: status === 'completed' ? (submitDate || getTodayDateString()) : '',
        incentiveAmount: finalIncentiveAmount,
        note: note.trim(),
      };

      await onSave(taskPayload);
      onClose();
    } catch (err: unknown) {
      console.error('Error saving task:', err);
      setErrorMsg('কাজ সংরক্ষণ করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {taskToEdit ? 'কাজ সম্পাদনা করুন' : 'নতুন কাজ যোগ করুন'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              নিচের ফর্মের সকল প্রয়োজনীয় তথ্য পূরণ করুন
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Order strictly requested by prompt:
            ১. কাজের নাম,
            ২. ক্যাটাগরি,
            ৩. কাজের তারিখ,
            ৪. ডেডলাইন,
            ৫. অবস্থা,
            ৬. জমা দেওয়ার তারিখ,
            ৭. নোট
        */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ১) কাজের নাম */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ১. কাজের নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: মাসিক পত্রিকার প্রধান কভার ও পেজ মেকআপ"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* ২) ক্যাটাগরি */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ২. ক্যাটাগরি (ইনসেনটিভসহ) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              >
                {availableCategories.length === 0 && (
                  <option value="">কোনো সক্রিয় ক্যাটাগরি নেই</option>
                )}
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — [ {formatBengaliCurrency(cat.incentive)} ]
                  </option>
                ))}
              </select>
            </div>

            {/* Incentive Rate pill */}
            {selectedCategory && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                <Coins className="w-3.5 h-3.5" />
                <span>
                  এই ক্যাটাগরির ইনসেনটিভ: <strong>{formatBengaliCurrency(selectedCategory.incentive)}</strong> (কাজ সম্পন্ন করলে যুক্ত হবে)
                </span>
              </div>
            )}
          </div>

          {/* ৩ ও ৪) কাজের তারিখ ও ডেডলাইন */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ৩. কাজের তারিখ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ৪. কাজের শেষ সময় (ডেডলাইন) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* ৫) অবস্থা (পেন্ডিং / চলমান / সম্পন্ন) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ৫. কাজের বর্তমান অবস্থা <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('pending')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  status === 'pending'
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                পেন্ডিং
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('in_progress')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  status === 'in_progress'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 animate-spin" />
                চলমান
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('completed')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  status === 'completed'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                সম্পন্ন
              </button>
            </div>
          </div>

          {/* ৬) জমা দেওয়ার তারিখ (সম্পন্ন করলে আজকের তারিখ নিজে বসবে) */}
          {status === 'completed' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 animate-fade-in">
              <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                ৬. জমা দেওয়ার তারিখ
              </label>
              <input
                type="date"
                value={submitDate}
                onChange={(e) => setSubmitDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                সম্পন্ন করার সাথে সাথে আজকের তারিখ নিজে বসেছে (প্রয়োজনে পরিবর্তন করতে পারেন)।
              </p>
            </div>
          )}

          {/* ৭) নোট */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ৭. নোট (ড্রাইভ লিংক বা মন্তব্য - ঐচ্ছিক)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ফাইল লিংক, ড্রাইভ লিংক বা কাজের কোনো বিশেষ নোট..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              বাতিল
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : taskToEdit ? 'আপডেট সংরক্ষণ করুন' : 'কাজ যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
