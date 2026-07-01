import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as IntentLauncher from "expo-intent-launcher";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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

const APP_PACKAGE = "com.focuslock.app";

async function openUsageAccess() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.USAGE_ACCESS_SETTINGS"); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openDeviceAdmin() {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync("android.app.action.ADD_DEVICE_ADMIN", {
      extra: {
        "android.app.extra.DEVICE_ADMIN": `${APP_PACKAGE}/.DeviceAdminReceiver`,
        "android.app.extra.ADD_EXPLANATION": "DuckLock needs device admin to prevent uninstall while a lock is active.",
      },
    });
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openOverlay() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.action.MANAGE_OVERLAY_PERMISSION", { data: `package:${APP_PACKAGE}` }); }
  catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openNotification() {
  if (Platform.OS !== "android") return;
  try {
    const Notifications = require("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") return;
    await IntentLauncher.startActivityAsync("android.settings.APP_NOTIFICATION_SETTINGS", {
      extra: { "android.provider.extra.APP_PACKAGE": APP_PACKAGE },
    });
  } catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
}

async function openBattery() {
  if (Platform.OS !== "android") return;
  try { await IntentLauncher.startActivityAsync("android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS", { data: `package:${APP_PACKAGE}` }); }
  catch {
    try { await IntentLauncher.startActivityAsync("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS"); }
    catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS); }
  }
}

interface PermItem {
  id: PermissionId;
  label: string;
  whyNeeded: string;
  openSettings: () => Promise<void>;
}

const PERMS: PermItem[] = [
  { id: "usageAccess",  label: "Usage Access",        whyNeeded: "App usage track karne ke liye — DuckLock ko pata chal sake kaunsa app open hai.",         openSettings: openUsageAccess },
  { id: "deviceAdmin",  label: "Device Admin",         whyNeeded: "Uninstall block karne ke liye — lock active hone par app delete nahi ho sakti.",            openSettings: openDeviceAdmin },
  { id: "overlay",      label: "Display Over Apps",    whyNeeded: "Block screen dikhane ke liye — locked app ke upar DuckLock ka screen aayega.",             openSettings: openOverlay },
  { id: "notification", label: "Notifications",        whyNeeded: "Reminders ke liye — lock expire hone par aur session updates ke liye notifications aayenge.", openSettings: openNotification },
  { id: "battery",      label: "Battery Optimization", whyNeeded: "Background mein chalne ke liye — Android app ko band na kare jab screen off ho.",           openSettings: openBattery },
];

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { permissions, markOpened, markGranted, completeSetup } = usePermissionStatus();

  const [whyOpen, setWhyOpen]   = useState(false);
  const [opening, setOpening]   = useState<PermissionId | null>(null);
  const whyHeight               = useRef(new Animated.Value(0)).current;
  const continueAnim            = useRef(new Animated.Value(0)).current;

  const appStateRef   = useRef<AppStateStatus>(AppState.currentState);
  const lastOpenedRef = useRef<PermissionId | null>(null);

  const isWeb        = Platform.OS === "web";
  const grantedCount = isWeb ? PERMS.length : PERMS.filter(p => permissions[p.id]?.granted).length;
  const allGranted   = isWeb || grantedCount === PERMS.length;

  useEffect(() => {
    Animated.spring(continueAnim, {
      toValue: allGranted ? 1 : 0,
      useNativeDriver: true,
      tension: 180,
      friction: 10,
    }).start();
  }, [allGranted]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current !== "active" && next === "active" && lastOpenedRef.current) {
        const id = lastOpenedRef.current;
        lastOpenedRef.current = null;
        markGranted(id, true);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [markGranted]);

  function toggleWhy() {
    const isOpen = !whyOpen;
    setWhyOpen(isOpen);
    Animated.spring(whyHeight, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      tension: 180,
      friction: 14,
    }).start();
  }

  async function handleAllow(perm: PermItem) {
    setOpening(perm.id);
    lastOpenedRef.current = perm.id;
    await markOpened(perm.id);

    if (Platform.OS !== "android") {
      Alert.alert(
        "Android Permission",
        perm.whyNeeded,
        [
          { text: "Mark as Granted", onPress: () => markGranted(perm.id, true) },
          { text: "Cancel", style: "cancel", onPress: () => { lastOpenedRef.current = null; } },
        ]
      );
      setOpening(null);
      return;
    }

    try { await perm.openSettings(); }
    finally { setOpening(null); }
  }

  async function handleContinue() {
    await completeSetup();
    router.replace("/(tabs)");
  }

  const topPad = Platform.OS === "web" ? 52 : insets.top + 12;
  const botPad = Platform.OS === "web" ? 40 : insets.bottom + 20;

  const whyMaxHeight = whyHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 420] });
  const whyOpacity   = whyHeight.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: botPad }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <Text style={styles.title}>Enable permissions{"\n"}to use DuckLock</Text>
        <Text style={styles.subtitle}>{grantedCount} of {PERMS.length} granted</Text>

        {/* ── Permissions list ── */}
        <View style={styles.listCard}>
          {PERMS.map((perm, i) => {
            const granted   = isWeb || (permissions[perm.id]?.granted ?? false);
            const isOpening = opening === perm.id;
            const isLast    = i === PERMS.length - 1;

            return (
              <View key={perm.id}>
                <View style={styles.row}>
                  <Text style={[styles.permLabel, granted && styles.permLabelGranted]}>
                    {perm.label}
                  </Text>

                  {granted ? (
                    <View style={styles.tickCircle}>
                      <Feather name="check" size={13} color="#636366" />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleAllow(perm)}
                      disabled={isOpening}
                      style={({ pressed }) => [{ opacity: isOpening || pressed ? 0.7 : 1 }]}
                    >
                      <LinearGradient
                        colors={["#FFBF80", "#FFA660"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.allowBtn}
                      >
                        <Text style={styles.allowBtnText}>
                          {isOpening ? "Opening…" : "Allow"}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>

                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        {/* ── Why card ── */}
        <Pressable onPress={toggleWhy} style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why should I give this permission?</Text>
          <Animated.View style={{ transform: [{ rotate: whyHeight.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) }] }}>
            <Feather name="chevron-right" size={18} color="#636366" />
          </Animated.View>
        </Pressable>

        <Animated.View style={{ maxHeight: whyMaxHeight, opacity: whyOpacity, overflow: "hidden" }}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.whyBody}
          >
            {PERMS.map((perm) => (
              <View key={perm.id} style={styles.whyRow}>
                <Text style={styles.whyLabel}>{perm.label}</Text>
                <Text style={styles.whyDesc}>{perm.whyNeeded}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Continue button (appears when all granted) ── */}
        <Animated.View
          style={{
            transform: [{ scale: continueAnim }],
            opacity: continueAnim,
          }}
          pointerEvents={allGranted ? "auto" : "none"}
        >
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={["#32D74B", "#27AE60"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
              <Text style={styles.continueBtnText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {!allGranted && (
          <Text style={styles.hint}>Grant all permissions to continue</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 14,
  },

  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#636366",
    marginBottom: 4,
  },

  listCard: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 17,
    gap: 12,
  },
  permLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  permLabelGranted: {
    color: "#636366",
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    backgroundColor: "#2C2C2E",
    marginLeft: 18,
  },
  tickCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  allowBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  allowBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },

  whyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  whyTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  whyBody: {
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  whyRow: {
    gap: 3,
  },
  whyLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFBF80",
  },
  whyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 19,
  },

  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 6,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },

  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#48484A",
    textAlign: "center",
    marginTop: 4,
  },
});
