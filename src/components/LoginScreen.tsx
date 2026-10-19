import React, { useState } from 'react';
import {
  CheckSquare,
  Sparkles,
  Palette,
  Video,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('গুগল প্রমাণীকরণ সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
        {/* Glow decorative shape */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
          <CheckSquare className="w-9 h-9 stroke-[2.5]" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            কাজের হিসাব
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            গ্রাফিক ডিজাইনার ও ভিডিও এডিটরদের কাজ ও ইনসেনটিভ প্ল্যাটফর্ম
          </p>
        </div>

        {/* Sign In vs Sign Up Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              authMode === 'signin'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>সাইন-ইন (Sign In)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition ${
              authMode === 'signup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>সাইন-আপ (Sign Up)</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Specific Description & Action Button */}
        <div className="space-y-4 pt-1">
          {authMode === 'signin' ? (
            <div className="text-left bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                পূর্বের অ্যাকাউন্টে লগইন
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                আপনার কাজের তালিকা ও ইনসেনটিভ দেখতে আপনার নিবন্ধিত গুগল অ্যাকাউন্ট দিয়ে প্রবেশ করুন।
              </p>
            </div>
          ) : (
            <div className="text-left bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                নতুন সদস্য নিবন্ধন
              </p>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                গুগল দিয়ে সাইন-আপ করার পর আপনার নাম ও বিভাগ (গ্রাফিক ডিজাইন বা ভিডিও এডিটিং) বেছে নিতে পারবেন।
              </p>
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-semibold shadow-sm hover:shadow transition active:scale-[0.99] disabled:opacity-50 ${
              authMode === 'signup'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200'
            }`}
          >
            {/* Google SVG */}
            <div className="p-1 rounded-full bg-white flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <span>
              {loading
                ? 'সংযোগ করা হচ্ছে...'
                : authMode === 'signup'
                ? 'গুগল দিয়ে সাইন-আপ করুন'
                : 'গুগল দিয়ে সাইন-ইন করুন'}
            </span>
          </button>

          {/* Bottom Switcher helper */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {authMode === 'signin' ? (
              <>
                টিমে নতুন যুক্ত হয়েছেন?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  এখানে সাইন-আপ করুন
                </button>
              </>
            ) : (
              <>
                ইতিমধ্যে একাউন্ট আছে?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  এখানে সাইন-ইন করুন
                </button>
              </>
            )}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5 text-left">
          <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Palette className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                গ্রাফিক ডিজাইন
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                ২৫+ ক্যাটাগরি সাপোর্ট
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Video className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                ভিডিও এডিটিং
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                ১৫+ ক্যাটাগরি ও শুট
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                ইনস্ট্যান্ট ইনসেনটিভ
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                কাজের সাথে সাথে হিসাব
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <ShieldCheck className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                নিরাপদ ডেটাবেস
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                ব্যক্তিগত গোপনীয়তা নিশ্চিত
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
