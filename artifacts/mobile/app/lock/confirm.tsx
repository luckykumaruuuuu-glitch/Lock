import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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
import { useFirebaseSyncContext } from "@/context/FirebaseSyncContext";
import { useLock } from "@/context/LockContext";
import { formatExpiryDate, getDurationMs } from "@/hooks/useLockStorage";
import { isFirebaseConfigured } from "@/lib/firebase";

function getDisplayDuration(preset: string, customDays: string, customHours: string): string {
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

/* ── Success Screen ── */
function SuccessScreen({
  lockedExpiry, lockedAppCount, skippedApps, configured, online,
}: {
  lockedExpiry: string; lockedAppCount: number; skippedApps: string[];
  configured: boolean; online: boolean;
}) {
  const insets = useSafeAreaInsets();
  const shieldScale   = useRef(new Animated.Value(0)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const cardOpacity   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(shieldScale, { toValue: 1, useNativeDriver: true, tension: 160, friction: 7 }),
        Animated.timing(shieldOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [shieldScale, shieldOpacity, textOpacity, cardOpacity]);

  return (
    <View style={[successStyles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <Animated.View style={[successStyles.iconWrap, { transform: [{ scale: shieldScale }], opacity: shieldOpacity }]}>
        <LinearGradient colors={["#00CC6A", "#00FF88"]} style={successStyles.iconCircle}>
          <Feather name="shield" size={52} color="#000" />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: "center", gap: 8 }}>
        <Text style={successStyles.title}>Lock Active</Text>
        <Text style={successStyles.subtitle}>{lockedAppCount} app{lockedAppCount !== 1 ? "s" : ""} are now blocked</Text>
      </Animated.View>

      <Animated.View style={{ opacity: cardOpacity, width: "100%", gap: 12 }}>
        <GlassCard padding={20} borderColor="rgba(0,255,136,0.12)">
          <View style={successStyles.infoRow}>
            <View style={successStyles.infoIcon}><Feather name="clock" size={15} color="#A5B4FC" /></View>
            <View style={{ flex: 1 }}>
              <Text style={successStyles.infoLabel}>UNLOCKS AT</Text>
              <Text style={successStyles.infoValue}>{lockedExpiry}</Text>
            </View>
          </View>

          <View style={successStyles.divider} />

          <View style={successStyles.infoRow}>
            <View style={successStyles.infoIcon}><Feather name="slash" size={15} color="#FF6B6B" /></View>
            <View style={{ flex: 1 }}>
              <Text style={successStyles.infoLabel}>EARLY UNLOCK</Text>
              <Text style={[successStyles.infoValue, { color: "#FF6B6B" }]}>Not possible</Text>
            </View>
          </View>

          {configured && (
            <>
              <View style={successStyles.divider} />
              <View style={successStyles.infoRow}>
                <View style={successStyles.infoIcon}>
                  <Feather name={online ? "cloud" : "cloud-off"} size={15} color={online ? "#00FF88" : "rgba(255,255,255,0.35)"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={successStyles.infoLabel}>CLOUD SYNC</Text>
                  <Text style={[successStyles.infoValue, { color: online ? "#00FF88" : "rgba(255,255,255,0.45)" }]}>
                    {online ? "Synced to Firebase" : "Will sync when online"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </GlassCard>

        {skippedApps.length > 0 && (
          <GlassCard padding={14} borderColor="rgba(255,149,0,0.2)">
            <View style={successStyles.infoRow}>
              <Feather name="info" size={14} color="#FF9500" />
              <Text style={successStyles.skipText}>{skippedApps.join(", ")} already locked — skipped</Text>
            </View>
          </GlassCard>
        )}

        <GlassCard padding={18} borderColor="rgba(255,255,255,0.05)">
          <Text style={successStyles.tipText}>Stay committed. Your future self will thank you. 💪</Text>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  root:       { flex: 1, alignItems: "center", paddingHorizontal: 24, gap: 28 },
  iconWrap:   { shadowColor: "#00FF88", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 32, elevation: 18 },
  iconCircle: { width: 110, height: 110, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle:   { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textAlign: "center" },
  infoRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon:   { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  infoLabel:  { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.35)", marginBottom: 3, letterSpacing: 0.8 },
  infoValue:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  divider:    { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 14 },
  skipText:   { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#FF9500", lineHeight: 18, marginLeft: 8 },
  tipText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.38)", textAlign: "center", lineHeight: 21 },
});

/* ── Final Agreement Modal ── */
function AgreementModal({
  visible,
  appNames,
  durationText,
  expiryDate,
  onCancel,
  onAgree,
}: {
  visible: boolean;
  appNames: string[];
  durationText: string;
  expiryDate: string;
  onCancel: () => void;
  onAgree: () => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[agStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[agStyles.sheet, { transform: [{ scale: scaleAnim }] }]}>

          {/* Warning icon */}
          <View style={agStyles.iconRow}>
            <LinearGradient colors={["rgba(255,0,85,0.25)", "rgba(255,0,85,0.1)"]} style={agStyles.iconCircle}>
              <Feather name="alert-octagon" size={28} color="#FF0055" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={agStyles.title}>Final Agreement</Text>
          <View style={agStyles.titleUnderline} />

          {/* Apps being locked */}
          <View style={agStyles.infoBlock}>
            <Text style={agStyles.infoHeading}>APPS BEING LOCKED</Text>
            <Text style={agStyles.infoValue}>
              {appNames.length > 0 ? appNames.join(", ") : "No apps selected"}
            </Text>
          </View>

          {/* Lock duration */}
          <View style={agStyles.infoBlock}>
            <Text style={agStyles.infoHeading}>LOCK DURATION</Text>
            <Text style={agStyles.infoValue}>{durationText}</Text>
            <Text style={agStyles.infoSub}>Unlocks: {expiryDate}</Text>
          </View>

          <View style={agStyles.divider} />

          {/* Agreement clauses */}
          <Text style={agStyles.clauseHeading}>By agreeing, you confirm that:</Text>
          <View style={agStyles.clauses}>
            {[
              "This lock CANNOT be removed before the timer expires.",
              "You cannot uninstall this app during the lock period.",
              "No PIN, no bypass, no exceptions.",
              "This decision is final and irreversible.",
            ].map((clause, i) => (
              <View key={i} style={agStyles.clauseRow}>
                <View style={agStyles.bullet} />
                <Text style={agStyles.clauseText}>{clause}</Text>
              </View>
            ))}
          </View>

          <View style={agStyles.divider} />

          {/* Buttons */}
          <View style={agStyles.btnRow}>
            {/* Cancel — grey */}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [agStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={agStyles.cancelText}>Cancel</Text>
            </Pressable>

            {/* Agree — golden/red gradient */}
            <Pressable
              onPress={onAgree}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#FFD580", "#FF2255"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={agStyles.agreeBtn}
              >
                <Feather name="lock" size={16} color="#1A1A1A" />
                <Text style={agStyles.agreeText}>I Agree &amp; Lock</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const agStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  sheet: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#000000",
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255,0,85,0.25)",
    shadowColor: "#FF0055",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    gap: 16,
  },
  iconRow:    { alignItems: "center" },
  iconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,0,85,0.3)" },
  title:      { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  titleUnderline: { height: 2, backgroundColor: "rgba(255,0,85,0.3)", borderRadius: 1, marginHorizontal: 40 },

  infoBlock:   { backgroundColor: "rgba(255,213,128,0.06)", borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: "rgba(255,213,128,0.12)" },
  infoHeading: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "rgba(255,213,128,0.45)", marginBottom: 2 },
  infoValue:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 20 },
  infoSub:     { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },

  divider:     { height: 1, backgroundColor: "rgba(255,255,255,0.07)" },

  clauseHeading:{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,0,85,0.7)", letterSpacing: 0.3 },
  clauses:      { gap: 8 },
  clauseRow:    { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet:       { width: 5, height: 5, borderRadius: 3, backgroundColor: "#FF0055", marginTop: 5, flexShrink: 0 },
  clauseText:   { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,248,240,0.7)", lineHeight: 19 },

  btnRow:     { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn:  { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.45)" },
  agreeBtn:   { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#FF0055", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  agreeText:  { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1A1A1A" },
});

/* ── Main Confirm Screen ── */
export default function ConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { selection, confirmLock, resetSelection } = useLock();
  const { saveToFirebase, online, configured }     = useFirebaseSyncContext();

  const [saving,          setSaving]          = useState(false);
  const [locked,          setLocked]          = useState(false);
  const [showAgreement,   setShowAgreement]   = useState(false);
  const [lockedExpiry,    setLockedExpiry]    = useState("");
  const [lockedAppCount,  setLockedAppCount]  = useState(0);
  const [skippedApps,     setSkippedApps]     = useState<string[]>([]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const durationText = getDisplayDuration(selection.durationPreset, selection.customDays, selection.customHours);
  const durationMs   = getDurationMs(selection.durationPreset, selection.customDays, selection.customHours);
  const expiryDate   = formatExpiryDate(Date.now() + durationMs);
  const appNames     = selection.selectedApps.map(a => a.name);

  async function doLock() {
    setShowAgreement(false);
    if (saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await confirmLock();
      if (!result) { setSaving(false); return; }
      const { entry, duplicatesSkipped } = result;

      if (configured && entry.id) saveToFirebase(entry).catch(() => {});

      setSkippedApps(duplicatesSkipped);
      setLockedExpiry(formatExpiryDate(entry.endTime));
      setLockedAppCount(entry.apps?.length ?? 0);
      setLocked(true);

      setTimeout(() => {
        resetSelection();
        setTimeout(() => router.replace("/(tabs)"), 2500);
      }, 4000);
    } catch {
      setSaving(false);
    }
  }

  if (locked) {
    return (
      <GradientBackground>
        <SuccessScreen
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: bottomPad + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning banner */}
        <View style={styles.warningBanner}>
          <LinearGradient colors={["rgba(255,0,85,0.22)", "rgba(255,0,85,0.08)"]} style={styles.warningIconBox}>
            <Feather name="alert-octagon" size={21} color="#FF0055" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>No Going Back</Text>
            <Text style={styles.warningBody}>This lock CANNOT be removed until the timer expires.</Text>
          </View>
        </View>

        {/* Apps */}
        <Text style={styles.sectionLabel}>APPS TO LOCK</Text>
        <GlassCard>
          {selection.selectedApps.map((app, idx) => (
            <View key={app.id}>
              <View style={styles.appRow}>
                <LinearGradient colors={[app.iconColor + "33", app.iconColor + "15"]} style={styles.appIconBg}>
                  <FontAwesome5 name={app.iconName as any} size={17} color={app.iconColor} />
                </LinearGradient>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Feather name="lock" size={13} color="rgba(255,255,255,0.28)" />
              </View>
              {idx < selection.selectedApps.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </GlassCard>

        {/* Duration */}
        <Text style={styles.sectionLabel}>DURATION &amp; EXPIRY</Text>
        <GlassCard padding={18}>
          <View style={styles.durationRow}>
            <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.durationIcon}>
              <Feather name="clock" size={22} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.durationValue}>{durationText}</Text>
              <Text style={styles.durationExpiry}>Unlocks: {expiryDate}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Summary table */}
        <GlassCard>
          {[
            { label: "Apps blocked",  value: `${selection.selectedApps.length}`, color: "#fff" },
            { label: "Duration",      value: durationText,   color: "#fff" },
            { label: "Unlocks at",    value: expiryDate,     color: "#A5B4FC" },
            { label: "Cloud sync",    value: configured ? (online ? "Firebase ☁️" : "Offline") : "Local only", color: configured && online ? "#00FF88" : "rgba(255,255,255,0.45)" },
            { label: "Early unlock",  value: "Impossible ✗", color: "#FF0055" },
          ].map((row, i, arr) => (
            <View key={row.label}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>{row.label}</Text>
                <Text style={[styles.tableValue, { color: row.color }]}>{row.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.tableDivider} />}
            </View>
          ))}
        </GlassCard>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={({ pressed }) => [styles.cancelBtn, { opacity: saving ? 0.4 : pressed ? 0.65 : 1 }]}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowAgreement(true);
          }}
          disabled={saving}
          style={({ pressed }) => [{ flex: 1, opacity: saving ? 0.7 : pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={["#FFD580", "#FF2255"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.lockBtn}
          >
            <Feather name="lock" size={18} color="#1A1A1A" />
            <Text style={styles.lockBtnText}>{saving ? "Locking…" : "Lock Forever"}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Final Agreement Popup */}
      <AgreementModal
        visible={showAgreement}
        appNames={appNames}
        durationText={durationText}
        expiryDate={expiryDate}
        onCancel={() => setShowAgreement(false)}
        onAgree={doLock}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20, gap: 10 },

  warningBanner:  { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(255,0,85,0.09)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,0,85,0.22)", padding: 16, marginBottom: 4 },
  warningIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  warningTitle:   { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FF0055", marginBottom: 3 },
  warningBody:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,0,85,0.6)", lineHeight: 17 },

  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "rgba(255,255,255,0.28)", marginTop: 6, marginLeft: 2, marginBottom: 2 },

  appRow:    { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  appIconBg: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  appInfo:   { flex: 1 },
  appName:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 2 },
  appPkg:    { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.28)" },
  rowDivider:{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginLeft: 64 },

  durationRow:   { flexDirection: "row", alignItems: "center", gap: 14 },
  durationIcon:  { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  durationValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  durationExpiry:{ fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.38)" },

  tableRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  tableLabel:  { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.38)" },
  tableValue:  { fontSize: 13, fontFamily: "Inter_700Bold" },
  tableDivider:{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginHorizontal: 16 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(8,0,20,0.94)" },

  cancelBtn:     { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.13)", backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.55)" },

  lockBtn:     { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#FF0055", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  lockBtnText: { color: "#1A1A1A", fontSize: 16, fontFamily: "Inter_700Bold" },
});
