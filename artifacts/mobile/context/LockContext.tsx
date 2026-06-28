import React, { createContext, useContext, useState } from "react";
import { getDurationLabel, getDurationMs, LockedAppEntry, LockEntry, saveLock } from "@/hooks/useLockStorage";

/* ───────────────────────────────────────────────
   App catalogue (dummy — replace with real
   installed-apps query in a future milestone)
─────────────────────────────────────────────── */
export interface AppItem {
  id: string;
  name: string;
  category: string;
  iconName: string;
  iconFamily: "FontAwesome5" | "MaterialCommunityIcons" | "Feather";
  iconColor: string;
  packageName: string;
}

export type DurationPreset = "1d" | "7d" | "30d" | "custom";

export interface LockSelection {
  selectedApps: AppItem[];
  durationPreset: DurationPreset;
  customDays: string;
  customHours: string;
}

interface LockContextType {
  selection: LockSelection;
  setSelectedApps: (apps: AppItem[]) => void;
  setDurationPreset: (preset: DurationPreset) => void;
  setCustomDays: (v: string) => void;
  setCustomHours: (v: string) => void;
  resetSelection: () => void;
  confirmLock: () => Promise<void>;
}

const defaultSelection: LockSelection = {
  selectedApps: [],
  durationPreset: "1d",
  customDays: "1",
  customHours: "0",
};

const LockContext = createContext<LockContextType>({
  selection: defaultSelection,
  setSelectedApps: () => {},
  setDurationPreset: () => {},
  setCustomDays: () => {},
  setCustomHours: () => {},
  resetSelection: () => {},
  confirmLock: async () => {},
});

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = useState<LockSelection>(defaultSelection);

  const setSelectedApps = (apps: AppItem[]) =>
    setSelection((s) => ({ ...s, selectedApps: apps }));

  const setDurationPreset = (preset: DurationPreset) =>
    setSelection((s) => ({ ...s, durationPreset: preset }));

  const setCustomDays = (v: string) =>
    setSelection((s) => ({ ...s, customDays: v }));

  const setCustomHours = (v: string) =>
    setSelection((s) => ({ ...s, customHours: v }));

  const resetSelection = () => setSelection(defaultSelection);

  const confirmLock = async () => {
    const { selectedApps, durationPreset, customDays, customHours } = selection;
    if (selectedApps.length === 0) return;

    const now = Date.now();
    const durationMs = getDurationMs(durationPreset, customDays, customHours);
    const endTime = now + durationMs;

    const apps: LockedAppEntry[] = selectedApps.map((a) => ({
      id: a.id,
      name: a.name,
      iconName: a.iconName,
      iconColor: a.iconColor,
      packageName: a.packageName,
    }));

    const entry: LockEntry = {
      id: `lock_${now}_${Math.random().toString(36).slice(2, 7)}`,
      apps,
      startTime: now,
      endTime,
      status: "ACTIVE",
      durationLabel: getDurationLabel(durationPreset, customDays, customHours),
    };

    await saveLock(entry);
  };

  return (
    <LockContext.Provider
      value={{
        selection,
        setSelectedApps,
        setDurationPreset,
        setCustomDays,
        setCustomHours,
        resetSelection,
        confirmLock,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  return useContext(LockContext);
}

/* ───────────────────────────────────────────────
   App catalogue with Android package names
─────────────────────────────────────────────── */
export const DUMMY_APPS: AppItem[] = [
  { id: "instagram", name: "Instagram", category: "Social", iconName: "instagram", iconFamily: "FontAwesome5", iconColor: "#E1306C", packageName: "com.instagram.android" },
  { id: "tiktok", name: "TikTok", category: "Social", iconName: "tiktok", iconFamily: "FontAwesome5", iconColor: "#010101", packageName: "com.zhiliaoapp.musically" },
  { id: "twitter", name: "Twitter / X", category: "Social", iconName: "twitter", iconFamily: "FontAwesome5", iconColor: "#1DA1F2", packageName: "com.twitter.android" },
  { id: "facebook", name: "Facebook", category: "Social", iconName: "facebook", iconFamily: "FontAwesome5", iconColor: "#1877F2", packageName: "com.facebook.katana" },
  { id: "youtube", name: "YouTube", category: "Video", iconName: "youtube", iconFamily: "FontAwesome5", iconColor: "#FF0000", packageName: "com.google.android.youtube" },
  { id: "snapchat", name: "Snapchat", category: "Social", iconName: "snapchat-ghost", iconFamily: "FontAwesome5", iconColor: "#FFFC00", packageName: "com.snapchat.android" },
  { id: "reddit", name: "Reddit", category: "Social", iconName: "reddit", iconFamily: "FontAwesome5", iconColor: "#FF4500", packageName: "com.reddit.frontpage" },
  { id: "pinterest", name: "Pinterest", category: "Social", iconName: "pinterest", iconFamily: "FontAwesome5", iconColor: "#E60023", packageName: "com.pinterest" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", iconName: "whatsapp", iconFamily: "FontAwesome5", iconColor: "#25D366", packageName: "com.whatsapp" },
  { id: "telegram", name: "Telegram", category: "Messaging", iconName: "telegram", iconFamily: "FontAwesome5", iconColor: "#0088CC", packageName: "org.telegram.messenger" },
  { id: "discord", name: "Discord", category: "Social", iconName: "discord", iconFamily: "FontAwesome5", iconColor: "#5865F2", packageName: "com.discord" },
  { id: "linkedin", name: "LinkedIn", category: "Professional", iconName: "linkedin", iconFamily: "FontAwesome5", iconColor: "#0A66C2", packageName: "com.linkedin.android" },
];

/* ───────────────────────────────────────────────
   Re-export LockEntry type for screens
─────────────────────────────────────────────── */
export type { LockEntry, LockedAppEntry };
