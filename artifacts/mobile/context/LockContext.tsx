import React, { createContext, useContext, useState } from "react";
import {
  getDurationLabel,
  getDurationMs,
  getActiveLocks,
  LockedAppEntry,
  LockEntry,
  saveLock,
} from "@/hooks/useLockStorage";

/* ───────────────────────────────────────────────
   App catalogue
─────────────────────────────────────────────── */
export interface AppItem {
  id: string;
  name: string;
  category: string;
  iconName: string;
  iconFamily: "FontAwesome5" | "MaterialCommunityIcons" | "Feather";
  iconColor: string;
  packageName: string;
  domain: string;
  iconUrl: string;
}

export type DurationPreset = "1d" | "7d" | "30d" | "custom";

export interface LockSelection {
  selectedApps: AppItem[];
  durationPreset: DurationPreset;
  customDays: string;
  customHours: string;
}

export interface LockCreationResult {
  entry: LockEntry;
  duplicatesSkipped: string[];
}

interface LockContextType {
  selection: LockSelection;
  setSelectedApps: (apps: AppItem[]) => void;
  setDurationPreset: (preset: DurationPreset) => void;
  setCustomDays: (v: string) => void;
  setCustomHours: (v: string) => void;
  resetSelection: () => void;
  confirmLock: () => Promise<LockCreationResult | null>;
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
  confirmLock: async () => null,
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

  const confirmLock = async (): Promise<LockCreationResult | null> => {
    const { selectedApps, durationPreset, customDays, customHours } = selection;
    if (selectedApps.length === 0) return null;

    const now = Date.now();
    const durationMs = getDurationMs(durationPreset, customDays, customHours);
    const endTime = now + durationMs;

    /* ── Duplicate detection: skip apps already locked ── */
    const activeLocks = await getActiveLocks();
    const alreadyLockedPkgs = new Set<string>(
      activeLocks.flatMap((l) => l.apps.map((a) => a.packageName))
    );

    const duplicatesSkipped: string[] = [];
    const freshApps = selectedApps.filter((a) => {
      if (alreadyLockedPkgs.has(a.packageName)) {
        duplicatesSkipped.push(a.name);
        return false;
      }
      return true;
    });

    if (freshApps.length === 0) {
      return {
        entry: {} as LockEntry,
        duplicatesSkipped,
      };
    }

    const apps: LockedAppEntry[] = freshApps.map((a) => ({
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
    return { entry, duplicatesSkipped };
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
  { id: "instagram", name: "Instagram", category: "Social", iconName: "instagram", iconFamily: "FontAwesome5", iconColor: "#E1306C", packageName: "com.instagram.android", domain: "instagram.com", iconUrl: "" },
  { id: "tiktok", name: "TikTok", category: "Social", iconName: "tiktok", iconFamily: "FontAwesome5", iconColor: "#EE1D52", packageName: "com.zhiliaoapp.musically", domain: "tiktok.com", iconUrl: "" },
  { id: "twitter", name: "Twitter / X", category: "Social", iconName: "twitter", iconFamily: "FontAwesome5", iconColor: "#1DA1F2", packageName: "com.twitter.android", domain: "twitter.com", iconUrl: "" },
  { id: "facebook", name: "Facebook", category: "Social", iconName: "facebook", iconFamily: "FontAwesome5", iconColor: "#1877F2", packageName: "com.facebook.katana", domain: "facebook.com", iconUrl: "" },
  { id: "youtube", name: "YouTube", category: "Video", iconName: "youtube", iconFamily: "FontAwesome5", iconColor: "#FF0000", packageName: "com.google.android.youtube", domain: "youtube.com", iconUrl: "" },
  { id: "snapchat", name: "Snapchat", category: "Social", iconName: "snapchat-ghost", iconFamily: "FontAwesome5", iconColor: "#FFFC00", packageName: "com.snapchat.android", domain: "snapchat.com", iconUrl: "" },
  { id: "reddit", name: "Reddit", category: "Social", iconName: "reddit", iconFamily: "FontAwesome5", iconColor: "#FF4500", packageName: "com.reddit.frontpage", domain: "reddit.com", iconUrl: "" },
  { id: "pinterest", name: "Pinterest", category: "Social", iconName: "pinterest", iconFamily: "FontAwesome5", iconColor: "#E60023", packageName: "com.pinterest", domain: "pinterest.com", iconUrl: "" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", iconName: "whatsapp", iconFamily: "FontAwesome5", iconColor: "#25D366", packageName: "com.whatsapp", domain: "whatsapp.com", iconUrl: "" },
  { id: "telegram", name: "Telegram", category: "Messaging", iconName: "telegram", iconFamily: "FontAwesome5", iconColor: "#0088CC", packageName: "org.telegram.messenger", domain: "telegram.org", iconUrl: "" },
  { id: "discord", name: "Discord", category: "Social", iconName: "discord", iconFamily: "FontAwesome5", iconColor: "#5865F2", packageName: "com.discord", domain: "discord.com", iconUrl: "" },
  { id: "linkedin", name: "LinkedIn", category: "Professional", iconName: "linkedin", iconFamily: "FontAwesome5", iconColor: "#0A66C2", packageName: "com.linkedin.android", domain: "linkedin.com", iconUrl: "" },
];

export type { LockEntry, LockedAppEntry };
