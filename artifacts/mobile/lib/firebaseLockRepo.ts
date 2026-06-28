import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";

import { LockEntry } from "@/hooks/useLockStorage";
import { getFirebaseDb } from "./firebase";

/* ───────────────────────────────────────────────
   Device ID — unique per install, used as the
   RTDB path key instead of Firebase Auth UID.
   Stored in AsyncStorage and never changes.
─────────────────────────────────────────────── */
const DEVICE_ID_KEY = "focuslock_device_id";

export async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // uuid-lite: timestamp + random hex
    id = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/* ───────────────────────────────────────────────
   RTDB path helper
─────────────────────────────────────────────── */
function lockPath(deviceId: string, lockId?: string) {
  const base = `devices/${deviceId}/locks`;
  return lockId ? `${base}/${lockId}` : base;
}

/* ───────────────────────────────────────────────
   Firebase RTDB payload shape
─────────────────────────────────────────────── */
export interface FirebaseLockPayload {
  id: string;
  apps: string;          // JSON-serialised LockedAppEntry[]
  startTime: number;
  endTime: number;
  status: "ACTIVE" | "EXPIRED";
  durationLabel: string;
  createdAt: object;     // serverTimestamp() sentinel
}

/* ───────────────────────────────────────────────
   Server time
   Firebase exposes clock offset at:
     .info/serverTimeOffset  (ms to add to Date.now())
   This prevents phone-clock manipulation.
─────────────────────────────────────────────── */
export async function getServerTime(): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return Date.now();

  return new Promise((resolve) => {
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsub = onValue(
      offsetRef,
      (snap) => {
        unsub();
        const offset: number = snap.val() ?? 0;
        resolve(Date.now() + offset);
      },
      { onlyOnce: true }
    );
    // Fallback: resolve with local time after 5 s
    setTimeout(() => resolve(Date.now()), 5000);
  });
}

/* ───────────────────────────────────────────────
   Write a new lock to Firebase
─────────────────────────────────────────────── */
export async function saveFirebaseLock(
  deviceId: string,
  entry: LockEntry
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const payload: FirebaseLockPayload = {
    id: entry.id,
    apps: JSON.stringify(entry.apps),
    startTime: entry.startTime,
    endTime: entry.endTime,
    status: "ACTIVE",
    durationLabel: entry.durationLabel,
    createdAt: serverTimestamp(),
  };

  await set(ref(db, lockPath(deviceId, entry.id)), payload);
}

/* ───────────────────────────────────────────────
   Mark a lock EXPIRED in Firebase
─────────────────────────────────────────────── */
export async function markFirebaseLockExpired(
  deviceId: string,
  lockId: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  await update(ref(db, lockPath(deviceId, lockId)), {
    status: "EXPIRED",
  });
}

/* ───────────────────────────────────────────────
   Sync: fetch all Firebase locks and compare
   against server time. Returns active + newly
   expired entries for the caller to act on.
─────────────────────────────────────────────── */
export interface SyncResult {
  active: LockEntry[];
  newlyExpired: LockEntry[];
}

export async function syncLocksFromFirebase(
  deviceId: string
): Promise<SyncResult> {
  const db = getFirebaseDb();
  if (!db) return { active: [], newlyExpired: [] };

  const [snap, serverTime] = await Promise.all([
    get(ref(db, lockPath(deviceId))),
    getServerTime(),
  ]);

  if (!snap.exists()) return { active: [], newlyExpired: [] };

  const active: LockEntry[] = [];
  const newlyExpired: LockEntry[] = [];
  const expirePromises: Promise<void>[] = [];

  snap.forEach((child) => {
    const raw = child.val() as FirebaseLockPayload;

    const entry: LockEntry = {
      id: raw.id,
      apps: JSON.parse(raw.apps),
      startTime: raw.startTime,
      endTime: raw.endTime,
      status: raw.status,
      durationLabel: raw.durationLabel,
    };

    if (entry.status === "EXPIRED") return;     // already handled

    if (serverTime >= entry.endTime) {
      entry.status = "EXPIRED";
      newlyExpired.push(entry);
      expirePromises.push(markFirebaseLockExpired(deviceId, entry.id));
    } else {
      active.push(entry);
    }
  });

  await Promise.allSettled(expirePromises);
  return { active, newlyExpired };
}

/* ───────────────────────────────────────────────
   Real-time listener — fires on any lock change
─────────────────────────────────────────────── */
export function listenForLockChanges(
  deviceId: string,
  onUpdate: (result: SyncResult) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const locksRef = ref(db, lockPath(deviceId));
  const unsub = onValue(locksRef, async () => {
    const result = await syncLocksFromFirebase(deviceId);
    onUpdate(result);
  });

  return unsub;
}

/* ───────────────────────────────────────────────
   Online / offline detection via Firebase
─────────────────────────────────────────────── */
export function listenForConnectionState(
  onChange: (online: boolean) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) return () => {};

  const connRef = ref(db, ".info/connected");
  return onValue(connRef, (snap) => {
    onChange(snap.val() === true);
  });
}
