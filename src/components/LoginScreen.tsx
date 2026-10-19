import React, { useState } from 'react';
import {
  CheckSquare,
  Sparkles,
  Palette,
  Video,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
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
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            গ্রাফিক ডিজাইনার ও ভিডিও এডিটরদের কাজ ও ইনসেনটিভ হিসাবের নির্ভুল প্ল্যাটফর্ম
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-sm font-semibold shadow-sm hover:shadow transition active:scale-[0.99] disabled:opacity-50"
          >
            {/* Google SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            <span>{loading ? 'লগইন প্রক্রিয়াধীন...' : 'গুগল দিয়ে সাইন-ইন করুন'}</span>
          </button>
        </div>

        {/* Feature Badges */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-left">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
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

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
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

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
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

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
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
