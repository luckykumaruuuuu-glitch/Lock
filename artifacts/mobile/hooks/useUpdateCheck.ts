import Constants from "expo-constants";
import { get, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";

export interface UpdateInfo {
  required: boolean;
  message: string;
  url: string;
  latestVersionName: string;
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  // hasUpdate stays true even after "Later" is pressed, until app is updated
  const [hasUpdate, setHasUpdate] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isChecking = useRef(false);

  const check = async () => {
    if (Platform.OS === "web") return;
    if (isChecking.current) return;
    if (!isFirebaseConfigured) return;

    const db = getFirebaseDb();
    if (!db) return;

    isChecking.current = true;
    try {
      const currentVersionCode =
        Constants.expoConfig?.android?.versionCode ?? 0;

      if (!currentVersionCode || currentVersionCode === 0) return;

      const snapshot = await get(ref(db, "app_config"));
      const config = snapshot.val();
      if (!config) return;

      const latestCode = Number(config.latest_version_code ?? 0);

      if (latestCode > currentVersionCode) {
        const info: UpdateInfo = {
          required: config.force_update === true,
          message:
            config.update_message ??
            "A new version is available with important improvements.",
          url: config.update_url ?? "",
          latestVersionName: config.latest_version_name ?? "",
        };
        setUpdateInfo(info);
        setHasUpdate(true);
        setShowUpdateModal(true);
      }
    } catch {
      // Silent — update check is non-critical
    } finally {
      isChecking.current = false;
    }
  };

  useEffect(() => {
    check();

    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          next === "active"
        ) {
          check();
        }
        appStateRef.current = next;
      }
    );

    return () => sub.remove();
  }, []);

  // "Later" — closes modal but hasUpdate stays true
  const dismiss = () => setShowUpdateModal(false);

  // Settings screen taps version row → reopen modal
  const reopenModal = () => {
    if (hasUpdate) setShowUpdateModal(true);
  };

  return { showUpdateModal, updateInfo, dismiss, hasUpdate, reopenModal };
}
