import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

export type PermissionId =
  | "usageAccess"
  | "deviceAdmin"
  | "accessibility";

export interface PermissionState {
  granted: boolean;
  openedSettings: boolean;
}

export type PermissionsMap = Record<PermissionId, PermissionState>;

const STORAGE_KEY = "focuslock_permissions_v1";
const SETUP_DONE_KEY = "focuslock_setup_complete";

const DEFAULT_STATE: PermissionsMap = {
  usageAccess: { granted: false, openedSettings: false },
  deviceAdmin: { granted: false, openedSettings: false },
  accessibility: { granted: false, openedSettings: false },
};

export function usePermissionStatus() {
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULT_STATE);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAppState = useRef<AppStateStatus>("active");

  useEffect(() => {
    (async () => {
      try {
        const [savedPerms, done] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SETUP_DONE_KEY),
        ]);

        if (savedPerms) {
          setPermissions(JSON.parse(savedPerms));
        }
        setSetupComplete(done === "true");
      } catch {
        setSetupComplete(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (next: PermissionsMap) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPermissions(next);
  }, []);

  const markOpened = useCallback(
    async (id: PermissionId) => {
      const next: PermissionsMap = {
        ...permissions,
        [id]: { ...permissions[id], openedSettings: true },
      };
      await save(next);
    },
    [permissions, save]
  );

  const markGranted = useCallback(
    async (id: PermissionId, granted: boolean) => {
      const next: PermissionsMap = {
        ...permissions,
        [id]: { ...permissions[id], granted },
      };
      await save(next);
    },
    [permissions, save]
  );

  const completeSetup = useCallback(async () => {
    await AsyncStorage.setItem(SETUP_DONE_KEY, "true");
    setSetupComplete(true);
  }, []);

  const resetSetup = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY, SETUP_DONE_KEY]);
    setPermissions(DEFAULT_STATE);
    setSetupComplete(false);
  }, []);

  const allGranted =
    Platform.OS !== "android" ||
    Object.values(permissions).every((p) => p.granted);

  return {
    permissions,
    setupComplete,
    loading,
    allGranted,
    markOpened,
    markGranted,
    completeSetup,
    resetSetup,
  };
}
