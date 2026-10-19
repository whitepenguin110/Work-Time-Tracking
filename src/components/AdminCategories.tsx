import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Coins,
  Palette,
  Video,
  AlertCircle,
  RotateCcw,
  Search,
  Check
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { Category, Department, DEPARTMENTS } from '../types';
import { INITIAL_CATEGORIES } from '../config/seedCategories';
import { toBengaliNumber, formatBengaliCurrency } from '../utils/bengali';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<Department>('graphic');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add category form
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIncentive, setNewCatIncentive] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit category inline / modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editIncentive, setEditIncentive] = useState<number | ''>('');

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const list: Category[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Category);
        });
        // Sort by name or creation
        list.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
        setCategories(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Filter by department and search
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.department !== activeTab) return false;
      if (searchQuery.trim()) {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return true;
    });
  }, [categories, activeTab, searchQuery]);

  // Handle Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setErrorMsg('ক্যাটাগরির নাম লিখুন।');
      return;
    }
    const incentiveNum = Number(newCatIncentive) || 0;
    if (incentiveNum < 0) {
      setErrorMsg('ইনসেনটিভের পরিমাণ ঋণাত্মক হতে পারে না।');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCatName.trim(),
        department: activeTab,
        incentive: incentiveNum,
        active: true,
        createdAt: new Date().toISOString(),
      });
      setNewCatName('');
      setNewCatIncentive('');
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'categories');
    } finally {
      setIsSaving(false);
    }
  };

  // Start Editing
  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditIncentive(cat.incentive);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    if (!editName.trim()) {
      alert('ক্যাটাগরির নাম খালি রাখা যাবে না।');
      return;
    }
    const inc = Number(editIncentive) || 0;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'categories', editingCategory.id);
      await updateDoc(docRef, {
        name: editName.trim(),
        incentive: inc,
      });
      setEditingCategory(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${editingCategory.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Soft Delete / Toggle Active
  const handleToggleActive = async (cat: Category) => {
    const newStatus = !cat.active;
    const confirmText = newStatus
      ? `আপনি কি "${cat.name}" ক্যাটাগরি পুনরায় সক্রিয় করতে চান?`
      : `আপনি কি "${cat.name}" ক্যাটাগরি নিষ্ক্রিয় করতে চান? (এটি ডাটাবেস থেকে মুছবে না, পুরনো কাজের তথ্যে অক্ষুণ্ণ থাকবে)`;

    if (window.confirm(confirmText)) {
      try {
        const docRef = doc(db, 'categories', cat.id);
        await updateDoc(docRef, {
          active: newStatus,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `categories/${cat.id}`);
      }
    }
  };

  // Seed default 40 categories if missing
  const handleSeedDefaults = async () => {
    if (!window.confirm('আপনি কি শুরুর সকল ৪০টি ক্যাটাগরি ডাটাবেসে সিড করতে চান?')) return;
    setIsSeeding(true);
    setSeedSuccessMsg(null);
    try {
      const batch = writeBatch(db);
      const catCol = collection(db, 'categories');

      // Check existing category names to avoid duplicates
      const existingNames = new Set(categories.map((c) => `${c.department}_${c.name.trim()}`));

      let addedCount = 0;
      for (const item of INITIAL_CATEGORIES) {
        const key = `${item.department}_${item.name.trim()}`;
        if (!existingNames.has(key)) {
          const newRef = doc(catCol);
          batch.set(newRef, {
            name: item.name,
            department: item.department,
            incentive: item.incentive,
            active: true,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        await batch.commit();
        setSeedSuccessMsg(`সফলভাবে ${toBengaliNumber(addedCount)}টি নতুন ক্যাটাগরি যুক্ত হয়েছে!`);
      } else {
        setSeedSuccessMsg('সকল ক্যাটাগরি ইতিমধ্যেই ডাটাবেসে উপস্থিত রয়েছে।');
      }
    } catch (err) {
      console.error(err);
      alert('সিড প্রক্রিয়া সম্পন্ন করা যায়নি।');
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            ক্যাটাগরি ও ইনসেনটিভ রেট ম্যানেজমেন্ট
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            বিভাগ অনুযায়ী কাজের ক্যাটাগরি তৈরি, নাম ও ইনসেনটিভ রেট পরিবর্তন করুন
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seed Button */}
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition disabled:opacity-50"
            title="শুরুর ৪০টি ক্যাটাগরি সিড করুন"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'লোড হচ্ছে...' : 'শুরুর ক্যাটাগরি সিড করুন'}
          </button>

          {/* Add Category Button */}
          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            নতুন ক্যাটাগরি যোগ করুন
          </button>
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedSuccessMsg}</span>
        </div>
      )}

      {/* Add Category Form Container */}
      {isAdding && (
        <form
          onSubmit={handleAddCategory}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-lg space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              {DEPARTMENTS[activeTab].label} বিভাগে নতুন ক্যাটাগরি যোগ
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              বন্ধ করুন
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ক্যাটাগরির নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="যেমন: ৩ ফোল্ড লিফলেট ডিজাইন"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ইনসেনটিভের পরিমাণ (টাকা ৳)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={newCatIncentive}
                onChange={(e) => setNewCatIncentive(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="যেমন: ৫০০ (ডিফল্ট ০)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
            >
              {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি যুক্ত করুন'}
            </button>
          </div>
        </form>
      )}

      {/* Department Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {/* Graphic Design Tab */}
          <button
            onClick={() => setActiveTab('graphic')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'graphic'
                ? 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 ring-2 ring-pink-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-pink-500" />
            <span>গ্রাফিক ডিজাইন</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-pink-200/60 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200">
              {toBengaliNumber(categories.filter((c) => c.department === 'graphic').length)}
            </span>
          </button>

          {/* Video Editing Tab */}
          <button
            onClick={() => setActiveTab('video')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'video'
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4 text-blue-500" />
            <span>ভিডিও এডিটিং ও প্রোডাকশন</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-200/60 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {toBengaliNumber(categories.filter((c) => c.department === 'video').length)}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ক্যাটাগরি অনুসন্ধান..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Info Callout about Category Pricing and Deactivation */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
        <Coins className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p>
          <strong>নোট:</strong> ক্যাটাগরির ইনসেনটিভ রেট পরিবর্তন করলে শুধুমাত্র ভবিষ্যতের সম্পন্ন কাজের ক্ষেত্রে নতুন রেট প্রযোজ্য হবে।
          অতীতে সম্পন্ন করা কাজের লক করা ইনসেনটিভ অক্ষুণ্ণ থাকবে। ক্যাটাগরি "রিমুভ" করলে তা ডাটাবেস থেকে না মুছে <em>নিষ্ক্রিয়</em> হবে, যাতে পুরনো কাজের হিসাব নির্ভুল থাকে।
        </p>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">ক্যাটাগরি লোড হচ্ছে...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Layers className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            এই বিভাগে কোনো ক্যাটাগরি পাওয়া যায়নি
          </p>
          <button
            onClick={handleSeedDefaults}
            className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            শুরুর ৪০টি ক্যাটাগরি লোড করুন
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5">ক্যাটাগরির নাম</th>
                  <th className="px-4 py-3.5 text-center">বর্তমান ইনসেনটিভ</th>
                  <th className="px-4 py-3.5 text-center">স্থিতি</th>
                  <th className="px-4 py-3.5 text-right">ব্যবস্থাপনা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCategories.map((cat) => {
                  const isEditingThis = editingCategory?.id === cat.id;

                  return (
                    <tr
                      key={cat.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                        !cat.active ? 'opacity-60 bg-slate-50/40 dark:bg-slate-950/20' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        {isEditingThis ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white text-sm">
                              {cat.name}
                            </span>
                            {!cat.active && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 font-medium">
                                নিষ্ক্রিয়
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Incentive */}
                      <td className="px-4 py-3.5 text-center">
                        {isEditingThis ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>৳</span>
                            <input
                              type="number"
                              min="0"
                              value={editIncentive}
                              onChange={(e) =>
                                setEditIncentive(
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              className="w-24 px-2 py-1 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-center"
                            />
                          </div>
                        ) : (
                          <span
                            className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                              cat.incentive > 0
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {formatBengaliCurrency(cat.incentive)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            cat.active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {cat.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              সক্রিয়
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" />
                              নিষ্ক্রিয়
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isEditingThis ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700"
                            >
                              সংরক্ষণ
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
                            >
                              বাতিল
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(cat)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="নাম বা ইনসেনটিভ সম্পাদনা করুন"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(cat)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                cat.active
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={
                                cat.active
                                  ? 'নিষ্ক্রিয় করুন (ইউজারের ড্রপডাউন থেকে লুকানো হবে)'
                                  : 'পুনরায় সক্রিয় করুন'
                              }
                            >
                              {cat.active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
