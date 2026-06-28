import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionId, usePermissionStatus } from "@/hooks/usePermissionStatus";
import { useColors } from "@/hooks/useColors";

/* ───────────────────────────────────────────────
   Permission metadata
─────────────────────────────────────────────── */
interface PermissionStep {
  id: PermissionId;
  title: string;
  description: string;
  whyNeeded: string;
  icon: string;
  settingsLabel: string;
  openSettings: () => Promise<void>;
}

const APP_PACKAGE = "com.focuslock.app";

async function openUsageAccess() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.USAGE_ACCESS_SETTINGS"
    );
  } catch {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.SETTINGS
    );
  }
}

async function openDeviceAdmin() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      "android.app.action.ADD_DEVICE_ADMIN",
      {
        extra: {
          "android.app.extra.DEVICE_ADMIN": `${APP_PACKAGE}/.DeviceAdminReceiver`,
          "android.app.extra.ADD_EXPLANATION":
            "FocusLock needs device administrator access to prevent itself from being uninstalled while a lock is active.",
        },
      }
    );
  } catch {
    await IntentLauncher.startActivityAsync(
      "android.settings.DEVICE_INFO_SETTINGS"
    );
  }
}

async function openAccessibility() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.ACCESSIBILITY_SETTINGS"
    );
  } catch {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.SETTINGS
    );
  }
}

const PERMISSION_STEPS: PermissionStep[] = [
  {
    id: "usageAccess",
    title: "Usage Access",
    description:
      "Allows FocusLock to detect which apps are currently in the foreground so it can enforce active locks.",
    whyNeeded: "Without this, FocusLock cannot detect when a blocked app is opened.",
    icon: "activity",
    settingsLabel: "Open Usage Access Settings",
    openSettings: openUsageAccess,
  },
  {
    id: "deviceAdmin",
    title: "Device Administrator",
    description:
      "Prevents FocusLock from being uninstalled while an active lock is running, making your commitment truly binding.",
    whyNeeded: "Without this, you could simply uninstall the app to bypass a lock.",
    icon: "shield",
    settingsLabel: "Activate Device Admin",
    openSettings: openDeviceAdmin,
  },
  {
    id: "accessibility",
    title: "Accessibility Service",
    description:
      "Monitors which app is in use and redirects you away from locked apps when their timer is still running.",
    whyNeeded: "Without this, FocusLock cannot block locked apps from being used.",
    icon: "eye",
    settingsLabel: "Enable Accessibility Service",
    openSettings: openAccessibility,
  },
];

const AUTO_PERMISSIONS = [
  { icon: "wifi", label: "Internet", desc: "For future cloud sync" },
  { icon: "cpu", label: "Foreground Service", desc: "Background timer enforcement" },
  { icon: "power", label: "Boot Completed", desc: "Restores locks after reboot" },
];

/* ───────────────────────────────────────────────
   PermissionCard component
─────────────────────────────────────────────── */
interface PermissionCardProps {
  step: PermissionStep;
  granted: boolean;
  openedSettings: boolean;
  onOpenSettings: () => Promise<void>;
  onMarkGranted: (granted: boolean) => void;
  colors: ReturnType<typeof useColors>;
  returnedFromSettings: boolean;
}

function PermissionCard({
  step,
  granted,
  openedSettings,
  onOpenSettings,
  onMarkGranted,
  colors,
  returnedFromSettings,
}: PermissionCardProps) {
  const [opening, setOpening] = useState(false);

  async function handleOpen() {
    setOpening(true);
    try {
      await onOpenSettings();
    } finally {
      setOpening(false);
    }
  }

  const cardBg = granted
    ? colors.primary + "0D"
    : colors.card;
  const borderColor = granted
    ? colors.primary + "40"
    : openedSettings && returnedFromSettings
    ? colors.warning + "50"
    : colors.border;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIconBg,
            {
              backgroundColor: granted
                ? colors.primary + "18"
                : colors.muted,
            },
          ]}
        >
          <Feather
            name={step.icon as any}
            size={20}
            color={granted ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {step.title}
          </Text>
          <View style={styles.statusRow}>
            {granted ? (
              <>
                <Feather name="check-circle" size={13} color={colors.primary} />
                <Text style={[styles.statusGranted, { color: colors.primary }]}>
                  Granted
                </Text>
              </>
            ) : (
              <>
                <Feather name="alert-circle" size={13} color={colors.warning} />
                <Text style={[styles.statusPending, { color: colors.warning }]}>
                  Required
                </Text>
              </>
            )}
          </View>
        </View>
        {granted && (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={14} color="#fff" />
          </View>
        )}
      </View>

      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
        {step.description}
      </Text>

      <View style={[styles.whyBox, { backgroundColor: colors.muted }]}>
        <Feather name="info" size={12} color={colors.mutedForeground} />
        <Text style={[styles.whyText, { color: colors.mutedForeground }]}>
          {step.whyNeeded}
        </Text>
      </View>

      {!granted && (
        <View style={styles.cardActions}>
          <Pressable
            onPress={handleOpen}
            disabled={opening}
            style={({ pressed }) => [
              styles.openBtn,
              {
                backgroundColor: colors.primary,
                opacity: opening ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="external-link" size={14} color="#fff" />
            <Text style={styles.openBtnText}>
              {opening ? "Opening…" : step.settingsLabel}
            </Text>
          </Pressable>

          {openedSettings && returnedFromSettings && (
            <Pressable
              onPress={() => onMarkGranted(true)}
              style={({ pressed }) => [
                styles.verifyBtn,
                {
                  borderColor: colors.primary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="check" size={14} color={colors.primary} />
              <Text style={[styles.verifyBtnText, { color: colors.primary }]}>
                I've enabled this
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {granted && (
        <Pressable
          onPress={() => onMarkGranted(false)}
          style={styles.revokeLink}
        >
          <Text style={[styles.revokeLinkText, { color: colors.mutedForeground }]}>
            Undo
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ───────────────────────────────────────────────
   Main setup screen
─────────────────────────────────────────────── */
export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    permissions,
    allGranted,
    markOpened,
    markGranted,
    completeSetup,
  } = usePermissionStatus();

  const [returnedFrom, setReturnedFrom] = useState<PermissionId | null>(null);
  const lastOpenedRef = useRef<PermissionId | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current !== "active" &&
          nextState === "active" &&
          lastOpenedRef.current
        ) {
          setReturnedFrom(lastOpenedRef.current);
        }
        appStateRef.current = nextState;
      }
    );
    return () => sub.remove();
  }, []);

  const handleOpenSettings = useCallback(
    async (step: PermissionStep) => {
      lastOpenedRef.current = step.id;
      setReturnedFrom(null);
      await markOpened(step.id);

      if (Platform.OS !== "android") {
        Alert.alert(
          "Android Only",
          "This permission flow is for Android devices only. Tap \"I've enabled this\" to simulate granting it.",
          [{ text: "OK" }]
        );
        setReturnedFrom(step.id);
        return;
      }

      await step.openSettings();
    },
    [markOpened]
  );

  async function handleComplete() {
    await completeSetup();
    router.replace("/(tabs)");
  }

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const grantedCount = Object.values(permissions).filter((p) => p.granted).length;
  const total = PERMISSION_STEPS.length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 24, paddingBottom: bottomPad + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <View style={[styles.shieldCircle, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="shield" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>
          Set Up FocusLock
        </Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          FocusLock needs a few Android permissions to enforce locks. Grant each
          one below — this is a one-time setup.
        </Text>
      </View>

      <View
        style={[
          styles.progressRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.progressTextRow}>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            Permissions granted
          </Text>
          <Text style={[styles.progressCount, { color: colors.foreground }]}>
            {grantedCount} / {total}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: grantedCount === total ? colors.primary : colors.warning,
                width: `${Math.round((grantedCount / total) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        REQUIRED PERMISSIONS
      </Text>

      {PERMISSION_STEPS.map((step) => (
        <PermissionCard
          key={step.id}
          step={step}
          granted={permissions[step.id].granted}
          openedSettings={permissions[step.id].openedSettings}
          returnedFromSettings={returnedFrom === step.id || !permissions[step.id].granted && permissions[step.id].openedSettings}
          onOpenSettings={() => handleOpenSettings(step)}
          onMarkGranted={(g) => markGranted(step.id, g)}
          colors={colors}
        />
      ))}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        AUTO-CONFIGURED (NO ACTION NEEDED)
      </Text>

      <View style={[styles.autoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {AUTO_PERMISSIONS.map((p, i) => (
          <View key={p.label}>
            <View style={styles.autoRow}>
              <View style={[styles.autoIconBg, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={p.icon as any} size={14} color={colors.primary} />
              </View>
              <View style={styles.autoText}>
                <Text style={[styles.autoLabel, { color: colors.foreground }]}>{p.label}</Text>
                <Text style={[styles.autoDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
              </View>
              <Feather name="check-circle" size={16} color={colors.primary} />
            </View>
            {i < AUTO_PERMISSIONS.length - 1 && (
              <View style={[styles.autoDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}
      </View>

      {allGranted ? (
        <View style={[styles.successBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Feather name="check-circle" size={16} color={colors.primary} />
          <Text style={[styles.successText, { color: colors.primary }]}>
            All permissions granted — FocusLock is ready!
          </Text>
        </View>
      ) : (
        <View style={[styles.infoBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Grant all {total} permissions above to activate FocusLock.
          </Text>
        </View>
      )}

      <Pressable
        onPress={handleComplete}
        disabled={!allGranted}
        style={({ pressed }) => [
          styles.completeBtn,
          {
            backgroundColor: allGranted ? colors.primary : colors.muted,
            opacity: !allGranted ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather
          name={allGranted ? "check-circle" : "lock"}
          size={18}
          color={allGranted ? "#fff" : colors.mutedForeground}
        />
        <Text
          style={[
            styles.completeBtnText,
            { color: allGranted ? "#fff" : colors.mutedForeground },
          ]}
        >
          {allGranted ? "Enter FocusLock" : `Grant ${total - grantedCount} More Permission${total - grantedCount !== 1 ? "s" : ""}`}
        </Text>
      </Pressable>

      <Pressable onPress={handleComplete} style={styles.skipLink}>
        <Text style={[styles.skipLinkText, { color: colors.mutedForeground }]}>
          Skip for now (locks won't be enforced)
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  headerArea: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  shieldCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  progressRow: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  progressCount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
    marginTop: 4,
    marginLeft: 2,
    marginBottom: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleGroup: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusGranted: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statusPending: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  whyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  whyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  cardActions: {
    gap: 8,
    marginTop: 2,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  verifyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  revokeLink: {
    alignItems: "center",
    paddingTop: 2,
  },
  revokeLinkText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  autoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  autoIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  autoText: { flex: 1 },
  autoLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 2,
  },
  autoDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  autoDivider: { height: 1, marginLeft: 56 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  completeBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  skipLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipLinkText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
});
