import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";

/* ───────────────────────────────────────────────
   Data types
─────────────────────────────────────────────── */
export interface LockedAppEntry {
  id: string;
  name: string;
  iconName: string;
  iconColor: string;
  packageName: string;
}

export interface LockEntry {
  id: string;
  apps: LockedAppEntry[];
  startTime: number;
  endTime: number;
  status: "ACTIVE" | "EXPIRED";
  durationLabel: string;
}

export interface ActiveLockDisplayItem {
  lockId: string;
  app: LockedAppEntry;
  startTime: number;
  endTime: number;
}

/* ───────────────────────────────────────────────
   Constants
─────────────────────────────────────────────── */
const STORAGE_KEY = "focuslock_locks_v2";
const NATIVE_FILE = "focuslock_data.json";

function getNativeFilePath(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${NATIVE_FILE}`;
}

/* ───────────────────────────────────────────────
   Core async storage helpers
─────────────────────────────────────────────── */
export async function getAllLocks(): Promise<LockEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getActiveLocks(): Promise<LockEntry[]> {
  const now = Date.now();
  const locks = await getAllLocks();
  return locks.filter((l) => l.status === "ACTIVE" && l.endTime > now);
}

export async function saveLock(entry: LockEntry): Promise<void> {
  const locks = await getAllLocks();
  locks.push(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
  await syncToNativeFile(locks);
}

export async function refreshExpiredLocks(): Promise<LockEntry[]> {
  const now = Date.now();
  const locks = await getAllLocks();
  let changed = false;

  const updated = locks.map((l) => {
    if (l.status === "ACTIVE" && l.endTime <= now) {
      changed = true;
      return { ...l, status: "EXPIRED" as const };
    }
    return l;
  });

  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await syncToNativeFile(updated);
  }

  return updated;
}

/* ───────────────────────────────────────────────
   Native file sync (for Kotlin AccessibilityService)
   Writes to documentDirectory/focuslock_data.json
   which Kotlin reads via context.filesDir
─────────────────────────────────────────────── */
async function syncToNativeFile(locks: LockEntry[]): Promise<void> {
  try {
    const filePath = getNativeFilePath();
    if (!filePath) return;

    const nativePayload = {
      locks: locks
        .filter((l) => l.status === "ACTIVE")
        .map((l) => ({
          id: l.id,
          appPackageNames: l.apps.map((a) => a.packageName),
          endTime: l.endTime,
        })),
      updatedAt: Date.now(),
    };

    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(nativePayload),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
  } catch {
    // Best-effort — native sync failure doesn't break the JS layer
  }
}

/* ───────────────────────────────────────────────
   Duration helpers
─────────────────────────────────────────────── */
export function getDurationMs(
  preset: string,
  customDays: string,
  customHours: string
): number {
  const MS_DAY = 24 * 60 * 60 * 1000;
  if (preset === "1d") return MS_DAY;
  if (preset === "7d") return 7 * MS_DAY;
  if (preset === "30d") return 30 * MS_DAY;
  const d = parseInt(customDays) || 0;
  const h = parseInt(customHours) || 0;
  return (d * 24 + h) * 60 * 60 * 1000;
}

export function getDurationLabel(
  preset: string,
  customDays: string,
  customHours: string
): string {
  if (preset === "1d") return "1 Day";
  if (preset === "7d") return "7 Days";
  if (preset === "30d") return "30 Days";
  const d = parseInt(customDays) || 0;
  const h = parseInt(customHours) || 0;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  return `Custom: ${parts.join(" ")}`;
}

export function formatTimeRemaining(endTime: number): string {
  const ms = endTime - Date.now();
  if (ms <= 0) return "Expired";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m remaining`;
  return "< 1 minute remaining";
}

export function formatExpiryDate(endTime: number): string {
  return new Date(endTime).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getLockProgress(startTime: number, endTime: number): number {
  const now = Date.now();
  const total = endTime - startTime;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - startTime) / total));
}

/* ───────────────────────────────────────────────
   React hook — real-time active locks
─────────────────────────────────────────────── */
export function useActiveLocks(refreshIntervalMs = 60_000) {
  const [locks, setLocks] = useState<LockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const updated = await refreshExpiredLocks();
    const active = updated.filter((l) => l.status === "ACTIVE");
    setLocks(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, refreshIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, refreshIntervalMs]);

  const displayItems: ActiveLockDisplayItem[] = locks.flatMap((entry) =>
    entry.apps.map((app) => ({
      lockId: entry.id,
      app,
      startTime: entry.startTime,
      endTime: entry.endTime,
    }))
  );

  return { locks, displayItems, loading, refresh };
}
