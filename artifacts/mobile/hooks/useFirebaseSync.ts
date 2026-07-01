import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";
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
  getActiveLocks,
  getAllLocks,
  LockEntry,
  readStartupCacheLocks,
  refreshExpiredLocks,
  saveLock,
  writeStartupUnverifiedMarker,
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
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: trigger },
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
   Startup sync status — tracks whether the
   cold-start Firebase verification has completed.
   'checking' : verification in progress (block navigation)
   'synced'   : locks verified and restored from Firebase
   'no-locks' : Firebase confirmed no active locks exist
─────────────────────────────────────────────── */
export type StartupSyncStatus = "checking" | "synced" | "no-locks";

/* ───────────────────────────────────────────────
   Hook public shape
─────────────────────────────────────────────── */
export interface FirebaseSyncState {
  deviceId: string | null;
  online: boolean;
  lastSyncedAt: number | null;
  configured: boolean;
  startupSyncStatus: StartupSyncStatus;
}

const SYNC_INTERVAL_MS = 30 * 60 * 1000;   // 30 minutes
const STARTUP_VERIFY_TIMEOUT_MS = 5000;     // Never block UI for more than 5s

export function useFirebaseSync() {
  const [state, setState] = useState<FirebaseSyncState>({
    deviceId: null,
    online: false,
    lastSyncedAt: null,
    configured: isFirebaseConfigured,
    startupSyncStatus: "checking",
  });

  const deviceIdRef = useRef<string | null>(null);
  const unsubLocks = useRef<(() => void) | null>(null);
  const unsubConn = useRef<(() => void) | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    let mounted = true;

    // Safety net: never leave the app in 'checking' state beyond 5s
    startupTimeoutRef.current = setTimeout(() => {
      setState((s) =>
        s.startupSyncStatus === "checking"
          ? { ...s, startupSyncStatus: "synced" }
          : s
      );
    }, STARTUP_VERIFY_TIMEOUT_MS);

    (async () => {
      await requestNotificationPermissions();

      /* ── Step 1: Startup verification ────────────────────────────────
         Before anything else, ensure that the 1-3s Firebase sync window
         cannot be exploited after a Clear Data / fresh install.

         Write the unverified marker to focuslock_data.json immediately
         so the Kotlin AccessibilityService knows to use the startup cache
         conservatively while we fetch from Firebase.
      ─────────────────────────────────────────────────────────────────── */
      await writeStartupUnverifiedMarker();

      if (!isFirebaseConfigured) {
        // Firebase not configured — check local + startup cache, resolve immediately
        const localActive = await getActiveLocks();
        if (!mounted) return;
        if (localActive.length > 0) {
          setState((s) => ({ ...s, startupSyncStatus: "synced" }));
        } else {
          const cached = await readStartupCacheLocks();
          setState((s) => ({
            ...s,
            startupSyncStatus: cached.length > 0 ? "synced" : "no-locks",
          }));
        }
        // Schedule notifications for existing local locks
        for (const l of localActive) {
          if (l.status === "ACTIVE") await scheduleUnlockNotification(l);
        }
        return;
      }

      /* ── Firebase is configured ─────────────────────────────────── */
      const deviceId = await getDeviceId();
      if (!mounted) return;

      deviceIdRef.current = deviceId;
      setState((s) => ({ ...s, deviceId }));

      // Schedule notifications for existing active local locks
      const local = await getAllLocks();
      for (const l of local) {
        if (l.status === "ACTIVE") {
          await scheduleUnlockNotification(l);
        }
      }

      /* ── Step 2: Check local storage first ──────────────────────────
         If local storage has active locks, the data is intact —
         no sync gap is possible. Resolve immediately and run the
         server-time sync in the background.
      ─────────────────────────────────────────────────────────────────── */
      const localActive = await getActiveLocks();

      if (localActive.length > 0) {
        // Local data is present — no gap. Mark verified and sync in background.
        if (mounted) {
          setState((s) => ({ ...s, startupSyncStatus: "synced" }));
        }
        // Background server-time sync (verifies endTimes, catches expiries)
        runSync(deviceId);
      } else {
        /* ── Step 3: Local is empty — critical Firebase check ───────────
           This is the dangerous window (Clear Data / fresh install).
           Fetch Firebase synchronously before resolving startup status.
           The blocking service must not allow locked apps through here.
        ─────────────────────────────────────────────────────────────────── */
        try {
          const result = await syncLocksFromFirebase(deviceId);
          if (!mounted) return;

          await applyFirebaseSync(result);
          setState((s) => ({
            ...s,
            lastSyncedAt: Date.now(),
            startupSyncStatus: result.active.length > 0 ? "synced" : "no-locks",
          }));
        } catch {
          /* ── Step 4: Firebase unreachable — startup cache fallback ──────
             No internet or Firebase error. Use the last-known locks cache
             (focuslock_startup_cache.json) as a conservative fallback.
             If cache is also empty, resolve 'no-locks'.
          ─────────────────────────────────────────────────────────────────── */
          if (!mounted) return;
          const cached = await readStartupCacheLocks();
          // Restore cached locks to local storage so blocking service has data
          for (const lock of cached) {
            await saveLock(lock);
          }
          setState((s) => ({
            ...s,
            startupSyncStatus: cached.length > 0 ? "synced" : "no-locks",
          }));
          // Also run local expiry refresh as best-effort
          await refreshExpiredLocks();
        }
      }

      if (!mounted) return;

      // Real-time change listener (ongoing, post-startup)
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
      if (startupTimeoutRef.current) clearTimeout(startupTimeoutRef.current);
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
