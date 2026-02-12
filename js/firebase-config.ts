/**
 * Firebase configuration and initialization
 * This module handles Firebase initialization and exports the Firestore instance
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Firebase configuration
// These should be environment variables in production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase app and services
 * @returns Object containing initialized Firebase services
 */
export function initFirebase(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
} {
  if (app && db && auth) {
    return { app, db, auth };
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  // Connect to emulator in development
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
  ) {
    const emulatorHost =
      import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    const emulatorPort = parseInt(
      import.meta.env.VITE_FIREBASE_EMULATOR_PORT || '8080',
      10
    );
    try {
      connectFirestoreEmulator(db, emulatorHost, emulatorPort);
      console.log(
        `Connected to Firestore emulator at ${emulatorHost}:${emulatorPort}`
      );
    } catch (error) {
      console.warn('Failed to connect to Firestore emulator:', error);
    }
  }

  return { app, db, auth };
}

/**
 * Get the Firestore instance
 * Initializes Firebase if not already initialized
 */
export function getFirestoreInstance(): Firestore {
  if (!db) {
    const { db: firestore } = initFirebase();
    return firestore;
  }
  return db;
}

/**
 * Get the Auth instance
 * Initializes Firebase if not already initialized
 */
export function getAuthInstance(): Auth {
  if (!auth) {
    const { auth: firebaseAuth } = initFirebase();
    return firebaseAuth;
  }
  return auth;
}

/**
 * Check if Firebase is configured for production
 */
export function isProductionFirebase(): boolean {
  return firebaseConfig.apiKey !== 'demo-api-key';
}

/**
 * Get current user ID or null if not authenticated
 * For demo mode, returns 'demo-user'
 *
 * WARNING: Demo mode shares data across all users.
 * This is for development only. Implement Firebase Auth for production.
 */
export function getCurrentUserId(): string | null {
  if (!isProductionFirebase()) {
    // Demo mode: All users share the same data
    // This is INSECURE and only for development
    console.warn(
      'Running in demo mode - all users share data. Implement Firebase Auth for production.'
    );
    return 'demo-user';
  }

  const authInstance = getAuthInstance();
  return authInstance.currentUser?.uid || null;
}
