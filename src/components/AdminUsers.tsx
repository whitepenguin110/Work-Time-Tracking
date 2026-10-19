import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Palette,
  Video,
  UserCheck,
  UserX,
  AlertTriangle,
  Mail,
  Calendar,
  Check
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { UserProfile, Department, UserRole, DEPARTMENTS } from '../types';
import { MAX_ADMINS } from '../config/admins';
import { toBengaliNumber, formatBengaliDate } from '../utils/bengali';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const currentAdminCount = users.filter((u) => u.role === 'admin' && u.active).length;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Change user department
  const handleChangeDepartment = async (user: UserProfile, newDept: Department) => {
    if (user.department === newDept) return;
    setUpdatingId(user.id);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { department: newDept });
      showFeedback('success', `${user.name}-এর বিভাগ পরিবর্তন করা হয়েছে।`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      showFeedback('error', 'বিভাগ পরিবর্তন করা যায়নি।');
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (user: UserProfile) => {
    const newActive = !user.active;
    const confirmMsg = newActive
      ? `আপনি কি "${user.name}"-কে পুনরায় সক্রিয় করতে চান?`
      : `আপনি কি "${user.name}"-কে নিষ্ক্রিয় করতে চান? (নিষ্ক্রিয় কর্মী লগইন বা কাজ যোগ করতে পারবেন না)`;

    if (!window.confirm(confirmMsg)) return;

    setUpdatingId(user.id);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { active: newActive });
      showFeedback(
        'success',
        `${user.name}-এর অ্যাকাউন্ট ${newActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      showFeedback('error', 'অ্যাকাউন্ট স্থিতি পরিবর্তন করা যায়নি।');
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle admin role (STRICT MAX 2 ADMINS ENFORCED)
  const handleToggleAdminRole = async (user: UserProfile) => {
    const isCurrentlyAdmin = user.role === 'admin';

    if (!isCurrentlyAdmin) {
      // Promoting to Admin: Check if already at MAX_ADMINS
      if (currentAdminCount >= MAX_ADMINS) {
        showFeedback(
          'error',
          `সর্বোচ্চ ২ জন অ্যাডমিন থাকতে পারে। নতুন কাউকে অ্যাডমিন করতে চাইলে বর্তমান ২ জনের মধ্যে একজনকে সদস্য হিসেবে নামিয়ে দিতে হবে।`
        );
        return;
      }
      if (!window.confirm(`আপনি কি "${user.name}"-কে অ্যাডমিন হিসেবে পদোন্নতি দিতে চান?`)) {
        return;
      }
    } else {
      // Demoting from Admin: Ensure at least 1 admin remains
      if (currentAdminCount <= 1) {
        showFeedback('error', 'সিস্টেমে অন্তত ১ জন অ্যাডমিন আবশ্যক।');
        return;
      }
      if (
        !window.confirm(
          `আপনি কি "${user.name}"-এর অ্যাডমিন ক্ষমতা বাতিল করে সাধারণ সদস্য করতে চান?`
        )
      ) {
        return;
      }
    }

    setUpdatingId(user.id);
    const newRole: UserRole = isCurrentlyAdmin ? 'user' : 'admin';
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { role: newRole });
      showFeedback(
        'success',
        `${user.name}-এর পদবি সফলভাবে পরিবর্তন করা হয়েছে।`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
      showFeedback('error', 'পদবি পরিবর্তন করা যায়নি।');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Policy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            টিম মেম্বার ও ভূমিকা ব্যবস্থাপনা
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ইউজারের বিভাগ পরিবর্তন, অ্যাকাউন্ট সক্রিয়/নিষ্ক্রিয়করণ এবং অ্যাডমিন নির্বাচন
          </p>
        </div>

        {/* 2 Admins Policy badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200">
          <ShieldAlert className="w-5 h-5 text-purple-600 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold">অ্যাডমিন সীমা নিয়ন্ত্রণ</p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              বর্তমান সক্রিয় অ্যাডমিন: <strong>{toBengaliNumber(currentAdminCount)} / {toBengaliNumber(MAX_ADMINS)} জন</strong> (সর্বোচ্চ ২ জন)
            </p>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-700 dark:text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Users Card Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">লোড হচ্ছে...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">টিম সদস্য</th>
                  <th className="px-5 py-3.5">বিভাগ নির্বাচন (শুধুমাত্র অ্যাডমিন পরিবর্তন করতে পারবেন)</th>
                  <th className="px-5 py-3.5 text-center">ভূমিকা (Role)</th>
                  <th className="px-5 py-3.5 text-center">অ্যাকাউন্ট স্থিতি</th>
                  <th className="px-5 py-3.5 text-right">নিবন্ধন তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isUpdating = updatingId === u.id;

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
                          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department Select */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.department}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleChangeDepartment(u, e.target.value as Department)
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
                          >
                            <option value="graphic">🎨 গ্রাফিক ডিজাইন</option>
                            <option value="video">🎬 ভিডিও এডিটিং ও প্রোডাকশন</option>
                          </select>
                        </div>
                      </td>

                      {/* Role Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleToggleAdminRole(u)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                          }`}
                          title={
                            u.role === 'admin'
                              ? 'অ্যাডমিন পদবি সরান'
                              : 'অ্যাডমিন হিসেবে পদোন্নতি দিন (সর্বোচ্চ ২ জন)'
                          }
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{u.role === 'admin' ? 'অ্যাডমিন' : 'সদস্য'}</span>
                        </button>
                      </td>

                      {/* Active / Inactive Toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            u.active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-red-50 hover:text-red-600'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title={u.active ? 'নিষ্ক্রিয় করুন' : 'পুনরায় সক্রিয় করুন'}
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
                      </td>

                      {/* Created At */}
                      <td className="px-5 py-4 text-right text-slate-400 text-xs">
                        {u.createdAt ? formatBengaliDate(u.createdAt.slice(0, 10)) : '—'}
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
