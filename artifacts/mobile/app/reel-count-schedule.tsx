/**
 * reel-count-schedule.tsx — "How many reels to allow?" screen.
 *
 * Opened from Settings → "Unlock" → after the user completes one of the 5 tasks.
 * The user picks a reel count (5 / 10 / 20 / 30 / 40 / 50). After watching
 * that many reels, the Reels-Lock auto re-enables.
 *
 * This is INDEPENDENT from duration-selector.tsx (toggle-off flow):
 *   Toggle-off flow → duration-selector  (time-based unlock)
 *   Settings flow   → reel-count-schedule (count-based unlock)
 *
 * Platform (instagram / youtube / facebook) is read from unlockFlowState,
 * which Settings sets before pushing to /unlock-tasks.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getUnlockPlatform, SourcePlatform } from "@/lib/unlockFlowState";
import { saveReelsRemaining } from "@/lib/reelsLockReels";
import { clearReelsLockOff } from "@/lib/reelsLockOff";

// ── Count options (single-select) ────────────────────────────────────────────
const COUNT_OPTIONS = [5, 10, 20, 30, 40, 50] as const;

// Card geometry — 3 per row, capped so it looks right on any screen width
const SCREEN_W      = Dimensions.get("window").width;
const H_PADDING     = 40;
const CARD_GAP      = 12;
const CARD_SIZE     = Math.min(
  Math.floor((SCREEN_W - H_PADDING * 2 - CARD_GAP * 2) / 3),
  88, // cap for tablets / web preview
);

// ── Platform helpers ──────────────────────────────────────────────────────────
function platformLabel(p: SourcePlatform): string {
  if (p === "youtube") return "Shorts";
  return "Reels"; // instagram, facebook, null
}

function platformDisplayName(p: SourcePlatform): string {
  if (p === "youtube")   return "YouTube";
  if (p === "facebook")  return "Facebook";
  if (p === "instagram") return "Instagram";
  return "";
}

const PLATFORM_DEEP_LINKS: Partial<Record<NonNullable<SourcePlatform>, string>> = {
  instagram: "instagram://",
  youtube:   "youtube://",
  facebook:  "fb://",
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ReelCountScheduleScreen() {
  const insets     = useSafeAreaInsets();
  const platform   = getUnlockPlatform();
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const unit        = platformLabel(platform);
  const platformName = platformDisplayName(platform);

  async function handleConfirm() {
    if (!selected || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // 1. Save the reel-count schedule
      await saveReelsRemaining({ count: selected, platform });

      // 2. Clear any existing duration-based unlock (the two modes are exclusive)
      await clearReelsLockOff();

      // 3. Disable native ReelsLock so the user can actually watch reels
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { await NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }

      // 4. Redirect: try to open the platform app, then fall through to home
      if (platform && PLATFORM_DEEP_LINKS[platform]) {
        Linking.openURL(PLATFORM_DEEP_LINKS[platform]!).catch(() => {});
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("[ReelCountSchedule] handleConfirm error:", e);
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={["#2b1a12", "#0d0806"]}
      style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      {/* ── Top: platform-logo placeholder ──────────────────────────── */}
      <View style={styles.topArea}>
        <View style={styles.logoPlaceholder}>
          {/* Logo asset goes here once added — empty dashed circle for now */}
          <View style={styles.logoEmptyBox} />
        </View>
        {platformName ? (
          <Text style={styles.platformName}>{platformName}</Text>
        ) : null}
      </View>

      {/* ── Center: heading + grid ───────────────────────────────────── */}
      <View style={styles.center}>
        <Text style={styles.title}>How many {unit.toLowerCase()}?</Text>
        <Text style={styles.subtitle}>
          Pick how many before it locks again
        </Text>

        {/* 6-box grid — 3 per row */}
        <View style={styles.grid}>
          {COUNT_OPTIONS.map((num) => {
            const isSelected = selected === num;
            return (
              <TouchableOpacity
                key={num}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(num);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Bottom: confirm button ───────────────────────────────────── */}
      <View style={[styles.bottomArea]}>
        <Pressable
          onPress={handleConfirm}
          disabled={!selected || loading}
          style={({ pressed }) => [{ opacity: pressed || !selected ? 0.45 : 1 }]}
        >
          <LinearGradient
            colors={["#FFBF80", "#FFA660"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Feather name="check-circle" size={18} color="#000000" style={{ marginRight: 8 }} />
            <Text style={styles.confirmText}>
              {loading ? "Saving…" : "Confirm"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // ── Top area ──
  topArea: {
    alignItems: "center",
    paddingTop: 16,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmptyBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "#5a4634",
    borderStyle: "dashed",
  },
  platformName: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#9a7a5a",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Center ──
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: H_PADDING,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "#c9b8a8",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── Grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: CARD_GAP,
    width: CARD_SIZE * 3 + CARD_GAP * 2,
  },
  option: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: CARD_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "#5a4634",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  optionSelected: {
    borderColor: "#FFBF80",
    backgroundColor: "rgba(255,191,128,0.12)",
  },
  optionText: {
    color: "#c9b8a8",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  optionTextSelected: {
    color: "#FFBF80",
  },

  // ── Bottom ──
  bottomArea: {
    width: "100%",
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 12,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmText: {
    color: "#000000",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
