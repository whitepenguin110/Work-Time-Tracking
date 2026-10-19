import React, { useState } from 'react';
import {
  CheckSquare,
  Sun,
  Moon,
  LogOut,
  Palette,
  Video,
  ShieldAlert,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Users,
  BookOpen,
  LayoutDashboard,
  UserCheck,
  KeyRound,
  Coins,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DEPARTMENTS } from '../types';
import { ProfileModal } from './ProfileModal';

export type AdminViewTab = 'approvals' | 'all_tasks' | 'overview' | 'reports' | 'categories' | 'users' | 'rules';

interface NavbarProps {
  currentTab: AdminViewTab;
  onTabChange: (tab: AdminViewTab) => void;
  pendingApprovalsCount?: number;
  pendingMemberApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  pendingApprovalsCount = 0,
  pendingMemberApprovalsCount = 0
}) => {
  const { user, profile, isAdmin, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!user) return null;

  const deptInfo = profile?.department ? DEPARTMENTS[profile.department] : null;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <CheckSquare className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                    কাজের হিসাব
                  </span>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <ShieldAlert className="w-3 h-3" />
                      অ্যাডমিন
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      সদস্য
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  ডিজাইনার ও এডিটর টিম ইনসেনটিভ ট্র্যাকার
                </p>
              </div>
            </div>

            {/* Department badge & User menu */}
            <div className="flex items-center gap-3">
              {deptInfo && (
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {deptInfo.id === 'graphic' ? (
                    <Palette className="w-3.5 h-3.5 text-pink-500" />
                  ) : (
                    <Video className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  <span>{deptInfo.label}</span>
                </div>
              )}

              {/* Profile & Password button */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                title="প্রোফাইল তথ্য ও লগইন পাসওয়ার্ড পরিবর্তন"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">পাসওয়ার্ড ও প্রোফাইল</span>
              </button>

              {/* Dark mode button */}
              <button
                onClick={toggleTheme}
                aria-label="থিম পরিবর্তন"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={theme === 'dark' ? 'লাইট মোড অন করুন' : 'ডার্ক মোড অন করুন'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400" />
                ) : (
                  <Moon className="w-5 h-5 text-slate-700" />
                )}
              </button>

              {/* User profile and logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition"
                  title="প্রোফাইল সেটিংস খুলুন"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={profile?.name || user.displayName || 'User'}
                      className="w-8 h-8 rounded-full ring-2 ring-emerald-500/30 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold text-sm">
                      {(profile?.name || user.displayName || 'ইউ')[0]}
                    </div>
                  )}
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                      {profile?.name || user.displayName || 'ব্যবহারকারী'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {user.email}
                    </p>
                  </div>
                </button>

                <button
                  onClick={signOutUser}
                  aria-label="লগআউট"
                  className="p-2 ml-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  title="লগআউট করুন"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800 scrollbar-none">
              <button
                onClick={() => onTabChange('approvals')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition relative ${
                  currentTab === 'approvals'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>কাজ অ্যাসাইন ও অনুমোদন</span>
                {pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onTabChange('all_tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  currentTab === 'all_tasks'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                সম্পূর্ণ কাজের তালিকা ও PDF
              </button>

              <button
                onClick={() => onTabChange('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  currentTab === 'overview'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                টিম ড্যাশবোর্ড
              </button>

              <button
                onClick={() => onTabChange('reports')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  currentTab === 'reports'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                মাসিক রিপোর্ট ও CSV
              </button>

              <button
                onClick={() => onTabChange('categories')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  currentTab === 'categories'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                ইনসেন্টিভ রেট চার্ট
              </button>

              <button
                onClick={() => onTabChange('users')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition relative ${
                  currentTab === 'users'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>টিম মেম্বারস</span>
                {pendingMemberApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                    {pendingMemberApprovalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onTabChange('rules')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  currentTab === 'rules'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                ফায়ারবেস রুলস নির্দেশিকা
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile & Password Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
