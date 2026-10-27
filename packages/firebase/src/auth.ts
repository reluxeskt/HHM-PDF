import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './config';
import { UserProfile } from '../../shared/src/types';

export class AuthService {
  /**
   * Listen to Firebase auth state changes
   */
  static onAuthChange(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth();
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Get currently authenticated Firebase user
   */
  static getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    return auth ? auth.currentUser : null;
  }

  /**
   * Register with Email and Password
   */
  static async signUp(email: string, pass: string, displayName?: string): Promise<User> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Running in Local Offline Mode.');
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  }

  /**
   * Sign In with Email and Password
   */
  static async signIn(email: string, pass: string): Promise<User> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Running in Local Offline Mode.');
    }
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  }

  /**
   * Sign In with Google via Popup
   */
  static async signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not configured. Running in Local Offline Mode.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  /**
   * Send Password Reset Email
   */
  static async resetPassword(email: string): Promise<void> {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Authentication is not configured.');
    }
    await sendPasswordResetEmail(auth, email);
  }

  /**
   * Sign Out of current session
   */
  static async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      await fbSignOut(auth);
    }
  }
}
