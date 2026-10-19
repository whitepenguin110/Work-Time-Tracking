import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  Users,
  Shield,
  ShieldCheck,
  Palette,
  Video,
  UserCheck,
  UserX,
  AlertTriangle,
  Mail,
  Check,
  Trash2,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Calendar,
  Briefcase
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, Department, DEPARTMENTS } from '../types';
import { isFixedAdminEmail } from '../config/admins';
import { toBengaliNumber, formatBengaliDate } from '../utils/bengali';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<'all' | Department>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Removal Modal State
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [memberTasksCount, setMemberTasksCount] = useState<number | null>(null);
  const [loadingTasksCount, setLoadingTasksCount] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Real-time Firestore subscription to users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as UserProfile);
        });
        setUsers(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Change user department
  const handleChangeDepartment = async (user: UserProfile, newDept: Department) => {
    if (user.department === newDept) return;
    setUpdatingId(user.id);
    const newDeptName = DEPARTMENTS[newDept]?.label || newDept;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { department: newDept });
      showFeedback(
        'success',
        `"${user.name}"-এর বিভাগ সফলভাবে পরিবর্তন করে "${newDeptName}" নির্ধারণ করা হয়েছে।`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      showFeedback('error', 'বিভাগ পরিবর্তন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (user: UserProfile) => {
    const newActive = !user.active;
    const isTargetFixedAdmin = isFixedAdminEmail(user.email);

    if (isTargetFixedAdmin && !newActive) {
      showFeedback('error', 'নির্ধারিত ৩ জন মূল অ্যাডমিনের অ্যাকাউন্ট নিষ্ক্রিয় করা যাবে না।');
      return;
    }

    setUpdatingId(user.id);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { active: newActive });
      showFeedback(
        'success',
        `"${user.name}"-এর অ্যাকাউন্ট ${newActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      showFeedback('error', 'অ্যাকাউন্টের স্থিতি পরিবর্তন করা যায়নি।');
    } finally {
      setUpdatingId(null);
    }
  };

  // Open removal confirmation modal
  const handleInitiateRemove = async (user: UserProfile) => {
    if (isFixedAdminEmail(user.email)) {
      showFeedback('error', 'নির্ধারিত ৩ জন মূল অ্যাডমিনের অ্যাকাউন্ট টিম থেকে রিমুভ করা সম্ভব নয়।');
      return;
    }

    setMemberToRemove(user);
    setLoadingTasksCount(true);
    setMemberTasksCount(null);

    try {
      const q = query(collection(db, 'tasks'), where('assignedToUid', '==', user.id));
      const snap = await getDocs(q);
      setMemberTasksCount(snap.size);
    } catch {
      setMemberTasksCount(0);
    } finally {
      setLoadingTasksCount(false);
    }
  };

  // Confirm member removal from Firestore
  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    if (isFixedAdminEmail(memberToRemove.email)) {
      showFeedback('error', 'নির্ধারিত ৩ জন মূল অ্যাডমিনের অ্যাকাউন্ট টিম থেকে রিমুভ করা সম্ভব নয়।');
      setMemberToRemove(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'users', memberToRemove.id));
      showFeedback(
        'success',
        `"${memberToRemove.name}"-কে সফলভাবে টিম থেকে স্থায়ীভাবে রিমুভ করা হয়েছে।`
      );
      setMemberToRemove(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${memberToRemove.id}`);
      showFeedback('error', 'সদস্যকে রিমুভ করার সময় সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary counts
  const summary = useMemo(() => {
    let graphicCount = 0;
    let videoCount = 0;
    let adminCount = 0;
    let activeCount = 0;

    users.forEach((u) => {
      if (isFixedAdminEmail(u.email)) {
        adminCount++;
      }
      if (u.department === 'graphic') {
        graphicCount++;
      } else if (u.department === 'video') {
        videoCount++;
      }
      if (u.active) {
        activeCount++;
      }
    });

    return {
      total: users.length,
      graphicCount,
      videoCount,
      adminCount,
      activeCount
    };
  }, [users]);

  // Filtered members list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Dept filter
      if (filterDept !== 'all' && u.department !== filterDept) {
        return false;
      }
      // Status filter
      if (filterStatus === 'active' && !u.active) return false;
      if (filterStatus === 'inactive' && u.active) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      return true;
    });
  }, [users, filterDept, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header and 3 Fixed Admins Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            টিম মেম্বার ও বিভাগ পরিচালনা
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            যেকোনো সদস্যের বিভাগ (গ্রাফিক্স/ভিডিও) ইচ্ছামতো পরিবর্তন ও প্রয়োজনে টিম থেকে রিমুভ করুন
          </p>
        </div>

        {/* 3 Fixed Admins Policy badge */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">স্থায়ী ৩ জন অ্যাডমিন নীতি</p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              শুধুমাত্র ৩টি নির্ধারিত ইমেইল অ্যাডমিন হিসেবে সংরক্ষিত, এদের রিমুভ বা পরিবর্তন করা যাবে না।
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fade-in shadow-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span className="font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Department & Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">মোট টিম সদস্য</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-2">
            {toBengaliNumber(summary.total)} <span className="text-xs font-normal text-slate-500">জন</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            সক্রিয়: {toBengaliNumber(summary.activeCount)} জন
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">গ্রাফিক ডিজাইনার</span>
            <Palette className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            {toBengaliNumber(summary.graphicCount)} <span className="text-xs font-normal text-slate-500">জন</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">ডিজাইন বিভাগে নিযুক্ত</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">ভিডিও এডিটর</span>
            <Video className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {toBengaliNumber(summary.videoCount)} <span className="text-xs font-normal text-slate-500">জন</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">ভিডিও প্রোডাকশনে নিযুক্ত</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">স্থায়ী অ্যাডমিন</span>
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {toBengaliNumber(summary.adminCount)} <span className="text-xs font-normal text-slate-500">জন</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">স্থায়ী নিয়ন্ত্রণকারী</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="সদস্যের নাম বা ইমেইল দিয়ে সার্চ করুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="px-2 text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
                <Filter className="w-3 h-3" /> বিভাগ:
              </span>
              <button
                onClick={() => setFilterDept('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterDept === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                সকল
              </button>
              <button
                onClick={() => setFilterDept('graphic')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterDept === 'graphic'
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                গ্রাফিক্স
              </button>
              <button
                onClick={() => setFilterDept('video')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterDept === 'video'
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                ভিডিও
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                সকল স্থিতি
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                সক্রিয়
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filterStatus === 'inactive'
                    ? 'bg-red-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-red-600'
                }`}
              >
                নিষ্ক্রিয়
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Card Table */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">টিম সদস্য লোড হচ্ছে...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            কোনো টিম সদস্য পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            সার্চ বা ফিল্টারের সাথে মিলে এমন কোনো সদস্য তালিকাভুক্ত নেই।
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">টিম সদস্য ও ইমেইল</th>
                  <th className="px-5 py-3.5">
                    ইচ্ছামতো বিভাগ নির্বাচন
                  </th>
                  <th className="px-5 py-3.5 text-center">ভূমিকা (Role)</th>
                  <th className="px-5 py-3.5 text-center">লগইন স্থিতি</th>
                  <th className="px-5 py-3.5 text-right">নিবন্ধন তারিখ</th>
                  <th className="px-5 py-3.5 text-center">টিম অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const isUpdating = updatingId === u.id;
                  const isUserFixedAdmin = isFixedAdminEmail(u.email);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                        !u.active ? 'opacity-60 bg-red-50/10' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              isUserFixedAdmin
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.department === 'graphic'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {u.name}
                              </p>
                              {isUserFixedAdmin && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                  মূল অ্যাডমিন
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department Select (ইচ্ছামতো বিভাগ নির্বাচন) */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-flex items-center">
                            <select
                              value={u.department}
                              disabled={isUpdating}
                              onChange={(e) =>
                                handleChangeDepartment(u, e.target.value as Department)
                              }
                              className={`px-3 py-1.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer ${
                                u.department === 'graphic'
                                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                                  : 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                              } disabled:opacity-50`}
                              title="সদস্যের বিভাগ পরিবর্তন করুন"
                            >
                              <option value="graphic">🎨 গ্রাফিক ডিজাইন</option>
                              <option value="video">🎬 ভিডিও এডিটিং ও প্রোডাকশন</option>
                            </select>
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin ml-2" />
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge (Fixed Admin vs Member) */}
                      <td className="px-5 py-4 text-center">
                        {isUserFixedAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                            title="স্থায়ী ৩ জন মূল অ্যাডমিনের একজন"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>স্থায়ী অ্যাডমিন</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            title="টিম সদস্য"
                          >
                            <span>টিম মেম্বার</span>
                          </span>
                        )}
                      </td>

                      {/* Active / Inactive Toggle */}
                      <td className="px-5 py-4 text-center">
                        {isUserFixedAdmin ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <UserCheck className="w-3.5 h-3.5" />
                            সক্রিয় (স্থায়ী)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isUpdating}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-amber-50 hover:text-amber-700'
                                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title={u.active ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'সক্রিয় করতে ক্লিক করুন'}
                          >
                            {u.active ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                সক্রিয়
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                নিষ্ক্রিয়
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-5 py-4 text-right text-slate-400 text-xs">
                        {u.createdAt ? formatBengaliDate(u.createdAt.slice(0, 10)) : '—'}
                      </td>

                      {/* Actions: Remove Member */}
                      <td className="px-5 py-4 text-center">
                        {isUserFixedAdmin ? (
                          <span
                            className="text-[11px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
                            title="মূল অ্যাডমিন অ্যাকাউন্ট রিমুভ করা সম্ভব নয়"
                          >
                            সুরক্ষিত
                          </span>
                        ) : (
                          <button
                            onClick={() => handleInitiateRemove(u)}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900 transition shadow-xs"
                            title="টিম থেকে রিমুভ করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>রিমুভ</span>
                          </button>
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

      {/* =========================================================================
          REMOVE MEMBER CONFIRMATION MODAL
          ========================================================================= */}
      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  টিম থেকে সদস্য রিমুভ নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  সদস্যকে টিম থেকে স্থায়ীভাবে মুছে ফেলা হবে
                </p>
              </div>
            </div>

            {/* Member Details Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">সদস্যের নাম:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {memberToRemove.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">ইমেইল ঠিকানা:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {memberToRemove.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">বর্তমান বিভাগ:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {DEPARTMENTS[memberToRemove.department]?.label || memberToRemove.department}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">নিবন্ধন তারিখ:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {memberToRemove.createdAt ? formatBengaliDate(memberToRemove.createdAt.slice(0, 10)) : '—'}
                </span>
              </div>
            </div>

            {/* Task Warning Notice */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>সতর্কবার্তা ও কাজের হিসাব:</span>
              </div>
              {loadingTasksCount ? (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>কাজের সংখ্যা যাচাই করা হচ্ছে...</span>
                </div>
              ) : memberTasksCount !== null && memberTasksCount > 0 ? (
                <p className="text-[11px] leading-relaxed">
                  এই সদস্যের অধীনে বর্তমানে{' '}
                  <strong className="font-bold underline text-amber-900 dark:text-amber-100">
                    {toBengaliNumber(memberTasksCount)} টি কাজ
                  </strong>{' '}
                  রেকর্ড করা রয়েছে। সদস্যকে টিম থেকে রিমুভ করলেও পূর্ববর্তী কাজের হিসাব ও ইতিহাস সিস্টেমে অক্ষুণ্ণ থাকবে।
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed">
                  এই সদস্যকে রিমুভ করলে তিনি টিম প্যানেল থেকে মুছে যাবেন এবং সিস্টেমে আর কাজ অ্যাক্সেস করতে পারবেন না।
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    রিমুভ করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    হ্যাঁ, টিম থেকে রিমুভ করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
