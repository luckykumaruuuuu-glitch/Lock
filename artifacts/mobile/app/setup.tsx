import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as IntentLauncher from "expo-intent-launcher";
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
import { PermissionId, usePermissionStatus } from "@/hooks/usePermissionStatus";
import { useSounds } from "@/hooks/useSounds";

const APP_PACKAGE = "com.focuslock.app";

async function openUsageAccess() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync("android.settings.USAGE_ACCESS_SETTINGS");
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}
async function openDeviceAdmin() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync("android.app.action.ADD_DEVICE_ADMIN", {
      extra: { "android.app.extra.DEVICE_ADMIN": `${APP_PACKAGE}/.DeviceAdminReceiver`, "android.app.extra.ADD_EXPLANATION": "FocusLock needs device administrator access to prevent itself from being uninstalled while a lock is active." },
    });
  } catch { await IntentLauncher.startActivityAsync("android.settings.DEVICE_INFO_SETTINGS"); }
}
async function openAccessibility() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync("android.settings.ACCESSIBILITY_SETTINGS");
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

interface PermissionStep {
  id: PermissionId;
  title: string;
  description: string;
  whyNeeded: string;
  icon: string;
  settingsLabel: string;
  openSettings: () => Promise<void>;
  iconColors: readonly [string, string];
  glow: string;
}

const PERMISSION_STEPS: PermissionStep[] = [
  { id: "usageAccess", title: "Usage Access", description: "Detects which app is in the foreground so FocusLock can enforce active locks.", whyNeeded: "Without this, FocusLock cannot detect when a blocked app is opened.", icon: "activity", settingsLabel: "Open Usage Access Settings", openSettings: openUsageAccess, iconColors: ["#C47B2B", "#E8943A"], glow: "#C47B2B" },
  { id: "deviceAdmin", title: "Device Administrator", description: "Prevents FocusLock from being uninstalled while a lock is running.", whyNeeded: "Without this, you could simply uninstall the app to bypass a lock.", icon: "shield", settingsLabel: "Activate Device Admin", openSettings: openDeviceAdmin, iconColors: ["#FF6B35", "#E85A20"], glow: "#FF6B35" },
  { id: "accessibility", title: "Accessibility Service", description: "Monitors which app is in use and redirects you when a locked app is opened.", whyNeeded: "Without this, FocusLock cannot block locked apps from being used.", icon: "eye", settingsLabel: "Enable Accessibility Service", openSettings: openAccessibility, iconColors: ["#A0522D", "#C47B2B"], glow: "#C47B2B" },
];

function PermCard({ step, granted, openedSettings, onOpenSettings, onMarkGranted, returnedFromSettings, index, onGranted }: {
  step: PermissionStep; granted: boolean; openedSettings: boolean; onOpenSettings: () => Promise<void>;
  onMarkGranted: (g: boolean) => void; returnedFromSettings: boolean; index: number; onGranted: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 150, friction: 12, delay: index * 100 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  useEffect(() => {
    if (granted) {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 250, friction: 8 }).start(() => onGranted());
    } else {
      Animated.spring(checkScale, { toValue: 0, useNativeDriver: true, tension: 250, friction: 8 }).start();
    }
  }, [granted, checkScale, onGranted]);

  async function handleOpen() {
    setOpening(true);
    try { await onOpenSettings(); } finally { setOpening(false); }
  }

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <GlassCard
        borderColor={granted ? step.iconColors[0] + "40" : "rgba(196,123,43,0.22)"}
        backgroundColor={granted ? step.iconColors[0] + "12" : "rgba(61,31,10,0.65)"}
        padding={18}
        style={granted ? { shadowColor: step.glow, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6, shadowOffset: { width: 0, height: 0 } } : undefined}
      >
        <View style={pStyles.header}>
          <LinearGradient colors={granted ? step.iconColors : ["rgba(61,31,10,0.6)", "rgba(61,31,10,0.3)"]} style={pStyles.iconBg}>
            <Feather name={step.icon as any} size={22} color={granted ? "#FFF8F0" : "#D4A574"} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={pStyles.title}>{step.title}</Text>
            <View style={pStyles.statusRow}>
              {granted
                ? <><Feather name="check-circle" size={13} color="#4CAF50" /><Text style={[pStyles.statusText, { color: "#4CAF50" }]}>Granted ✓</Text></>
                : <><Feather name="alert-circle" size={13} color="#FF6B35" /><Text style={[pStyles.statusText, { color: "#FF6B35" }]}>Required</Text></>}
            </View>
          </View>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <LinearGradient colors={["#3D9142", "#4CAF50"]} style={pStyles.checkBadge}>
              <Feather name="check" size={14} color="#FFF8F0" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={pStyles.desc}>{step.description}</Text>

        <View style={pStyles.whyBox}>
          <Feather name="info" size={12} color="rgba(212,165,116,0.4)" />
          <Text style={pStyles.whyText}>{step.whyNeeded}</Text>
        </View>

        {!granted && (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Pressable onPress={handleOpen} disabled={opening} style={({ pressed }) => [{ opacity: opening ? 0.75 : pressed ? 0.85 : 1 }]}>
              <LinearGradient colors={opening ? ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"] : step.iconColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pStyles.openBtn}>
                <Feather name="external-link" size={14} color="#FFF8F0" />
                <Text style={pStyles.openBtnText}>{opening ? "Opening…" : step.settingsLabel}</Text>
              </LinearGradient>
            </Pressable>
            {openedSettings && returnedFromSettings && (
              <Pressable onPress={() => onMarkGranted(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <GlassCard borderColor={step.iconColors[0] + "40"} backgroundColor={step.iconColors[0] + "12"} padding={12} radius={14}>
                  <View style={pStyles.verifyRow}>
                    <Feather name="check" size={14} color={step.iconColors[0]} />
                    <Text style={[pStyles.verifyText, { color: step.iconColors[0] }]}>I've enabled this</Text>
                  </View>
                </GlassCard>
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
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  iconBg: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF8F0", marginBottom: 3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  checkBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  desc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 20, marginBottom: 10 },
  whyBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, backgroundColor: "rgba(61,31,10,0.5)", marginBottom: 4 },
  whyText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.55)", lineHeight: 18 },
  openBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  openBtnText: { color: "#FFF8F0", fontSize: 14, fontFamily: "Inter_700Bold" },
  verifyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  verifyText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  undoBtn: { alignItems: "center", marginTop: 4 },
  undoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.3)", textDecorationLine: "underline" },
});

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { permissions, allGranted, markOpened, markGranted, completeSetup } = usePermissionStatus();
  const { playSuccess, playPermissionGranted } = useSounds();
  const [returnedFrom, setReturnedFrom] = useState<PermissionId | null>(null);
  const lastOpenedRef = useRef<PermissionId | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const grantedCount = Object.values(permissions).filter((p) => p.granted).length;
  const total = PERMISSION_STEPS.length;

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: (grantedCount / total) * 100, useNativeDriver: false, tension: 150, friction: 12 }).start();
    if (grantedCount === total && total > 0) playSuccess();
  }, [grantedCount, total, progressAnim, playSuccess]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current !== "active" && nextState === "active" && lastOpenedRef.current) setReturnedFrom(lastOpenedRef.current);
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const handleOpenSettings = useCallback(async (step: PermissionStep) => {
    lastOpenedRef.current = step.id;
    setReturnedFrom(null);
    await markOpened(step.id);
    if (Platform.OS !== "android") {
      Alert.alert("Android Only", "This flow is Android-only. Tap 'I've enabled this' to simulate.", [{ text: "OK" }]);
      setReturnedFrom(step.id);
      return;
    }
    await step.openSettings();
  }, [markOpened]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  async function handleComplete() {
    await completeSetup();
    router.replace("/(tabs)");
  }

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad + 24, paddingBottom: bottomPad + 40 }]} showsVerticalScrollIndicator={false}>

        <View style={styles.headerArea}>
          <LinearGradient colors={["#C47B2B", "#E8943A"]} style={styles.headerIcon}>
            <Feather name="shield" size={36} color="#FFF8F0" />
          </LinearGradient>
          <Text style={styles.heading}>Set Up FocusLock</Text>
          <Text style={styles.subheading}>Grant each permission below — this is a one-time setup to activate full protection.</Text>
        </View>

        <GlassCard padding={18} style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Permissions granted</Text>
            <Text style={styles.progressCount}>{grantedCount}/{total}</Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: grantedCount === total ? "#4CAF50" : "#C47B2B" }]} />
          </View>
          {grantedCount === total && (
            <View style={styles.progressComplete}>
              <Feather name="check-circle" size={14} color="#4CAF50" />
              <Text style={styles.progressCompleteText}>All permissions granted — FocusLock is ready!</Text>
            </View>
          )}
        </GlassCard>

        <Text style={styles.sectionLabel}>REQUIRED PERMISSIONS</Text>
        <View style={{ gap: 12 }}>
          {PERMISSION_STEPS.map((step, i) => (
            <PermCard
              key={step.id}
              step={step}
              granted={permissions[step.id].granted}
              openedSettings={permissions[step.id].openedSettings}
              returnedFromSettings={returnedFrom === step.id || (!permissions[step.id].granted && permissions[step.id].openedSettings)}
              onOpenSettings={() => handleOpenSettings(step)}
              onMarkGranted={(g) => markGranted(step.id, g)}
              index={i}
              onGranted={playPermissionGranted}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>AUTO-CONFIGURED</Text>
        <GlassCard>
          {[
            { icon: "wifi", label: "Internet", desc: "For cloud sync" },
            { icon: "cpu", label: "Foreground Service", desc: "Background enforcement" },
            { icon: "power", label: "Boot Completed", desc: "Restores after reboot" },
          ].map((p, i, arr) => (
            <View key={p.label}>
              <View style={styles.autoRow}>
                <View style={styles.autoIcon}>
                  <Feather name={p.icon as any} size={14} color="#C47B2B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoLabel}>{p.label}</Text>
                  <Text style={styles.autoDesc}>{p.desc}</Text>
                </View>
                <Feather name="check-circle" size={16} color="#4CAF50" />
              </View>
              {i < arr.length - 1 && <View style={styles.autoDivider} />}
            </View>
          ))}
        </GlassCard>

        <Pressable onPress={handleComplete} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient
            colors={allGranted ? ["#3D9142", "#4CAF50"] : ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.enterBtn, allGranted && { shadowColor: "#4CAF50", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 }]}
          >
            <Feather name={allGranted ? "check-circle" : "lock"} size={18} color={allGranted ? "#FFF8F0" : "#D4A574"} />
            <Text style={[styles.enterBtnText, { color: allGranted ? "#FFF8F0" : "#D4A574" }]}>
              {allGranted ? "Enter FocusLock" : `Grant ${total - grantedCount} More Permission${total - grantedCount !== 1 ? "s" : ""}`}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleComplete} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now (locks won't be enforced)</Text>
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  headerArea: { alignItems: "center", gap: 14, marginBottom: 8 },
  headerIcon: { width: 80, height: 80, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#C47B2B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 16 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF8F0", letterSpacing: -0.5, textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#D4A574", textAlign: "center", lineHeight: 22 },
  progressCard: { gap: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574" },
  progressCount: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF8F0" },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(196,123,43,0.15)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressComplete: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  progressCompleteText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#4CAF50" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "rgba(212,165,116,0.4)", marginTop: 8, marginLeft: 2, marginBottom: 4 },
  autoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  autoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(196,123,43,0.15)", alignItems: "center", justifyContent: "center" },
  autoLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF8F0", marginBottom: 1 },
  autoDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#D4A574" },
  autoDivider: { height: 1, backgroundColor: "rgba(196,123,43,0.1)", marginLeft: 60 },
  enterBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18, marginTop: 8 },
  enterBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.3)", textDecorationLine: "underline" },
});
