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
        <LinearGradient colors={["#32D74B", "#30C244"]} style={successStyles.iconCircle}>
          <Feather name="shield" size={52} color="#000" />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: "center", gap: 8 }}>
        <Text style={successStyles.title}>Lock Active</Text>
        <Text style={successStyles.subtitle}>{lockedAppCount} app{lockedAppCount !== 1 ? "s" : ""} are now blocked</Text>
      </Animated.View>

      <Animated.View style={{ opacity: cardOpacity, width: "100%", gap: 12 }}>
        <GlassCard padding={20} borderColor="rgba(50,215,75,0.12)">
          <View style={successStyles.infoRow}>
            <View style={successStyles.infoIcon}><Feather name="clock" size={15} color="#FFBF80" /></View>
            <View style={{ flex: 1 }}>
              <Text style={successStyles.infoLabel}>UNLOCKS AT</Text>
              <Text style={successStyles.infoValue}>{lockedExpiry}</Text>
            </View>
          </View>

          <View style={successStyles.divider} />

          <View style={successStyles.infoRow}>
            <View style={successStyles.infoIcon}><Feather name="slash" size={15} color="#FF453A" /></View>
            <View style={{ flex: 1 }}>
              <Text style={successStyles.infoLabel}>EARLY UNLOCK</Text>
              <Text style={[successStyles.infoValue, { color: "#FF453A" }]}>Not possible</Text>
            </View>
          </View>

          {configured && (
            <>
              <View style={successStyles.divider} />
              <View style={successStyles.infoRow}>
                <View style={successStyles.infoIcon}>
                  <Feather name={online ? "cloud" : "cloud-off"} size={15} color={online ? "#32D74B" : "#8E8E93"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={successStyles.infoLabel}>CLOUD SYNC</Text>
                  <Text style={[successStyles.infoValue, { color: online ? "#32D74B" : "#8E8E93" }]}>
                    {online ? "Synced to Firebase" : "Will sync when online"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </GlassCard>

        {skippedApps.length > 0 && (
          <GlassCard padding={14} borderColor="rgba(255,159,10,0.2)">
            <View style={successStyles.infoRow}>
              <Feather name="info" size={14} color="#FFA660" />
              <Text style={successStyles.skipText}>{skippedApps.join(", ")} already locked — skipped</Text>
            </View>
          </GlassCard>
        )}

        <GlassCard padding={18} borderColor="rgba(255,255,255,0.06)">
          <Text style={successStyles.tipText}>Stay committed. Your future self will thank you. 💪</Text>
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  root:       { flex: 1, alignItems: "center", paddingHorizontal: 24, gap: 28 },
  iconWrap:   { shadowColor: "#32D74B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 32, elevation: 18 },
  iconCircle: { width: 110, height: 110, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.5 },
  subtitle:   { fontSize: 15, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center" },
  infoRow:    { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIcon:   { width: 32, height: 32, borderRadius: 10, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" },
  infoLabel:  { fontSize: 10, fontFamily: "Inter_500Medium", color: "#8E8E93", marginBottom: 3, letterSpacing: 0.8 },
  infoValue:  { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  divider:    { height: 1, backgroundColor: "#2C2C2E", marginVertical: 14 },
  skipText:   { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#FFA660", lineHeight: 18, marginLeft: 8 },
  tipText:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 21 },
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

          {/* Scrollable body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={agStyles.scrollContent}
          >
            {/* Lock icon */}
            <View style={agStyles.iconRow}>
              <View style={agStyles.iconCircle}>
                <Feather name="lock" size={24} color="#FFBF80" />
              </View>
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
          </ScrollView>

          <View style={agStyles.divider} />

          {/* Buttons — outside scroll, always visible */}
          <View style={agStyles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [agStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={agStyles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onAgree}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={["#FFBF80", "#FFA660"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={agStyles.agreeBtn}
              >
                <Feather name="lock" size={16} color="#000000" />
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  sheet: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "58%",
    backgroundColor: "#1C1C1E",
    borderRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "#3A3A3C",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    gap: 12,
  },
  scrollContent: { gap: 10, paddingBottom: 4 },
  iconRow:    { alignItems: "center" },
  iconCircle: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,191,128,0.12)", borderWidth: 1, borderColor: "rgba(255,191,128,0.2)" },
  title:      { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  titleUnderline: { height: 2, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 1, marginHorizontal: 40 },

  infoBlock:   { backgroundColor: "#2C2C2E", borderRadius: 10, padding: 11, gap: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  infoHeading: { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "#8E8E93", marginBottom: 1 },
  infoValue:   { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 18 },
  infoSub:     { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },

  divider:     { height: 1, backgroundColor: "#2C2C2E" },

  clauseHeading:{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#EBEBF5", letterSpacing: 0.3 },
  clauses:      { gap: 6 },
  clauseRow:    { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bullet:       { width: 4, height: 4, borderRadius: 2, backgroundColor: "#8E8E93", marginTop: 6, flexShrink: 0 },
  clauseText:   { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", lineHeight: 18 },

  btnRow:     { flexDirection: "row", gap: 10 },
  cancelBtn:  { height: 48, borderRadius: 13, borderWidth: 1.5, borderColor: "#2C2C2E", backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#8E8E93" },
  agreeBtn:   { height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  agreeText:  { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000" },
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
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Once locked, this cannot be undone until the timer expires.</Text>
        </View>

        {/* Apps */}
        <Text style={styles.sectionLabel}>APPS TO LOCK</Text>
        <GlassCard>
          {selection.selectedApps.map((app, idx) => (
            <View key={app.id}>
              <View style={styles.appRow}>
                <View style={[styles.appIconBg, { backgroundColor: "#2C2C2E" }]}>
                  <FontAwesome5 name={app.iconName as any} size={17} color="#FFBF80" />
                </View>
                <View style={styles.appInfo}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPkg}>{app.packageName}</Text>
                </View>
                <Feather name="lock" size={13} color="#3A3A3C" />
              </View>
              {idx < selection.selectedApps.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </GlassCard>

        {/* Duration */}
        <Text style={styles.sectionLabel}>DURATION &amp; EXPIRY</Text>
        <GlassCard padding={18}>
          <View style={styles.durationRow}>
            <View style={styles.durationIcon}>
              <Feather name="clock" size={22} color="#FFBF80" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.durationValue}>{durationText}</Text>
              <Text style={styles.durationExpiry}>Unlocks: {expiryDate}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Summary table */}
        <GlassCard>
          {[
            { label: "Apps blocked",  value: `${selection.selectedApps.length}`, color: "#FFFFFF" },
            { label: "Duration",      value: durationText,   color: "#FFFFFF" },
            { label: "Unlocks at",    value: expiryDate,     color: "#FFFFFF" },
            { label: "Cloud sync",    value: configured ? (online ? "Firebase ☁️" : "Offline") : "Local only", color: configured && online ? "#32D74B" : "#8E8E93" },
            { label: "Early unlock",  value: "Impossible ✗", color: "#FF453A" },
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
            colors={["#FFBF80", "#FFA660"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.lockBtn}
          >
            <Feather name="lock" size={18} color="#000000" />
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

  infoBanner: { backgroundColor: "#1C1C1E", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4, borderWidth: 1, borderColor: "#2C2C2E" },
  infoText:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FFFFFF", lineHeight: 19 },

  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "#8E8E93", marginTop: 6, marginLeft: 2, marginBottom: 2 },

  appRow:    { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  appIconBg: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  appInfo:   { flex: 1 },
  appName:   { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 2 },
  appPkg:    { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  rowDivider:{ height: 1, backgroundColor: "#2C2C2E", marginLeft: 64 },

  durationRow:   { flexDirection: "row", alignItems: "center", gap: 14 },
  durationIcon:  { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,203,142,0.12)" },
  durationValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 3 },
  durationExpiry:{ fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },

  tableRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  tableLabel:  { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  tableValue:  { fontSize: 13, fontFamily: "Inter_700Bold" },
  tableDivider:{ height: 1, backgroundColor: "#2C2C2E", marginHorizontal: 16 },

  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#2C2C2E", backgroundColor: "rgba(0,0,0,0.95)" },

  cancelBtn:     { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: "#2C2C2E", backgroundColor: "#1C1C1E", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#8E8E93" },

  lockBtn:     { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#FFBF80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10 },
  lockBtnText: { color: "#000000", fontSize: 16, fontFamily: "Inter_700Bold" },
});
