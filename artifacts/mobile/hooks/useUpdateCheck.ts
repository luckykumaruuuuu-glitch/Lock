import * as Application from "expo-application";
import { get, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isChecking = useRef(false);

  const check = async () => {
    if (isChecking.current) return;
    if (!isFirebaseConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;

    isChecking.current = true;
    try {
      const rawBuild = Application.nativeBuildVersion ?? "0";
      const currentVersionCode = parseInt(rawBuild, 10);
      if (isNaN(currentVersionCode)) return;

      const snapshot = await get(ref(db, "app_config"));
      const config = snapshot.val();
      if (!config) return;

      const latestCode = Number(config.latest_version_code);
      if (!isFinite(latestCode)) return;

      if (latestCode > currentVersionCode) {
        setUpdateInfo({
          required: config.force_update === true,
          message:
            config.update_message ??
            "A new version is available with important improvements.",
          url: config.update_url ?? "",
          latestVersionName: config.latest_version_name ?? "",
        });
        setShowUpdateModal(true);
      }
    } catch {
      // Network unavailable or Firebase error — silently skip
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

  const dismiss = () => setShowUpdateModal(false);

  return { showUpdateModal, updateInfo, dismiss };
}
