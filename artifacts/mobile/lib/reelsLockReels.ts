/**
 * reelsLockReels.ts
 *
 * Persists the "reel-count schedule" unlock state to AsyncStorage.
 * When the user picks a reel count from ReelCountScheduleScreen, this stores
 * how many reels are still allowed before the lock auto re-enables.
 *
 * Storage key : "duckLockReelsRemaining"
 * Value shape : JSON-serialised ReelsRemainingState | null (missing = not in count mode)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SourcePlatform } from "./unlockFlowState";

export const REELS_REMAINING_KEY = "duckLockReelsRemaining";

export type ReelsRemainingState = {
  count: number;
  platform: SourcePlatform;
};

/** Save the chosen reel count + source platform. */
export async function saveReelsRemaining(state: ReelsRemainingState): Promise<void> {
  await AsyncStorage.setItem(REELS_REMAINING_KEY, JSON.stringify(state));
}

/** Read the stored reel-count state. Returns null if not set or on parse error. */
export async function getReelsRemaining(): Promise<ReelsRemainingState | null> {
  try {
    const raw = await AsyncStorage.getItem(REELS_REMAINING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReelsRemainingState;
  } catch {
    return null;
  }
}

/** Remove the reel-count state (lock is back ON or user cancelled). */
export async function clearReelsRemaining(): Promise<void> {
  await AsyncStorage.removeItem(REELS_REMAINING_KEY);
}
