import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFirestoreError, getBengaliErrorMessage, OperationType, auth, FirestoreErrorInfo } from './firebase';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => {
  return {
    getAuth: vi.fn(() => ({
      currentUser: null,
    })),
    GoogleAuthProvider: class {
      setCustomParameters = vi.fn();
    },
    setPersistence: vi.fn().mockResolvedValue(undefined),
    browserLocalPersistence: {},
  };
});

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

describe('handleFirestoreError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should format error info correctly when user is logged in', () => {
    const errorMsg = 'permission-denied';
    const error = new Error(errorMsg);
    const path = 'some/path';
    const operationType = OperationType.GET;

    // Mock currentUser
    auth.currentUser = {
      uid: 'user123',
      email: 'test@example.com',
      emailVerified: true,
      isAnonymous: false,
    } as any;

    const { message: bengaliMessage, indexUrl } = getBengaliErrorMessage(error);
    const expectedErrInfo: FirestoreErrorInfo = {
      error: errorMsg,
      bengaliMessage,
      indexUrl,
      authInfo: {
        userId: 'user123',
        email: 'test@example.com',
        emailVerified: true,
        isAnonymous: false,
      },
      operationType,
      path,
    };

    expect(() => handleFirestoreError(error, operationType, path)).toThrowError(JSON.stringify(expectedErrInfo));
    expect(console.error).toHaveBeenCalledWith('Firestore Error [বাংলা]:', bengaliMessage, JSON.stringify(expectedErrInfo));
  });

  it('should handle string errors instead of Error objects', () => {
    const errorMsg = 'failed-precondition requires an index https://console.firebase.google.com/project/my-project/database/firestore/indexes?create_composite=ClVwcm9qZWN0cy9teS1wcm9qZWN0L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy93b3JrL2luZGV4ZXMvXwE';
    const path = 'works';
    const operationType = OperationType.LIST;

    auth.currentUser = null;

    const { message: bengaliMessage, indexUrl } = getBengaliErrorMessage(errorMsg);
    const expectedErrInfo: FirestoreErrorInfo = {
      error: errorMsg,
      bengaliMessage,
      indexUrl,
      authInfo: {
        userId: undefined,
        email: undefined,
        emailVerified: undefined,
        isAnonymous: undefined,
      },
      operationType,
      path,
    };

    expect(() => handleFirestoreError(errorMsg, operationType, path)).toThrowError(JSON.stringify(expectedErrInfo));
    expect(console.error).toHaveBeenCalledWith('Firestore Error [বাংলা]:', bengaliMessage, JSON.stringify(expectedErrInfo));
  });

  it('should handle missing currentUser properties gracefully', () => {
    const error = new Error('unavailable');
    const path = null;
    const operationType = OperationType.WRITE;

    // Mock currentUser with partial data
    auth.currentUser = {
      uid: 'anon123',
      isAnonymous: true,
    } as any;

    const { message: bengaliMessage, indexUrl } = getBengaliErrorMessage(error);
    const expectedErrInfo: FirestoreErrorInfo = {
      error: 'unavailable',
      bengaliMessage,
      indexUrl,
      authInfo: {
        userId: 'anon123',
        email: undefined,
        emailVerified: undefined,
        isAnonymous: true,
      },
      operationType,
      path,
    };

    expect(() => handleFirestoreError(error, operationType, path)).toThrowError(JSON.stringify(expectedErrInfo));
  });
});
