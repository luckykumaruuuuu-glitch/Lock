import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
  showChevron?: boolean;
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  colors,
  showChevron = false,
}: SettingsRowProps) {
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
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : null}
      {showChevron && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Settings</Text>

      <SectionHeader title="APPLICATION" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <SettingsRow icon="info" label="Version" value="1.0.0" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="cpu" label="Build" value="2024.1" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="target" label="Target SDK" value="API 34 (Android 14)" colors={colors} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow icon="smartphone" label="Min SDK" value="API 26 (Android 8.0)" colors={colors} />
      </View>

      <SectionHeader title="LEGAL" colors={colors} />
      <View style={[styles.section, { borderColor: colors.border }]}>
        <SettingsRow
          icon="file-text"
          label="Privacy Policy"
          colors={colors}
          showChevron
          onPress={() => Linking.openURL("https://example.com/privacy")}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SettingsRow
          icon="book"
          label="Terms of Service"
          colors={colors}
          showChevron
          onPress={() => Linking.openURL("https://example.com/terms")}
        />
      </View>

      <SectionHeader title="ABOUT" colors={colors} />
      <View
        style={[
          styles.aboutCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.aboutIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="shield" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.aboutTitle, { color: colors.foreground }]}>
          FocusLock
        </Text>
        <Text style={[styles.aboutSubtitle, { color: colors.mutedForeground }]}>
          Social Media Addiction Blocker
        </Text>
        <Text style={[styles.aboutDesc, { color: colors.mutedForeground }]}>
          FocusLock helps you take back control of your digital life by blocking
          distracting apps for a set period. Once a lock is set, it cannot be
          removed — keeping you accountable.
        </Text>
        <View style={[styles.aboutBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.aboutBadgeText, { color: colors.primary }]}>
            Compatible with Android 8.0+
          </Text>
        </View>
      </View>

      <View style={[styles.warningBox, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "25" }]}>
        <Feather name="alert-triangle" size={14} color={colors.destructive} />
        <Text style={[styles.warningText, { color: colors.destructive }]}>
          Locks are permanent until the timer expires. There is no override or bypass.
        </Text>
      </View>
    </ScrollView>
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
});
