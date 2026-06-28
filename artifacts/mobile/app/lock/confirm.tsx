import { FontAwesome5, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(
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

export default function ConfirmScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selection, resetSelection } = useLock();
  const [locked, setLocked] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const durationText = formatDuration(
    selection.durationPreset,
    selection.customDays,
    selection.customHours
  );

  function handleConfirm() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      "Final Confirmation",
      `You are about to lock ${selection.selectedApps.length} app${
        selection.selectedApps.length !== 1 ? "s" : ""
      } for ${durationText}.\n\nThis CANNOT be undone. Are you absolutely sure?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Lock Forever",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setLocked(true);
            setTimeout(() => {
              resetSelection();
              router.replace("/(tabs)");
            }, 1800);
          },
        },
      ]
    );
  }

  if (locked) {
    return (
      <View
        style={[
          styles.successContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.successIcon,
            { backgroundColor: colors.primary + "15" },
          ]}
        >
          <Feather name="shield" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Lock Active
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your apps are now blocked
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomPad + 120 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.warningBox,
          { backgroundColor: "#DC2626" + "12", borderColor: "#DC2626" + "35" },
        ]}
      >
        <Feather name="alert-octagon" size={20} color="#DC2626" />
        <Text style={[styles.warningTitle, { color: "#DC2626" }]}>
          THIS LOCK CANNOT BE REMOVED UNTIL THE TIMER EXPIRES
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        APPS TO BE LOCKED
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {selection.selectedApps.map((app, idx) => (
          <View key={app.id}>
            <View style={styles.appRow}>
              <View
                style={[
                  styles.appIconBg,
                  { backgroundColor: app.iconColor + "18" },
                ]}
              >
                <FontAwesome5
                  name={app.iconName as any}
                  size={16}
                  color={app.iconColor}
                />
              </View>
              <Text style={[styles.appName, { color: colors.foreground }]}>
                {app.name}
              </Text>
              <Feather name="lock" size={14} color={colors.mutedForeground} />
            </View>
            {idx < selection.selectedApps.length - 1 && (
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        LOCK DURATION
      </Text>
      <View
        style={[
          styles.durationCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.durationIcon, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="clock" size={24} color={colors.primary} />
        </View>
        <View style={styles.durationText}>
          <Text style={[styles.durationValue, { color: colors.foreground }]}>
            {durationText}
          </Text>
          <Text style={[styles.durationSub, { color: colors.mutedForeground }]}>
            Lock expires automatically
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.detailsBox,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Apps blocked</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {selection.selectedApps.length}
          </Text>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Duration</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {durationText}
          </Text>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Can be cancelled</Text>
          <Text style={[styles.detailValueNo, { color: "#DC2626" }]}>Never</Text>
        </View>
      </View>

      <View style={{ height: 80 }} />

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 20,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.confirmButton,
            { opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Feather name="lock" size={18} color="#fff" />
          <Text style={styles.confirmButtonText}>Confirm & Lock Forever</Text>
        </Pressable>
        <Text style={[styles.confirmCaveat, { color: colors.mutedForeground }]}>
          By tapping above, you acknowledge this lock is permanent until the timer expires.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  warningTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    marginTop: 4,
    marginLeft: 2,
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  appIconBg: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
  durationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  durationIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  durationText: { flex: 1 },
  durationValue: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  durationSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  detailValueNo: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  detailDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
    borderTopWidth: 1,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#DC2626",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  confirmCaveat: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
});
