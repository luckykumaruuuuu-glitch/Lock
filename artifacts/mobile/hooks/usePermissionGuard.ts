import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

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

async function getMissingPermissions(): Promise<MissingPerm[]> {
  if (Platform.OS !== "android") return [];

  try {
    const [raw, setupDone] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SETUP_DONE_KEY),
    ]);

    if (setupDone !== "true") return [];

    const stored: Partial<Record<PermissionId, { granted: boolean }>> = raw
      ? JSON.parse(raw)
      : {};

    const notifGranted = await checkNotificationGranted();

    const missing: MissingPerm[] = [];

    const ids: PermissionId[] = [
      "usageAccess",
      "deviceAdmin",
      "overlay",
      "notification",
      "battery",
    ];

    for (const id of ids) {
      if (id === "notification") {
        if (!notifGranted) {
          missing.push({ id, label: PERM_LABELS[id] });
        }
      } else {
        const granted = stored[id]?.granted ?? false;
        if (!granted) {
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
