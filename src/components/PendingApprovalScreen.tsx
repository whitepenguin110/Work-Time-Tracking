import React, { useState } from 'react';
import {
  Clock,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Palette,
  Video,
  AlertCircle,
  XCircle,
  Lock,
  Mail,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../types';
import { formatBengaliDate } from '../utils/bengali';

interface PendingApprovalScreenProps {
  isRejected?: boolean;
  rejectionReason?: string;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  isRejected = false,
  rejectionReason
}) => {
  const { profile, signOutUser, refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setChecking(true);
    setLastCheckMessage(null);
    try {
      await refreshProfile();
      setLastCheckMessage('স্ট্যাটাস যাচাই সম্পন্ন হয়েছে। এখনও অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।');
      setTimeout(() => setLastCheckMessage(null), 4000);
    } catch {
      setLastCheckMessage('যাচাই করা সম্ভব হয়নি, অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।');
    } finally {
      setChecking(false);
    }
  };

  const deptInfo = profile?.department ? DEPARTMENTS[profile.department] : null;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
        
        {/* Top Header Banner */}
        <div
          className={`px-6 py-8 text-center text-white relative ${
            isRejected
              ? 'bg-gradient-to-r from-red-600 to-rose-700'
              : 'bg-gradient-to-r from-amber-500 via-amber-600 to-teal-600'
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-lg">
            {isRejected ? (
              <XCircle className="w-8 h-8 text-white" />
            ) : (
              <Clock className="w-8 h-8 text-white animate-pulse" />
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm border border-white/30 text-white mb-2">
            {isRejected ? 'আবেদন গৃহীত হয়নি' : 'অ্যাকাউন্ট ভেরিফিকেশন ও অনুমোদন'}
          </span>

          <h2 className="text-xl font-bold tracking-tight">
            {isRejected
              ? 'আবেদন প্রত্যাখ্যাত হয়েছে'
              : 'আপনার অ্যাকাউন্টটি অনুমোদনের অপেক্ষায় আছে'}
          </h2>

          <p className="text-xs text-white/90 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {isRejected
              ? 'দুঃখিত, অ্যাডমিন আপনার সদস্যপদের আবেদনটি অনুমোদন করেননি।'
              : 'অ্যাডমিন অনুমোদন করার পরে আপনি আপনার অ্যাকাউন্টের সব তথ্য, কাজ ও ইনসেন্টিভ দেখতে পাবেন।'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Status Message Alert */}
          {lastCheckMessage && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lastCheckMessage}</span>
            </div>
          )}

          {isRejected && rejectionReason && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs text-red-800 dark:text-red-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4" />
                প্রত্যাখ্যানের কারণ:
              </p>
              <p className="text-[11px] leading-relaxed pl-5 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-red-100 dark:border-red-900">
                {rejectionReason}
              </p>
            </div>
          )}

          {/* Member Profile Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                আবেদনকারীর তথ্য
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  isRejected
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isRejected ? 'bg-red-500' : 'bg-amber-500 animate-ping'
                  }`}
                />
                {isRejected ? 'বাতিল' : 'অনুমোদনের অপেক্ষায়'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">পূর্ণ নাম:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {profile?.name || 'ব্যবহারকারী'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  ইমেইল:
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {profile?.email}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">নির্বাচিত বিভাগ:</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                  {profile?.department === 'graphic' ? (
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  {deptInfo?.label || profile?.department}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  আবেদনের সময়:
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {profile?.createdAt
                    ? formatBengaliDate(profile.createdAt.slice(0, 10))
                    : 'আজ'}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Anti-Leak Assurance Box */}
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 text-teal-900 dark:text-teal-200 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-[11px] text-teal-800 dark:text-teal-300">
                তথ্যের সাইবার সুরক্ষা ব্যবস্থা সক্রিয়
              </p>
              <p className="text-[11px] text-teal-700 dark:text-teal-400/90 leading-relaxed">
                অ্যাডমিন অনুমোদন না দেওয়া পর্যন্ত এই অ্যাকাউন্টের মাধ্যমে টিমের কোনো কাজের তালিকা, ইনসেন্টিভ বা ভেতরের তথ্য প্রদর্শিত হবে না।
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            {!isRejected && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={checking}
                className="w-full flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'স্ট্যাটাস যাচাই হচ্ছে...' : 'অনুমোদন স্ট্যাটাস রিফ্রেশ করুন'}
              </button>
            )}

            <button
              type="button"
              onClick={signOutUser}
              className={`w-full ${
                !isRejected ? 'sm:w-auto' : 'flex-1'
              } inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition`}
            >
              <LogOut className="w-3.5 h-3.5" />
              লগআউট করুন
            </button>
          </div>

          {/* Admin contact footnote */}
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            জরুরি প্রয়োজনে প্রধান অ্যাডমিনের সাথে যোগাযোগ করুন:{' '}
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              whitepenguin110@gmail.com
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
