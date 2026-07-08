import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as IntentLauncher from "expo-intent-launcher";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { checkNativePermissions } from "@/lib/nativePermissionCheck";
import { PermissionId, usePermissionStatus } from "@/hooks/usePermissionStatus";
const APP_PACKAGE = "com.focuslock.app";

/**
 * Checks real OS-level status for ALL 5 permissions in one shot.
 * Returns a map of { permissionId → boolean }.
 * Safe to call on every foreground resume — never throws.
 */
async function fetchAllPermissionStatus(): Promise<Partial<Record<PermissionId, boolean>>> {
  const result: Partial<Record<PermissionId, boolean>> = {};

  // Native check: usageAccess, overlay, deviceAdmin, accessibility, battery
  const native = await checkNativePermissions();
  if (native !== null) {
    result.usageAccess   = native.usageAccess;
    result.overlay       = native.overlay;
    result.deviceAdmin   = native.deviceAdmin;
    result.accessibility = native.accessibility;
    result.battery       = native.battery;
    console.log(
      "[PermSetup] Native status →",
      `usageAccess=${native.usageAccess}`,
      `overlay=${native.overlay}`,
      `deviceAdmin=${native.deviceAdmin}`,
      `accessibility=${native.accessibility}`,
      `battery=${native.battery}`,
    );
  } else {
    console.log("[PermSetup] Native module unavailable — skipping native checks");
  }

  // Notification: expo-notifications JS check
  try {
    const Notifications = require("expo-notifications");
    const { status } = await Notifications.getPermissionsAsync();
    result.notification = status === "granted";
    console.log("[PermSetup] Notification status →", status, `(granted=${result.notification})`);
  } catch (e) {
    console.log("[PermSetup] Notification check failed:", e);
    result.notification = false;
  }

  return result;
}

/**
 * Polls `checkFn` with exponential backoff until it returns true or maxDuration
 * is exhausted. Industry-standard approach used by Screen Time / Digital Wellbeing
 * managers for permissions (like Battery Optimization) whose OS dialogs resolve
 * fire-and-forget — the caller's promise resolves before the user has responded.
 *
 * Gaps grow exponentially so we don't hammer the native bridge: 1 s → 2 s → 4 s → 8 s.
 * Early-exits the moment the grant is detected, wasting no more time.
 * Idempotent with the AppState listener — whichever detects the grant first updates
 * the UI; both reaching the same result is harmless (refreshGranted is atomic).
 *
 * Not awaited by callers — runs entirely in the background alongside all other
 * listeners (AppState, useFocusEffect).
 */
async function verifyWithBackoff(
  checkFn: () => Promise<boolean>,
  maxDuration = 15000,
): Promise<boolean> {
  const delays = [1000, 2000, 4000, 8000]; // ms — exponentially growing gaps
  let elapsed = 0;
  for (const delay of delays) {
    if (elapsed >= maxDuration) break;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    elapsed += delay;
    const granted = await checkFn();
    if (granted) return true; // early-exit: grant detected, stop polling
  }
  return false; // AppState / useFocusEffect are still running as backstop
}

async function openUsageAccess() {
  if (Platform.OS !== "android") return;
  // Settings.ACTION_USAGE_ACCESS_SETTINGS + package Uri — without the Uri, Android
  // opens the generic list of every app; with it, several OEMs jump straight to
  // DuckLock's own toggle/detail page.
  try {
    await IntentLauncher.startActivityAsync("android.settings.USAGE_ACCESS_SETTINGS", {
      data: `package:${APP_PACKAGE}`,
    });
  } catch {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
  }
}

async function openDeviceAdmin() {
  if (Platform.OS !== "android") return;
  // ACTION_ADD_DEVICE_ADMIN requires a ComponentName Parcelable extra.
  // expo-intent-launcher can only pass String extras from JS, so the targeted
  // activation screen MUST be opened through the native module (Kotlin builds the
  // ComponentName properly). The native module is NOT present in Expo Go.
  if (NativeModules.FocusLockPermissionChecker?.openDeviceAdminSettings) {
    // Real APK path — opens "Activate device admin app?" confirmation dialog directly.
    try {
      await NativeModules.FocusLockPermissionChecker.openDeviceAdminSettings();
      return;
    } catch (e) {
      console.error("[openDeviceAdmin] Native call failed:", e);
      // Rare APK-only edge case: native method threw after module was present.
      // Fall back to generic Security Settings so the user can at least navigate manually.
      try { await IntentLauncher.startActivityAsync("android.settings.action.SECURITY_SETTINGS"); }
      catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
    }
  } else {
    // Expo Go: native module is not bundled — there is no JS-only way to open the
    // targeted Device Admin activation screen. Show a clear message instead of
    // silently opening the wrong generic Settings page.
    Alert.alert(
      "Expo Go mein available nahi",
      "Device Admin permission sirf real APK build mein activate ho sakti hai. Expo Go is feature ko support nahi karta.\n\nAPK build karo aur wahan test karo.",
      [{ text: "OK" }]
    );
  }
}

async function openAccessibility() {
  if (Platform.OS !== "android") return;
  // There is no ComponentName-targeted Intent for accessibility activation —
  // the OS always opens the full Accessibility Settings list, and the user
  // must find "DuckLock" in it and toggle it ON manually.
  try { await IntentLauncher.startActivityAsync("android.settings.ACCESSIBILITY_SETTINGS"); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openOverlay() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.action.MANAGE_OVERLAY_PERMISSION", { data: `package:${APP_PACKAGE}` }); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openNotification() {
  if (Platform.OS !== "android") return;
  // POST_NOTIFICATIONS is a runtime permission (Android 13+). Android will only show the
  // native inline system dialog (requestPermissionsAsync) while canAskAgain is true — the
  // FIRST time, or after the user hasn't permanently denied it yet.
  //
  // Once the user has denied it and canAskAgain becomes false, calling
  // requestPermissionsAsync() again resolves immediately with no dialog at all — at that
  // point the ONLY way to let the user turn it on is the exact targeted Settings screen:
  //   Settings.ACTION_APP_NOTIFICATION_SETTINGS + EXTRA_APP_PACKAGE
  // which opens DuckLock's own app-specific notification settings page directly (not the
  // generic all-apps notification list).
  const Notifications = require("expo-notifications");
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== "granted" && current.canAskAgain) {
    // First ask (or still askable) — inline system dialog, no Settings redirect.
    await Notifications.requestPermissionsAsync();
    // Return value intentionally ignored: verifyAllPermissions() in handleAllow does the
    // authoritative live check after this resolves.
    return;
  }
  if (current.status !== "granted") {
    // Permanently denied — the dialog can no longer be shown, so go straight to the
    // exact targeted app-notification-settings page.
    try {
      await IntentLauncher.startActivityAsync("android.settings.APP_NOTIFICATION_SETTINGS", {
        extra: { "android.provider.extra.APP_PACKAGE": APP_PACKAGE },
      });
    } catch {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
    }
  }
}

async function openBattery() {
  if (Platform.OS !== "android") return;
  // Native method uses startActivity with FLAG_ACTIVITY_NEW_TASK and proper Uri —
  // manifest now declares REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission so no SecurityException.
  try {
    await NativeModules.FocusLockPermissionChecker?.openBatterySettings();
  } catch {
    // Fallback for Expo Go / native module not built yet
    try { await IntentLauncher.startActivityAsync("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS"); }
    catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
  }
}

interface PermItem {
  id: PermissionId;
  label: string;
  whyNeeded: string;
  openSettings: () => Promise<void>;
}

const PERMS: PermItem[] = [
  { id: "usageAccess",    label: "Usage Access",          whyNeeded: "App usage track karne ke liye — DuckLock ko pata chal sake kaunsa app open hai.",         openSettings: openUsageAccess },
  { id: "deviceAdmin",    label: "Device Admin",           whyNeeded: "Uninstall block karne ke liye — lock active hone par app delete nahi ho sakti.",            openSettings: openDeviceAdmin },
  { id: "accessibility",  label: "Accessibility Service",  whyNeeded: "Sabse zaroori permission — isi se DuckLock detect karta hai ki koi locked app open hui hai aur usko block karta hai. Iske bina locking bilkul kaam nahi karegi.", openSettings: openAccessibility },
  { id: "overlay",        label: "Display Over Apps",      whyNeeded: "Block screen dikhane ke liye — locked app ke upar DuckLock ka screen aayega.",             openSettings: openOverlay },
  { id: "notification",   label: "Notifications",          whyNeeded: "Reminders ke liye — lock expire hone par aur session updates ke liye notifications aayenge.", openSettings: openNotification },
  { id: "battery",        label: "Battery Optimization",   whyNeeded: "Background mein chalne ke liye — Android app ko band na kare jab screen off ho.",           openSettings: openBattery },
];

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { permissions, markOpened, markGranted, refreshGranted, completeSetup } = usePermissionStatus();

  const [whyOpen, setWhyOpen]   = useState(false);
  const [opening, setOpening]   = useState<PermissionId | null>(null);
  const whyHeight               = useRef(new Animated.Value(0)).current;
  const continueAnim            = useRef(new Animated.Value(0)).current;

  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);
  // Monotonic counter — incremented before every async permission check so that
  // a slow, older check cannot overwrite a newer one's result.
  const checkTokenRef = useRef(0);

  const isWeb        = Platform.OS === "web";
  const grantedCount = isWeb ? PERMS.length : PERMS.filter(p => permissions[p.id]?.granted).length;
  const allGranted   = isWeb || grantedCount === PERMS.length;

  useEffect(() => {
    Animated.spring(continueAnim, {
      toValue: allGranted ? 1 : 0,
      useNativeDriver: true,
      tension: 180,
      friction: 10,
    }).start();
  }, [allGranted]);

  /**
   * Checks real OS status for ALL 5 permissions and atomically updates state.
   * Called on mount and every time the app returns to foreground — this is the
   * single source of truth for permission state (not AsyncStorage cache).
   *
   * Uses a monotonic token so that a slow, stale check cannot overwrite the
   * result of a newer check that resolved first.
   */
  const verifyAllPermissions = useCallback(async () => {
    if (Platform.OS === "web") return;
    const token = ++checkTokenRef.current;
    console.log("[PermSetup] verifyAllPermissions called — token", token);
    const statusMap = await fetchAllPermissionStatus();
    if (token !== checkTokenRef.current) {
      console.log("[PermSetup] Stale check (token", token, "< current", checkTokenRef.current, ") — discarding result");
      return;
    }
    await refreshGranted(statusMap);
  }, [refreshGranted]);

  // Check real OS status on mount (fixes stale AsyncStorage cache on first load)
  useEffect(() => {
    verifyAllPermissions();
  }, [verifyAllPermissions]);

  // Re-check ALL permissions every time the app comes back to foreground.
  // Condition: `next === "active"` (guard on prev removed) so that ROMs which
  // occasionally re-emit "active" without a proper background transition are
  // still caught. verifyAllPermissions() has a monotonic token guard, so
  // duplicate calls are safe — stale results are silently discarded.
  //
  // Limitation: if the battery dialog shows as a full-screen overlay that does NOT
  // change AppState at all (some Xiaomi / Oppo / Vivo ROMs), this listener may
  // never fire. The exponential-backoff in handleAllow covers that gap.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") {
        console.log(
          "[PermSetup] AppState →", next,
          "(prev:", appStateRef.current, ") — re-checking all permissions",
        );
        verifyAllPermissions();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [verifyAllPermissions]);

  // Navigation-level focus listener — fires when this screen gains focus in the
  // navigation stack. Complements AppState: covers cases where navigating back
  // from an Android Settings Activity restores navigation focus before (or instead
  // of) triggering an AppState "active" event. Especially useful on ROMs where
  // the Settings screen and the RN Activity share the same task stack.
  useFocusEffect(
    useCallback(() => {
      console.log("[PermSetup] Screen focused (useFocusEffect) — re-checking all permissions");
      verifyAllPermissions();
    }, [verifyAllPermissions]),
  );

  function toggleWhy() {
    const isOpen = !whyOpen;
    setWhyOpen(isOpen);
    Animated.spring(whyHeight, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      tension: 180,
      friction: 14,
    }).start();
  }

  async function handleAllow(perm: PermItem) {
    setOpening(perm.id);
    await markOpened(perm.id);

    if (Platform.OS !== "android") {
      // Web/iOS simulator: no real Settings to open, offer a manual toggle for testing
      Alert.alert(
        "Android Permission",
        perm.whyNeeded,
        [
          { text: "Mark as Granted", onPress: () => markGranted(perm.id, true) },
          { text: "Cancel", style: "cancel" },
        ]
      );
      setOpening(null);
      return;
    }

    try {
      await perm.openSettings();

      // Immediate check — catches in-app dialogs (e.g. Notifications) that resolve
      // synchronously after the user responds. For fire-and-forget native openers
      // (e.g. Battery Optimization: Kotlin fires startActivity then resolves immediately),
      // this check runs before the user has even seen the dialog — correct old state is
      // returned; the safety nets below are the authoritative path.
      await verifyAllPermissions();

      if (perm.id === "battery") {
        // ── Battery Optimization: production-grade exponential-backoff detection ──
        //
        // WHY THIS IS NECESSARY:
        //   openBatterySettings() is fire-and-forget — the Kotlin side calls
        //   startActivity() then immediately resolves the JS promise. The user has not
        //   yet interacted with the dialog. On many ROMs (Xiaomi MIUI, Oppo ColorOS,
        //   Samsung OneUI) the battery overlay does NOT transition AppState to background,
        //   so the AppState "change" listener may never fire after the user responds.
        //
        // APPROACH (industry standard — matches Screen Time managers, Digital Wellbeing):
        //   Poll with exponentially growing gaps: 1 s → 2 s → 4 s → 8 s.
        //   Early-exits the instant the OS confirms the grant — wastes no extra time.
        //   Idempotent with AppState listener and useFocusEffect: whichever fires first
        //   updates the UI; concurrent arrivals at the same result are harmless.
        //
        // NOT awaited — runs entirely in the background alongside all other listeners.
        //
        // checkFn design: calls verifyAllPermissions() (the same token-guarded updater
        // used by AppState and useFocusEffect) so ALL writes go through one shared
        // monotonic path — no separate refreshGranted() call that could race with a
        // concurrent full-map write and transiently overwrite a freshly-detected grant.
        // checkNativePermissions() is called once more only to read the battery value
        // for the early-exit decision (cheap read-only native call; no state mutation).
        verifyWithBackoff(async () => {
          await verifyAllPermissions();                   // token-guarded; safe to call concurrently
          const native = await checkNativePermissions();  // read-only: just needs battery status
          return native?.battery === true;                // true → early-exit, backoff stops
        });
      } else {
        // Other fire-and-forget openers (usageAccess, overlay, deviceAdmin):
        // Single 1.5 s delayed re-check is sufficient — their Settings screens always
        // background the Activity, so AppState reliably fires when the user returns.
        // This is just a belt-and-suspenders fallback.
        setTimeout(() => { verifyAllPermissions(); }, 1500);
      }
    } finally { setOpening(null); }
  }

  async function handleContinue() {
    await completeSetup();
    router.replace("/(tabs)");
  }

  const topPad = Platform.OS === "web" ? 52 : insets.top + 12;
  const botPad = Platform.OS === "web" ? 40 : insets.bottom + 20;

  const whyMaxHeight = whyHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });
  const whyOpacity   = whyHeight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <Text style={styles.title}>Enable permissions{"\n"}to use DuckLock</Text>
        <Text style={styles.subtitle}>{grantedCount} of {PERMS.length} granted</Text>

        {/* ── Permissions list ── */}
        <View style={styles.listCard}>
          {PERMS.map((perm, i) => {
            const granted   = isWeb || (permissions[perm.id]?.granted ?? false);
            const isOpening = opening === perm.id;
            const isLast    = i === PERMS.length - 1;

            return (
              <View key={perm.id}>
                <View style={styles.row}>
                  <Text style={[styles.permLabel, granted && styles.permLabelGranted]}>
                    {perm.label}
                  </Text>

                  {granted ? (
                    <View style={styles.tickCircle}>
                      <Feather name="check" size={13} color="#636366" />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleAllow(perm)}
                      disabled={isOpening}
                      style={({ pressed }) => [{ opacity: isOpening || pressed ? 0.7 : 1 }]}
                    >
                      <LinearGradient
                        colors={["#FFBF80", "#FFA660"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.allowBtn}
                      >
                        <Text style={styles.allowBtnText}>
                          {isOpening ? "Opening…" : "Allow"}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>

                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        {/* ── Why card ── */}
        <Pressable onPress={toggleWhy} style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why should I give this permission?</Text>
          <Animated.View style={{ transform: [{ rotate: whyHeight.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) }] }}>
            <Feather name="chevron-right" size={18} color="#636366" />
          </Animated.View>
        </Pressable>

        <Animated.View style={{ maxHeight: whyMaxHeight, opacity: whyOpacity, overflow: "hidden" }}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.whyBody}
          >
            {PERMS.map((perm) => (
              <View key={perm.id} style={styles.whyRow}>
                <Text style={styles.whyLabel}>{perm.label}</Text>
                <Text style={styles.whyDesc}>{perm.whyNeeded}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Continue button (appears when all granted) ── */}
        <Animated.View
          style={{
            transform: [{ scale: continueAnim }],
            opacity: continueAnim,
          }}
          pointerEvents={allGranted ? "auto" : "none"}
        >
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["#32D74B", "#27AE60"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
              <Text style={styles.continueBtnText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {!allGranted && (
          <Text style={styles.hint}>Grant all permissions to continue</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },

  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#636366",
    marginBottom: 4,
  },

  listCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 17,
    gap: 12,
  },
  permLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  permLabelGranted: {
    color: "#636366",
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: "#2C2C2E",
    marginLeft: 18,
  },
  tickCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  allowBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  allowBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },

  whyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  whyTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  whyBody: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  whyRow: {
    gap: 3,
  },
  whyLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFBF80",
  },
  whyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 19,
  },

  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 6,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#48484A",
    textAlign: "center",
    marginTop: 4,
  },
});
