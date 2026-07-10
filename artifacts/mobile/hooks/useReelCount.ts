import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  getNativeReelCount,
  ReelCountResult,
} from "../lib/nativeReelCounter";

/**
 * useReelCount — React hook that exposes today's Instagram reel count.
 *
 * Reads from the native ReelCounterModule (ReelDetector writes counts
 * to reelcount_data.json; this hook reads them via the JS bridge).
 *
 * Refresh strategy:
 *  - On mount
 *  - Every `refreshIntervalMs` (default 30s) while app is in foreground
 *  - When the app returns to foreground (AppState "active")
 *
 * Returns null while loading or on non-Android / Expo Go.
 *
 * Usage:
 *   const { count, date, loading, refresh } = useReelCount();
 */
export function useReelCount(refreshIntervalMs = 30_000) {
  const [data, setData] = useState<ReelCountResult | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const result = await getNativeReelCount();
    setData(result);
    setLoading(false);
  }, []);

  // Refresh on mount and on interval
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, refreshIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, refreshIntervalMs]);

  // Refresh when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return {
    /** Today's reel count, or null if unavailable */
    count: data?.count ?? null,
    /** Today's date string "yyyy-MM-dd", or null if unavailable */
    date: data?.date ?? null,
    /** True on the first load before any data has been fetched */
    loading,
    /** Manually trigger a re-read (e.g. pull-to-refresh) */
    refresh,
  };
}
