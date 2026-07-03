import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { checkNativePermissions, NativePermissionStatus } from "@/lib/nativePermissionCheck";
import { PermissionId } from "@/hooks/usePermissionStatus";

const STORAGE_KEY = "focuslock_permissions_v2";
const SETUP_DONE_KEY = "focuslock_setup_complete";

export interface MissingPerm {
  id: PermissionId;
  label: string;
}

const PERM_LABELS: Record<PermissionId, string> = {
  usageAccess:   "Usage Access",
  deviceAdmin:   "Device Admin",
  accessibility: "Accessibility",
  overlay:       "Display Over Apps",
  notification:  "Notifications",
  battery:       "Battery Optimization",
};

async function checkNotificationGranted(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const Notifications = require("expo-notifications");
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return true;
  }
}

/**
 * Sync real native permission results back into AsyncStorage so the setup
 * screen (which reads AsyncStorage via usePermissionStatus) stays consistent.
 */
async function syncNativeStatusToStorage(native: NativePermissionStatus): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored: Partial<Record<PermissionId, { granted: boolean; openedSettings: boolean }>> =
      raw ? JSON.parse(raw) : {};

    const nativeIds: Array<keyof NativePermissionStatus> = [
      "usageAccess",
      "overlay",
      "deviceAdmin",
      "battery",
    ];
    for (const id of nativeIds) {
      stored[id] = {
        granted: native[id],
        openedSettings: stored[id]?.openedSettings ?? false,
      };
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Non-critical — best effort sync
  }
}

/**
 * Real-time permission check. Calls actual Android OS APIs via the native
 * PermissionCheckerModule — never trusts the AsyncStorage cache for the
 * Android-specific permissions (usageAccess, overlay, deviceAdmin, battery).
 *
 * Falls back to AsyncStorage only when the native module is unavailable
 * (e.g. Expo Go without a custom dev build).
 */
async function getMissingPermissions(): Promise<MissingPerm[]> {
  if (Platform.OS !== "android") return [];

  try {
    const setupDone = await AsyncStorage.getItem(SETUP_DONE_KEY);
    if (setupDone !== "true") return [];

    const [nativeStatus, notifGranted] = await Promise.all([
      checkNativePermissions(),
      checkNotificationGranted(),
    ]);

    const missing: MissingPerm[] = [];

    // Notification — expo-notifications real OS check (already worked correctly)
    if (!notifGranted) {
      missing.push({ id: "notification", label: PERM_LABELS["notification"] });
    }

    if (nativeStatus !== null) {
      // Real OS-level checks via native PermissionCheckerModule
      if (!nativeStatus.usageAccess) {
        missing.push({ id: "usageAccess", label: PERM_LABELS["usageAccess"] });
      }
      if (!nativeStatus.overlay) {
        missing.push({ id: "overlay", label: PERM_LABELS["overlay"] });
      }
      if (!nativeStatus.deviceAdmin) {
        missing.push({ id: "deviceAdmin", label: PERM_LABELS["deviceAdmin"] });
      }
      if (!nativeStatus.battery) {
        missing.push({ id: "battery", label: PERM_LABELS["battery"] });
      }

      // Sync real status back to AsyncStorage so setup screen stays in sync (non-blocking)
      syncNativeStatusToStorage(nativeStatus).catch(() => {});
    } else {
      // Native module unavailable — fall back to AsyncStorage cache
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored: Partial<Record<PermissionId, { granted: boolean }>> = raw
        ? JSON.parse(raw)
        : {};

      const fallbackIds: PermissionId[] = [
        "usageAccess",
        "deviceAdmin",
        "overlay",
        "battery",
      ];
      for (const id of fallbackIds) {
        if (!stored[id]?.granted) {
          missing.push({ id, label: PERM_LABELS[id] });
        }
      }
    }

    return missing;
  } catch {
    return [];
  }
}

export function usePermissionGuard() {
  const [missingPerms, setMissingPerms] = useState<MissingPerm[]>([]);
  const [checking, setChecking] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const mountedRef = useRef(true);

  const check = useCallback(async () => {
    setChecking(true);
    const missing = await getMissingPermissions();
    if (mountedRef.current) {
      setMissingPerms(missing);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    check();

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current !== "active" && next === "active") {
        check();
      }
      appStateRef.current = next;
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
    };
  }, [check]);

  const dismiss = useCallback(() => setMissingPerms([]), []);

  return { missingPerms, checking, recheck: check, dismiss };
}
