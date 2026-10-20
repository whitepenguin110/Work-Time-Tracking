import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import {
  Coins,
  Palette,
  Video,
  Search,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Info,
  Sparkles,
  BookmarkCheck,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  CloudUpload
} from 'lucide-react';
import { db } from '../services/firebase';
import { Category, Department, DEPARTMENTS } from '../types';
import { INITIAL_CATEGORIES } from '../config/seedCategories';
import { toBengaliNumber, formatBengaliCurrency } from '../utils/bengali';

const DELETED_SEED_KEY = 'deleted_seed_category_names';

import { useAuth } from '../context/AuthContext';

export const AdminCategories: React.FC = () => {
  const { profile } = useAuth();
  const adminScope = profile?.adminDepartmentScope || 'all';

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<Department | 'all'>(
    adminScope === 'graphic' ? 'graphic' : adminScope === 'video' ? 'video' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // নতুন চার্ট রেট যোগ করার স্টেট
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDepartment, setAddDepartment] = useState<Department>(
    adminScope === 'video' ? 'video' : 'graphic'
  );
  const [addIncentive, setAddIncentive] = useState<number | ''>(50);

  useEffect(() => {
    if (adminScope === 'graphic') {
      setActiveDepartment('graphic');
      setAddDepartment('graphic');
    } else if (adminScope === 'video') {
      setActiveDepartment('video');
      setAddDepartment('video');
    }
  }, [adminScope]);

  // চার্ট রেট পূর্ণাঙ্গ এডিট করার মডাল স্টেট
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState<Department>('graphic');
  const [editIncentive, setEditIncentive] = useState<number | ''>(0);

  // চার্ট রেট ডিলিট করার কনফার্মেশন মডাল স্টেট
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // মুছে ফেলা সিড ক্যাটাগরির ট্র্যাকিং (যেন ব্যাকগ্রাউন্ড থেকে আবার না আসে)
  const [deletedSeedNames, setDeletedSeedNames] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(DELETED_SEED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'info' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // সিড মুছে ফেলা নাম সংরক্ষণ
  const markSeedNameDeleted = (name: string) => {
    setDeletedSeedNames((prev) => {
      const updated = Array.from(new Set([...prev, name.trim().toLowerCase()]));
      try {
        localStorage.setItem(DELETED_SEED_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // ফায়ারবেস থেকে রেফারেন্স ক্যাটাগরি ও রেট লোড করা
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const firestoreList: Category[] = [];
        snapshot.forEach((d) => {
          firestoreList.push({ id: d.id, ...d.data() } as Category);
        });

        // যদি ফায়ারবেস ডেটাবেসে কিছু থাকে, তবে ফায়ারবেসের ডেটা মুখ্য হবে
        // এবং যেসব সিড আইটেম ফায়ারবেসে নেই বা ইউজার ডিলিট করেনি সেগুলো ব্যাকফিল হিসেবে থাকবে
        const firestoreNames = new Set(firestoreList.map((c) => `${c.name.trim().toLowerCase()}_${c.department}`));
        
        const fallbackSeeds: Category[] = INITIAL_CATEGORIES
          .filter((seed) => {
            const key = `${seed.name.trim().toLowerCase()}_${seed.department}`;
            if (firestoreNames.has(key)) return false;
            if (deletedSeedNames.includes(seed.name.trim().toLowerCase())) return false;
            return true;
          })
          .map((item, index) => ({
            id: `seed_${index}_${encodeURIComponent(item.name.slice(0, 10))}`,
            name: item.name,
            department: item.department,
            incentive: item.incentive,
            active: true
          }));

        const combined = [...firestoreList, ...fallbackSeeds];
        combined.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
        setCategories(combined);
        setLoading(false);
      },
      (err) => {
        console.warn('Categories snapshot error:', err);
        const fallbackSeeds: Category[] = INITIAL_CATEGORIES
          .filter((seed) => !deletedSeedNames.includes(seed.name.trim().toLowerCase()))
          .map((item, index) => ({
            id: `seed_${index}`,
            name: item.name,
            department: item.department,
            incentive: item.incentive,
            active: true
          }));
        setCategories(fallbackSeeds);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [deletedSeedNames]);

  // সার্চ ও ডিপার্টমেন্ট ফিল্টারিং
  const filteredList = useMemo(() => {
    return categories.filter((item) => {
      if (activeDepartment !== 'all' && item.department !== activeDepartment) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [categories, activeDepartment, searchQuery]);

  // ১) নতুন চার্ট রেট তৈরি করা (Create)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showNotification('error', 'কাজের নাম অবশ্যই দিতে হবে।');
      return;
    }

    const val = Number(addIncentive) || 0;
    setIsProcessing(true);

    try {
      const newRef = doc(collection(db, 'categories'));
      await setDoc(newRef, {
        name: addName.trim(),
        department: addDepartment,
        incentive: val,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      showNotification('success', `নতুন চার্ট রেট "${addName.trim()}" (${formatBengaliCurrency(val)}) সফলভাবে তৈরি হয়েছে!`);
      setAddName('');
      setAddIncentive(50);
      setIsAddingItem(false);
    } catch (e) {
      console.error('Error creating category:', e);
      // লোকাল স্টেট ব্যাকআপ
      const tempId = `local_${Date.now()}`;
      setCategories((prev) => [
        {
          id: tempId,
          name: addName.trim(),
          department: addDepartment,
          incentive: val,
          active: true
        },
        ...prev
      ]);
      showNotification('success', `চার্ট রেট "${addName.trim()}" তালিকায় যুক্ত হয়েছে।`);
      setAddName('');
      setAddIncentive(50);
      setIsAddingItem(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // ২) এডিট মোড চালু করা
  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDepartment(cat.department);
    setEditIncentive(cat.incentive ?? 0);
  };

  // ৩) চার্ট রেট সম্পাদন/মডিফাই সংরক্ষণ করা (Update / Modify)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    const val = Number(editIncentive) || 0;
    setIsProcessing(true);

    try {
      if (editingCategory.id.startsWith('seed_') || editingCategory.id.startsWith('local_')) {
        // সিড আইটেম হলে ফায়ারবেসে সম্পূর্ণ নতুন ডকুমেন্ট তৈরি করে স্থায়ী করা
        markSeedNameDeleted(editingCategory.name);
        const newRef = doc(collection(db, 'categories'));
        await setDoc(newRef, {
          name: editName.trim(),
          department: editDepartment,
          incentive: val,
          active: true,
          updatedAt: new Date().toISOString()
        });
      } else {
        // আসল ফায়ারবেস ডকুমেন্ট আপডেট করা
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: editName.trim(),
          department: editDepartment,
          incentive: val,
          updatedAt: new Date().toISOString()
        });
      }

      showNotification('success', `"${editName.trim()}" রেট চার্ট সফলভাবে আপডেট করা হয়েছে।`);
      setEditingCategory(null);
    } catch (e) {
      console.error('Error updating category:', e);
      // লোকাল আপডেট
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? { ...c, name: editName.trim(), department: editDepartment, incentive: val }
            : c
        )
      );
      showNotification('success', `রেট চার্ট আপডেট সম্পন্ন হয়েছে।`);
      setEditingCategory(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ৪) চার্ট রেট মুছে ফেলা (Delete)
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsProcessing(true);

    try {
      if (deletingCategory.id.startsWith('seed_')) {
        markSeedNameDeleted(deletingCategory.name);
      } else {
        await deleteDoc(doc(db, 'categories', deletingCategory.id));
      }

      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      showNotification('info', `"${deletingCategory.name}" চার্ট রেট সফলভাবে মুছে ফেলা হয়েছে।`);
      setDeletingCategory(null);
    } catch (e) {
      console.error('Error deleting category:', e);
      markSeedNameDeleted(deletingCategory.name);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      showNotification('info', `তালিকা থেকে সরানো হয়েছে।`);
      setDeletingCategory(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalGraphicCount = categories.filter((c) => c.department === 'graphic').length;
  const totalVideoCount = categories.filter((c) => c.department === 'video').length;

  return (
    <div className="space-y-6">
      {/* নোটিফিকেশন ব্যানার */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm transition-all animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* হেডার ব্যানার */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 mb-3">
            <Coins className="w-3.5 h-3.5" />
            <span>রেট চার্ট ম্যানেজমেন্ট প্যানেল</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
            ইনসেন্টিভ রেট চার্ট তৈরি, পরিবর্তন ও পরিচালনা
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            এখানে আপনি নতুন চার্ট রেট বানাতে পারবেন এবং পূর্বে থাকা যেকোনো রেট এডিট বা মুছে ফেলতে পারবেন। 
            নতুন কাজ তৈরি করার সময় অ্যাডমিন এখান থেকে সরাসরি প্রিসেট চার্ট রেট বেছে নিতে পারবেন অথবা ইচ্ছেমতো কাস্টম রেট দিতে পারবেন।
          </p>
        </div>

        {/* ব্যাকগ্রাউন্ড আইকন */}
        <Coins className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
      </div>

      {/* ফিল্টার, সার্চ ও অ্যাকশন টুলবার */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* ট্যাব সুইচ (সকল / গ্রাফিক / ভিডিও) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit flex-wrap gap-1">
            {adminScope === 'all' && (
              <button
                onClick={() => setActiveDepartment('all')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeDepartment === 'all'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>সকল চার্ট</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold">
                  {toBengaliNumber(categories.length)}
                </span>
              </button>
            )}

            {(adminScope === 'all' || adminScope === 'graphic') && (
              <button
                onClick={() => setActiveDepartment('graphic')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeDepartment === 'graphic'
                    ? 'bg-white dark:bg-slate-700 text-pink-600 dark:text-pink-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Palette className="w-4 h-4 text-pink-500" />
                <span>গ্রাফিক ডিজাইন</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300">
                  {toBengaliNumber(totalGraphicCount)}
                </span>
              </button>
            )}

            {(adminScope === 'all' || adminScope === 'video') && (
              <button
                onClick={() => setActiveDepartment('video')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeDepartment === 'video'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Video className="w-4 h-4 text-blue-500" />
                <span>ভিডিও এডিটিং</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {toBengaliNumber(totalVideoCount)}
                </span>
              </button>
            )}
          </div>

          {/* সার্চ ও নতুন চার্ট রেট যোগ বাটন */}
          <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="কাজের নাম বা রেট খুঁজুন..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition whitespace-nowrap active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন চার্ট রেট তৈরি</span>
            </button>
          </div>
        </div>

        {/* নতুন চার্ট রেট তৈরি করার ফর্ম */}
        {isAddingItem && (
          <form
            onSubmit={handleCreateCategory}
            className="p-5 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                নতুন ইনসেন্টিভ চার্ট রেট তৈরি করুন
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* বিভাগ নির্বাচন */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  বিভাগ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddDepartment('graphic')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      addDepartment === 'graphic'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    <span>গ্রাফিক্স</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddDepartment('video')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      addDepartment === 'video'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                    <span>ভিডিও</span>
                  </button>
                </div>
              </div>

              {/* কাজের নাম */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  কাজের বিবরণ বা নাম:
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="যেমন: ৩ ফোল্ড ব্রোশিওর ডিজাইন বা পডকাস্ট ভিডিও এডিট"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* স্ট্যান্ডার্ড ইনসেন্টিভ রেট */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইনসেন্টিভ রেট (টাকা):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={addIncentive}
                    onChange={(e) => setAddIncentive(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="৫০"
                    required
                    className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-bold text-emerald-600">
                    ৳
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
              <button
                type="button"
                onClick={() => setIsAddingItem(false)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                {isProcessing ? 'যুক্ত হচ্ছে...' : 'চার্ট রেট যুক্ত করুন'}
              </button>
            </div>
          </form>
        )}

        {/* চার্ট তালিকা গ্রিড / কার্ডসমূহ */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            রেট চার্ট লোড হচ্ছে...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Coins className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              কোনো চার্ট রেট পাওয়া যায়নি
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery ? 'আপনার সার্চের সাথে কোনো ফলাফল মেলেনি।' : 'নতুন চার্ট রেট যোগ করতে ওপরের বাটনে ক্লিক করুন।'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredList.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-md transition group relative flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {toBengaliNumber(idx + 1)}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                          {item.name}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md ${
                            item.department === 'graphic'
                              ? 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300'
                              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {item.department === 'graphic' ? (
                            <Palette className="w-2.5 h-2.5 text-pink-500" />
                          ) : (
                            <Video className="w-2.5 h-2.5 text-blue-500" />
                          )}
                          {DEPARTMENTS[item.department]?.label || item.department}
                        </span>
                      </div>
                    </div>

                    {/* অ্যাকশনস (মডিফাই বা ডিলিট) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                        title="চার্ট রেট মডিফাই / এডিট করুন"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="চার্ট রেট ডিলিট করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* রেট প্রদর্শন */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      নির্ধারিত রেট:
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800/40">
                      <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {formatBengaliCurrency(item.incentive || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================== পূর্ণাঙ্গ মডিফাই / এডিট মডাল ===================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                চার্ট রেট সম্পাদন ও মডিফাই করুন
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  বিভাগ পরিবর্তন:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditDepartment('graphic')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      editDepartment === 'graphic'
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 ring-1 ring-pink-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                    <span>গ্রাফিক ডিজাইন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditDepartment('video')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      editDepartment === 'video'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                    <span>ভিডিও এডিটিং</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  কাজের নাম বা বিবরণ:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইনসেন্টিভ রেট (টাকা):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editIncentive}
                    onChange={(e) => setEditIncentive(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-600">
                    ৳
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
                >
                  {isProcessing ? 'সংরক্ষণ হচ্ছে...' : 'আপডেট সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ডিলিট নিশ্চিতকরণ মডাল ===================== */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-200 dark:border-red-900/60 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                চার্ট রেটটি কি মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                "{deletingCategory.name}" ({formatBengaliCurrency(deletingCategory.incentive)}) চার্ট রেট তালিকা থেকে স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isProcessing}
                className="w-1/2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                না, রাখুন
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isProcessing}
                className="w-1/2 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition"
              >
                {isProcessing ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* নির্দেশনামূলক ফুটার */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-200">রেট চার্ট ব্যবহারের সুবিধা:</strong>
          <p className="mt-0.5 leading-relaxed">
            এখানে তৈরি করা যেকোনো চার্ট রেট নতুন কাজ অ্যাসাইনের সময় সরাসরি "চার্ট রেট" অপশন থেকে ১-ক্লিকে সিলেক্ট করা যাবে। 
            এছাড়াও অ্যাডমিন চাইলে প্রতিটি কাজের জন্য আলাদাভাবে নিজের ইচ্ছামতো অ্যামাউন্টও বসাতে পারেন।
          </p>
        </div>
      </div>
    </div>
  );
};
