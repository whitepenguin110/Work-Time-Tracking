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
  const [loading, setLoading] = useState<boolean>(true);
  const [needsRegistration, setNeedsRegistration] = useState<boolean>(false);

  // Run testConnection on boot as required by skill
  useEffect(() => {
    testConnection();
  }, []);

  const fetchProfile = useCallback(async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile({ ...data, id: snap.id });
        setNeedsRegistration(false);
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
        await fetchProfile(firebaseUser);
      } else {
        setProfile(null);
        setNeedsRegistration(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

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
      role,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, newProfile);
      setProfile(newProfile);
      setNeedsRegistration(false);

      // If user registered as admin, seed categories if not seeded yet
      if (role === 'admin') {
        seedCategoriesIfEmpty();
      }
    } catch (err) {
      console.error('Registration failed:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const isAdmin = profile?.role === 'admin' && profile?.active === true;

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
