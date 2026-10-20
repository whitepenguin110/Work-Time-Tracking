import React, { useState } from 'react';
import {
  CheckSquare,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Wrong username or password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await loginWithCredentials(identifier, password);
    } catch (err: unknown) {
      console.warn('Login failure:', err);
      setErrorMsg('Wrong username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden animate-fade-in">
        
        {/* Glow aesthetics */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon & Heading */}
        <div className="relative mb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 mb-4 transition-transform hover:scale-105">
            <CheckSquare className="w-9 h-9 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            কাজের হিসাব
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            টিম ম্যানেজমেন্ট ও ইনসেন্টিভ সিস্টেম
          </p>
        </div>

        {/* Error notification banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold flex items-center justify-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Username / Email field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ইউজারনেম বা ইমেইল (Username or Email)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="ইমেইল বা ইউজারনেম লিখুন"
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>পাসওয়ার্ড (Password)</span>
              <span className="text-[10px] font-normal text-slate-400">কেস-সেনসিটিভ</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="পাসওয়ার্ড লিখুন"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>লগইন হচ্ছে...</span>
              </>
            ) : (
              <span>লগইন করুন (Sign In)</span>
            )}
          </button>
        </form>

        {/* Quick Credentials Reference Accordion / Notice */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-left space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>অ্যাকাউন্ট গাইডলাইন:</span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 pl-5 leading-relaxed">
            <div>
              <strong className="text-slate-700 dark:text-slate-200">অ্যাডমিন অ্যাকাউন্ট:</strong> ইমেইল ও পাসওয়ার্ড প্রদান করে স্ব স্ব ডিপার্টমেন্ট ড্যাশবোর্ডে প্রবেশ করুন।
            </div>
            <div>
              <strong className="text-slate-700 dark:text-slate-200">টিম মেম্বার:</strong> ডিজাইনার (<code className="text-emerald-600 dark:text-emerald-400 font-mono">designer1</code> - <code className="text-emerald-600 dark:text-emerald-400 font-mono">designer10</code>) এবং ভিডিও এডিটর (<code className="text-teal-600 dark:text-teal-400 font-mono">videoeditor1</code> - <code className="text-teal-600 dark:text-teal-400 font-mono">videoeditor10</code>)। পাসওয়ার্ড: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">12345678</code>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>সুরক্ষিত লোকাল সেশন সংরক্ষণ ব্যবস্থা</span>
        </div>
      </div>
    </div>
  );
};
