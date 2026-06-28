import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import theme from "@/constants/theme";
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

async function openAccessibility() {
  if (Platform.OS !== "android") return;
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

interface PermissionStep {
  id: PermissionId;
  title: string;
  description: string;
  whyNeeded: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  settingsLabel: string;
  openSettings: () => Promise<void>;
  colors: readonly [string, string];
  glow: string;
}

const PERMISSION_STEPS: PermissionStep[] = [
  {
    id: "usageAccess",
    title: "Usage Access",
    description: "Tracks which app is currently open so FocusLock can detect locked apps.",
    whyNeeded: "Without this, FocusLock cannot see which app is in the foreground.",
    icon: "activity",
    settingsLabel: "Open Usage Access",
    openSettings: openUsageAccess,
    colors: ["#FFD60A", "#FF9F0A"],
    glow: "#FFD60A",
  },
  {
    id: "deviceAdmin",
    title: "Device Administrator",
    description: "Prevents FocusLock from being uninstalled while a lock is active.",
    whyNeeded: "Without this, you could uninstall the app to bypass any lock.",
    icon: "shield",
    settingsLabel: "Activate Device Admin",
    openSettings: openDeviceAdmin,
    colors: ["#FF6B35", "#E85A20"],
    glow: "#FF6B35",
  },
  {
    id: "accessibility",
    title: "Accessibility Service",
    description: "Monitors app launches and redirects you when a locked app is opened.",
    whyNeeded: "This is the core mechanism that actually blocks locked apps.",
    icon: "eye",
    settingsLabel: "Enable Accessibility",
    openSettings: openAccessibility,
    colors: ["#7C3AED", "#9B59F5"],
    glow: "#7C3AED",
  },
  {
    id: "overlay",
    title: "Display Over Apps",
    description: "Allows FocusLock to show a blocking screen on top of locked apps.",
    whyNeeded: "Without this, the lock screen cannot appear over other apps.",
    icon: "layers",
    settingsLabel: "Allow Display Over Apps",
    openSettings: openOverlay,
    colors: ["#0D7FD4", "#1A9FF0"],
    glow: "#0D7FD4",
  },
  {
    id: "notification",
    title: "Notifications",
    description: "Sends alerts when a lock is active and when it expires.",
    whyNeeded: "Without this, you won't get reminded when your focus session ends.",
    icon: "bell",
    settingsLabel: "Allow Notifications",
    openSettings: openNotification,
    colors: ["#FFD60A", "#FF9F0A"],
    glow: "#FFD60A",
  },
  {
    id: "battery",
    title: "Battery Optimization",
    description: "Keeps FocusLock running in the background without being killed by the OS.",
    whyNeeded: "Without this, Android may stop FocusLock and allow locked apps to open.",
    icon: "zap",
    settingsLabel: "Ignore Battery Optimization",
    openSettings: openBattery,
    colors: ["#32D74B", "#30C244"],
    glow: "#32D74B",
  },
];

function PermCard({
  step, granted, openedSettings, returnedFromSettings, index, onOpenSettings, onMarkGranted,
}: {
  step: PermissionStep; granted: boolean; openedSettings: boolean;
  returnedFromSettings: boolean; index: number;
  onOpenSettings: () => Promise<void>; onMarkGranted: (g: boolean) => void;
}) {
  const [opening, setOpening] = useState(false);
  const slideY   = useRef(new Animated.Value(40)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const checkSc  = useRef(new Animated.Value(granted ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 140, friction: 12, delay: index * 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [slideY, opacity, index]);

  useEffect(() => {
    Animated.spring(checkSc, { toValue: granted ? 1 : 0, useNativeDriver: true, tension: 260, friction: 8 }).start();
  }, [granted, checkSc]);

  async function handleGrant() {
    setOpening(true);
    try { await onOpenSettings(); } finally { setOpening(false); }
  }

  return (
    <Animated.View style={{ transform: [{ translateY: slideY }], opacity }}>
      <GlassCard
        padding={18}
        borderColor={granted ? step.colors[0] + "55" : theme.cardBorder}
        backgroundColor={granted ? step.colors[0] + "15" : theme.cardBackground}
        style={granted ? { shadowColor: step.glow, shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 6 } : undefined}
      >
        {/* Header */}
        <View style={pStyles.header}>
          <View style={[pStyles.iconBg, { backgroundColor: granted ? step.colors[0] + "22" : theme.divider }]}>
            <Feather name={step.icon} size={20} color={granted ? step.colors[0] : theme.secondaryText} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={pStyles.title}>{step.title}</Text>
            <View style={pStyles.statusPill}>
              {granted ? (
                <><Feather name="check-circle" size={12} color={theme.success} /><Text style={[pStyles.statusText, { color: theme.success }]}>Granted</Text></>
              ) : (
                <><Feather name="alert-circle" size={12} color={theme.error} /><Text style={[pStyles.statusText, { color: theme.error }]}>Required</Text></>
              )}
            </View>
          </View>
          <Animated.View style={{ transform: [{ scale: checkSc }] }}>
            <LinearGradient colors={["#32D74B", "#30C244"]} style={pStyles.checkBadge}>
              <Feather name="check" size={13} color="#000000" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={pStyles.desc}>{step.description}</Text>

        <View style={pStyles.whyBox}>
          <Feather name="info" size={11} color={theme.secondaryText} />
          <Text style={pStyles.whyText}>{step.whyNeeded}</Text>
        </View>

        {!granted && (
          <View style={{ gap: 10, marginTop: 6 }}>
            <Pressable
              onPress={handleGrant}
              disabled={opening}
              style={({ pressed }) => [{ opacity: opening ? 0.7 : pressed ? 0.82 : 1 }]}
            >
              <LinearGradient
                colors={opening ? theme.gradientDisabled : step.colors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={pStyles.grantBtn}
              >
                <Feather name="external-link" size={14} color="#000000" />
                <Text style={pStyles.grantBtnText}>{opening ? "Opening…" : step.settingsLabel}</Text>
              </LinearGradient>
            </Pressable>

            {openedSettings && returnedFromSettings && (
              <Pressable onPress={() => onMarkGranted(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={[pStyles.confirmRow, { borderColor: step.colors[0] + "40" }]}>
                  <Feather name="check" size={14} color={step.colors[0]} />
                  <Text style={[pStyles.confirmText, { color: step.colors[0] }]}>I've enabled this ✓</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {granted && (
          <Pressable onPress={() => onMarkGranted(false)} style={pStyles.undoBtn}>
            <Text style={pStyles.undoText}>Undo</Text>
          </Pressable>
        )}
      </GlassCard>
    </Animated.View>
  );
}

const pStyles = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 10 },
  iconBg:      { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  title:       { fontSize: 15, fontFamily: "Inter_700Bold", color: theme.primaryText },
  statusPill:  { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText:  { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  checkBadge:  { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  desc:        { fontSize: 13, fontFamily: "Inter_400Regular", color: theme.secondaryText, lineHeight: 19, marginBottom: 10 },
  whyBox:      { flexDirection: "row", alignItems: "flex-start", gap: 7, padding: 10, borderRadius: 10, backgroundColor: theme.divider, marginBottom: 2 },
  whyText:     { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: theme.secondaryText, lineHeight: 17 },
  grantBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 13 },
  grantBtnText:{ color: "#000000", fontSize: 14, fontFamily: "Inter_700Bold" },
  confirmRow:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: theme.cardBackground },
  confirmText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  undoBtn:     { alignItems: "center", marginTop: 4 },
  undoText:    { fontSize: 12, fontFamily: "Inter_400Regular", color: theme.tertiaryText, textDecorationLine: "underline" },
});

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { permissions, allGranted, markOpened, markGranted, completeSetup } = usePermissionStatus();

  const [returnedFrom, setReturnedFrom] = useState<PermissionId | null>(null);
  const lastOpenedRef  = useRef<PermissionId | null>(null);
  const appStateRef    = useRef<AppStateStatus>(AppState.currentState);
  const progressAnim   = useRef(new Animated.Value(0)).current;

  const topPad    = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const grantedCount = Object.values(permissions).filter((p) => p.granted).length;
  const total = PERMISSION_STEPS.length;

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: (grantedCount / total) * 100, useNativeDriver: false, tension: 150, friction: 12 }).start();
  }, [grantedCount, total, progressAnim]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current !== "active" && next === "active" && lastOpenedRef.current) {
        setReturnedFrom(lastOpenedRef.current);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const handleOpenSettings = useCallback(async (step: PermissionStep) => {
    lastOpenedRef.current = step.id;
    setReturnedFrom(null);
    await markOpened(step.id);

    if (Platform.OS !== "android") {
      Alert.alert("Android Only", "This permission is Android-only. Tap 'I've enabled this' to continue.", [{ text: "OK" }]);
      setReturnedFrom(step.id);
      return;
    }
    await step.openSettings();
  }, [markOpened]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  const progressColor = grantedCount === total ? theme.success : theme.accent;

  async function handleEnter() {
    if (!allGranted) return;
    await completeSetup();
    router.replace("/(tabs)");
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.headerIcon}>
            <Feather name="shield" size={34} color={theme.buttonText} />
          </View>
          <Text style={styles.heading}>Activate FocusLock</Text>
          <Text style={styles.subheading}>
            Grant all permissions below to enable full protection. The app will not work until all are granted.
          </Text>
        </View>

        {/* Progress card */}
        <GlassCard padding={18}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Permissions granted</Text>
            <Text style={[styles.progressCount, { color: progressColor }]}>{grantedCount}/{total}</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: progressColor }]} />
          </View>
          {grantedCount === total ? (
            <View style={styles.progressDone}>
              <Feather name="check-circle" size={14} color={theme.success} />
              <Text style={styles.progressDoneText}>All permissions granted — ready to launch!</Text>
            </View>
          ) : (
            <Text style={styles.progressHint}>{total - grantedCount} more permission{total - grantedCount !== 1 ? "s" : ""} needed</Text>
          )}
        </GlassCard>

        {/* Permission cards */}
        <Text style={styles.sectionLabel}>REQUIRED PERMISSIONS ({total})</Text>
        <View style={{ gap: 12 }}>
          {PERMISSION_STEPS.map((step, i) => (
            <PermCard
              key={step.id}
              step={step}
              index={i}
              granted={permissions[step.id]?.granted ?? false}
              openedSettings={permissions[step.id]?.openedSettings ?? false}
              returnedFromSettings={returnedFrom === step.id || (!permissions[step.id]?.granted && (permissions[step.id]?.openedSettings ?? false))}
              onOpenSettings={() => handleOpenSettings(step)}
              onMarkGranted={(g) => markGranted(step.id, g)}
            />
          ))}
        </View>

        {/* Auto-configured section */}
        <Text style={styles.sectionLabel}>AUTO-CONFIGURED</Text>
        <GlassCard>
          {[
            { icon: "wifi" as const, label: "Internet", desc: "Cloud sync via Firebase" },
            { icon: "cpu" as const, label: "Foreground Service", desc: "Background enforcement" },
            { icon: "power" as const, label: "Boot Completed", desc: "Auto-restarts after reboot" },
          ].map((p, i, arr) => (
            <View key={p.label}>
              <View style={styles.autoRow}>
                <View style={styles.autoIconBox}>
                  <Feather name={p.icon} size={13} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoLabel}>{p.label}</Text>
                  <Text style={styles.autoDesc}>{p.desc}</Text>
                </View>
                <Feather name="check-circle" size={15} color={theme.success} />
              </View>
              {i < arr.length - 1 && <View style={styles.autoDivider} />}
            </View>
          ))}
        </GlassCard>

        {/* Enter button */}
        <Pressable
          onPress={handleEnter}
          disabled={!allGranted}
          style={({ pressed }) => [{ opacity: !allGranted ? 1 : pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={allGranted ? (["#32D74B", "#30C244"] as const) : theme.gradientDisabled}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[
              styles.enterBtn,
              allGranted && { shadowColor: theme.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10 },
            ]}
          >
            <Feather name={allGranted ? "check-circle" : "lock"} size={18} color={allGranted ? "#000000" : theme.secondaryText} />
            <Text style={[styles.enterBtnText, { color: allGranted ? "#000000" : theme.secondaryText }]}>
              {allGranted ? "Enter FocusLock" : `${total - grantedCount} Permission${total - grantedCount !== 1 ? "s" : ""} Remaining`}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.mandatoryNote}>
          All permissions are mandatory for FocusLock to work correctly.
        </Text>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },

  headerArea: { alignItems: "center", gap: 14, marginBottom: 4 },
  headerIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.accentBg,
    borderWidth: 1,
    borderColor: theme.accentBorder,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 14,
  },
  heading: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    textAlign: "center",
    lineHeight: 21,
  },

  progressRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  progressLabel:    { fontSize: 13, fontFamily: "Inter_400Regular", color: theme.secondaryText },
  progressCount:    { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressTrack:    { height: 6, borderRadius: 3, backgroundColor: theme.divider, overflow: "hidden", marginBottom: 10 },
  progressFill:     { height: "100%", borderRadius: 3 },
  progressDone:     { flexDirection: "row", alignItems: "center", gap: 6 },
  progressDoneText: { fontSize: 12, fontFamily: "Inter_500Medium", color: theme.success },
  progressHint:     { fontSize: 12, fontFamily: "Inter_400Regular", color: theme.secondaryText },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    color: theme.secondaryText,
    marginTop: 4,
    marginLeft: 2,
  },

  autoRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  autoIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.accentBg, alignItems: "center", justifyContent: "center" },
  autoLabel:   { fontSize: 13, fontFamily: "Inter_600SemiBold", color: theme.primaryText, marginBottom: 1 },
  autoDesc:    { fontSize: 11, fontFamily: "Inter_400Regular", color: theme.secondaryText },
  autoDivider: { height: 1, backgroundColor: theme.divider, marginLeft: 56 },

  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 4,
  },
  enterBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },

  mandatoryNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: theme.tertiaryText,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 2,
  },
});
