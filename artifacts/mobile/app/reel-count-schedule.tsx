/**
 * reel-count-schedule.tsx — "How many reels?" screen.
 *
 * Opened from Settings → "Unlock Tasks Screen" → after the user completes one
 * of the 5 tasks.  INDEPENDENT from duration-selector.tsx (toggle-off flow).
 *
 * Layout (top → bottom):
 *  · Fixed back-arrow button (top-left)
 *  · Illustration placeholder (character + platform logo — placeholder only)
 *  · 2-line heading + vertical gap
 *  · 3×2 grid of pill buttons (5, 10, 20, 30, 40, 50)
 *  · Full-width orange CTA (disabled until selected)
 *  · Thin gesture indicator bar
 *
 * Always opens fresh — no carry-over selection from previous visits.
 */

import { Feather } from "@expo/vector-icons";
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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getUnlockPlatform, SourcePlatform } from "@/lib/unlockFlowState";
import { saveReelsRemaining } from "@/lib/reelsLockReels";
import { clearReelsLockOff } from "@/lib/reelsLockOff";

// ── Constants ─────────────────────────────────────────────────────────────────
const COUNT_OPTIONS = [5, 10, 20, 30, 40, 50] as const;

const SCREEN_W = Dimensions.get("window").width;
// Pill width: 2 per row with equal gaps + side padding
const PILL_H_PAD = 24;
const PILL_GAP   = 12;
const PILL_W     = Math.floor((SCREEN_W - PILL_H_PAD * 2 - PILL_GAP) / 2);
const PILL_H     = 52;

// ── Helpers ───────────────────────────────────────────────────────────────────
function platformLabel(p: SourcePlatform): string {
  return p === "youtube" ? "Shorts" : "Reels";
}

const PLATFORM_DEEP_LINKS: Partial<Record<NonNullable<SourcePlatform>, string>> = {
  instagram: "instagram://",
  youtube:   "youtube://",
  facebook:  "fb://",
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ReelCountScheduleScreen() {
  const insets  = useSafeAreaInsets();
  const platform = getUnlockPlatform();

  // Always starts with no selection — fresh state every mount
  const [selected, setSelected] = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);

  const topPad    = Platform.OS === "web" ? 54 : insets.top;
  const bottomPad = Platform.OS === "web" ? 20 : Math.max(insets.bottom, 8);

  const unit = platformLabel(platform);

  async function handleConfirm() {
    if (!selected || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      // 1. Save reel-count schedule
      await saveReelsRemaining({ count: selected, platform });
      // 2. Clear any duration-based unlock (modes are exclusive)
      await clearReelsLockOff();
      // 3. Disable native lock
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { await NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }
      // 4. Redirect to platform feed, then home
      if (platform && PLATFORM_DEEP_LINKS[platform]) {
        Linking.openURL(PLATFORM_DEEP_LINKS[platform]!).catch(() => {});
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("[ReelCountSchedule] handleConfirm error:", e);
      setLoading(false);
    }
  }

  // Pair the options for 2-per-row rendering
  const rows: (typeof COUNT_OPTIONS[number])[][] = [];
  for (let i = 0; i < COUNT_OPTIONS.length; i += 2) {
    rows.push([COUNT_OPTIONS[i], COUNT_OPTIONS[i + 1]]);
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>

      {/* ── Fixed back button (top-left) ────────────────────────────── */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: topPad + 8 }]}
        hitSlop={12}
      >
        <Feather name="arrow-left" size={20} color="#FFFFFF" />
      </Pressable>

      {/* ── Illustration placeholder ────────────────────────────────── */}
      {/* Real assets (mascot + platform logo) will be added later.
          For now: a minimal empty area so the layout spacing is set. */}
      <View style={styles.illustrationArea}>
        {/* intentionally empty — placeholder */}
      </View>

      {/* ── Heading ─────────────────────────────────────────────────── */}
      <View style={styles.headingBlock}>
        <Text style={styles.heading}>
          {"Kitne\n"}
          <Text>{unit.toLowerCase() === "shorts" ? "Shorts" : "Reels"} dekhne hain?</Text>
        </Text>
      </View>

      {/* ── Vertical gap ────────────────────────────────────────────── */}
      <View style={styles.gap} />

      {/* ── 6-pill grid (2 per row) ──────────────────────────────────── */}
      <View style={styles.grid}>
        {rows.map((pair, ri) => (
          <View key={ri} style={styles.gridRow}>
            {pair.map((num) => {
              const isSel = selected === num;
              return (
                <TouchableOpacity
                  key={num}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelected(num);
                  }}
                  activeOpacity={0.75}
                  style={[styles.pill, isSel && styles.pillSelected]}
                >
                  <Text style={[styles.pillText, isSel && styles.pillTextSelected]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Spacer to push CTA to bottom ─────────────────────────────── */}
      <View style={{ flex: 1 }} />

      {/* ── CTA button ────────────────────────────────────────────────── */}
      <View style={styles.ctaWrapper}>
        <Pressable
          onPress={handleConfirm}
          disabled={!selected || loading}
          style={({ pressed }) => [
            styles.ctaPressable,
            { opacity: pressed || !selected ? 0.42 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#FFB347", "#FF8C42"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              {loading ? "Saving…" : "Confirm"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── Gesture indicator bar ─────────────────────────────────────── */}
      <View style={styles.gestureBar} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
  },

  // ── Back button ──
  backBtn: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // ── Illustration area ──
  illustrationArea: {
    width: "100%",
    height: 120, // reserved for mascot + logo asset
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 4,
  },

  // ── Heading ──
  headingBlock: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 34,
  },

  // ── Gap between heading and grid ──
  gap: {
    height: 36,
  },

  // ── Grid ──
  grid: {
    width: "100%",
    paddingHorizontal: PILL_H_PAD,
    gap: PILL_GAP,
  },
  gridRow: {
    flexDirection: "row",
    gap: PILL_GAP,
  },
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,        // fully pill-shaped
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelected: {
    backgroundColor: "#2C2C2E",
    borderWidth: 1.5,
    borderColor: "#FFB347",
  },
  pillText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  pillTextSelected: {
    color: "#FFB347",
  },

  // ── CTA ──
  ctaWrapper: {
    width: "100%",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  ctaPressable: {
    width: "100%",
    borderRadius: 50,
    overflow: "hidden",
  },
  ctaGradient: {
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  // ── Gesture bar ──
  gestureBar: {
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.30)",
    marginBottom: 4,
    marginTop: 4,
  },
});
