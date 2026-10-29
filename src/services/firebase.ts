import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  limit,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import defaultAppletConfig from '../../firebase-applet-config.json';
import { INITIAL_CATEGORIES } from '../config/seedCategories';

// Read configuration from environment variables with safe fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultAppletConfig.appId,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure local persistence so sessions persist reliably
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence initialization:', err);
});

// Use specified custom database ID if provided in env or config
const customDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultAppletConfig.firestoreDatabaseId;
export const db = customDatabaseId
  ? getFirestore(app, customDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// Ensure select_account prompt so users can easily pick accounts
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  bengaliMessage: string;
  operationType: OperationType;
  path: string | null;
  indexUrl?: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

/**
 * Translates Firestore errors into friendly Bengali messages
 */
export function getBengaliErrorMessage(err: unknown): { message: string; indexUrl: string | null } {
  const rawMsg = err instanceof Error ? err.message : String(err);
  let indexUrl: string | null = null;

  // Check for missing index link
  const urlMatch = rawMsg.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
  if (urlMatch) {
    indexUrl = urlMatch[0];
  }

  if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
    return {
      message: 'আপনার এই তথ্যটি দেখা, যোগ বা পরিবর্তন করার অনুমতি নেই (Permission Denied)।',
      indexUrl: null,
    };
  }

  if (rawMsg.includes('failed-precondition') || rawMsg.includes('requires an index')) {
    return {
      message:
        'এই তথ্যগুলো ফিল্টার করতে ফায়ারবেসে একটি ইনডেক্স প্রয়োজন (Missing Index)। নিচের লিংকে গিয়ে ইনডেক্স তৈরি করুন অথবা firestore.indexes.json ডিপ্লয় করুন।',
      indexUrl,
    };
  }

  if (rawMsg.includes('unavailable') || rawMsg.includes('offline')) {
    return {
      message: 'ইন্টারনেট সংযোগ পাওয়া যায়নি অথবা ফায়ারবেস সার্ভারের সাথে যোগাযোগ বিচ্ছিন্ন রয়েছে।',
      indexUrl: null,
    };
  }

  return {
    message: `একটি অপ্রত্যাশিত সমস্যা হয়েছে: ${rawMsg}`,
    indexUrl,
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const { message: bengaliMessage, indexUrl } = getBengaliErrorMessage(error);

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    bengaliMessage,
    indexUrl,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };

  console.error('Firestore Error [বাংলা]:', bengaliMessage, JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test
export async function testConnection(): Promise<void> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: Client currently appears offline.');
    }
  }
}

// Seed default categories if collection is empty
export async function seedCategoriesIfEmpty(): Promise<boolean> {
  try {
    const catCol = collection(db, 'categories');
    const q = query(catCol, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const batch = writeBatch(db);
      for (const item of INITIAL_CATEGORIES) {
        const newDocRef = doc(catCol);
        batch.set(newDocRef, {
          name: item.name,
          department: item.department,
          incentive: item.incentive,
          active: true,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      console.log('ডিফল্ট ক্যাটাগরি সফলভাবে সিড করা হয়েছে!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('ক্যাটাগরি সিড করা যায়নি (শুধুমাত্র অ্যাডমিন অধিকার প্রয়োজন হতে পারে):', err);
    return false;
  }
}

export {
  signInWithPopup,
  signInWithCredential,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile
};
