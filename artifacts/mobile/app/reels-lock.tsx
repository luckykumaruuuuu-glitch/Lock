/**
 * reels-lock.tsx — JS/React version of the native ReelsLockActivity.
 *
 * Shows the platform-specific "locked" screen (same dark-glow design as the
 * Kotlin original) and bridges into the JS unlock-tasks flow.
 *
 * Route params:
 *   platform: "instagram" | "youtube" | "facebook"
 *
 * Buttons:
 *   "Back"   → router.back() (mimics native: returns to platform feed/home)
 *   "Unlock" → sets unlock flow state then pushes /unlock-tasks
 */

import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { setUnlockFlowState, SourcePlatform } from "@/lib/unlockFlowState";

// ── Platform config ───────────────────────────────────────────────────────────
type PlatformKey = "instagram" | "youtube" | "facebook";

const PLATFORM_CONFIG: Record<
  PlatformKey,
  { title: string; image: ReturnType<typeof require> }
> = {
  instagram: {
    title: "Reels are locked",
    image: require("@/assets/reels_lock_char_instagram.png"),
  },
  youtube: {
    title: "Shorts are locked",
    image: require("@/assets/reels_lock_char_youtube.png"),
  },
  facebook: {
    title: "Reels are locked",
    image: require("@/assets/reels_lock_char_facebook.png"),
  },
};

// Glow accent colour per platform
const GLOW_COLOR: Record<PlatformKey, string> = {
  instagram: "rgba(193, 53, 132, 0.35)",  // Instagram pink/purple
  youtube:   "rgba(255, 0, 0, 0.30)",      // YouTube red
  facebook:  "rgba(24, 119, 242, 0.30)",   // Facebook blue
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ReelsLockScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ platform?: string }>();

  const platform: PlatformKey =
    params.platform === "youtube"
      ? "youtube"
      : params.platform === "facebook"
      ? "facebook"
      : "instagram"; // default fallback

  const config   = PLATFORM_CONFIG[platform];
  const glowColor = GLOW_COLOR[platform];

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/settings");
    }
  }

  function handleUnlock() {
    setUnlockFlowState("reel-count-schedule", platform as SourcePlatform);
    router.push("/unlock-tasks");
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>

      {/* ── Radial glow behind character ─────────────────────────────── */}
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={[glowColor, "transparent"]}
          style={styles.glow}
        />
      </View>

      {/* ── Character image ─────────────────────────────────────────── */}
      <View style={styles.imageWrap}>
        <Image
          source={config.image}
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* ── Title ────────────────────────────────────────────────────── */}
      <Text style={styles.title}>{config.title}</Text>
      <Text style={styles.subtitle}>
        Complete a quick challenge to unlock your session.
      </Text>

      {/* ── Buttons ──────────────────────────────────────────────────── */}
      <View style={styles.buttonRow}>
        {/* Back */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.btnBack, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.btnBackText}>Back</Text>
        </Pressable>

        {/* Unlock */}
        <Pressable
          onPress={handleUnlock}
          style={({ pressed }) => [styles.btnUnlock, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnUnlockText}>Unlock</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // Glow — large soft circle centred behind the character
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    width: 380,
    height: 380,
    borderRadius: 190,
  },

  // Character image
  imageWrap: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  character: {
    width: 220,
    height: 220,
  },

  // Title
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },

  // Subtitle
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
    paddingHorizontal: 8,
  },

  // Buttons row — side by side
  buttonRow: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },

  // "Back" — outlined/ghost style
  btnBack: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#3A3A3C",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  btnBackText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#EBEBF5",
  },

  // "Unlock" — filled amber/orange (matches app accent)
  btnUnlock: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFBF80",
  },
  btnUnlockText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
});
