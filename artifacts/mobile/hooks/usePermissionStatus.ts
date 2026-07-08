import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

export type PermissionId =
  | "usageAccess"
  | "deviceAdmin"
  | "accessibility"
  | "overlay"
  | "notification"
  | "battery";

export interface PermissionState {
  granted: boolean;
  openedSettings: boolean;
}

export type PermissionsMap = Record<PermissionId, PermissionState>;

const STORAGE_KEY = "focuslock_permissions_v2";
const SETUP_DONE_KEY = "focuslock_setup_complete";

const DEFAULT_STATE: PermissionsMap = {
  usageAccess:  { granted: false, openedSettings: false },
  deviceAdmin:  { granted: false, openedSettings: false },
  accessibility:{ granted: false, openedSettings: false },
  overlay:      { granted: false, openedSettings: false },
  notification: { granted: false, openedSettings: false },
  battery:      { granted: false, openedSettings: false },
};

export function usePermissionStatus() {
  const [permissions, setPermissions] = useState<PermissionsMap>(DEFAULT_STATE);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const lastAppState = useRef<AppStateStatus>("active");
  // Mirrors `permissions` synchronously (not via a post-render effect) so
  // refreshGranted can diff old-vs-new `granted` values reliably even across
  // back-to-back calls, without waiting a render cycle for a ref to catch up.
  const permissionsRef = useRef<PermissionsMap>(DEFAULT_STATE);

  useEffect(() => {
    (async () => {
      try {
        const [savedPerms, done] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SETUP_DONE_KEY),
        ]);
        if (savedPerms) {
          const parsed = JSON.parse(savedPerms) as Partial<PermissionsMap>;
          // Use functional updater so that if a live OS check (refreshGranted)
          // already resolved and applied fresh `granted` values before hydration
          // finished, we only layer in `openedSettings` without clobbering the
          // accurate live values. Each field is merged individually so neither
          // source fully overwrites the other.
          setPermissions((prev) => {
            const next: PermissionsMap = { ...prev };
            (Object.keys(parsed) as PermissionId[]).forEach((id) => {
              if (parsed[id]) {
                next[id] = { ...parsed[id]!, ...prev[id] };
                // prev wins for `granted` (live check result takes precedence),
                // but we always restore `openedSettings` from storage.
                next[id].openedSettings =
                  parsed[id]!.openedSettings || prev[id].openedSettings;
              }
            });
            permissionsRef.current = next;
            return next;
          });
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
    permissionsRef.current = next;
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

  /**
   * Atomically updates `granted` for multiple permissions in a single
   * AsyncStorage write. Avoids the stale-closure problem that occurs when
   * `markGranted` is called in a loop (each call would capture an old
   * `permissions` snapshot and overwrite earlier updates).
   *
   * Pass only the IDs whose real OS status you have just checked.
   * IDs not included in the map keep their existing state unchanged.
   *
   * `onNewlyGranted`, if provided, fires once per permission that just
   * transitioned false → true in THIS call (diffed against permissionsRef,
   * which is kept in sync with every write). This is the single shared
   * "grant detected" point for both auto-return (watcher-driven) and
   * manual-return (AppState/backoff-driven) permission checks, since both
   * paths funnel through refreshGranted.
   */
  const refreshGranted = useCallback(
    async (
      grantedMap: Partial<Record<PermissionId, boolean>>,
      onNewlyGranted?: (id: PermissionId) => void
    ) => {
      const prev = permissionsRef.current;
      const next: PermissionsMap = { ...prev };
      const newlyGranted: PermissionId[] = [];
      (Object.keys(grantedMap) as PermissionId[]).forEach((id) => {
        const wasGranted = prev[id]?.granted;
        next[id] = { ...prev[id], granted: grantedMap[id]! };
        if (grantedMap[id] === true && !wasGranted) newlyGranted.push(id);
      });
      permissionsRef.current = next;
      setPermissions(next);
      // Persist asynchronously — fire-and-forget so the state update is
      // synchronous and the UI re-renders immediately.
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      if (onNewlyGranted) {
        newlyGranted.forEach((id) => onNewlyGranted(id));
      }
    },
    []
  );

  const completeSetup = useCallback(async () => {
    await AsyncStorage.setItem(SETUP_DONE_KEY, "true");
    setSetupComplete(true);
  }, []);

  const resetSetup = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY, SETUP_DONE_KEY]);
    permissionsRef.current = DEFAULT_STATE;
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
    refreshGranted,
    completeSetup,
    resetSetup,
  };
}
