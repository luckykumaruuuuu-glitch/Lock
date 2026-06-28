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
const BUILD_NUMBER = "2026.06.28";

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

function SoundToggleRow({ muted, setMuted, playPreview }: { muted: boolean; setMuted: (v: boolean) => void; playPreview: () => void }) {
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
    if (!next) {
      setTimeout(() => playPreview(), 100);
    }
  }

  const dotPos = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const trackColor = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(61,31,10,0.6)", "#C47B2B"] });

  return (
    <>
      <Pressable onPress={handleToggle} style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}>
        <LinearGradient
          colors={muted ? ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"] : ["#C47B2B", "#E8943A"]}
          style={styles.settingIcon}
        >
          <Feather name={muted ? "volume-x" : "volume-2"} size={14} color={muted ? "#D4A574" : "#FFF8F0"} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>Sound Effects</Text>
          <Text style={[styles.soundStatus, { color: muted ? "#D4A574" : "#4CAF50" }]}>
            {muted ? "Sound Effects: OFF ✗" : "Sound Effects: ON ✓"}
          </Text>
        </View>
        <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
          <Animated.View style={[styles.dot, { transform: [{ translateX: dotPos }] }]} />
        </Animated.View>
      </Pressable>
      <View style={styles.rowDivider} />
    </>
  );
}

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[modalStyles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={modalStyles.text}>{PRIVACY_POLICY}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF8F0" },
  content: { paddingBottom: 24 },
  text: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 22 },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const { muted, setMuted, playPreview } = useSounds();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Sound Effects — prominent section */}
        <Text style={styles.sectionLabel}>SOUND EFFECTS</Text>
        <GlassCard>
          <SoundToggleRow muted={muted} setMuted={setMuted} playPreview={playPreview} />
          <View style={styles.soundInfo}>
            <Text style={styles.soundInfoTitle}>When ON:</Text>
            {["Button click — soft click", "Lock confirmed — success chime", "App blocked — warning tone", "Permission granted — pleasant ding"].map((s) => (
              <View key={s} style={styles.soundItem}>
                <Feather name="music" size={10} color="#C47B2B" />
                <Text style={styles.soundItemText}>{s}</Text>
              </View>
            ))}
            <Text style={[styles.soundInfoTitle, { marginTop: 10 }]}>When OFF:</Text>
            <View style={styles.soundItem}>
              <Feather name="volume-x" size={10} color="#D4A574" />
              <Text style={styles.soundItemText}>Complete silence, no sounds at all</Text>
            </View>
          </View>
        </GlassCard>

        {/* App info */}
        <Text style={styles.sectionLabel}>APPLICATION</Text>
        <GlassCard>
          <SettingRow icon="info" label="Version" value={APP_VERSION} />
          <SettingRow icon="cpu" label="Build" value={BUILD_NUMBER} />
          <SettingRow icon="target" label="Target SDK" value="API 34 (Android 14)" />
          <SettingRow icon="smartphone" label="Min SDK" value="API 26 (Android 8.0)" last />
        </GlassCard>

        {/* How it works */}
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <GlassCard>
          {[
            { icon: "lock", text: "Select apps to block and set a duration. Once confirmed, the lock cannot be removed.", colors: ["#C47B2B", "#E8943A"] as const },
            { icon: "eye", text: "The Accessibility Service monitors the foreground app and redirects away from locked apps.", colors: ["#FF6B35", "#E85A20"] as const },
            { icon: "shield", text: "Device Admin prevents FocusLock from being uninstalled while any lock is active.", colors: ["#3D9142", "#4CAF50"] as const },
            { icon: "cloud", text: "Firebase server time (when configured) verifies lock expiry — changing your clock has no effect.", colors: ["#A0522D", "#C47B2B"] as const },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.howRow}>
                <LinearGradient colors={item.colors} style={styles.howIcon}>
                  <Feather name={item.icon as any} size={13} color="#FFF8F0" />
                </LinearGradient>
                <Text style={styles.howText}>{item.text}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </GlassCard>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <GlassCard>
          <SettingRow icon="file-text" label="Privacy Policy" onPress={() => setPrivacyVisible(true)} />
          <SettingRow icon="book" label="Terms of Service" onPress={() => Linking.openURL("https://focuslock.app/terms").catch(() => {})} />
          <SettingRow icon="alert-circle" label="Open Source Licenses" last onPress={() => Linking.openURL("https://github.com/expo/expo/blob/main/LICENSE").catch(() => {})} />
        </GlassCard>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <GlassCard padding={24} style={styles.aboutCard}>
          <LinearGradient colors={["#C47B2B", "#E8943A"]} style={styles.aboutIcon}>
            <Feather name="shield" size={32} color="#FFF8F0" />
          </LinearGradient>
          <Text style={styles.aboutTitle}>FocusLock</Text>
          <Text style={styles.aboutVersion}>v{APP_VERSION} · Social Media Blocker</Text>
          <Text style={styles.aboutDesc}>
            FocusLock helps you take back control of your digital life by blocking distracting apps for a set period. Once set, there's no going back — only the timer unlocks you.
          </Text>
          <LinearGradient colors={["rgba(196,123,43,0.2)", "rgba(232,148,58,0.1)"]} style={styles.aboutBadge}>
            <Text style={styles.aboutBadgeText}>Android 8.0+ compatible</Text>
          </LinearGradient>
        </GlassCard>

        <GlassCard padding={14} borderColor="rgba(255,107,53,0.3)" backgroundColor="rgba(255,107,53,0.08)" style={styles.dangerCard}>
          <Feather name="alert-triangle" size={14} color="#FF6B35" />
          <Text style={styles.dangerText}>Locks are permanent until the timer expires. There is no override or bypass — not even for the developer.</Text>
        </GlassCard>

        <Text style={styles.footer}>FocusLock {APP_VERSION} · Made with ❤️ for focus</Text>
      </ScrollView>

      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 8 },
  pageTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFF8F0", letterSpacing: -0.8, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, color: "rgba(212,165,116,0.5)", marginTop: 12, marginBottom: 4, marginLeft: 2 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFF8F0" },
  settingValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574" },
  rowDivider: { height: 1, backgroundColor: "rgba(196,123,43,0.12)", marginLeft: 58 },
  soundStatus: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  track: { width: 44, height: 24, borderRadius: 12, justifyContent: "center" },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF8F0" },
  soundInfo: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4, gap: 5 },
  soundInfoTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#D4A574" },
  soundItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  soundItemText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.65)" },
  howRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  howIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 1 },
  howText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 20 },
  aboutCard: { alignItems: "center", gap: 10 },
  aboutIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowColor: "#C47B2B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12, marginBottom: 4 },
  aboutTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF8F0" },
  aboutVersion: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#D4A574" },
  aboutDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", textAlign: "center", lineHeight: 20, marginTop: 4 },
  aboutBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  aboutBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#E8943A" },
  dangerCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  dangerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF6B35", lineHeight: 18 },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.3)", textAlign: "center", marginTop: 8, marginBottom: 4 },
});
