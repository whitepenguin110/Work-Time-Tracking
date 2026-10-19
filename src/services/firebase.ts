import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_CATEGORIES } from '../config/seedCategories';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

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
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test required by skill
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
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
      console.log('Categories collection is empty. Populating default seed data...');
      const batch = writeBatch(db);
      for (const item of INITIAL_CATEGORIES) {
        const newDocRef = doc(catCol);
        batch.set(newDocRef, {
          name: item.name,
          department: item.department,
          incentive: item.incentive,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      await batch.commit();
      console.log('Seed categories created successfully!');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Could not auto-seed categories (may require admin login):', err);
    return false;
  }
}

export { signInWithPopup, signOut };
