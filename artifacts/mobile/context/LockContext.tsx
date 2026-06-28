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
  { id: "instagram", name: "Instagram", category: "Social", iconName: "instagram", iconFamily: "FontAwesome5", iconColor: "#E1306C", packageName: "com.instagram.android", domain: "instagram.com", iconUrl: "https://play-lh.googleusercontent.com/VRMWkE5p3CkWhJs6nv-9ZsLAs1QOg5ob1_3qg-rckwYW7yp1fMrYZqnEFpk0IoVP4LQ=s180" },
  { id: "tiktok", name: "TikTok", category: "Social", iconName: "tiktok", iconFamily: "FontAwesome5", iconColor: "#010101", packageName: "com.zhiliaoapp.musically", domain: "tiktok.com", iconUrl: "https://play-lh.googleusercontent.com/os3mjEMjbGFEWl0EJ3VuSNqFRNqiK0KSBSJe0hIBnDjIBrqCpJvK_KRl8SkS9WPmQ=s180" },
  { id: "twitter", name: "Twitter / X", category: "Social", iconName: "twitter", iconFamily: "FontAwesome5", iconColor: "#1DA1F2", packageName: "com.twitter.android", domain: "twitter.com", iconUrl: "https://play-lh.googleusercontent.com/A1-GBu6UdHWD-KjkHzMRDvhm2fAFfpH3INcqnR-4Y0JbhKMjVXvZmfBULmf1YK_BQ=s180" },
  { id: "facebook", name: "Facebook", category: "Social", iconName: "facebook", iconFamily: "FontAwesome5", iconColor: "#1877F2", packageName: "com.facebook.katana", domain: "facebook.com", iconUrl: "https://play-lh.googleusercontent.com/ccWDU4A7fX1R24v-vvT480ySh26AYp44ZhLPTKMtYLBYMkuCBGp4yKFmTNhYJG2GoA=s180" },
  { id: "youtube", name: "YouTube", category: "Video", iconName: "youtube", iconFamily: "FontAwesome5", iconColor: "#FF0000", packageName: "com.google.android.youtube", domain: "youtube.com", iconUrl: "https://play-lh.googleusercontent.com/lMoItBgdPPVDJsNOVtP26EKHePkwBg-PkuY9NOrc-fumRtTFP4XhpUNk_22syN4Datc=s180" },
  { id: "snapchat", name: "Snapchat", category: "Social", iconName: "snapchat-ghost", iconFamily: "FontAwesome5", iconColor: "#FFFC00", packageName: "com.snapchat.android", domain: "snapchat.com", iconUrl: "https://play-lh.googleusercontent.com/KxeSAjPTKliM-QZcMBzIKkMGZHFZjBPYOGCVBCpZKSEoTOXeI34y5jhOQFm-YGqIog=s180" },
  { id: "reddit", name: "Reddit", category: "Social", iconName: "reddit", iconFamily: "FontAwesome5", iconColor: "#FF4500", packageName: "com.reddit.frontpage", domain: "reddit.com", iconUrl: "https://play-lh.googleusercontent.com/6gAm8dGANZhAPAIBCMoSnZ8XbJusqFNvQyMuD4RqANEBFBaBlHJ9F3A7hnGHW-f5aQ=s180" },
  { id: "pinterest", name: "Pinterest", category: "Social", iconName: "pinterest", iconFamily: "FontAwesome5", iconColor: "#E60023", packageName: "com.pinterest", domain: "pinterest.com", iconUrl: "https://play-lh.googleusercontent.com/8Vw-aMzb1EPNFxkOFHnbFKwINDLsOBtHQHBApH5kHZhgPHRRKBQKUJWQhidF3mGrNg=s180" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", iconName: "whatsapp", iconFamily: "FontAwesome5", iconColor: "#25D366", packageName: "com.whatsapp", domain: "whatsapp.com", iconUrl: "https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN=s180" },
  { id: "telegram", name: "Telegram", category: "Messaging", iconName: "telegram", iconFamily: "FontAwesome5", iconColor: "#0088CC", packageName: "org.telegram.messenger", domain: "telegram.org", iconUrl: "https://play-lh.googleusercontent.com/ZU9cSoKfJz4HWzPOC0mXTaKNjxs1-jqhyKj3BJRMNHQ8pJJiU5kqGrQ5cBcRn0Xomxg=s180" },
  { id: "discord", name: "Discord", category: "Social", iconName: "discord", iconFamily: "FontAwesome5", iconColor: "#5865F2", packageName: "com.discord", domain: "discord.com", iconUrl: "https://play-lh.googleusercontent.com/0oO5sAneb9lJP6l8c6DH4aj6f85qNpplQVSutzNMep4jKnWQAAaN1L9c1XZGW3SWHQ=s180" },
  { id: "linkedin", name: "LinkedIn", category: "Professional", iconName: "linkedin", iconFamily: "FontAwesome5", iconColor: "#0A66C2", packageName: "com.linkedin.android", domain: "linkedin.com", iconUrl: "https://play-lh.googleusercontent.com/kMofDwjFOQlPYqKRHE3Q7ZVKIjMFSqKG2N0i09HKGMvFZEQ5bkHmY5N3CcSU-pFdPsA=s180" },
];

export type { LockEntry, LockedAppEntry };
