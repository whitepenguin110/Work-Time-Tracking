import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, Department, UserRole } from '../types';
import {
  authenticateAdmin,
  authenticateTeamMember,
  ADMIN_ACCOUNTS,
  TEAM_MEMBERS_LIST
} from '../config/accounts';
import {
  syncAllTeamMembers,
  updateMemberRealName,
  getCachedRealNames,
  formatMemberDisplayName
} from '../services/teamService';
import { seedCategoriesIfEmpty, testConnection } from '../services/firebase';

export interface SimpleAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  username?: string;
}

const LOCAL_STORAGE_SESSION_KEY = 'kajer_hishab_session_user_v2';

interface AuthContextType {
  user: SimpleAuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  needsRegistration: boolean;
  isAdmin: boolean;
  adminDepartmentScope?: 'all' | 'graphic' | 'video';
  loginWithCredentials: (identifier: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateMemberName: (username: string, newRealName: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  needsRegistration: false,
  isAdmin: false,
  adminDepartmentScope: undefined,
  loginWithCredentials: async () => {},
  signOutUser: async () => {},
  updateMemberName: async () => ({ success: false }),
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SimpleAuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize DB and sync team members in background
  useEffect(() => {
    testConnection();
    seedCategoriesIfEmpty().catch(() => {});
    syncAllTeamMembers().catch(() => {});
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (stored) {
        const parsedProfile: UserProfile = JSON.parse(stored);
        if (parsedProfile && parsedProfile.id) {
          const authUser: SimpleAuthUser = {
            uid: parsedProfile.id,
            email: parsedProfile.email,
            displayName: parsedProfile.name,
            username: parsedProfile.username,
          };
          setUser(authUser);
          setProfile(parsedProfile);
        }
      }
    } catch (e) {
      console.warn('Session restore note:', e);
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Primary Login with Username/Email and Case-Sensitive Password
  const loginWithCredentials = async (identifier: string, password: string) => {
    setLoading(true);

    const trimmedId = identifier.trim();

    // 1. Check if identifier is an Admin (whitepenguin110@gmail.com, itisamgfx@gmail.com, itvdrive84@gmail.com)
    const adminConfig = authenticateAdmin(trimmedId, password);
    if (adminConfig) {
      const adminProfile: UserProfile = {
        id: adminConfig.email,
        name: adminConfig.name,
        email: adminConfig.email,
        department: adminConfig.departmentScope === 'all' ? 'graphic' : adminConfig.departmentScope,
        role: 'admin',
        adminDepartmentScope: adminConfig.departmentScope,
        active: true,
        approvalStatus: 'approved',
        archived: false,
        createdAt: new Date().toISOString(),
      };

      const authUser: SimpleAuthUser = {
        uid: adminConfig.email,
        email: adminConfig.email,
        displayName: adminConfig.name,
      };

      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(adminProfile));
      setUser(authUser);
      setProfile(adminProfile);
      setLoading(false);
      return;
    }

    // 2. Check if identifier is a Team Member (designer1..10, videoeditor1..10)
    const memberConfig = authenticateTeamMember(trimmedId, password);
    if (memberConfig) {
      const cachedNames = getCachedRealNames();
      const realName = cachedNames[memberConfig.username] || '';
      const displayName = formatMemberDisplayName(memberConfig.username, realName);

      const memberProfile: UserProfile = {
        id: memberConfig.username,
        username: memberConfig.username,
        realName,
        name: displayName,
        email: `${memberConfig.username}@team.local`,
        department: memberConfig.department,
        role: 'user',
        active: true,
        approvalStatus: 'approved',
        archived: false,
        createdAt: new Date().toISOString(),
      };

      const authUser: SimpleAuthUser = {
        uid: memberConfig.username,
        username: memberConfig.username,
        email: `${memberConfig.username}@team.local`,
        displayName,
      };

      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(memberProfile));
      setUser(authUser);
      setProfile(memberProfile);
      setLoading(false);
      return;
    }

    // 3. Neither admin nor member matched -> Throw strict error
    setLoading(false);
    throw new Error('Wrong username or password');
  };

  // Sign out / Logout
  const signOutUser = async () => {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  // Admin updates real name of a team member
  const handleUpdateMemberName = async (username: string, newRealName: string) => {
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'শুধুমাত্র অ্যাডমিন নাম পরিবর্তন করতে পারবেন।' };
    }

    const scope = profile.adminDepartmentScope || 'all';
    const result = await updateMemberRealName(username, newRealName, scope, profile.email);

    // If the currently logged-in user is the one being renamed, update their state
    if (result.success && profile.username === username) {
      const updated = {
        ...profile,
        realName: newRealName.trim(),
        name: formatMemberDisplayName(username, newRealName.trim()),
      };
      setProfile(updated);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
    }

    return result;
  };

  const refreshProfile = async () => {
    // If user profile needs to reload cached real names
    if (profile && profile.username) {
      const cachedNames = getCachedRealNames();
      const realName = cachedNames[profile.username] || profile.realName || '';
      const displayName = formatMemberDisplayName(profile.username, realName);
      const updated = { ...profile, realName, name: displayName };
      setProfile(updated);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
    }
  };

  const isAdmin = profile?.role === 'admin';
  const adminDepartmentScope = profile?.adminDepartmentScope;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsRegistration: false, // No registration needed in fixed system
        isAdmin,
        adminDepartmentScope,
        loginWithCredentials,
        signOutUser,
        updateMemberName: handleUpdateMemberName,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
