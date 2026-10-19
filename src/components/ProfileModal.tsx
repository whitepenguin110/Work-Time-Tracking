import React, { useState } from 'react';
import {
  X,
  User,
  KeyRound,
  Shield,
  Palette,
  Video,
  Check,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEPARTMENTS } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin, updateUserName, changePassword } = useAuth();

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !user) return null;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameFeedback({ type: 'error', text: 'নাম খালি রাখা যাবে না।' });
      return;
    }

    setIsUpdatingName(true);
    setNameFeedback(null);
    try {
      await updateUserName(name.trim());
      setNameFeedback({ type: 'success', text: 'নাম সফলভাবে হালনাগাদ করা হয়েছে!' });
    } catch (err: unknown) {
      console.warn('Profile name update notice:', err);
      setNameFeedback({ type: 'error', text: 'নাম পরিবর্তন করা সম্ভব হয়নি।' });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', text: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'উভয় পাসওয়ার্ড একই হতে হবে।' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordFeedback(null);
    try {
      await changePassword(newPassword);
      setPasswordFeedback({ type: 'success', text: 'লগইন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.warn('Password change notice:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('requires-recent-login')) {
        setPasswordFeedback({
          type: 'error',
          text: 'নিরাপত্তার স্বার্থে পাসওয়ার্ড পরিবর্তনের পূর্বে অনুগ্রহ করে একবার লগআউট করে পুনরায় লগইন করুন।',
        });
      } else {
        setPasswordFeedback({ type: 'error', text: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const dept = profile?.department ? DEPARTMENTS[profile.department] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                আমার প্রোফাইল ও পাসওয়ার্ড
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ব্যক্তিগত তথ্য ও নিরাপত্তা সেটিংস
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* User Overview Badges */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">ইমেইল অ্যাকাউন্ট:</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.email}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">কাজের বিভাগ:</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {dept?.id === 'graphic' ? (
                  <Palette className="w-3.5 h-3.5 text-pink-500" />
                ) : (
                  <Video className="w-3.5 h-3.5 text-blue-500" />
                )}
                {dept?.label || 'অনির্ধারিত'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">অ্যাকাউন্ট ভূমিকা:</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                <Shield className="w-3 h-3" />
                {isAdmin ? 'স্থায়ী অ্যাডমিন' : 'টিম সদস্য'}
              </span>
            </div>
          </div>

          {/* Section 1: Update Name */}
          <form onSubmit={handleUpdateName} className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              নাম পরিবর্তন করুন
            </h4>

            {nameFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  nameFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200'
                }`}
              >
                {nameFeedback.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{nameFeedback.text}</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isUpdatingName}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white transition disabled:opacity-50 shrink-0"
              >
                {isUpdatingName ? 'সংরক্ষণ...' : 'নাম সেভ'}
              </button>
            </div>
          </form>

          {/* Section 2: Change Password */}
          <form onSubmit={handleChangePassword} className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                লগইন পাসওয়ার্ড পরিবর্তন
              </h4>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassword ? 'লুকান' : 'দেখুন'}
              </button>
            </div>

            {passwordFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 mt-1"
              >
                {isChangingPassword ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
