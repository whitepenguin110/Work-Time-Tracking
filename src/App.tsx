/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './services/firebase';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, AdminViewTab } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { RegistrationModal } from './components/RegistrationModal';
import { InactiveAccountScreen } from './components/InactiveAccountScreen';
import { UserDashboard } from './components/UserDashboard';
import { AdminApprovals } from './components/AdminApprovals';
import { AdminAllTasksReport } from './components/AdminAllTasksReport';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminReports } from './components/AdminReports';
import { AdminCategories } from './components/AdminCategories';
import { AdminUsers } from './components/AdminUsers';
import { FirebaseRulesGuide } from './components/FirebaseRulesGuide';

const AppContent: React.FC = () => {
  const { user, profile, loading, needsRegistration, isAdmin } = useAuth();
  const [adminTab, setAdminTab] = useState<AdminViewTab>('approvals');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Real-time counter of tasks awaiting admin approval
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(
      collection(db, 'tasks'),
      where('status', '==', 'completed'),
      where('approvalStatus', '==', 'pending_approval')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPendingApprovalsCount(snap.size);
      },
      () => {}
    );
    return () => unsub();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          কাজের হিসাব লোড হচ্ছে...
        </p>
      </div>
    );
  }

  // If not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
        <div className="flex-1 flex items-center justify-center">
          <LoginScreen />
        </div>
        <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800/60">
          কাজের হিসাব — গ্রাফিক ডিজাইনার ও ভিডিও এডিটর টিম ম্যানেজমেন্ট সিস্টেম
        </footer>
      </div>
    );
  }

  // If newly logged in and needs registration (choose name & department)
  if (needsRegistration) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <RegistrationModal />
      </div>
    );
  }

  // If account is deactivated by admin
  if (profile && !profile.active) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar currentTab={adminTab} onTabChange={setAdminTab} />
        <InactiveAccountScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar
        currentTab={adminTab}
        onTabChange={setAdminTab}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isAdmin ? (
          // Admin View: assignment & approvals is the primary workspace
          <>
            {adminTab === 'approvals' && <AdminApprovals onNavigateTab={setAdminTab} />}
            {adminTab === 'all_tasks' && <AdminAllTasksReport />}
            {adminTab === 'overview' && <AdminDashboard onNavigateTab={setAdminTab} />}
            {adminTab === 'reports' && <AdminReports />}
            {adminTab === 'categories' && <AdminCategories />}
            {adminTab === 'users' && <AdminUsers />}
            {adminTab === 'rules' && <FirebaseRulesGuide />}
          </>
        ) : (
          // Standard Member View (Designer / Editor - progress input only)
          <UserDashboard />
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200 dark:border-slate-800/80 mt-12">
        <p>কাজের হিসাব &copy; {new Date().getFullYear()} — সকল অধিকার সংরক্ষিত।</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
