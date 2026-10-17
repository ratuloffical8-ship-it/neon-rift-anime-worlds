// src/net/firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

/**
 * Firebase web configuration comes from environment variables (Vite reads
 * them from a local `.env` file and from Render's environment settings):
 *
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 *
 * These web values are not secrets (every visitor's browser receives them).
 * Security comes from Firebase Authentication and Firestore Security Rules.
 * NEVER put a service-account key or any private credential in frontend code.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

function readConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = env.VITE_FIREBASE_APP_ID as string | undefined;

  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return { apiKey, authDomain, projectId, appId };
}

/** True when all required environment variables are set. */
export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}

/** Returns the shared Firebase app. Throws a clear error if it is not configured. */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();

  const config = readConfig();
  if (!config) {
    throw new Error(
      'Firebase is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, ' +
        'VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID (see .env.example).',
    );
  }
  return initializeApp(config);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
