import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as IntentLauncher from "expo-intent-launcher";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionId, usePermissionStatus } from "@/hooks/usePermissionStatus";

const APP_PACKAGE = "com.focuslock.app";

async function openUsageAccess() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.USAGE_ACCESS_SETTINGS"); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openDeviceAdmin() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync("android.app.action.ADD_DEVICE_ADMIN", {
      extra: {
        "android.app.extra.DEVICE_ADMIN": `${APP_PACKAGE}/.DeviceAdminReceiver`,
        "android.app.extra.ADD_EXPLANATION": "FocusLock needs device admin to prevent uninstall while a lock is active.",
      },
    });
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openOverlay() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.action.MANAGE_OVERLAY_PERMISSION", { data: `package:${APP_PACKAGE}` }); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openNotification() {
  if (Platform.OS !== "android") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") return;
    await IntentLauncher.startActivityAsync("android.settings.APP_NOTIFICATION_SETTINGS", {
      extra: { "android.provider.extra.APP_PACKAGE": APP_PACKAGE },
    });
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openBattery() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", { data: `package:${APP_PACKAGE}` }); }
  catch {
    try { await IntentLauncher.startActivityAsync("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS"); }
    catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
  }
}

interface Step {
  id: PermissionId;
  title: string;
  reason: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
  openSettings: () => Promise<void>;
}

const STEPS: Step[] = [
  {
    id: "usageAccess",
    title: "Usage Access",
    reason: "App usage track karne ke liye",
    icon: "activity",
    color: "#FFD60A",
    openSettings: openUsageAccess,
  },
  {
    id: "deviceAdmin",
    title: "Device Admin",
    reason: "Uninstall block karne ke liye",
    icon: "shield",
    color: "#FF6B35",
    openSettings: openDeviceAdmin,
  },
  {
    id: "overlay",
    title: "Display Over Apps",
    reason: "Block screen dikhane ke liye",
    icon: "layers",
    color: "#A855F7",
    openSettings: openOverlay,
  },
  {
    id: "notification",
    title: "Notifications",
    reason: "Reminders ke liye",
    icon: "bell",
    color: "#38BDF8",
    openSettings: openNotification,
  },
  {
    id: "battery",
    title: "Battery Optimization",
    reason: "Background mein chalne ke liye",
    icon: "zap",
    color: "#32D74B",
    openSettings: openBattery,
  },
];

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { permissions, markOpened, markGranted, completeSetup } = usePermissionStatus();

  const [currentStep, setCurrentStep] = useState(0);
  const [openedSettings, setOpenedSettings] = useState(false);
  const [returnedFromSettings, setReturnedFromSettings] = useState(false);
  const [showTick, setShowTick] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const slideX    = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const tickScale = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const iconFade  = useRef(new Animated.Value(0)).current;

  const appStateRef    = useRef<AppStateStatus>(AppState.currentState);
  const lastOpenedRef  = useRef(false);

  const step    = STEPS[currentStep];
  const granted = permissions[step.id]?.granted ?? false;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(iconFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current !== "active" && next === "active" && lastOpenedRef.current) {
        setReturnedFromSettings(true);
        lastOpenedRef.current = false;
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (granted && !advancing) {
      setShowTick(true);
      setAdvancing(true);
      Animated.spring(tickScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }).start();
      setTimeout(() => goNext(), 1200);
    }
  }, [granted]);

  const goNext = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: -420, duration: 260, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      const nextIdx = currentStep + 1;
      if (nextIdx >= STEPS.length) {
        completeSetup().then(() => router.replace("/(tabs)"));
        return;
      }
      setCurrentStep(nextIdx);
      setOpenedSettings(false);
      setReturnedFromSettings(false);
      setShowTick(false);
      setAdvancing(false);
      tickScale.setValue(0);
      iconScale.setValue(0.8);
      iconFade.setValue(0);
      slideX.setValue(420);
      fadeAnim.setValue(1);
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true, tension: 200, friction: 14 }).start();
    });
  }, [currentStep, slideX, fadeAnim, tickScale, iconScale, iconFade, completeSetup]);

  async function handleAllow() {
    lastOpenedRef.current = true;
    setReturnedFromSettings(false);
    setOpenedSettings(true);
    await markOpened(step.id);

    if (Platform.OS !== "android") {
      Alert.alert(
        "Android Permission",
        "This permission is only available on Android. Tap 'Mark Enabled' to continue.",
        [
          { text: "Mark Enabled", onPress: () => markGranted(step.id, true) },
          { text: "Skip", style: "cancel", onPress: () => setReturnedFromSettings(true) },
        ]
      );
      return;
    }
    await step.openSettings();
  }

  function handleConfirmEnabled() {
    markGranted(step.id, true);
  }

  const topPad = Platform.OS === "web" ? 44 : insets.top + 8;
  const botPad = Platform.OS === "web" ? 40 : insets.bottom + 24;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>

      {/* ── Progress header ── */}
      <View style={styles.progressHeader}>
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentStep && styles.dotDone,
                i === currentStep && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepCount}>{currentStep + 1} / {STEPS.length}</Text>
      </View>

      {/* ── Main animated slide ── */}
      <Animated.View style={[styles.slide, { transform: [{ translateX: slideX }], opacity: fadeAnim }]}>

        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }], opacity: iconFade }]}>
          <View style={[styles.iconRing, { borderColor: step.color + "40", shadowColor: step.color }]}>
            <View style={[styles.iconBg, { backgroundColor: step.color + "18" }]}>
              <Feather name={step.icon} size={72} color={step.color} />
            </View>
          </View>

          {showTick && (
            <Animated.View style={[styles.tickBadge, { transform: [{ scale: tickScale }] }]}>
              <LinearGradient colors={["#32D74B", "#27AE60"]} style={styles.tickGradient}>
                <Feather name="check" size={22} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          )}
        </Animated.View>

        {/* Title & reason */}
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.reason}>{step.reason}</Text>

        {granted && (
          <View style={styles.grantedBadge}>
            <Feather name="check-circle" size={15} color="#32D74B" />
            <Text style={styles.grantedText}>Permission granted</Text>
          </View>
        )}
      </Animated.View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {!granted && (
          <Pressable
            onPress={returnedFromSettings ? handleConfirmEnabled : handleAllow}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
          >
            <LinearGradient
              colors={returnedFromSettings ? ["#32D74B", "#27AE60"] : ["#FFD60A", "#FF9F0A"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.allowBtn}
            >
              <Feather
                name={returnedFromSettings ? "check" : "external-link"}
                size={18}
                color="#000000"
              />
              <Text style={styles.allowBtnText}>
                {returnedFromSettings
                  ? "I've Enabled This ✓"
                  : openedSettings
                  ? "Open Settings Again"
                  : "Allow"}
              </Text>
            </LinearGradient>
          </Pressable>
        )}

        {!granted && !openedSettings && (
          <Pressable onPress={goNext} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        )}

        {!granted && openedSettings && !returnedFromSettings && (
          <Pressable onPress={() => setReturnedFromSettings(true)} style={styles.skipBtn}>
            <Text style={styles.skipText}>I went back without enabling</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 24,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2C2C2E",
  },
  dotDone: {
    backgroundColor: "#32D74B",
    width: 8,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#FFD60A",
    borderRadius: 4,
  },
  stepCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8E8E93",
  },

  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },

  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 8,
  },
  iconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  iconBg: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  tickBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  tickGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#000000",
  },

  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  reason: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  grantedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#32D74B22",
    marginTop: 4,
  },
  grantedText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#32D74B",
  },

  footer: {
    gap: 14,
    paddingTop: 12,
  },
  allowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
  allowBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#48484A",
    textDecorationLine: "underline",
  },
});
