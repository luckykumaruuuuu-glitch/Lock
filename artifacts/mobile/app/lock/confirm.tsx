import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { Particles } from "@/components/ui/Particles";
import { useFirebaseSyncContext } from "@/context/FirebaseSyncContext";
import { useLock } from "@/context/LockContext";
import { formatExpiryDate, getDurationMs } from "@/hooks/useLockStorage";
import { usePermissionStatus } from "@/hooks/usePermissionStatus";
import { useSounds } from "@/hooks/useSounds";
import { isFirebaseConfigured } from "@/lib/firebase";

function getDisplayDuration(
  preset: string,
  customDays: string,
  customHours: string
): string {
  if (preset === "1d") return "1 Day (24 hours)";
  if (preset === "7d") return "7 Days";
  if (preset === "30d") return "30 Days";
  const d = parseInt(customDays) || 0;
  const h = parseInt(customHours) || 0;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
  if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
  return parts.join(" and ") || "No duration";
}

/* ── Countdown overlay ── */
function CountdownOverlay({
  count,
  visible,
}: {
  count: number;
  visible: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(2);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count, visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <View style={cdStyles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          cdStyles.numWrap,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={["#FF0055", "#FF006E"]}
          style={cdStyles.numCircle}
        >
          <Text style={cdStyles.num}>{count}</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const cdStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 50,
  },
  numWrap: {
    shadowColor: "#FF006E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 30,
  },
  numCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  num: {
    fontSize: 80,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});

/* ── Success state ── */
function SuccessState({
  lockedExpiry,
  lockedAppCount,
  skippedApps,
  configured,
  online,
}: {
  lockedExpiry: string;
  lockedAppCount: number;
  skippedApps: string[];
  configured: boolean;
  online: boolean;
}) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [checkScale, checkOpacity]);

  return (
    <View style={sStyles.container}>
      <Animated.View
        style={[
          sStyles.iconWrap,
          { transform: [{ scale: checkScale }], opacity: checkOpacity },
        ]}
      >
        <LinearGradient colors={["#00CC6A", "#00FF88"]} style={sStyles.iconCircle}>
          <Feather name="shield" size={56} color="#000" />
        </LinearGradient>
      </Animated.View>

      <Text style={sStyles.title}>Lock Active! 🔒</Text>
      <Text style={sStyles.sub}>
        {lockedAppCount} app{lockedAppCount !== 1 ? "s" : ""} locked until{" "}
        {lockedExpiry}
      </Text>

      {skippedApps.length > 0 && (
        <GlassCard
          style={sStyles.skipCard}
          borderColor="rgba(255,149,0,0.3)"
          padding={12}
        >
          <Feather name="info" size={14} color="#FF9500" />
          <Text style={sStyles.skipText}>
            {skippedApps.join(", ")} already locked — skipped
          </Text>
        </GlassCard>
      )}

      {configured && (
        <View style={sStyles.syncRow}>
          <Feather
            name={online ? "cloud" : "cloud-off"}
            size={13}
            color="rgba(255,255,255,0.45)"
          />
          <Text style={sStyles.syncText}>
            {online ? "Synced to Firebase" : "Will sync when online"}
          </Text>
        </View>
      )}
    </View>
  );
}

const sStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 20,
  },
  iconWrap: {
    shadowColor: "#00FF88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
  },
  skipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF9500",
    lineHeight: 18,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  syncText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
});

/* ── Main Confirm Screen ── */
export default function ConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { selection, confirmLock, resetSelection } = useLock();
  const { saveToFirebase, online, configured } = useFirebaseSyncContext();
  const { permissions } = usePermissionStatus();
  const { playWarning, playLock } = useSounds();

  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [lockedExpiry, setLockedExpiry] = useState("");
  const [lockedAppCount, setLockedAppCount] = useState(0);
  const [skippedApps, setSkippedApps] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [countdownVisible, setCountdownVisible] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const durationText = getDisplayDuration(
    selection.durationPreset,
    selection.customDays,
    selection.customHours
  );
  const durationMs = getDurationMs(
    selection.durationPreset,
    selection.customDays,
    selection.customHours
  );
  const expiryDate = formatExpiryDate(Date.now() + durationMs);

  async function doLock() {
    setSaving(true);
    try {
      const result = await confirmLock();
      if (!result) {
        setSaving(false);
        return;
      }
      const { entry, duplicatesSkipped } = result;

      if (duplicatesSkipped.length > 0 && (!entry.apps || entry.apps.length === 0)) {
        setSaving(false);
        Alert.alert(
          "Already Locked",
          `${duplicatesSkipped.join(", ")} ${
            duplicatesSkipped.length === 1 ? "is" : "are"
          } already locked.`,
          [{ text: "OK" }]
        );
        return;
      }

      if (configured && entry.id) saveToFirebase(entry).catch(() => {});
      setSkippedApps(duplicatesSkipped);
      setLockedExpiry(formatExpiryDate(entry.endTime));
      setLockedAppCount(entry.apps?.length ?? 0);
      setLocked(true);
      setConfetti(true);
      playLock();

      setTimeout(() => {
        setConfetti(false);
        resetSelection();
        setTimeout(() => router.replace("/(tabs)"), 1800);
      }, 3500);
    } catch {
      setSaving(false);
      Alert.alert("Error", "Failed to save lock. Please try again.");
    }
  }

  function startCountdown() {
    playWarning();
    setCountdownVisible(true);
    let count = 3;
    setCountdown(3);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tick = () => {
      if (count > 1) {
        count--;
        setTimeout(() => {
          setCountdown(count);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          tick();
        }, 1000);
      } else {
        setTimeout(() => {
          setCountdownVisible(false);
          doLock();
        }, 1000);
      }
    };
    tick();
  }

  function handleConfirm() {
    Alert.alert(
      "Final Confirmation",
      `Lock ${selection.selectedApps.length} app${
        selection.selectedApps.length !== 1 ? "s" : ""
      } for ${durationText}.\n\nUnlocks: ${expiryDate}\n\nThis CANNOT be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Lock Forever", style: "destructive", onPress: startCountdown },
      ]
    );
  }

  if (locked) {
    return (
      <GradientBackground>
        <Particles active={confetti} />
        <SuccessState
          lockedExpiry={lockedExpiry}
          lockedAppCount={lockedAppCount}
          skippedApps={skippedApps}
          configured={configured}
          online={online}
        />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <CountdownOverlay count={countdown} visible={countdownVisible} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning banner */}
        <GlassCard
          style={styles.warningBanner}
          borderColor="rgba(255,0,85,0.4)"
          padding={18}
        >
          <LinearGradient
            colors={["rgba(255,0,85,0.25)", "rgba(255,0,85,0.1)"]}
            style={styles.warningIcon}
          >
            <Feather name="alert-octagon" size={24} color="#FF0055" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>No Going Back</Text>
            <Text style={styles.warningBody}>
              This lock CANNOT be removed until the timer expires.
            </Text>
          </View>
        </GlassCard>

        {/* Apps section */}
        <Text style={styles.sectionLabel}>APPS TO LOCK</Text>
        <GlassCard>
          {selection.selectedApps.map((app, idx) => (
            <View key={app.id}>
              <View style={styles.appRow}>
                <LinearGradient
                  colors={[app.iconColor + "33", app.iconColor + "15"]}
                  style={styles.appIconBg}
                >
                  <FontAwesome5
                    name={app.iconName as any}
                    size={18}
                    color={app.iconColor}
                  />
                </LinearGradient>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Feather name="lock" size={14} color="rgba(255,255,255,0.35)" />
              </View>
              {idx < selection.selectedApps.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </GlassCard>

        {/* Duration card */}
        <Text style={styles.sectionLabel}>DURATION & EXPIRY</Text>
        <GlassCard padding={18}>
          <View style={styles.durationRow}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.durationIcon}
            >
              <Feather name="clock" size={24} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.durationValue}>{durationText}</Text>
              <Text style={styles.durationExpiry}>Unlocks: {expiryDate}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Details table */}
        <GlassCard>
          {[
            { label: "Apps blocked", value: `${selection.selectedApps.length}`, color: "#fff" },
            { label: "Duration", value: durationText, color: "#fff" },
            { label: "Unlocks at", value: expiryDate, color: "#A5B4FC" },
            {
              label: "Verification",
              value: configured ? (online ? "Firebase ☁️" : "Offline") : "Local only",
              color: configured && online ? "#00FF88" : "rgba(255,255,255,0.45)",
            },
            { label: "Early unlock", value: "Impossible ✗", color: "#FF0055" },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{row.label}</Text>
                <Text style={[styles.tableValue, { color: row.color }]}>
                  {row.value}
                </Text>
              </View>
              {i < arr.length - 1 && <View style={styles.tableDivider} />}
            </View>
          ))}
        </GlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 20 },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={saving}
          style={({ pressed }) => [{ opacity: saving ? 0.6 : pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={["#FF0055", "#CC0044"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Feather name="lock" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>
              {saving ? "Locking…" : "Confirm — Lock Forever"}
            </Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.confirmCaveat}>
          3-second countdown confirms. No PIN bypass.
        </Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
  },
  warningIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FF0055",
    marginBottom: 3,
  },
  warningBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,0,85,0.7)",
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
    marginLeft: 2,
    marginBottom: 4,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  appIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appInfo: { flex: 1 },
  appName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginBottom: 2,
  },
  appPkg: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginLeft: 66,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  durationIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  durationValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  durationExpiry: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  tableLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  tableValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  tableDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(8,0,20,0.85)",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    shadowColor: "#FF0055",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  confirmCaveat: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
});
