import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Linking,
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
import { useSounds } from "@/hooks/useSounds";

const APP_VERSION = "1.0.0";

const PRIVACY_POLICY = `FocusLock Privacy Policy
Last updated: June 28, 2026

1. INFORMATION WE COLLECT
FocusLock does not collect any personal information. The app operates primarily on your device. If Firebase is configured, a random device UUID (not linked to any personal identity) is used as a database path to sync lock states.

2. DATA STORED ON DEVICE
FocusLock stores the following data locally:
• Active lock entries (which apps are locked and until when)
• Permission grant status for Accessibility Service and Device Admin
• Onboarding completion flag
• Sound preference setting

3. FIREBASE REALTIME DATABASE (OPTIONAL)
If Firebase credentials are configured, FocusLock syncs lock data using a randomly generated device UUID. No personal information is stored.

4. ANDROID PERMISSIONS
• Accessibility Service: To detect and block locked apps in the foreground
• Device Administrator: To prevent uninstallation while locks are active
• Usage Access: To identify which app is currently open
• Foreground Service: To maintain protection in the background
• Boot Completed: To restore locks after device restart
• Internet: For optional Firebase time verification

5. DATA SHARING
FocusLock does not share, sell, or transmit your data to any third parties.

6. CHILDREN'S PRIVACY
FocusLock does not knowingly collect data from children under 13.

7. CONTACT
For privacy concerns, contact the developer through the app's Google Play listing.`;

/* ── Setting row ── */
function SettingRow({
  icon,
  label,
  value,
  onPress,
  iconColors = ["#C47B2B", "#E8943A"] as const,
  last = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  iconColors?: readonly [string, string];
  last?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <LinearGradient colors={iconColors} style={styles.settingIcon}>
          <Feather name={icon as any} size={14} color="#FFF8F0" />
        </LinearGradient>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && <Feather name="chevron-right" size={15} color="rgba(212,165,116,0.4)" />}
      </Pressable>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

/* ── Sound toggle (switch only, no description) ── */
function SoundToggleRow({
  muted,
  setMuted,
  playPreview,
  last = false,
}: {
  muted: boolean;
  setMuted: (v: boolean) => void;
  playPreview: () => void;
  last?: boolean;
}) {
  const toggleAnim = useRef(new Animated.Value(muted ? 0 : 1)).current;

  function handleToggle() {
    const next = !muted;
    setMuted(next);
    Animated.spring(toggleAnim, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 200,
      friction: 10,
    }).start();
    if (!next) setTimeout(() => playPreview(), 100);
  }

  const dotPos    = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const trackColor = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(61,31,10,0.6)", "#C47B2B"] });

  return (
    <>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <LinearGradient
          colors={muted ? ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"] : ["#C47B2B", "#E8943A"]}
          style={styles.settingIcon}
        >
          <Feather name={muted ? "volume-x" : "volume-2"} size={14} color={muted ? "#D4A574" : "#FFF8F0"} />
        </LinearGradient>
        <Text style={styles.settingLabel}>Sound Effects</Text>
        <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
          <Animated.View style={[styles.dot, { transform: [{ translateX: dotPos }] }]} />
        </Animated.View>
      </Pressable>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

/* ── Privacy Policy modal ── */
function PrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.root, { paddingTop: insets.top + 16 }]}>
        <LinearGradient colors={["#0D0500", "#1A0A00", "#2C1503"]} style={StyleSheet.absoluteFill} />
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Privacy Policy</Text>
          <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <GlassCard radius={20} padding={8}>
              <Feather name="x" size={18} color="#FFF8F0" />
            </GlassCard>
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[modalStyles.content, { paddingBottom: insets.bottom + 24 }]}
        >
          <Text style={modalStyles.text}>{PRIVACY_POLICY}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  root:    { flex: 1, paddingHorizontal: 20 },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title:   { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF8F0" },
  content: { paddingBottom: 24 },
  text:    { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 22 },
});

/* ── Main Settings Screen ── */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const { muted, setMuted, playPreview } = useSounds();

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Sound Effects */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <GlassCard>
          <SoundToggleRow muted={muted} setMuted={setMuted} playPreview={playPreview} last />
        </GlassCard>

        {/* App info — version only */}
        <Text style={styles.sectionLabel}>APPLICATION</Text>
        <GlassCard>
          <SettingRow icon="info" label="Version" value={APP_VERSION} last />
        </GlassCard>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <GlassCard>
          <SettingRow icon="file-text" label="Privacy Policy" onPress={() => setPrivacyVisible(true)} />
          <SettingRow
            icon="book"
            label="Terms of Service"
            last
            onPress={() => Linking.openURL("https://focuslock.app/terms").catch(() => {})}
          />
        </GlassCard>

        {/* About — logo + name only */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <GlassCard padding={28} style={styles.aboutCard}>
          <LinearGradient colors={["#C47B2B", "#E8943A"]} style={styles.aboutIcon}>
            <Feather name="shield" size={32} color="#FFF8F0" />
          </LinearGradient>
          <Text style={styles.aboutTitle}>FocusLock</Text>
        </GlassCard>

        <Text style={styles.footer}>FocusLock {APP_VERSION}</Text>
      </ScrollView>

      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content:    { paddingHorizontal: 20, gap: 8 },
  pageTitle:  { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFF8F0", letterSpacing: -0.8, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "rgba(212,165,116,0.5)", marginTop: 12, marginBottom: 4, marginLeft: 2 },

  settingRow:   { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon:  { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFF8F0" },
  settingValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574" },
  rowDivider:   { height: 1, backgroundColor: "rgba(196,123,43,0.12)", marginLeft: 58 },

  track: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  dot:   { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF8F0" },

  aboutCard:  { alignItems: "center", gap: 12 },
  aboutIcon:  { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#C47B2B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  aboutTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFF8F0" },

  footer: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.25)", textAlign: "center", marginTop: 8, marginBottom: 4 },
});
