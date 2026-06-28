import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

/* ─── Icon box ─── */
function IconBox({
  name,
  colors = ["#C47B2B", "#E8943A"],
}: {
  name: string;
  colors?: [string, string];
}) {
  return (
    <LinearGradient colors={colors} style={styles.iconBox}>
      <Feather name={name as any} size={14} color="#FFF8F0" />
    </LinearGradient>
  );
}

/* ─── Divider between rows ─── */
function RowDivider() {
  return <View style={styles.rowDivider} />;
}

/* ─── Standard tappable row ─── */
function SettingRow({
  icon,
  iconColors,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: string;
  iconColors?: [string, string];
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
        <IconBox name={icon} colors={iconColors} />
        <Text style={styles.rowLabel}>{label}</Text>
        {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
        {onPress && (
          <Feather name="chevron-right" size={15} color="rgba(212,165,116,0.35)" />
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
    outputRange: ["rgba(61,31,10,0.6)", "#C47B2B"],
  });

  return (
    <Pressable
      onPress={handleToggle}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
    >
      <LinearGradient
        colors={muted ? ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"] : ["#C47B2B", "#E8943A"]}
        style={styles.iconBox}
      >
        <Feather
          name={muted ? "volume-x" : "volume-2"}
          size={14}
          color={muted ? "#D4A574" : "#FFF8F0"}
        />
      </LinearGradient>
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
        <LinearGradient colors={["#0D0500", "#1A0A00", "#2C1503"]} style={StyleSheet.absoluteFill} />
        <View style={modalSt.header}>
          <Text style={modalSt.title}>{t("privacyPolicy")}</Text>
          <Pressable onPress={onClose} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <GlassCard radius={20} padding={8}>
              <Feather name="x" size={18} color="#FFF8F0" />
            </GlassCard>
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
  root:   { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title:  { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFF8F0" },
  text:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 22 },
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
            iconColors={["#8B4513", "#C47B2B"]}
            label={t("feedback")}
            onPress={() => router.push("/settings/feedback")}
          />
          <SettingRow
            icon="globe"
            iconColors={["#1A6B8A", "#2196B5"]}
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
            <LinearGradient colors={["#C47B2B", "#E8943A"]} style={styles.aboutIcon}>
              <Feather name="shield" size={26} color="#FFF8F0" />
            </LinearGradient>
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
    color: "#FFF8F0",
    letterSpacing: -0.8,
    marginBottom: 10,
  },

  /* Section header */
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
    color: "rgba(212,165,116,0.45)",
    marginTop: 14,
    marginBottom: 5,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  /* Row inside a card */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FFF8F0",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.65)",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(196,123,43,0.18)",
    marginLeft: 56,
  },

  /* Toggle */
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: "center" },
  dot:   { width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF8F0", marginHorizontal: 1 },

  /* About row */
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  aboutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C47B2B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  aboutName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFF8F0",
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.55)",
  },

  footer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.2)",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4,
  },
});
