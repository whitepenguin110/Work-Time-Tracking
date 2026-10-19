import React from 'react';
import { UserX, Archive, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface InactiveAccountScreenProps {
  isArchived?: boolean;
}

export const InactiveAccountScreen: React.FC<InactiveAccountScreenProps> = ({ isArchived = false }) => {
  const { signOutUser, profile } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center animate-fade-in">
        <div
          className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
            isArchived
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              : 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
          }`}
        >
          {isArchived ? <Archive className="w-8 h-8" /> : <UserX className="w-8 h-8" />}
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isArchived ? 'অ্যাকাউন্টটি সংরক্ষিত (আর্কাইভ)' : 'অ্যাকাউন্ট নিষ্ক্রিয়'}
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
          জনাব <strong>{profile?.name}</strong>,{' '}
          {isArchived
            ? 'আপনার অ্যাকাউন্টটি টিম থেকে সরিয়ে আলাদা ডাটাবেজ আর্কাইভ সেকশনে সংরক্ষিত রাখা হয়েছে। আপনার পূর্ববর্তী সকল কাজের হিসাব ও তথ্য সুরক্ষিত রয়েছে। পুনরায় টিমে যুক্ত হতে অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'
            : 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় করা আছে। পুনরায় সক্রিয় করতে অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'}
        </p>

        {isArchived && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 mb-5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>পূর্ববর্তী সমস্ত কাজের ডেটা অক্ষুণ্ণ রয়েছে</span>
          </div>
        )}

        <button
          onClick={signOutUser}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition"
        >
          <LogOut className="w-4 h-4" />
          লগআউট করুন
        </button>
      </div>
    </div>
  );
};
