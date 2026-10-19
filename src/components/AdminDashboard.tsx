import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Coins,
  Calendar,
  Filter,
  Eye,
  X,
  Palette,
  Video,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, Task, Department, DEPARTMENTS } from '../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  formatBengaliDate,
  getCurrentMonthString,
  getPastMonthsOptions,
  formatBengaliMonthYear,
  checkIsOverdue
} from '../utils/bengali';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected user for inspection modal (read-only)
  const [selectedUserForTasks, setSelectedUserForTasks] = useState<UserProfile | null>(null);

  // 1. Fetch all users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as UserProfile);
        });
        setUsers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );
    return () => unsub();
  }, []);

  // 2. Fetch all tasks
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const list: Task[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Task);
        });
        setAllTasks(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute per-user statistics based on the selected month
  const userStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        completed: number;
        inProgress: number;
        pending: number;
        monthIncentive: number;
        allTimeIncentive: number;
      }
    > = {};

    users.forEach((u) => {
      map[u.id] = {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        monthIncentive: 0,
        allTimeIncentive: 0,
      };
    });

    allTasks.forEach((task) => {
      if (!map[task.ownerUid]) {
        map[task.ownerUid] = {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          monthIncentive: 0,
          allTimeIncentive: 0,
        };
      }
      const entry = map[task.ownerUid];
      entry.total++;

      if (task.status === 'completed') {
        entry.completed++;
        const amount = task.incentiveAmount || 0;
        entry.allTimeIncentive += amount;

        // Month matching
        const refDate = task.submitDate || task.workDate || '';
        if (refDate.startsWith(selectedMonth)) {
          entry.monthIncentive += amount;
        }
      } else if (task.status === 'in_progress') {
        entry.inProgress++;
      } else if (task.status === 'pending') {
        entry.pending++;
      }
    });

    return map;
  }, [users, allTasks, selectedMonth]);

  // Overall metrics
  const totalTeamIncentiveThisMonth = useMemo(() => {
    return Object.values(userStatsMap).reduce((acc, curr) => acc + curr.monthIncentive, 0);
  }, [userStatsMap]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (departmentFilter !== 'all' && u.department !== departmentFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [users, departmentFilter, searchQuery]);

  // Tasks of selected user for read-only view
  const inspectedUserTasks = useMemo(() => {
    if (!selectedUserForTasks) return [];
    return allTasks
      .filter((t) => t.ownerUid === selectedUserForTasks.id)
      .sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''));
  }, [selectedUserForTasks, allTasks]);

  const monthOptions = getPastMonthsOptions(12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            টিম ড্যাশবোর্ড ও কর্মী ওভারভিউ
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            টিমের সকল ডিজাইনার ও ভিডিও এডিটরদের কাজের স্থিতি ও অর্জিত ইনসেনটিভ পর্যবেক্ষণ
          </p>
        </div>

        {/* Global summary pill */}
        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              নির্বাচিত মাসে টিমের মোট ইনসেনটিভ
            </p>
            <p className="text-base font-bold text-emerald-800 dark:text-emerald-200">
              {formatBengaliCurrency(totalTeamIncentiveThisMonth)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="কর্মীর নাম বা ইমেইল দিয়ে খুঁজুন..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">সকল বিভাগ</option>
              <option value="graphic">গ্রাফিক ডিজাইন</option>
              <option value="video">ভিডিও এডিটিং ও প্রোডাকশন</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            টিম মেম্বার তথ্য লোড হচ্ছে...
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            কোনো ব্যবহারকারী পাওয়া যায়নি
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো সদস্য তালিকাভুক্ত নেই।
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3.5">কর্মী ও যোগাযোগ</th>
                  <th className="px-4 py-3.5">বিভাগ</th>
                  <th className="px-4 py-3.5 text-center">মোট কাজ</th>
                  <th className="px-4 py-3.5 text-center">সম্পন্ন</th>
                  <th className="px-4 py-3.5 text-center">চলমান</th>
                  <th className="px-4 py-3.5 text-center">পেন্ডিং</th>
                  <th className="px-4 py-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    {formatBengaliMonthYear(selectedMonth)}-এর ইনসেনটিভ
                  </th>
                  <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const s = userStatsMap[u.id] || {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    pending: 0,
                    monthIncentive: 0,
                  };
                  const dept = DEPARTMENTS[u.department];

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => setSelectedUserForTasks(u)}
                    >
                      {/* Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {u.name}
                              </span>
                              {u.role === 'admin' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                                  অ্যাডমিন
                                </span>
                              )}
                              {!u.active && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 font-medium">
                                  নিষ্ক্রিয়
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[11px] block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {u.department === 'graphic' ? (
                            <Palette className="w-3.5 h-3.5 text-pink-500" />
                          ) : (
                            <Video className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          {dept?.label || u.department}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {toBengaliNumber(s.total)}
                      </td>

                      {/* Completed */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {toBengaliNumber(s.completed)}
                        </span>
                      </td>

                      {/* In Progress */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          {toBengaliNumber(s.inProgress)}
                        </span>
                      </td>

                      {/* Pending */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {toBengaliNumber(s.pending)}
                        </span>
                      </td>

                      {/* Month Incentive */}
                      <td className="px-4 py-3.5 text-right font-bold text-sm text-emerald-700 dark:text-emerald-400">
                        {formatBengaliCurrency(s.monthIncentive)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedUserForTasks(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 hover:text-emerald-700 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>কাজের তালিকা</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Task Details Modal (Read-only for Admin) */}
      {selectedUserForTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedUserForTasks.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedUserForTasks.name}-এর কাজের বিস্তারিত
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    বিভাগ: {DEPARTMENTS[selectedUserForTasks.department]?.label} • {selectedUserForTasks.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForTasks(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task list body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {inspectedUserTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  এই কর্মীর কোনো কাজ এখনও যুক্ত করা হয়নি।
                </div>
              ) : (
                inspectedUserTasks.map((t) => {
                  const overdue = checkIsOverdue(t.dueDate, t.status);
                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {t.categoryName}
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Status Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : t.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {t.status === 'completed'
                              ? 'সম্পন্ন'
                              : t.status === 'in_progress'
                              ? 'চলমান'
                              : 'পেন্ডিং'}
                          </span>

                          {/* Incentive */}
                          {t.status === 'completed' && (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {formatBengaliCurrency(t.incentiveAmount)}
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t.name}
                      </h4>

                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>শুরু: {formatBengaliDate(t.workDate)}</span>
                        <span className={overdue.isOverdue ? 'text-red-600 font-bold' : ''}>
                          ডেডলাইন: {formatBengaliDate(t.dueDate)} {overdue.isOverdue && `(মেয়াদ শেষ)`}
                        </span>
                        {t.submitDate && (
                          <span className="text-emerald-600">
                            জমা: {formatBengaliDate(t.submitDate)}
                          </span>
                        )}
                      </div>

                      {t.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                          নোট: {t.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-right">
              <button
                onClick={() => setSelectedUserForTasks(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
