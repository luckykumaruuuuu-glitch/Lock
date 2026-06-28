import { getApp, getApps, initializeApp } from "firebase/app";
import { Database, getDatabase } from "firebase/database";

/* ───────────────────────────────────────────────
   Firebase config — values come from EXPO_PUBLIC_*
   env vars (see .env.example for setup guide).

   The app works in "local-only" mode when these
   are not set — all locking still works, but
   server-time verification and cloud sync are off.
─────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** True only when all three required env vars are present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId
);

/* ───────────────────────────────────────────────
   Lazy singleton database instance.
   Auth is intentionally omitted — we use a
   device-local UUID as the RTDB path, which
   provides sufficient isolation for a single-
   device use-case without managing auth tokens.
─────────────────────────────────────────────── */
let _db: Database | null = null;

export function getFirebaseDb(): Database | null {
  if (!isFirebaseConfigured) return null;
  if (_db) return _db;

  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  _db = getDatabase(app);
  return _db;
}
