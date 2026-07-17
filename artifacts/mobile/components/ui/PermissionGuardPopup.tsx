import { Feather } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { checkNativePermissions } from "@/lib/nativePermissionCheck";

import { MissingPerm } from "@/hooks/usePermissionGuard";
import { PermissionId } from "@/hooks/usePermissionStatus";
import { openBatteryOptimizationSettings } from "@/lib/openBatteryOptimizationSettings";

const APP_PACKAGE = "com.focuslock.app";

async function openSettingsForPerm(id: PermissionId): Promise<void> {
  if (Platform.OS !== "android") {
    Alert.alert("Android Only", "This permission is only required on Android.");
    return;
  }
  try {
    switch (id) {
      case "usageAccess":
        // Settings.ACTION_USAGE_ACCESS_SETTINGS + package Uri — without the Uri this
        // opens the generic all-apps list instead of jumping to DuckLock directly.
        await IntentLauncher.startActivityAsync(
          "android.settings.USAGE_ACCESS_SETTINGS",
          { data: `package:${APP_PACKAGE}` }
        );
        break;
      case "deviceAdmin":
        // DevicePolicyManager.EXTRA_DEVICE_ADMIN requires a real ComponentName Parcelable —
        // expo-intent-launcher can only pass String extras from JS, so a string here would
        // silently fail to activate. The native module builds the ComponentName correctly.
        if (NativeModules.FocusLockPermissionChecker?.openDeviceAdminSettings) {
          await NativeModules.FocusLockPermissionChecker.openDeviceAdminSettings();
        } else {
          Alert.alert(
            "Expo Go mein available nahi",
            "Device Admin permission sirf real APK build mein activate ho sakti hai."
          );
        }
        break;
      case "accessibility":
        // No ComponentName-targeted Intent exists for accessibility activation — the OS
        // always opens the full Accessibility Settings list.
        await IntentLauncher.startActivityAsync(
          "android.settings.ACCESSIBILITY_SETTINGS"
        );
        break;
      case "overlay":
        await IntentLauncher.startActivityAsync(
          "android.settings.action.MANAGE_OVERLAY_PERMISSION",
          { data: `package:${APP_PACKAGE}` }
        );
        break;
      case "notification": {
        // Mirror setup.tsx exactly: use PermissionsAndroid.request() directly so the
        // OS shows its native inline dialog. expo-notifications' requestPermissionsAsync()
        // has a canAskAgain heuristic that incorrectly returns false on MIUI, OneUI, and
        // ColorOS, silently swallowing the first request without showing any dialog at all.
        const apiLevel =
          typeof Platform.Version === "number"
            ? Platform.Version
            : parseInt(Platform.Version as string, 10);
        if (apiLevel >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            // OS will no longer show the dialog — send user to app notification settings.
            try {
              await IntentLauncher.startActivityAsync(
                "android.settings.APP_NOTIFICATION_SETTINGS",
                { extra: { "android.provider.extra.APP_PACKAGE": APP_PACKAGE } },
              );
            } catch {
              try {
                await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SETTINGS);
              } catch {}
            }
          }
          // 'granted' or 'denied': onRecheck() after this block handles the live check.
        }
        break;
      }
      case "battery":
        await openBatteryOptimizationSettings();
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

    if (id === "battery") {
      // Battery Optimization dialogs on Xiaomi MIUI, Oppo ColorOS, and Vivo ROMs often
      // render as an overlay that does NOT transition AppState to background, so the
      // AppState "active" listener in usePermissionGuard may never fire after the user
      // responds. Mirror setup.tsx: poll with exponential backoff (1s→2s→4s→8s) so the
      // popup auto-dismisses on those ROMs without requiring a manual "recheck" tap.
      // Not awaited — runs entirely in the background alongside the AppState listener;
      // whichever fires first calls onRecheck(); both arriving at the same result is safe.
      (async () => {
        const delays = [1000, 2000, 4000, 8000];
        for (const delay of delays) {
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
          const native = await checkNativePermissions();
          if (native?.battery === true) {
            onRecheck(); // grant detected — refresh the missing-perms list
            break;
          }
        }
      })();
    }
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
