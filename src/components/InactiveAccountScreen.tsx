import React from 'react';
import { UserX, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InactiveAccountScreen: React.FC = () => {
  const { signOutUser, profile } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
          <UserX className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          অ্যাকাউন্ট নিষ্ক্রিয়
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          জনাব <strong>{profile?.name}</strong>, আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় করা আছে। পুনরায় সক্রিয় করতে অনুগ্রহ করে আপনার অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
        <button
          onClick={signOutUser}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition"
        >
          <LogOut className="w-4 h-4" />
          লগআউট করুন
        </button>
      </div>
    </div>
  );
};
