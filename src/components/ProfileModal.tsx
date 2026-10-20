import React from 'react';
import {
  X,
  User,
  Shield,
  Palette,
  Video,
  LogOut,
  Lock,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, signOutUser } = useAuth();

  if (!isOpen || !user) return null;

  const dept = profile?.department ? DEPARTMENTS[profile.department] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                প্রোফাইল বিবরণ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                লগইন করা অ্যাকাউন্টের বিবরণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Account Overview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ভূমিকা (Role)</span>
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {profile?.adminDepartmentScope === 'all'
                    ? 'মাস্টার অ্যাডমিন'
                    : profile?.adminDepartmentScope === 'graphic'
                    ? 'গ্রাফিক ডিজাইন অ্যাডমিন'
                    : 'ভিডিও এডিটিং অ্যাডমিন'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  টিম সদস্য
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">নাম (Name)</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {profile?.name || user.displayName || 'ব্যবহারকারী'}
              </span>
            </div>

            {profile?.username && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ইউজারনেম (Username)</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                  @{profile.username}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ইমেইল (Email)</span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {user.email || 'N/A'}
              </span>
            </div>

            {dept && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">বিভাগ (Department)</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                  {dept.id === 'graphic' ? (
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  {dept.label}
                </span>
              </div>
            )}
          </div>

          {/* Session & Security Info */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">সেশন সুরক্ষিত</span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                আপনার লগইন সেশন লোকাল স্টোরেজে সুরক্ষিত রয়েছে। ব্রাউজার রিফ্রেশ করলেও স্বয়ংক্রিয়ভাবে লগইন থাকবে।
              </p>
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
            >
              বন্ধ করুন
            </button>
            <button
              type="button"
              onClick={async () => {
                onClose();
                await signOutUser();
              }}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>লগআউট করুন (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
