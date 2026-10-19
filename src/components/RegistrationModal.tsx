import React, { useState } from 'react';
import { Palette, Video, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Department } from '../types';

export const RegistrationModal: React.FC = () => {
  const { user, registerProfile } = useAuth();
  const [name, setName] = useState<string>(user?.displayName || '');
  const [department, setDepartment] = useState<Department>('graphic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await registerProfile(name, department);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('নিবন্ধন সম্পন্ন করা যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-6 text-white text-center relative">
          <div className="w-14 h-14 mx-auto rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold">কাজের হিসাবে স্বাগতম!</h2>
          <p className="text-emerald-100 text-xs mt-1">
            আপনার প্রোফাইল সম্পূর্ণ করতে নাম ও বিভাগ নির্বাচন করুন
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Email & Google Avatar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full ring-2 ring-emerald-500/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                {(user?.displayName || 'ইউ')[0]}
              </div>
            )}
            <div className="text-xs">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                গুগল অ্যাকাউন্ট
              </p>
              <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              আপনার পুরো নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: আব্দুল্লাহ আল মামুন"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
            />
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              আপনার বিভাগ বেছে নিন <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Graphic Design Option */}
              <button
                type="button"
                onClick={() => setDepartment('graphic')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                  department === 'graphic'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  {department === 'graphic' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    গ্রাফিক ডিজাইন
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    পোস্টার, কভার, ব্যানার, ব্রোশিওর ইত্যাদি ডিজাইন
                  </p>
                </div>
              </button>

              {/* Video Editing Option */}
              <button
                type="button"
                onClick={() => setDepartment('video')}
                className={`p-4 rounded-xl border text-left transition flex flex-col gap-2 ${
                  department === 'video'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Video className="w-5 h-5" />
                  </div>
                  {department === 'video' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    ভিডিও এডিটিং ও প্রোডাকশন
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    শুট, খুতবা এডিট, রিলস, ভয়েস ওভার ইত্যাদি
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Department warning notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>জরুরি বিজ্ঞপ্তি:</strong> নিবন্ধনের পর আপনি নিজে বিভাগ পরিবর্তন
              করতে পারবেন না। প্রয়োজনে শুধুমাত্র অ্যাডমিন আপনার বিভাগ পরিবর্তন করতে পারবেন।
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'প্রোফাইল তৈরি হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন এবং এগিয়ে যান'}
          </button>
        </form>
      </div>
    </div>
  );
};
