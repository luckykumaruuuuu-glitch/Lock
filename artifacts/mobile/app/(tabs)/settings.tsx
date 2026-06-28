import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
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

/* ─── Flat icon ─── */
function FlatIcon({ name }: { name: string }) {
  return (
    <View style={styles.iconBox}>
      <Feather name={name as any} size={18} color="#8E8E93" />
    </View>
  );
}

/* ─── Divider between rows ─── */
function RowDivider() {
  return <View style={styles.rowDivider} />;
}

/* ─── Standard tappable row ─── */
function SettingRow({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
      >
        <FlatIcon name={icon} />
        <Text style={styles.rowLabel}>{label}</Text>
        {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
        {onPress && (
          <Feather name="chevron-right" size={15} color="#3A3A3C" />
        )}
      </Pressable>
      {!last && <RowDivider />}
    </>
  );
}

/* ─── Sound toggle row ─── */
function SoundToggleRow({
  muted,
  setMuted,
  playPreview,
  label,
}: {
  muted: boolean;
  setMuted: (v: boolean) => void;
  playPreview: () => void;
  label: string;
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

  const dotPos = toggleAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  const trackColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#3A3A3C", "#FFD60A"],
  });

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
    >
      <FlatIcon name={muted ? "volume-x" : "volume-2"} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.dot, { transform: [{ translateX: dotPos }] }]} />
      </Animated.View>
    </Pressable>
  );
}

/* ─── Privacy modal ─── */
function PrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalSt.root, { paddingTop: insets.top + 16 }]}>
        <View style={modalSt.header}>
          <Text style={modalSt.title}>{t("privacyPolicy")}</Text>
          <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View style={modalSt.closeBtn}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text style={modalSt.text}>{PRIVACY_POLICY}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalSt = StyleSheet.create({
  root:     { flex: 1, paddingHorizontal: 20, backgroundColor: "#000000" },
  header:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title:    { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" },
  text:     { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 22 },
});

/* ─── Section label ─── */
function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

/* ─── Main screen ─── */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const { muted, setMuted, playPreview } = useSounds();
  const { t, currentLanguage } = useLanguage();

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  const currentLangName = LANGUAGES.find((l) => l.code === currentLanguage)?.name ?? "English";

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title */}
        <Text style={styles.pageTitle}>{t("settings")}</Text>

        {/* PREFERENCES */}
        <SectionLabel label={t("preferences")} />
        <GlassCard padding={0}>
          <SoundToggleRow
            muted={muted}
            setMuted={setMuted}
            playPreview={playPreview}
            label={t("soundEffects")}
          />
        </GlassCard>

        {/* APPLICATION */}
        <SectionLabel label={t("application")} />
        <GlassCard padding={0}>
          <SettingRow icon="info" label={t("version")} value={APP_VERSION} last />
        </GlassCard>

        {/* SUPPORT */}
        <SectionLabel label={t("support")} />
        <GlassCard padding={0}>
          <SettingRow
            icon="message-circle"
            label={t("feedback")}
            onPress={() => router.push("/settings/feedback")}
          />
          <SettingRow
            icon="globe"
            label={t("language")}
            value={currentLangName}
            onPress={() => router.push("/settings/language")}
            last
          />
        </GlassCard>

        {/* LEGAL */}
        <SectionLabel label={t("legal")} />
        <GlassCard padding={0}>
          <SettingRow
            icon="file-text"
            label={t("privacyPolicy")}
            onPress={() => setPrivacyVisible(true)}
          />
          <SettingRow
            icon="book"
            label={t("termsOfService")}
            onPress={() => Linking.openURL("https://focuslock.app/terms").catch(() => {})}
            last
          />
        </GlassCard>

        {/* ABOUT */}
        <SectionLabel label={t("about")} />
        <GlassCard padding={0}>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIconBox}>
              <Feather name="shield" size={22} color="#FFD60A" />
            </View>
            <View>
              <Text style={styles.aboutName}>FocusLock</Text>
              <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
            </View>
          </View>
        </GlassCard>

        <Text style={styles.footer}>FocusLock {APP_VERSION}</Text>
      </ScrollView>

      <PrivacyModal visible={privacyVisible} onClose={() => setPrivacyVisible(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content:   { paddingHorizontal: 20, gap: 6 },
  pageTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    marginBottom: 10,
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
    color: "#8E8E93",
    marginTop: 14,
    marginBottom: 5,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2C2C2E",
    marginLeft: 58,
  },

  track: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  dot:   { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFFFFF", marginHorizontal: 1 },

  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  aboutIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,214,10,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  aboutName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
  },

  footer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#3A3A3C",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4,
  },
});
