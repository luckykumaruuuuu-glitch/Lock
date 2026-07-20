/**
 * reelsLockOff.ts
 *
 * Persists the Reels-Lock "off" state to AsyncStorage so the chosen duration
 * survives app restarts and process kills.
 *
 * Storage key : "duckLockOffUntil"
 * Value shape : JSON-serialised ReelsLockOffState | null (missing key = not off)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const REELS_LOCK_OFF_KEY = "duckLockOffUntil";

export type ReelsLockOffState =
  | { type: "forever" }
  | { type: "timed"; until: number }; // unix milliseconds

/** Persist the chosen off-duration. */
export async function saveReelsLockOff(state: ReelsLockOffState): Promise<void> {
  await AsyncStorage.setItem(REELS_LOCK_OFF_KEY, JSON.stringify(state));
}

/** Read the stored off-state. Returns null if not set or on parse error. */
export async function getReelsLockOff(): Promise<ReelsLockOffState | null> {
  try {
    const raw = await AsyncStorage.getItem(REELS_LOCK_OFF_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReelsLockOffState;
  } catch {
    return null;
  }
}

/** Remove the off-state (lock is back ON). */
export async function clearReelsLockOff(): Promise<void> {
  await AsyncStorage.removeItem(REELS_LOCK_OFF_KEY);
}

/**
 * Returns a human-readable "time remaining" string for a timed off-state,
 * or null if the duration has already expired.
 */
export function formatOffTimeRemaining(state: ReelsLockOffState): string | null {
  if (state.type !== "timed") return null;
  const ms = state.until - Date.now();
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days  = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  if (days > 0)  return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}
