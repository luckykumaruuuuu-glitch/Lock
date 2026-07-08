import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import { NativeModules, Platform } from "react-native";

/**
 * Opens the Battery Optimization exemption screen for this app.
 *
 * Single source of truth — used by both setup.tsx and PermissionGuardPopup.tsx.
 *
 * Strategy (Android only):
 * 1. If the native module's openBatterySettings is present (real APK build),
 *    call it — it uses FLAG_ACTIVITY_NEW_TASK + correct Uri, and the manifest
 *    already declares REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, so no SecurityException.
 * 2. Otherwise (Expo Go / native module absent), JS-only fallback chain:
 *    a. REQUEST_IGNORE_BATTERY_OPTIMIZATIONS + runtime package name
 *       (Application.applicationId = "host.exp.exponent" in Expo Go, real
 *        package in production — never the hardcoded string).
 *       May still throw in Expo Go if the permission is absent from host manifest.
 *    b. IGNORE_BATTERY_OPTIMIZATION_SETTINGS (general list, no permission needed).
 *    c. Generic Android Settings as last resort.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== "android") return;

  // Path 1 — real APK: native module present and method available.
  // Explicit existence check (not ?. call) so the catch only fires on real errors,
  // not on undefined returning silently.
  if (NativeModules.FocusLockPermissionChecker?.openBatterySettings) {
    try {
      await NativeModules.FocusLockPermissionChecker.openBatterySettings();
      return;
    } catch (e) {
      console.error("[Battery] Native openBatterySettings failed:", e);
      // Fall through to IntentLauncher fallback below.
    }
  }

  // Path 2 — Expo Go / native module absent: IntentLauncher fallback chain.
  // Use the runtime package name so Expo Go gets "host.exp.exponent" and the
  // real APK gets "com.focuslock.app" — never a hardcoded string.
  const pkg = Application.applicationId ?? "com.focuslock.app";

  try {
    // Targeted dialog: "Do you want to exempt <app> from battery optimizations?"
    // Requires REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in the caller's manifest.
    // Works in the real APK; may throw SecurityException in Expo Go.
    await IntentLauncher.startActivityAsync(
      "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      { data: `package:${pkg}` },
    );
    return;
  } catch {}

  try {
    // General battery optimization list — no special permission required.
    await IntentLauncher.startActivityAsync(
      "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
    );
    return;
  } catch {}

  try {
    // Last resort: main Android Settings.
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
  } catch {}
}
