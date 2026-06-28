import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
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

3. FIREBASE REALTIME DATABASE (OPTIONAL)
If Firebase credentials are configured, FocusLock syncs lock data using a randomly generated device UUID. This includes lock identifiers, expiry timestamps, and app package names. No personal information is stored.

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

7. SECURITY
Lock data is stored locally via AsyncStorage and optionally in Firebase under an anonymous UUID.

8. CONTACT
For privacy concerns, contact the developer through the app's Google Play listing.`;

function SettingRow({
  icon,
  label,
  value,
  onPress,
  iconColors = ["#6366F1", "#8B5CF6"] as const,
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
        style={({ pressed }) => [
          styles.settingRow,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <LinearGradient colors={iconColors} style={styles.settingIcon}>
          <Feather name={icon as any} size={14} color="#fff" />
        </LinearGradient>
        <Text style={styles.settingLabel}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && (
          <Feather name="chevron-right" size={15} color="rgba(255,255,255,0.25)" />
        )}
      </Pressable>
      {!last && <View style={styles.rowDivider} />}
    </>
  );
}

function PrivacyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[modalStyles.root, { paddingTop: insets.top + 16 }]}>
        <LinearGradient
          colors={["#080014", "#16082E", "#0D1535"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Privacy Policy</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [modalStyles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <GlassCard radius={20} padding={8}>
              <Feather name="x" size={18} color="#fff" />
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
  root: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  closeBtn: {},
  content: { paddingBottom: 24 },
  text: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 22,
  },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const { muted, setMuted, playClick } = useSounds();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* App section */}
        <Text style={styles.sectionLabel}>APPLICATION</Text>
        <GlassCard>
          <SettingRow icon="info" label="Version" value={APP_VERSION} iconColors={["#6366F1", "#8B5CF6"]} />
          <SettingRow icon="cpu" label="Build" value={BUILD_NUMBER} iconColors={["#6366F1", "#8B5CF6"]} />
          <SettingRow icon="target" label="Target SDK" value="API 34 (Android 14)" iconColors={["#6366F1", "#8B5CF6"]} />
          <SettingRow icon="smartphone" label="Min SDK" value="API 26 (Android 8.0)" iconColors={["#6366F1", "#8B5CF6"]} last />
        </GlassCard>

        {/* Sound section */}
        <Text style={styles.sectionLabel}>AUDIO & FEEDBACK</Text>
        <GlassCard>
          <Pressable
            onPress={() => {
              const next = !muted;
              setMuted(next);
              if (!next) playClick();
            }}
            style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <LinearGradient
              colors={muted ? ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"] : ["#FF006E", "#FF4444"]}
              style={styles.settingIcon}
            >
              <Feather name={muted ? "volume-x" : "volume-2"} size={14} color={muted ? "rgba(255,255,255,0.3)" : "#fff"} />
            </LinearGradient>
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <View
              style={[
                styles.toggle,
                { backgroundColor: muted ? "rgba(255,255,255,0.1)" : "#FF006E" },
              ]}
            >
              <View
                style={[
                  styles.toggleDot,
                  { alignSelf: muted ? "flex-start" : "flex-end" },
                ]}
              />
            </View>
          </Pressable>
          <View style={styles.rowDivider} />
          <View style={styles.settingRow}>
            <LinearGradient colors={["#FF9500", "#FF6B00"]} style={styles.settingIcon}>
              <Feather name="zap" size={14} color="#fff" />
            </LinearGradient>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Text style={styles.settingValue}>Always on</Text>
          </View>
        </GlassCard>

        {/* How it works */}
        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        <GlassCard>
          {[
            {
              icon: "lock",
              text: "Select apps to block and set a duration. Once confirmed, the lock cannot be removed.",
              colors: ["#6366F1", "#8B5CF6"] as const,
            },
            {
              icon: "eye",
              text: "The Accessibility Service monitors the foreground app and redirects away from locked apps.",
              colors: ["#FF006E", "#FF4444"] as const,
            },
            {
              icon: "shield",
              text: "Device Admin prevents FocusLock from being uninstalled while any lock is active.",
              colors: ["#00CC6A", "#00FF88"] as const,
            },
            {
              icon: "cloud",
              text: "Firebase server time (when configured) verifies lock expiry — changing your clock has no effect.",
              colors: ["#FF9500", "#FF6B00"] as const,
            },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.howRow}>
                <LinearGradient colors={item.colors} style={styles.howIcon}>
                  <Feather name={item.icon as any} size={13} color="#fff" />
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
          <SettingRow
            icon="file-text"
            label="Privacy Policy"
            iconColors={["#6366F1", "#8B5CF6"]}
            onPress={() => setPrivacyVisible(true)}
          />
          <SettingRow
            icon="book"
            label="Terms of Service"
            iconColors={["#6366F1", "#8B5CF6"]}
            onPress={() => Linking.openURL("https://focuslock.app/terms").catch(() => {})}
          />
          <SettingRow
            icon="alert-circle"
            label="Open Source Licenses"
            iconColors={["#6366F1", "#8B5CF6"]}
            last
            onPress={() =>
              Linking.openURL("https://github.com/expo/expo/blob/main/LICENSE").catch(() => {})
            }
          />
        </GlassCard>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <GlassCard padding={24} style={styles.aboutCard}>
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            style={styles.aboutIcon}
          >
            <Feather name="shield" size={32} color="#fff" />
          </LinearGradient>
          <Text style={styles.aboutTitle}>FocusLock</Text>
          <Text style={styles.aboutVersion}>v{APP_VERSION} · Social Media Blocker</Text>
          <Text style={styles.aboutDesc}>
            FocusLock helps you take back control of your digital life by
            blocking distracting apps for a set period. Once set, there's no
            going back — only the timer unlocks you.
          </Text>
          <LinearGradient
            colors={["rgba(99,102,241,0.2)", "rgba(139,92,246,0.1)"]}
            style={styles.aboutBadge}
          >
            <Text style={styles.aboutBadgeText}>Android 8.0+ compatible</Text>
          </LinearGradient>
        </GlassCard>

        <GlassCard
          padding={14}
          borderColor="rgba(255,0,85,0.25)"
          style={styles.dangerCard}
        >
          <Feather name="alert-triangle" size={14} color="#FF0055" />
          <Text style={styles.dangerText}>
            Locks are permanent until the timer expires. There is no override or
            bypass — not even for the developer.
          </Text>
        </GlassCard>

        <Text style={styles.footer}>
          FocusLock {APP_VERSION} · Made with ❤️ for focus
        </Text>
      </ScrollView>

      <PrivacyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 8 },
  pageTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.3)",
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#fff",
  },
  settingValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 58,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  howRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  howIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  howText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },
  aboutCard: { alignItems: "center", gap: 10 },
  aboutIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 4,
  },
  aboutTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  aboutVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  aboutDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  aboutBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  aboutBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#A5B4FC",
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  dangerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF0055",
    lineHeight: 18,
  },
  footer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});
