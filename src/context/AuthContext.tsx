import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  handleFirestoreError,
  OperationType,
  testConnection,
  seedCategoriesIfEmpty
} from '../services/firebase';
import { UserProfile, Department, UserRole } from '../types';
import { INITIAL_ADMIN_EMAILS } from '../config/admins';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsRegistration: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  registerProfile: (name: string, department: Department) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  needsRegistration: false,
  isAdmin: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  registerProfile: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsRegistration, setNeedsRegistration] = useState<boolean>(false);

  // Run initial connection test on boot
  useEffect(() => {
    testConnection();
  }, []);

  const fetchProfileAndAdminStatus = useCallback(async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const email = (firebaseUser.email || '').toLowerCase().trim();
    const adminDocRef = doc(db, 'admins', email);

    try {
      const [userSnap, adminSnap] = await Promise.all([
        getDoc(userDocRef),
        getDoc(adminDocRef).catch(() => null), // Non-admins might get permission-denied reading /admins
      ]);

      const isBootstrapEmail = INITIAL_ADMIN_EMAILS.some((e) => e.toLowerCase().trim() === email);
      const isActualAdmin = adminSnap?.exists() || isBootstrapEmail;
      setIsAdmin(Boolean(isActualAdmin));

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setProfile({
          ...data,
          id: userSnap.id,
          role: isActualAdmin ? 'admin' : (data.role || 'user'),
        });
        setNeedsRegistration(false);

        // If bootstrap admin and admin doc doesn't exist yet, seed it
        if (isBootstrapEmail && (!adminSnap || !adminSnap.exists())) {
          try {
            await setDoc(adminDocRef, {
              email,
              active: true,
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch {
            // Silently ignore if already restricted
          }
        }
      } else {
        setProfile(null);
        setNeedsRegistration(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfileAndAdminStatus(firebaseUser);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setNeedsRegistration(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfileAndAdminStatus]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setNeedsRegistration(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const registerProfile = async (name: string, department: Department) => {
    if (!user) throw new Error('ব্যবহারকারী লগইন করা নেই।');

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isInitialAdmin = INITIAL_ADMIN_EMAILS.some(
      (email) => email.toLowerCase().trim() === normalizedEmail
    );
    const role: UserRole = isInitialAdmin ? 'admin' : 'user';

    const newProfile: UserProfile = {
      id: user.uid,
      name: name.trim() || user.displayName || 'নামহীন',
      email: normalizedEmail,
      department,
      role: 'user', // strictly conforms to security rules requirement: on create role must be 'user'
      active: true,
      createdAt: new Date().toISOString(),
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, newProfile);

      // If initial admin, create admins document
      if (isInitialAdmin) {
        try {
          await setDoc(doc(db, 'admins', normalizedEmail), {
            email: normalizedEmail,
            active: true,
            createdAt: new Date().toISOString(),
          }, { merge: true });
          setIsAdmin(true);
          newProfile.role = 'admin';
        } catch (e) {
          console.warn('Admin doc creation deferred:', e);
        }
      }

      setProfile(newProfile);
      setNeedsRegistration(false);

      if (isInitialAdmin) {
        seedCategoriesIfEmpty();
      }
    } catch (err) {
      console.error('Registration failed:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndAdminStatus(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsRegistration,
        isAdmin,
        signInWithGoogle,
        signOutUser,
        registerProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
