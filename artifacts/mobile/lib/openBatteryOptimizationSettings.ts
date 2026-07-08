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
 *    If that fails for any reason, also attempt IntentLauncher step A below.
 * 2. IntentLauncher fallback:
 *    A. REQUEST_IGNORE_BATTERY_OPTIMIZATIONS + runtime package name
 *       (Application.applicationId = "host.exp.exponent" in Expo Go, real
 *        package in production — never the hardcoded string).
 *       *** ONLY attempted when native module IS present (real APK) — Expo Go
 *       does NOT declare this permission in its manifest, so the OS silently
 *       resolves the intent without opening any UI, causing a false-success
 *       that prevents steps B and C from running. ***
 *    B. IGNORE_BATTERY_OPTIMIZATION_SETTINGS (general list, no permission needed).
 *       Safe in both Expo Go and real APK.
 *    C. Generic Android Settings as last resort.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  console.log("[Battery] openBatteryOptimizationSettings() called");

  if (Platform.OS !== "android") {
    console.log("[Battery] Not Android — skipping");
    return;
  }

  // Track whether the native module is present.
  // Absence = Expo Go (manifest lacks REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
  // Presence = real APK (permission declared, step A is safe to attempt).
  const hasNativeModule =
    typeof NativeModules.FocusLockPermissionChecker?.openBatterySettings ===
    "function";

  console.log(
    `[Battery] hasNativeModule=${hasNativeModule}, pkg=${Application.applicationId}`,
  );

  // ── Path 1: real APK — native module present ────────────────────────────
  if (hasNativeModule) {
    console.log("[Battery] Path 1: trying native openBatterySettings()");
    try {
      await NativeModules.FocusLockPermissionChecker.openBatterySettings();
      console.log("[Battery] Path 1: native openBatterySettings() succeeded");
      return;
    } catch (e) {
      console.error(
        "[Battery] Path 1: native openBatterySettings() failed — falling through to IntentLauncher:",
        e,
      );
    }
  }

  const pkg = Application.applicationId ?? "com.focuslock.app";

  // ── IntentLauncher step A ────────────────────────────────────────────────
  // Targeted "Do you want to exempt <app>?" dialog.
  // Requires REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in the CALLER'S manifest.
  //
  // In Expo Go this permission is absent. Android resolves the intent
  // immediately without opening any UI — a silent "success" that would cause
  // the function to return here, skipping steps B and C. So we only attempt
  // this when we know the manifest has the permission (= native module present).
  if (hasNativeModule) {
    console.log(
      `[Battery] Step A: REQUEST_IGNORE_BATTERY_OPTIMIZATIONS for pkg=${pkg}`,
    );
    try {
      await IntentLauncher.startActivityAsync(
        "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        { data: `package:${pkg}` },
      );
      console.log("[Battery] Step A: succeeded");
      return;
    } catch (e) {
      console.error("[Battery] Step A: failed:", e);
      // Fall through to step B.
    }
  } else {
    console.log(
      "[Battery] Step A: SKIPPED — Expo Go has no REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in manifest; would silently succeed without opening any UI",
    );
  }

  // ── IntentLauncher step B ────────────────────────────────────────────────
  // General battery optimization list — no special permission required.
  // Safe in both Expo Go and real APK.
  console.log("[Battery] Step B: IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
    );
    console.log("[Battery] Step B: succeeded");
    return;
  } catch (e) {
    console.error("[Battery] Step B: failed:", e);
    // Fall through to step C.
  }

  // ── IntentLauncher step C ────────────────────────────────────────────────
  // Last resort: main Android Settings.
  console.log("[Battery] Step C: generic SETTINGS (last resort)");
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.SETTINGS,
    );
    console.log("[Battery] Step C: succeeded");
  } catch (e) {
    console.error("[Battery] Step C: generic SETTINGS also failed:", e);
  }
}
