import { Feather } from "@expo/vector-icons";
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

import { useColors } from "@/hooks/useColors";

const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "2026.06.28";

const PRIVACY_POLICY = `FocusLock Privacy Policy
Last updated: June 28, 2026

1. INFORMATION WE COLLECT
FocusLock does not collect any personal information. The app operates primarily on your device. If Firebase is configured, a random device UUID (not linked to any personal identity) is used as a database path to sync lock states.

2. DATA STORED ON DEVICE
FocusLock stores the following data locally on your device:
• Active lock entries (which apps are locked and until when)
• Permission grant status for Accessibility Service and Device Admin
• Onboarding completion flag

3. FIREBASE REALTIME DATABASE (OPTIONAL)
If Firebase credentials are configured, FocusLock syncs lock data to Firebase Realtime Database using a randomly generated device UUID as the path. This data includes:
• Lock identifiers and expiry timestamps
• App package names that are locked
No personal information, name, email, or device identifiers are stored.

4. ANDROID PERMISSIONS
FocusLock requires the following Android permissions:
• Accessibility Service: To detect and block locked apps in the foreground
• Device Administrator: To prevent uninstallation while locks are active
• Usage Access: To identify which app is currently open
• Foreground Service: To maintain protection in the background
• Boot Completed: To restore locks after device restart
• Internet: For optional Firebase time verification

5. DATA SHARING
FocusLock does not share, sell, or transmit your data to any third parties. Lock data in Firebase (if used) is stored under your anonymous device UUID and is not accessible to us.

6. CHILDREN'S PRIVACY
FocusLock does not knowingly collect data from children under 13. The app does not have accounts, sign-ups, or user profiles.

7. SECURITY
Lock data is stored locally using AsyncStorage and optionally in Firebase under an anonymous UUID. The app is designed to prevent tampering via Device Admin and Accessibility Service enforcement.

8. CHANGES TO THIS POLICY
We may update this Privacy Policy. Continued use of FocusLock after changes constitutes acceptance of the updated policy.

9. CONTACT
For privacy concerns, contact the developer through the app's listing on Google Play.`;

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  showChevron?: boolean;
  destructive?: boolean;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  colors,
  showChevron = false,
  destructive = false,
}: SettingsRowProps) {
  const iconBg = destructive ? colors.destructive + "18" : colors.primary + "18";
  const iconColor = destructive ? colors.destructive : colors.primary;
  const labelColor = destructive ? colors.destructive : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : null}
      {showChevron && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function PrivacyModal({
  visible,
  onClose,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: colors.background, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Privacy Policy
          </Text>
          <Pressable
            onPress={onClose}
            style={[styles.modalClose, { backgroundColor: colors.muted }]}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={[
            styles.modalContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.privacyText, { color: colors.foreground }]}>
            {PRIVACY_POLICY}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [privacyVisible, setPrivacyVisible] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>
          Settings
        </Text>

        <SectionHeader title="APPLICATION" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingsRow
            icon="info"
            label="Version"
            value={APP_VERSION}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="cpu"
            label="Build"
            value={BUILD_NUMBER}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="target"
            label="Target SDK"
            value="API 34 (Android 14)"
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="smartphone"
            label="Min SDK"
            value="API 26 (Android 8.0)"
            colors={colors}
          />
        </View>

        <SectionHeader title="HOW IT WORKS" colors={colors} />
        <View
          style={[
            styles.howBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {[
            {
              icon: "lock",
              color: "#1E40AF",
              text: "Select apps to block and set a duration. Once confirmed, the lock cannot be removed.",
            },
            {
              icon: "eye",
              color: "#7C3AED",
              text: "The Accessibility Service monitors which app is in the foreground and blocks locked apps immediately.",
            },
            {
              icon: "shield",
              color: "#059669",
              text: "Device Admin prevents FocusLock from being uninstalled while any lock is active.",
            },
            {
              icon: "cloud",
              color: "#0284C7",
              text: "Firebase server time (when configured) is used to verify lock expiry — changing your phone's clock has no effect.",
            },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.howRow}>
                <View
                  style={[
                    styles.howIconBg,
                    { backgroundColor: item.color + "18" },
                  ]}
                >
                  <Feather name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text
                  style={[styles.howText, { color: colors.mutedForeground }]}
                >
                  {item.text}
                </Text>
              </View>
              {i < arr.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>

        <SectionHeader title="LEGAL" colors={colors} />
        <View style={[styles.section, { borderColor: colors.border }]}>
          <SettingsRow
            icon="file-text"
            label="Privacy Policy"
            colors={colors}
            showChevron
            onPress={() => setPrivacyVisible(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="book"
            label="Terms of Service"
            colors={colors}
            showChevron
            onPress={() =>
              Linking.openURL("https://focuslock.app/terms").catch(() => {})
            }
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="alert-circle"
            label="Open Source Licenses"
            colors={colors}
            showChevron
            onPress={() =>
              Linking.openURL(
                "https://github.com/expo/expo/blob/main/LICENSE"
              ).catch(() => {})
            }
          />
        </View>

        <SectionHeader title="ABOUT" colors={colors} />
        <View
          style={[
            styles.aboutCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.aboutIcon,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="shield" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>
            FocusLock
          </Text>
          <Text
            style={[styles.aboutSubtitle, { color: colors.mutedForeground }]}
          >
            v{APP_VERSION} — Social Media Addiction Blocker
          </Text>
          <Text style={[styles.aboutDesc, { color: colors.mutedForeground }]}>
            FocusLock helps you take back control of your digital life by
            blocking distracting apps for a set period. Once a lock is set, it
            cannot be removed until the timer expires — keeping you accountable
            to yourself.
          </Text>
          <View
            style={[
              styles.aboutBadge,
              {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Text style={[styles.aboutBadgeText, { color: colors.primary }]}>
              Compatible with Android 8.0+
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: colors.destructive + "10",
              borderColor: colors.destructive + "25",
            },
          ]}
        >
          <Feather name="alert-triangle" size={14} color={colors.destructive} />
          <Text style={[styles.warningText, { color: colors.destructive }]}>
            Locks are permanent until the timer expires. There is no override or
            bypass — not even for the developer.
          </Text>
        </View>

        <Text
          style={[styles.footerText, { color: colors.mutedForeground }]}
        >
          FocusLock {APP_VERSION} · Made with ❤️ for focus
        </Text>
      </ScrollView>

      <PrivacyModal
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        colors={colors}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIcon: {
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
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    marginLeft: 58,
  },
  howBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  howRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  howIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  howText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  aboutCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  aboutIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  aboutTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  aboutSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  aboutDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  aboutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  aboutBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: { flex: 1 },
  modalContent: { paddingBottom: 24 },
  privacyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
