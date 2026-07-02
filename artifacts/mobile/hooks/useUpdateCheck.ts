import Constants from "expo-constants";
import { get, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";
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
    // TEMPORARY DEBUG: visible alert at very start — remove after confirmed working
    Alert.alert("🔍 DEBUG", `check() called. Platform: ${Platform.OS}\nisFirebaseConfigured: ${isFirebaseConfigured}\nisChecking: ${isChecking.current}`);

    if (Platform.OS === "web") return;
    if (isChecking.current) return;

    if (!isFirebaseConfigured) {
      Alert.alert("⛔ DEBUG", "Firebase not configured — update check skipped");
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      Alert.alert("⛔ DEBUG", "No Firebase db instance");
      return;
    }

    isChecking.current = true;
    try {
      const currentVersionCode =
        Constants.expoConfig?.android?.versionCode ?? 0;

      const snapshot = await get(ref(db, "app_config"));
      const config = snapshot.val();
      const latestCode = Number(config?.latest_version_code ?? 0);

      // --- TEMPORARY DEBUG ALERT: remove after confirmed working ---
      Alert.alert(
        "🔍 Update Check Debug",
        `Platform: ${Platform.OS}\n` +
          `currentVersionCode: ${currentVersionCode}\n` +
          `Firebase config: ${JSON.stringify(config)}\n` +
          `latestCode: ${latestCode}\n` +
          `latestCode > current: ${latestCode > currentVersionCode}`
      );
      // --- END DEBUG ---

      if (!currentVersionCode || currentVersionCode === 0) {
        return;
      }

      if (!config) {
        return;
      }

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
    } catch (err) {
      Alert.alert("💥 checkForUpdate error", String(err));
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
