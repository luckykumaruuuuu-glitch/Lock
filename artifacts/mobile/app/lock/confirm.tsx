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

import { useFirebaseSyncContext } from "@/context/FirebaseSyncContext";
import { useLock } from "@/context/LockContext";
import { formatExpiryDate, getDurationMs } from "@/hooks/useLockStorage";
import { useColors } from "@/hooks/useColors";
import { usePermissionStatus } from "@/hooks/usePermissionStatus";
import { isFirebaseConfigured } from "@/lib/firebase";

function getDisplayDuration(
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
  const { selection, confirmLock, resetSelection } = useLock();
  const { saveToFirebase, online, configured } = useFirebaseSyncContext();
  const { permissions } = usePermissionStatus();
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockedExpiry, setLockedExpiry] = useState("");

  const adminGranted = Platform.OS !== "android" || permissions.deviceAdmin.granted;
  const a11yGranted  = Platform.OS !== "android" || permissions.accessibility.granted;
  const fullyProtected = adminGranted && a11yGranted;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const durationText = getDisplayDuration(
    selection.durationPreset,
    selection.customDays,
    selection.customHours
  );

  const durationMs = getDurationMs(
    selection.durationPreset,
    selection.customDays,
    selection.customHours
  );
  const expiryDate = formatExpiryDate(Date.now() + durationMs);

  async function doLock() {
    setSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 1. Save locally (returns the entry)
      const entry = await confirmLock();
      if (!entry) throw new Error("No apps selected");

      // 2. Save to Firebase (if configured) — best-effort, won't block the lock
      if (configured) {
        saveToFirebase(entry).catch(() =>
          console.warn("[Confirm] Firebase save failed — lock is still active locally")
        );
      }

      setLockedExpiry(formatExpiryDate(entry.endTime));
      setLocked(true);

      setTimeout(() => {
        resetSelection();
        router.replace("/(tabs)");
      }, 1800);
    } catch (e) {
      setSaving(false);
      Alert.alert("Error", "Failed to save lock. Please try again.");
    }
  }

  function handleConfirm() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const syncNote = configured
      ? online
        ? "\n\n☁️ Lock will be synced to Firebase."
        : "\n\n⚠️ You're offline — lock will sync to Firebase when connected."
      : "";

    Alert.alert(
      "Final Confirmation",
      `Lock ${selection.selectedApps.length} app${
        selection.selectedApps.length !== 1 ? "s" : ""
      } for ${durationText}.\n\nUnlocks: ${expiryDate}${syncNote}\n\nThis CANNOT be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Lock Forever", style: "destructive", onPress: doLock },
      ]
    );
  }

  if (locked) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="shield" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Lock Active
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {selection.selectedApps.length} app{selection.selectedApps.length !== 1 ? "s" : ""} locked until {lockedExpiry}
        </Text>
        {configured && (
          <View style={[styles.syncBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name={online ? "cloud" : "cloud-off"} size={12} color={colors.primary} />
            <Text style={[styles.syncBadgeText, { color: colors.primary }]}>
              {online ? "Synced to Firebase" : "Will sync when online"}
            </Text>
          </View>
        )}

        {/* Show protection warning if permissions aren't all granted */}
        {!fullyProtected && (
          <Pressable
            onPress={() => router.push("/setup")}
            style={[styles.protectionWarn, { backgroundColor: "#F59E0B" + "15", borderColor: "#F59E0B" + "50" }]}
          >
            <Feather name="alert-triangle" size={16} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.protectionWarnTitle, { color: "#F59E0B" }]}>
                Weak Protection
              </Text>
              <Text style={[styles.protectionWarnBody, { color: colors.mutedForeground }]}>
                {!adminGranted && !a11yGranted
                  ? "Device Admin & Accessibility Service not enabled — apps can be uninstalled or opened freely."
                  : !adminGranted
                  ? "Device Admin not enabled — FocusLock can be uninstalled."
                  : "Accessibility Service not enabled — locked apps won't be blocked."}
                {" "}Tap to fix.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#F59E0B" />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
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

      {/* Apps */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        APPS TO BE LOCKED
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {selection.selectedApps.map((app, idx) => (
          <View key={app.id}>
            <View style={styles.appRow}>
              <View style={[styles.appIconBg, { backgroundColor: app.iconColor + "18" }]}>
                <FontAwesome5 name={app.iconName as any} size={16} color={app.iconColor} />
              </View>
              <View style={styles.appInfo}>
                <Text style={[styles.appName, { color: colors.foreground }]}>{app.name}</Text>
                <Text style={[styles.appPkg, { color: colors.mutedForeground }]}>{app.packageName}</Text>
              </View>
              <Feather name="lock" size={14} color={colors.mutedForeground} />
            </View>
            {idx < selection.selectedApps.length - 1 && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>

      {/* Duration */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        LOCK DURATION & EXPIRY
      </Text>
      <View style={[styles.durationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.durationIcon, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="clock" size={24} color={colors.primary} />
        </View>
        <View style={styles.durationText}>
          <Text style={[styles.durationValue, { color: colors.foreground }]}>
            {durationText}
          </Text>
          <Text style={[styles.durationExpiry, { color: colors.mutedForeground }]}>
            Unlocks: {expiryDate}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={[styles.detailsBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Apps blocked</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            {selection.selectedApps.length}
          </Text>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Duration</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{durationText}</Text>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Unlocks</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{expiryDate}</Text>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Server verification</Text>
          <View style={styles.detailValueRow}>
            <Feather
              name={configured ? (online ? "cloud" : "cloud-off") : "slash"}
              size={12}
              color={configured && online ? colors.primary : colors.mutedForeground}
            />
            <Text style={[styles.detailValue, { color: configured && online ? colors.primary : colors.mutedForeground }]}>
              {configured ? (online ? "Firebase active" : "Offline") : "Local only"}
            </Text>
          </View>
        </View>
        <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Early unlock</Text>
          <Text style={[styles.detailValueNo, { color: "#DC2626" }]}>Impossible</Text>
        </View>
      </View>

      {/* Protection status banner — shown before the user locks */}
      {!fullyProtected && Platform.OS === "android" && (
        <Pressable
          onPress={() => router.push("/setup")}
          style={[styles.protectionWarn, { backgroundColor: "#F59E0B" + "15", borderColor: "#F59E0B" + "50" }]}
        >
          <Feather name="alert-triangle" size={16} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.protectionWarnTitle, { color: "#F59E0B" }]}>
              Weak Protection — Tap to Fix
            </Text>
            <Text style={[styles.protectionWarnBody, { color: colors.mutedForeground }]}>
              {!adminGranted && "Device Admin not enabled — FocusLock can be uninstalled. "}
              {!a11yGranted && "Accessibility Service not enabled — locked apps won't be blocked."}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#F59E0B" />
        </Pressable>
      )}

      <View style={{ height: 80 }} />

      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 20, backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={saving}
          style={({ pressed }) => [
            styles.confirmButton,
            { opacity: saving ? 0.6 : pressed ? 0.88 : 1 },
          ]}
        >
          <Feather name="lock" size={18} color="#fff" />
          <Text style={styles.confirmButtonText}>
            {saving ? "Saving Lock…" : "Confirm & Lock Forever"}
          </Text>
        </Pressable>
        <Text style={[styles.confirmCaveat, { color: colors.mutedForeground }]}>
          No PIN, no bypass — only the timer can unlock. Lock verified using{" "}
          {configured ? "Firebase server time" : "local device time"}.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  successIcon: { width: 100, height: 100, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  syncBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  syncBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  warningBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 8 },
  warningTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, letterSpacing: 0.2 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1, marginTop: 4, marginLeft: 2, marginBottom: 4 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  appRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  appIconBg: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  appPkg: { fontSize: 11, fontFamily: "Inter_400Regular" },
  divider: { height: 1, marginLeft: 62 },
  durationCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  durationIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  durationText: { flex: 1 },
  durationValue: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 3 },
  durationExpiry: { fontSize: 12, fontFamily: "Inter_400Regular" },
  detailsBox: { borderRadius: 14, borderWidth: 1, padding: 4, overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  detailLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  detailValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  detailValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailValueNo: { fontSize: 14, fontFamily: "Inter_700Bold" },
  detailDivider: { height: 1, marginHorizontal: 14 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, gap: 10, borderTopWidth: 1 },
  confirmButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14, backgroundColor: "#DC2626" },
  confirmButtonText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  confirmCaveat: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 16 },
});
