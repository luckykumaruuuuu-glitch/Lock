/**
 * debugLogger.ts — JS wrapper around the native DebugLogger bridge.
 *
 * On Android (real build): delegates to NativeModules.DuckLockDebugLog which
 * reads from the Kotlin DebugLogger ring-buffer (populated by DebugLogger.log()
 * calls throughout the native layer).
 *
 * On Expo Go / web: falls back gracefully — getAllLogs() returns an empty
 * string so the viewer still opens without crashing.
 *
 * Usage:
 *   import { getAllDebugLogs, clearDebugLogs } from "@/lib/debugLogger";
 *   const text = await getAllDebugLogs();
 */

import { NativeModules, Platform } from "react-native";

const native = NativeModules.DuckLockDebugLog as
  | { getAllLogs(): Promise<string>; clear(): Promise<null> }
  | undefined;

/**
 * Returns all buffered debug log lines as a single newline-separated string,
 * newest entries first. Returns "" when the native module is unavailable
 * (Expo Go, web, iOS).
 */
export async function getAllDebugLogs(): Promise<string> {
  if (Platform.OS !== "android" || !native) return "";
  try {
    return await native.getAllLogs();
  } catch {
    return "";
  }
}

/**
 * Clears the in-memory native log buffer. Safe to call multiple times.
 * No-op on platforms where the module is unavailable.
 */
export async function clearDebugLogs(): Promise<void> {
  if (Platform.OS !== "android" || !native) return;
  try {
    await native.clear();
  } catch {}
}
