import React, { createContext, useContext, useState } from "react";

export interface AppItem {
  id: string;
  name: string;
  category: string;
  iconName: string;
  iconFamily: "FontAwesome5" | "MaterialCommunityIcons" | "Feather";
  iconColor: string;
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

  return (
    <LockContext.Provider
      value={{
        selection,
        setSelectedApps,
        setDurationPreset,
        setCustomDays,
        setCustomHours,
        resetSelection,
      }}
    >
      {children}
    </LockContext.Provider>
  );
}

export function useLock() {
  return useContext(LockContext);
}

export const DUMMY_APPS: AppItem[] = [
  { id: "instagram", name: "Instagram", category: "Social", iconName: "instagram", iconFamily: "FontAwesome5", iconColor: "#E1306C" },
  { id: "tiktok", name: "TikTok", category: "Social", iconName: "tiktok", iconFamily: "FontAwesome5", iconColor: "#010101" },
  { id: "twitter", name: "Twitter / X", category: "Social", iconName: "twitter", iconFamily: "FontAwesome5", iconColor: "#1DA1F2" },
  { id: "facebook", name: "Facebook", category: "Social", iconName: "facebook", iconFamily: "FontAwesome5", iconColor: "#1877F2" },
  { id: "youtube", name: "YouTube", category: "Video", iconName: "youtube", iconFamily: "FontAwesome5", iconColor: "#FF0000" },
  { id: "snapchat", name: "Snapchat", category: "Social", iconName: "snapchat-ghost", iconFamily: "FontAwesome5", iconColor: "#FFFC00" },
  { id: "reddit", name: "Reddit", category: "Social", iconName: "reddit", iconFamily: "FontAwesome5", iconColor: "#FF4500" },
  { id: "pinterest", name: "Pinterest", category: "Social", iconName: "pinterest", iconFamily: "FontAwesome5", iconColor: "#E60023" },
  { id: "whatsapp", name: "WhatsApp", category: "Messaging", iconName: "whatsapp", iconFamily: "FontAwesome5", iconColor: "#25D366" },
  { id: "telegram", name: "Telegram", category: "Messaging", iconName: "telegram", iconFamily: "FontAwesome5", iconColor: "#0088CC" },
  { id: "discord", name: "Discord", category: "Social", iconName: "discord", iconFamily: "FontAwesome5", iconColor: "#5865F2" },
  { id: "linkedin", name: "LinkedIn", category: "Professional", iconName: "linkedin", iconFamily: "FontAwesome5", iconColor: "#0A66C2" },
];

export const DUMMY_ACTIVE_LOCKS = [
  { id: "al1", appName: "Instagram", iconName: "instagram", iconColor: "#E1306C", expiresInDays: 2, expiresInHours: 14 },
  { id: "al2", appName: "TikTok", iconName: "tiktok", iconColor: "#010101", expiresInDays: 5, expiresInHours: 3 },
  { id: "al3", appName: "Twitter / X", iconName: "twitter", iconColor: "#1DA1F2", expiresInDays: 28, expiresInHours: 7 },
];
