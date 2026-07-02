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
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isChecking = useRef(false);

  const check = async () => {
    console.log("🔍 checkForUpdate called, Platform:", Platform.OS);

    if (Platform.OS === "web") {
      console.log("⏭️ Skipped: web platform");
      return;
    }

    if (isChecking.current) {
      console.log("⏭️ Skipped: already checking");
      return;
    }

    if (!isFirebaseConfigured) {
      console.log("⏭️ Skipped: Firebase not configured");
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      console.log("⏭️ Skipped: no Firebase db instance");
      return;
    }

    isChecking.current = true;
    try {
      // expo-constants reads from app.json — works correctly in both
      // Expo Go and standalone APK. Application.nativeBuildVersion
      // returns Expo Go's own versionCode in Expo Go, not the app's.
      const currentVersionCode =
        Constants.expoConfig?.android?.versionCode ?? 0;
      console.log(
        "📱 currentVersionCode (from expoConfig):",
        currentVersionCode
      );

      if (!currentVersionCode || currentVersionCode === 0) {
        console.log("⏭️ Skipped: invalid version code");
        return;
      }

      const snapshot = await get(ref(db, "app_config"));
      const config = snapshot.val();
      console.log("🔥 Firebase config:", JSON.stringify(config));

      if (!config) {
        console.log("⏭️ Skipped: no config found");
        return;
      }

      const latestCode = Number(config.latest_version_code);
      console.log(
        "🔢 Comparison:",
        config.latest_version_code,
        ">",
        currentVersionCode,
        "=",
        latestCode > currentVersionCode
      );

      if (latestCode > currentVersionCode) {
        console.log("✅ Update needed, showing modal");
        setUpdateInfo({
          required: config.force_update === true,
          message:
            config.update_message ??
            "A new version is available with important improvements.",
          url: config.update_url ?? "",
          latestVersionName: config.latest_version_name ?? "",
        });
        setShowUpdateModal(true);
      } else {
        console.log("❌ No update needed");
      }
    } catch (err) {
      console.log("💥 checkForUpdate error:", String(err));
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
