import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Demo-mode toggle. When VITE_DEMO_MODE === 'true' the Vite build aliases
// the `firebase/app`, `firebase/auth` and `firebase/firestore` imports above
// to our in-memory mocks under `src/lib/mock/`.
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// Firebase project config (used only when demo mode is off).
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// In demo mode we consider the app configured; otherwise require every key.
const isConfigured = isDemoMode || Object.values(firebaseConfig).every(Boolean);

if (!isConfigured) {
  console.warn(
    '[Firebase] Missing configuration. Add these secrets:\n' +
    '  VITE_FIREBASE_API_KEY\n' +
    '  VITE_FIREBASE_AUTH_DOMAIN\n' +
    '  VITE_FIREBASE_PROJECT_ID\n' +
    '  VITE_FIREBASE_STORAGE_BUCKET\n' +
    '  VITE_FIREBASE_MESSAGING_SENDER_ID\n' +
    '  VITE_FIREBASE_APP_ID\n' +
    'Or set VITE_DEMO_MODE=true to run with in-memory demo data.'
  );
}

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app!) : null;
export const db = isConfigured ? getFirestore(app!) : null;
export { isConfigured };

/**
 * A promise that resolves once Firebase Auth persistence has been set to
 * browserSessionPersistence — meaning the session lives for the lifetime of
 * the browser tab (survives refresh/navigation) but is cleared when the
 * browser is fully closed and reopened.
 *
 * Import and await this before any signIn call so the persistence type is
 * guaranteed to be set before credentials are committed to storage.
 */
export const authReady: Promise<void> = auth
  ? setPersistence(auth, browserSessionPersistence).catch(err => {
      console.warn('[Firebase] Could not set session persistence:', err);
    }).then(() => {})
  : Promise.resolve();

/** Action code settings for Firebase email-link (passwordless) sign-in.
 *  The URL points back to this app so the link handler runs on load. */
export function getActionCodeSettings() {
  return {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  };
}
