import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
  seedCategoriesIfEmpty
} from '../services/firebase';
import { UserProfile, Department, UserRole } from '../types';
import { isFixedAdminEmail } from '../config/admins';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsRegistration: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string, department: Department) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateUserName: (newName: string) => Promise<void>;
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
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  changePassword: async () => {},
  updateUserName: async () => {},
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

  useEffect(() => {
    testConnection();
  }, []);

  const fetchProfileAndAdminStatus = useCallback(async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const email = (firebaseUser.email || '').toLowerCase().trim();
    const isFixedAdmin = isFixedAdminEmail(email);

    setIsAdmin(isFixedAdmin);

    try {
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const finalRole: UserRole = isFixedAdmin ? 'admin' : 'user';
        setProfile({
          ...data,
          id: userSnap.id,
          role: finalRole,
        });
        setNeedsRegistration(false);

        // Ensure admin document exists in /admins/{email} for security rules
        if (isFixedAdmin) {
          try {
            await setDoc(
              doc(db, 'admins', email),
              {
                email,
                active: true,
                createdAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch {
            // Silently ignore
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

  // 1. Google Sign In
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // 2. Email & Password Sign In
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error('Email sign in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // 3. Email & Password Sign Up (with Name & Department directly)
  const signUpWithEmail = async (
    name: string,
    email: string,
    password: string,
    department: Department
  ) => {
    try {
      setLoading(true);
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const newUser = userCred.user;

      // Update Firebase Auth display name
      await updateProfile(newUser, { displayName: name.trim() });

      const normalizedEmail = email.toLowerCase().trim();
      const isFixedAdmin = isFixedAdminEmail(normalizedEmail);
      const role: UserRole = isFixedAdmin ? 'admin' : 'user';

      const newProfile: UserProfile = {
        id: newUser.uid,
        name: name.trim(),
        email: normalizedEmail,
        department,
        role,
        active: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUser.uid), newProfile);

      if (isFixedAdmin) {
        try {
          await setDoc(
            doc(db, 'admins', normalizedEmail),
            {
              email: normalizedEmail,
              active: true,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {
          // Ignore
        }
      }

      setProfile(newProfile);
      setIsAdmin(isFixedAdmin);
      setNeedsRegistration(false);

      if (isFixedAdmin) {
        seedCategoriesIfEmpty();
      }
    } catch (error) {
      console.error('Email registration failed:', error);
      setLoading(false);
      throw error;
    }
  };

  // 4. Change Password (for logged in user)
  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error('ব্যবহারকারী লগইন করা নেই।');
    await updatePassword(auth.currentUser, newPassword);
  };

  // 5. Update Profile Name
  const updateUserName = async (newName: string) => {
    if (!auth.currentUser || !profile) throw new Error('ব্যবহারকারী লগইন করা নেই।');
    const trimmed = newName.trim();
    if (!trimmed) throw new Error('নাম খালি রাখা যাবে না।');

    await updateProfile(auth.currentUser, { displayName: trimmed });
    await updateDoc(doc(db, 'users', profile.id), { name: trimmed });
    setProfile({ ...profile, name: trimmed });
  };

  // 6. Sign Out
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

  // 7. Complete Registration (for first-time Google sign-ins)
  const registerProfile = async (name: string, department: Department) => {
    if (!user) throw new Error('ব্যবহারকারী লগইন করা নেই।');

    const normalizedEmail = (user.email || '').toLowerCase().trim();
    const isFixedAdmin = isFixedAdminEmail(normalizedEmail);
    const role: UserRole = isFixedAdmin ? 'admin' : 'user';

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

      if (isFixedAdmin) {
        try {
          await setDoc(
            doc(db, 'admins', normalizedEmail),
            {
              email: normalizedEmail,
              active: true,
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
          setIsAdmin(true);
        } catch (e) {
          console.warn('Admin doc creation deferred:', e);
        }
      }

      setProfile(newProfile);
      setNeedsRegistration(false);

      if (isFixedAdmin) {
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
        signInWithEmail,
        signUpWithEmail,
        changePassword,
        updateUserName,
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
