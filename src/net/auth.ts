// src/net/auth.ts
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  providerIds: string[];
}

/** Error with a message that is safe to show to the player. */
export class AuthFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthFailure';
    this.code = code;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for the player, or null if the input is acceptable. */
export function validateCredentials(
  email: string,
  password: string,
  mode: 'login' | 'register',
): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
  if (password.length === 0) return 'Enter your password.';
  if (mode === 'register' && password.length < 8) {
    return 'Use at least 8 characters for your password.';
  }
  return null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled.',
  // One message for all wrong-credential cases so nobody can probe which emails exist.
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-login-credentials': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'The sign-in window was blocked. Allow pop-ups and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already registered with a different sign-in method.',
};

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'unknown';
}

function toAuthFailure(error: unknown): AuthFailure {
  if (error instanceof AuthFailure) return error;
  const code = errorCode(error);
  const message = ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
  return new AuthFailure(code, message);
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((p) => p.providerId),
  };
}

/**
 * Thin wrapper around Firebase Authentication.
 * - Passwords are only sent to Firebase. They are never stored or logged here.
 * - Sessions persist across page reloads (local persistence).
 * - Every method throws AuthFailure with a player-friendly message.
 * Create it only when isFirebaseConfigured() is true (the constructor throws otherwise).
 */
export class AuthService {
  private readonly auth: Auth;

  constructor() {
    this.auth = getFirebaseAuth();
    // If local storage is blocked (e.g. private mode) Firebase falls back to its default.
    void setPersistence(this.auth, browserLocalPersistence).catch(() => undefined);
  }

  /** Resolves once Firebase has restored any saved session (user or null). */
  async waitForInitialState(): Promise<AuthUser | null> {
    await this.auth.authStateReady();
    return this.currentUser();
  }

  currentUser(): AuthUser | null {
    const user = this.auth.currentUser;
    return user ? toAuthUser(user) : null;
  }

  /** Calls the listener now and on every login/logout. Returns an unsubscribe function. */
  onAuthChanged(listener: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (user) => listener(user ? toAuthUser(user) : null));
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const problem = validateCredentials(email, password, 'register');
    if (problem) throw new AuthFailure('app/invalid-input', problem);

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
      return toAuthUser(credential.user);
    } catch (error) {
      throw toAuthFailure(error);
    }
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const problem = validateCredentials(email, password, 'login');
    if (problem) throw new AuthFailure('app/invalid-input', problem);

    try {
      const credential = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      return toAuthUser(credential.user);
    } catch (error) {
      throw toAuthFailure(error);
    }
  }

  /**
   * Google sign-in. Uses a pop-up and falls back to a full-page redirect when the
   * browser blocks pop-ups (common on phones). Returns null when a redirect started:
   * the page leaves and the session is restored when it comes back.
   */
  async loginWithGoogle(): Promise<AuthUser | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const credential = await signInWithPopup(this.auth, provider);
      return toAuthUser(credential.user);
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(this.auth, provider);
          return null;
        } catch (redirectError) {
          throw toAuthFailure(redirectError);
        }
      }
      throw toAuthFailure(error);
    }
  }

  /**
   * Sends a password-reset email. Succeeds even if no account exists for the address,
   * so the screen never reveals which emails are registered.
   */
  async resetPassword(email: string): Promise<void> {
    if (!EMAIL_PATTERN.test(email.trim())) {
      throw new AuthFailure('app/invalid-input', 'Enter a valid email address.');
    }

    try {
      await sendPasswordResetEmail(this.auth, email.trim());
    } catch (error) {
      if (errorCode(error) === 'auth/user-not-found') return;
      throw toAuthFailure(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw toAuthFailure(error);
    }
  }
  }
