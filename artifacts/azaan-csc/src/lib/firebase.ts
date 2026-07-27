import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// These values come from your Firebase project settings.
// In Replit: go to "Secrets" (lock icon) and add each key below.
// In GitHub Pages: add them as Repository secrets and expose via GitHub Actions.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase config is provided
const isConfigured = Object.values(firebaseConfig).every(Boolean);

if (!isConfigured) {
  console.warn(
    '[Firebase] Missing configuration. Add these secrets to Replit:\n' +
    '  VITE_FIREBASE_API_KEY\n' +
    '  VITE_FIREBASE_AUTH_DOMAIN\n' +
    '  VITE_FIREBASE_PROJECT_ID\n' +
    '  VITE_FIREBASE_STORAGE_BUCKET\n' +
    '  VITE_FIREBASE_MESSAGING_SENDER_ID\n' +
    '  VITE_FIREBASE_APP_ID\n' +
    'See SETUP.md for instructions.'
  );
}

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app!) : null;
export const db = isConfigured ? getFirestore(app!) : null;
export { isConfigured };

/** Action code settings for Firebase email-link (passwordless) sign-in.
 *  The URL points back to this app so the link handler runs on load. */
export function getActionCodeSettings() {
  return {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  };
}
