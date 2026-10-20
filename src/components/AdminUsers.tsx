import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  Users,
  Shield,
  Palette,
  Video,
  Search,
  Check,
  Edit3,
  Loader2,
  AlertCircle,
  Briefcase,
  Sparkles,
  UserCheck,
  X,
  Save
} from 'lucide-react';
import { db } from '../services/firebase';
import { UserProfile, Department, DEPARTMENTS } from '../types';
import { TEAM_MEMBERS_LIST, ADMIN_ACCOUNTS } from '../config/accounts';
import { useAuth } from '../context/AuthContext';
import {
  updateMemberRealName,
  formatMemberDisplayName,
  getCachedRealNames,
  syncAllTeamMembers
} from '../services/teamService';
import { toBengaliNumber } from '../utils/bengali';

export const AdminUsers: React.FC = () => {
  const { user, profile } = useAuth();
  const adminScope = profile?.adminDepartmentScope || 'all';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'all' | Department>(
    adminScope === 'graphic' ? 'graphic' : adminScope === 'video' ? 'video' : 'all'
  );

  // Real Name Editing State
  const [editingMember, setEditingMember] = useState<{ username: string; currentRealName: string; department: Department } | null>(null);
  const [inputRealName, setInputRealName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tasks count per member
  const [memberTasksMap, setMemberTasksMap] = useState<Record<string, number>>({});

  useEffect(() => {
    // Keep filter locked if scoped admin
    if (adminScope === 'graphic') {
      setSelectedDeptFilter('graphic');
    } else if (adminScope === 'video') {
      setSelectedDeptFilter('video');
    }
  }, [adminScope]);

  // Sync and listen to users from Firestore
  useEffect(() => {
    syncAllTeamMembers().catch(() => {});

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
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Fetch task counts for members
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.forEach((d) => {
          const t = d.data();
          if (t.assignedToUid) {
            counts[t.assignedToUid] = (counts[t.assignedToUid] || 0) + 1;
          }
        });
        setMemberTasksMap(counts);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Check if current admin can edit name of this member
  const canEditMemberName = (memberDept: Department): boolean => {
    if (adminScope === 'all') return true;
    if (adminScope === 'graphic' && memberDept === 'graphic') return true;
    if (adminScope === 'video' && memberDept === 'video') return true;
    return false;
  };

  // Open Edit Name Modal
  const handleOpenEditName = (username: string, currentRealName: string, dept: Department) => {
    if (!canEditMemberName(dept)) {
      showFeedback('error', 'আপনার এই বিভাগের সদস্যের নাম পরিবর্তনের অনুমতি নেই।');
      return;
    }
    setEditingMember({ username, currentRealName, department: dept });
    setInputRealName(currentRealName || '');
  };

  // Save Real Name
  const handleSaveRealName = async () => {
    if (!editingMember || !user) return;
    setIsSavingName(true);

    try {
      const result = await updateMemberRealName(
        editingMember.username,
        inputRealName,
        adminScope,
        profile?.email || user.email || ''
      );

      if (result.success) {
        showFeedback(
          'success',
          `"${editingMember.username}"-এর নাম সফলভাবে "${inputRealName.trim() || editingMember.username}" নির্ধারণ করা হয়েছে!`
        );
        setEditingMember(null);
      } else {
        showFeedback('error', result.error || 'নাম সংরক্ষণ করা যায়নি।');
      }
    } catch {
      showFeedback('error', 'নাম সংরক্ষণের সময় সমস্যা হয়েছে।');
    } finally {
      setIsSavingName(false);
    }
  };

  // Combine hardcoded team members list with Firestore data
  const combinedMembers = useMemo(() => {
    const cachedNames = getCachedRealNames();

    return TEAM_MEMBERS_LIST.map((tm) => {
      const fsUser = users.find((u) => (u.username || u.id).toLowerCase() === tm.username.toLowerCase());
      const realName = fsUser?.realName || cachedNames[tm.username] || '';
      const displayName = formatMemberDisplayName(tm.username, realName);

      return {
        username: tm.username,
        realName,
        displayName,
        department: tm.department,
        active: fsUser?.active !== false,
        tasksCount: memberTasksMap[tm.username] || 0,
      };
    });
  }, [users, memberTasksMap]);

  // Filter members based on admin scope and UI filters
  const filteredMembers = useMemo(() => {
    return combinedMembers.filter((m) => {
      // 1. Enforce admin department scope strictly
      if (adminScope === 'graphic' && m.department !== 'graphic') return false;
      if (adminScope === 'video' && m.department !== 'video') return false;

      // 2. UI department filter (for Master admin)
      if (selectedDeptFilter !== 'all' && m.department !== selectedDeptFilter) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchUser = m.username.toLowerCase().includes(q);
        const matchReal = m.realName.toLowerCase().includes(q);
        const matchDisplay = m.displayName.toLowerCase().includes(q);
        if (!matchUser && !matchReal && !matchDisplay) return false;
      }

      return true;
    });
  }, [combinedMembers, adminScope, selectedDeptFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              টিম সদস্য ও নাম নির্ধারণ
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            নির্ধারিত ২০ জন টিম মেম্বার অ্যাকাউন্টে আসল নাম (Real Name) যুক্ত করুন যাতে সহজেই কাজ ট্র্যাক করা যায়
          </p>
        </div>

        {/* Admin Scope Badge */}
        <div className="flex items-center gap-2">
          {adminScope === 'all' && (
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              মাস্টার অ্যাডমিন (উভয় বিভাগ নিয়ন্ত্রণ)
            </span>
          )}
          {adminScope === 'graphic' && (
            <span className="px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 text-xs font-bold flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              গ্রাফিক ডিজাইন অ্যাডমিন (শুধুমাত্র ডিজাইনার)
            </span>
          )}
          {adminScope === 'video' && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              ভিডিও এডিটিং অ্যাডমিন (শুধুমাত্র এডিটর)
            </span>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ইউজারনেম বা নাম দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Department Switcher Tabs (Only visible for Master Admin) */}
        {adminScope === 'all' && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-stretch sm:self-auto">
            <button
              onClick={() => setSelectedDeptFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDeptFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল ২০ সদস্য
            </button>
            <button
              onClick={() => setSelectedDeptFilter('graphic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDeptFilter === 'graphic'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>গ্রাফিক ডিজাইনার (১০)</span>
            </button>
            <button
              onClick={() => setSelectedDeptFilter('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedDeptFilter === 'video'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>ভিডিও এডিটর (১০)</span>
            </button>
          </div>
        )}
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isGraphic = member.department === 'graphic';
          const deptInfo = DEPARTMENTS[member.department];
          const hasRealName = Boolean(member.realName && member.realName.trim());
          const editable = canEditMemberName(member.department);

          return (
            <div
              key={member.username}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      isGraphic
                        ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    }`}
                  >
                    {isGraphic ? <Palette className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                    <span>{deptInfo?.label || member.department}</span>
                  </span>

                  <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    পাসওয়ার্ড: 12345678
                  </span>
                </div>

                {/* Member Identity Details */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                      isGraphic
                        ? 'bg-gradient-to-tr from-pink-600 to-rose-500'
                        : 'bg-gradient-to-tr from-blue-600 to-teal-500'
                    }`}
                  >
                    {hasRealName ? member.realName[0] : member.username[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {member.displayName}
                    </h3>

                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        @{member.username}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">
                      মোট কাজ: <strong className="text-slate-700 dark:text-slate-200">{toBengaliNumber(member.tasksCount)}</strong> টি
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Action: Assign / Edit Real Name */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {hasRealName ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      নাম নির্ধারণ করা আছে
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">নাম নির্ধারণ বাকি</span>
                  )}
                </span>

                {editable ? (
                  <button
                    onClick={() => handleOpenEditName(member.username, member.realName, member.department)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-xs font-bold transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{hasRealName ? 'নাম পরিবর্তন' : 'আসল নাম লিখুন'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">অনুমতি নেই</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Real Name Assignment Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    টিম মেম্বারের আসল নাম নির্ধারণ
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">@{editingMember.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  আসল নাম (Real Name)
                </label>
                <input
                  type="text"
                  value={inputRealName}
                  onChange={(e) => setInputRealName(e.target.value)}
                  placeholder="যেমন: রহিম / Rahim"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  এই নামটি সকল কাজের তালিকা, অ্যাসাইনমেন্ট ও রিপোর্টে ইউজারনেমের পাশে প্রদর্শিত হবে (যেমন: {formatMemberDisplayName(editingMember.username, inputRealName || 'রহিম')})।
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  disabled={isSavingName}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleSaveRealName}
                  disabled={isSavingName}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSavingName ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>সংরক্ষণ করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
