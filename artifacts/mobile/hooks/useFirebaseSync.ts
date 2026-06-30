import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { isFirebaseConfigured } from "@/lib/firebase";
import {
  getDeviceId,
  listenForConnectionState,
  listenForLockChanges,
  saveFirebaseLock,
  SyncResult,
  syncLocksFromFirebase,
} from "@/lib/firebaseLockRepo";
import {
  getAllLocks,
  LockEntry,
  refreshExpiredLocks,
  saveLock,
} from "./useLockStorage";

/* ───────────────────────────────────────────────
   Notification handler — must be set before any
   notification APIs are called.
─────────────────────────────────────────────── */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestNotificationPermissions(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.requestPermissionsAsync();
}

async function scheduleUnlockNotification(entry: LockEntry): Promise<void> {
  if (Platform.OS === "web") return;

  const trigger = new Date(entry.endTime);
  if (trigger <= new Date()) return;   // already in the past

  const appNames = entry.apps.map((a) => a.name).join(", ");

  await Notifications.scheduleNotificationAsync({
    identifier: `unlock_${entry.id}`,
    content: {
      title: "🔓 DuckLock — Locks Removed",
      body: `Your lock on ${appNames} has expired. Stay focused! 💪`,
      data: { lockId: entry.id },
    },
    trigger: { date: trigger },
  });
}

async function cancelUnlockNotification(lockId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(`unlock_${lockId}`).catch(() => {});
}

/* ───────────────────────────────────────────────
   Merge Firebase sync result into local storage
─────────────────────────────────────────────── */
async function applyFirebaseSync(result: SyncResult): Promise<void> {
  // Cancel notifications for locks that just expired
  for (const expired of result.newlyExpired) {
    await cancelUnlockNotification(expired.id);
  }

  // Add any active Firebase locks missing from local storage
  const local = await getAllLocks();
  const localIds = new Set(local.map((l) => l.id));

  for (const remote of result.active) {
    if (!localIds.has(remote.id)) {
      await saveLock(remote);
      await scheduleUnlockNotification(remote);
    }
  }
}

/* ───────────────────────────────────────────────
   Hook public shape
─────────────────────────────────────────────── */
export interface FirebaseSyncState {
  deviceId: string | null;
  online: boolean;
  lastSyncedAt: number | null;
  configured: boolean;
}

const SYNC_INTERVAL_MS = 30 * 60 * 1000;   // 30 minutes

export function useFirebaseSync() {
  const [state, setState] = useState<FirebaseSyncState>({
    deviceId: null,
    online: false,
    lastSyncedAt: null,
    configured: isFirebaseConfigured,
  });

  const deviceIdRef = useRef<string | null>(null);
  const unsubLocks = useRef<(() => void) | null>(null);
  const unsubConn = useRef<(() => void) | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /* ── Full server-time sync ─────────────────── */
  const runSync = useCallback(async (deviceId: string) => {
    try {
      const result = await syncLocksFromFirebase(deviceId);
      await applyFirebaseSync(result);
      setState((s) => ({ ...s, lastSyncedAt: Date.now() }));
    } catch {
      // Fallback: expire locally using device clock
      await refreshExpiredLocks();
    }
  }, []);

  /* ── Initialise listeners ────────────────── */
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let mounted = true;

    (async () => {
      await requestNotificationPermissions();

      const deviceId = await getDeviceId();
      if (!mounted) return;

      deviceIdRef.current = deviceId;
      setState((s) => ({ ...s, deviceId }));

      // Schedule notifications for existing active locks
      const local = await getAllLocks();
      for (const l of local) {
        if (l.status === "ACTIVE") {
          await scheduleUnlockNotification(l);
        }
      }

      // Initial server-time sync
      await runSync(deviceId);

      // Real-time change listener
      unsubLocks.current = listenForLockChanges(deviceId, (result) => {
        applyFirebaseSync(result);
      });

      // Online/offline detection
      unsubConn.current = listenForConnectionState((online) => {
        setState((s) => ({ ...s, online }));
        if (online && deviceIdRef.current) {
          runSync(deviceIdRef.current);
        }
      });

      // 30-minute periodic sync
      syncIntervalRef.current = setInterval(() => {
        if (deviceIdRef.current) runSync(deviceIdRef.current);
      }, SYNC_INTERVAL_MS);
    })();

    return () => {
      mounted = false;
      unsubLocks.current?.();
      unsubConn.current?.();
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [runSync]);

  /* ── App foreground sync ─────────────────── */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (
        appStateRef.current !== "active" &&
        next === "active" &&
        deviceIdRef.current &&
        isFirebaseConfigured
      ) {
        runSync(deviceIdRef.current);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [runSync]);

  /* ── Save new lock to Firebase ─────────────── */
  const saveFirebaseLockOnConfirm = useCallback(async (entry: LockEntry) => {
    if (!isFirebaseConfigured) return;

    const deviceId = deviceIdRef.current ?? (await getDeviceId());
    if (!deviceIdRef.current) deviceIdRef.current = deviceId;

    try {
      await saveFirebaseLock(deviceId, entry);
      await scheduleUnlockNotification(entry);
    } catch {
      // Lock already saved locally — Firebase failure is non-fatal
    }
  }, []);

  return { ...state, saveFirebaseLockOnConfirm };
}
