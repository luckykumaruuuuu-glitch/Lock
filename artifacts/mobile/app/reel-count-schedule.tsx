/**
 * reel-count-schedule.tsx — "How many reels?" screen.
 *
 * Opened from Settings → "Unlock Tasks Screen" → after the user completes one
 * of the 5 tasks.  INDEPENDENT from duration-selector.tsx (toggle-off flow).
 *
 * Layout (top → bottom):
 *  · Absolute back-arrow button (top-left)
 *  · Top section (flex: 1): character image + heading, vertically centred
 *  · Bottom section (fixed): 3×2 pill grid + orange CTA
 *
 * Always opens fresh — no carry-over selection from previous visits.
 */

import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
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

// ── Per-platform background images ───────────────────────────────────────────
const PLATFORM_BG: Partial<Record<NonNullable<ReturnType<typeof getUnlockPlatform>>, ReturnType<typeof require>>> = {
  instagram: require("@/assets/reel_count_bg_instagram.webp"),
  youtube:   require("@/assets/reel_count_bg_youtube.webp"),
  facebook:  require("@/assets/reel_count_bg_facebook.webp"),
};

// ── Constants ─────────────────────────────────────────────────────────────────
const COUNT_OPTIONS = [5, 10, 20, 30, 40, 50] as const;

const SCREEN_W = Dimensions.get("window").width;

// Character: 70% wide, square container — proportional to heading visual weight,
// big enough to read while grid + CTA still stay on screen.
const CHAR_SIZE = Math.round(SCREEN_W * 0.70);

// Pill sizing
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
  const insets   = useSafeAreaInsets();
  const platform = getUnlockPlatform();

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
      await saveReelsRemaining({ count: selected, platform });
      await clearReelsLockOff();
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { await NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }
      if (platform && PLATFORM_DEEP_LINKS[platform]) {
        Linking.openURL(PLATFORM_DEEP_LINKS[platform]!).catch(() => {});
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("[ReelCountSchedule] handleConfirm error:", e);
      setLoading(false);
    }
  }

  // Pair options for 2-per-row rendering
  const rows: (typeof COUNT_OPTIONS[number])[][] = [];
  for (let i = 0; i < COUNT_OPTIONS.length; i += 2) {
    rows.push([COUNT_OPTIONS[i], COUNT_OPTIONS[i + 1]]);
  }

  return (
    <View style={[styles.root, { paddingBottom: bottomPad }]}>

      {/* ── Absolute back button (top-left) ─────────────────────────── */}
      {/* Uses a plain Unicode arrow — guaranteed to render on web/native
          without depending on an icon-font being loaded first.           */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: topPad + 8 }]}
        hitSlop={12}
      >
        <Text style={styles.backArrow}>←</Text>
      </Pressable>

      {/* ── Top section: image + heading ────────────────────────────── */}
      {/* flex: 1 so it expands to fill whatever space is left after the
          fixed-height bottom section. justifyContent: 'center' keeps
          the image+heading vertically centred in that space.            */}
      <View style={[styles.topSection, { paddingTop: topPad + 56 }]}>
        <View style={styles.illustrationArea}>
          {PLATFORM_BG[platform as keyof typeof PLATFORM_BG] && (
            <ExpoImage
              source={PLATFORM_BG[platform as keyof typeof PLATFORM_BG]}
              style={styles.illustrationImage}
              contentFit="contain"
              transition={0}
            />
          )}
        </View>

        <View style={styles.headingBlock}>
          <Text style={styles.heading}>
            {`How many ${unit}\ndo you want to watch?`}
          </Text>
        </View>
      </View>

      {/* ── Bottom section: grid + CTA ───────────────────────────────── */}
      {/* Fixed at the bottom — always fully visible regardless of how
          large the character image is.                                   */}
      <View style={styles.bottomSection}>
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

        <View style={{ height: PILL_GAP }} />

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
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Root fills the screen; top section + bottom section share the height
  // via flex (top) vs intrinsic size (bottom).
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
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
  // Unicode left arrow — renders on every platform without icon-font dependency
  backArrow: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 26,
    includeFontPadding: false,
  },

  // ── Top section (image + heading) ──
  topSection: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 16,
  },

  // Square container sized to 60% of screen width
  illustrationArea: {
    width: CHAR_SIZE,
    height: CHAR_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },

  // ── Heading ──
  headingBlock: {
    marginTop: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 32,
  },

  // ── Bottom section ──
  bottomSection: {
    width: "100%",
    paddingBottom: 4,
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
    borderRadius: PILL_H / 2,
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
});
