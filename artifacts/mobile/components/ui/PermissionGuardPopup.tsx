import { Feather } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MissingPerm } from "@/hooks/usePermissionGuard";
import { PermissionId } from "@/hooks/usePermissionStatus";

const APP_PACKAGE = "com.focuslock.app";

async function openSettingsForPerm(id: PermissionId): Promise<void> {
  if (Platform.OS !== "android") {
    Alert.alert("Android Only", "This permission is only required on Android.");
    return;
  }
  try {
    switch (id) {
      case "usageAccess":
        await IntentLauncher.startActivityAsync(
          "android.settings.USAGE_ACCESS_SETTINGS"
        );
        break;
      case "deviceAdmin":
        await IntentLauncher.startActivityAsync(
          "android.app.action.ADD_DEVICE_ADMIN",
          {
            extra: {
              "android.app.extra.DEVICE_ADMIN": `${APP_PACKAGE}/.DeviceAdminReceiver`,
              "android.app.extra.ADD_EXPLANATION":
                "DuckLock needs device admin to prevent uninstall while a lock is active.",
            },
          }
        );
        break;
      case "overlay":
        await IntentLauncher.startActivityAsync(
          "android.settings.action.MANAGE_OVERLAY_PERMISSION",
          { data: `package:${APP_PACKAGE}` }
        );
        break;
      case "notification":
        try {
          const Notifications = require("expo-notifications");
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === "granted") return;
        } catch {}
        await IntentLauncher.startActivityAsync(
          "android.settings.APP_NOTIFICATION_SETTINGS",
          { extra: { "android.provider.extra.APP_PACKAGE": APP_PACKAGE } }
        );
        break;
      case "battery":
        try {
          await IntentLauncher.startActivityAsync(
            "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
            { data: `package:${APP_PACKAGE}` }
          );
        } catch {
          await IntentLauncher.startActivityAsync(
            "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS"
          );
        }
        break;
      default:
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.SETTINGS
        );
    }
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.SETTINGS
      );
    } catch {}
  }
}

interface Props {
  missing: MissingPerm[];
  onRecheck: () => void;
}

export function PermissionGuardPopup({ missing, onRecheck }: Props) {
  const [opening, setOpening] = useState<PermissionId | null>(null);

  if (missing.length === 0) return null;

  async function handleAllow(id: PermissionId) {
    setOpening(id);
    await openSettingsForPerm(id);
    setOpening(null);
    onRecheck();
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Warning icon */}
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <Feather name="alert-triangle" size={26} color="#FF453A" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Permissions Missing</Text>
          <Text style={styles.subtitle}>
            DuckLock cannot work properly without these permissions. Please
            grant them to continue.
          </Text>

          {/* Permissions list */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {missing.map((perm, i) => {
              const isOpening = opening === perm.id;
              const isLast = i === missing.length - 1;
              return (
                <View key={perm.id}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={styles.dot} />
                      <Text style={styles.permLabel}>{perm.label}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleAllow(perm.id)}
                      disabled={isOpening}
                      style={({ pressed }) => [
                        { opacity: isOpening || pressed ? 0.7 : 1 },
                      ]}
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
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
          </ScrollView>

          {/* Recheck button */}
          <Pressable
            onPress={onRecheck}
            style={({ pressed }) => [
              styles.recheckBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={14} color="#8E8E93" />
            <Text style={styles.recheckText}>I've granted them — recheck</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1C1C1E",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: "center",
    gap: 12,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,69,58,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  listScroll: {
    width: "100%",
    maxHeight: 280,
  },
  list: {
    backgroundColor: "#2C2C2E",
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF453A",
  },
  permLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    flex: 1,
  },
  allowBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9,
  },
  allowBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  divider: {
    height: 1,
    backgroundColor: "#3A3A3C",
    marginLeft: 16,
  },
  recheckBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignSelf: "center",
    marginTop: 4,
  },
  recheckText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
  },
});
