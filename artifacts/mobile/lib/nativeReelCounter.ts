import { NativeModules, Platform } from "react-native";

export interface ReelCountResult {
  /** Today's date in "yyyy-MM-dd" format */
  date: string;
  /** Number of reels watched today (≥ 2.5s dwell, non-sponsored) */
  count: number;
}

const { ReelCounter } = NativeModules;

/**
 * Reads today's Instagram reel count from the native ReelCounterModule.
 *
 * The count is written by ReelDetector (Kotlin) into
 * context.filesDir/reelcount_data.json every time a reel is counted.
 * The native module reads that file and returns { date, count }.
 *
 * Returns null on non-Android or when the native module is unavailable
 * (e.g. Expo Go without a dev build).
 */
export async function getNativeReelCount(): Promise<ReelCountResult | null> {
  if (Platform.OS !== "android") return null;
  if (!ReelCounter?.getTodayCount) {
    console.log(
      "[ReelCounter] ReelCounter.getTodayCount not available — native module absent (Expo Go?)"
    );
    return null;
  }
  try {
    const raw = await ReelCounter.getTodayCount();
    return raw as ReelCountResult;
  } catch (e) {
    console.log("[ReelCounter] getTodayCount threw:", e);
    return null;
  }
}
