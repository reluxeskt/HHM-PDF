import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

// Read from import.meta.env or window global config
const getEnvConfig = (): FirebaseClientConfig => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {} as any;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.apiKey),
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.authDomain),
    projectId: env.VITE_FIREBASE_PROJECT_ID || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.projectId),
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.storageBucket),
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.messagingSenderId),
    appId: env.VITE_FIREBASE_APP_ID || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.appId),
    firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.firestoreDatabaseId),
  };
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

export function isFirebaseConfigured(): boolean {
  const config = getEnvConfig();
  return Boolean(config.apiKey && config.projectId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    if (getApps().length > 0) {
      appInstance = getApp();
    } else {
      const config = getEnvConfig();
      appInstance = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!dbInstance) {
    const config = getEnvConfig();
    dbInstance = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  }
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!storageInstance) {
    storageInstance = getStorage(app);
  }
  return storageInstance;
}
