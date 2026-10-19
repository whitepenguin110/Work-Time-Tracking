import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Coins,
  Users,
  Palette,
  Video
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, Task, DEPARTMENTS } from '../types';
import {
  toBengaliNumber,
  formatBengaliCurrency,
  getCurrentMonthString,
  getPastMonthsOptions,
  formatBengaliMonthYear,
  downloadCSV
} from '../utils/bengali';

export const AdminReports: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => uList.push({ id: d.id, ...d.data() } as UserProfile));
        setUsers(uList);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubTasks = onSnapshot(
      collection(db, 'tasks'),
      (snap) => {
        const tList: Task[] = [];
        snap.forEach((d) => tList.push({ id: d.id, ...d.data() } as Task));
        setTasks(tList);
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

  // Filter completed tasks for selected month
  const monthlyData = useMemo(() => {
    // Map of userId -> { completedCount, totalIncentive }
    const userSummaryMap: Record<string, { completedCount: number; totalIncentive: number }> = {};

    users.forEach((u) => {
      userSummaryMap[u.id] = { completedCount: 0, totalIncentive: 0 };
    });

    tasks.forEach((t) => {
      if (t.status === 'completed' && t.approvalStatus === 'approved') {
        const refDate = t.submitDate || t.workDate || '';
        if (refDate.startsWith(selectedMonth)) {
          if (!userSummaryMap[t.ownerUid]) {
            userSummaryMap[t.ownerUid] = { completedCount: 0, totalIncentive: 0 };
          }
          userSummaryMap[t.ownerUid].completedCount++;
          userSummaryMap[t.ownerUid].totalIncentive += t.incentiveAmount || 0;
        }
      }
    });

    const reportRows = users.map((u) => {
      const summary = userSummaryMap[u.id] || { completedCount: 0, totalIncentive: 0 };
      return {
        user: u,
        completedCount: summary.completedCount,
        totalIncentive: summary.totalIncentive,
      };
    });

    // Sort descending by total incentive
    reportRows.sort((a, b) => b.totalIncentive - a.totalIncentive);

    const grandTotalTasks = reportRows.reduce((acc, r) => acc + r.completedCount, 0);
    const grandTotalIncentive = reportRows.reduce((acc, r) => acc + r.totalIncentive, 0);

    return {
      rows: reportRows,
      grandTotalTasks,
      grandTotalIncentive,
    };
  }, [users, tasks, selectedMonth]);

  // Handle CSV export with UTF-8 BOM
  const handleExportCSV = () => {
    const monthLabel = formatBengaliMonthYear(selectedMonth);
    const filename = `কাজের_হিসাব_ইনসেনটিভ_রিপোর্ট_${selectedMonth}.csv`;

    const headers = [
      'কর্মীর নাম',
      'ইমেইল',
      'বিভাগ',
      'ভূমিকা',
      'সম্পন্ন কাজ সংখ্যা',
      'মোট ইনসেনটিভ (টাকা)',
    ];

    const dataRows = monthlyData.rows.map((r) => [
      r.user.name,
      r.user.email,
      DEPARTMENTS[r.user.department]?.label || r.user.department,
      r.user.role === 'admin' ? 'অ্যাডমিন' : 'সদস্য',
      r.completedCount,
      r.totalIncentive,
    ]);

    // Summary row
    dataRows.push([
      'সর্বমোট',
      '',
      '',
      '',
      monthlyData.grandTotalTasks,
      monthlyData.grandTotalIncentive,
    ]);

    downloadCSV(filename, headers, dataRows);
  };

  const monthOptions = getPastMonthsOptions(12);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            মাসিক ইনসেনটিভ রিপোর্ট
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            প্রতি মাসের সম্পন্ন কাজ ও প্রদেয় ইনসেনটিভের তালিকা এবং এক্সেল/সিএসভি রপ্তানি
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month selector */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            CSV ডাউনলোড
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">মোট সক্রিয় কর্মী</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {toBengaliNumber(users.filter((u) => u.active).length)} জন
          </p>
          <span className="text-[11px] text-slate-400">টিম সদস্য</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              সম্পন্ন কাজের মোট সংখ্যা
            </p>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {toBengaliNumber(monthlyData.grandTotalTasks)} টি
          </p>
          <span className="text-[11px] text-slate-400">
            {formatBengaliMonthYear(selectedMonth)} মাসে সম্পন্ন
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              মোট প্রদেয় ইনসেনটিভ
            </p>
            <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {formatBengaliCurrency(monthlyData.grandTotalIncentive)}
          </p>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            {formatBengaliMonthYear(selectedMonth)} মাসের সর্বমোট
          </span>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">রিপোর্ট তৈরি হচ্ছে...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              কর্মীভিত্তিক সারসংক্ষেপ — {formatBengaliMonthYear(selectedMonth)}
            </h3>
            <span className="text-xs text-slate-500">
              সর্বমোট {toBengaliNumber(monthlyData.rows.length)} জন কর্মী
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">ক্রম</th>
                  <th className="px-5 py-3.5">কর্মীর নাম ও ইমেইল</th>
                  <th className="px-5 py-3.5">বিভাগ</th>
                  <th className="px-5 py-3.5 text-center">সম্পন্ন কাজের সংখ্যা</th>
                  <th className="px-5 py-3.5 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    মোট অর্জিত ইনসেনটিভ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyData.rows.map((row, idx) => (
                  <tr
                    key={row.user.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-5 py-3.5 text-slate-400 font-medium">
                      {toBengaliNumber(idx + 1)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.user.name}</p>
                      <p className="text-[11px] text-slate-400">{row.user.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {row.user.department === 'graphic' ? (
                          <Palette className="w-3 h-3 text-pink-500" />
                        ) : (
                          <Video className="w-3 h-3 text-blue-500" />
                        )}
                        {DEPARTMENTS[row.user.department]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {toBengaliNumber(row.completedCount)} টি
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {formatBengaliCurrency(row.totalIncentive)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={3} className="px-5 py-4 text-slate-800 dark:text-slate-100">
                    সর্বমোট হিসাব
                  </td>
                  <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-100 text-sm">
                    {toBengaliNumber(monthlyData.grandTotalTasks)} টি
                  </td>
                  <td className="px-5 py-4 text-right text-base text-emerald-700 dark:text-emerald-400">
                    {formatBengaliCurrency(monthlyData.grandTotalIncentive)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
