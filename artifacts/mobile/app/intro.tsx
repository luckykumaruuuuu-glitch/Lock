/**
 * intro.tsx — 4-slide feature intro shown after Google Sign-In, before /setup.
 *
 * Slides:
 *   1. Take Back Control    — duck-screen1.mp4
 *   2. Unbreakable Locks    — duck-screen2.mp4
 *   3. Server-Verified Time — duck-screen3.mp4
 *   4. True Enforcement     — duck-screen4.mp4
 *
 * Navigation:
 *   "Next →"        → next slide
 *   "Get Started ✓" (slide 4) → marks INTRO_DONE_KEY → /setup
 *   "Skip intro"    → marks INTRO_DONE_KEY → /setup (any slide)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── AsyncStorage key ────────────────────────────────────────────────────────
export const INTRO_DONE_KEY = "focuslock_intro_done";

// ─── Video sources ───────────────────────────────────────────────────────────
const VIDEO_1 = require("../assets/images/duck-screen1.mp4");
const VIDEO_2 = require("../assets/images/duck-screen2.mp4");
const VIDEO_3 = require("../assets/images/duck-screen3.mp4");
const VIDEO_4 = require("../assets/images/duck-screen4.mp4");

// ─── Slide data ───────────────────────────────────────────────────────────────
type SlideData = {
  heading: string;
  body: string;
  btnColor: string;
  dotColor: string;
  btnLabel: string;
  isFinal: boolean;
};

const SLIDES: SlideData[] = [
  {
    heading: "Take Back Control",
    body: "DuckPal lets you lock distracting apps for a set period — with absolutely no way to bypass it early. Your commitment, enforced.",
    btnColor: "#F5A44A",
    dotColor: "#F5A44A",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "Unbreakable Locks",
    body: "Once set, a lock is permanent until the timer expires. No PIN override, no settings bypass — only the clock unlocks you.",
    btnColor: "#E8621A",
    dotColor: "#E8621A",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "Server-Verified Time",
    body: "DuckPal uses server time, not your device clock. Changing the date or time on your phone won't unlock a single app.",
    btnColor: "#22C55E",
    dotColor: "#22C55E",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "True Enforcement",
    body: "Device Administrator prevents uninstalling DuckPal while active. The Accessibility Service blocks apps in real-time.",
    btnColor: "#F5A44A",
    dotColor: "#F5A44A",
    btnLabel: "Get Started ✓",
    isFinal: true,
  },
];

const { width } = Dimensions.get("window");
// Badge / video container size — matches the original rounded-square icon badge
const BADGE_SIZE = 120;
const BADGE_RADIUS = 28;

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  // Fade animation on slide transition
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Button press scale
  const btnScale = useRef(new Animated.Value(1)).current;

  // ── Video players (all 4 initialized unconditionally — rules of hooks) ──────
  const player1 = useVideoPlayer(VIDEO_1, (p) => { p.loop = true; p.muted = true; });
  const player2 = useVideoPlayer(VIDEO_2, (p) => { p.loop = true; p.muted = true; });
  const player3 = useVideoPlayer(VIDEO_3, (p) => { p.loop = true; p.muted = true; });
  const player4 = useVideoPlayer(VIDEO_4, (p) => { p.loop = true; p.muted = true; });

  const players = [player1, player2, player3, player4];

  // Play only the active slide's video; pause all others
  useEffect(() => {
    players.forEach((p, i) => {
      try {
        if (i === index) {
          p.play();
        } else {
          p.pause();
        }
      } catch { /* safe on web */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  async function finish() {
    await AsyncStorage.setItem(INTRO_DONE_KEY, "true");
    router.replace("/setup");
  }

  function transition(toIndex: number) {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setIndex(toIndex);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function onNext() {
    if (slide.isFinal) {
      finish();
    } else {
      transition(index + 1);
    }
  }

  function onBtnPressIn() {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }
  function onBtnPressOut() {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start();
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── Top skip link ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finish} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.skipLink}>Skip intro</Text>
        </TouchableOpacity>
      </View>

      {/* ── Animated slide content ────────────────────────────────────── */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

        {/* Video badges — all rendered, only the active one visible */}
        <View style={styles.badgeContainer}>
          {players.map((player, i) => (
            <View
              key={i}
              style={[
                styles.badge,
                { opacity: i === index ? 1 : 0, position: i === 0 ? "relative" : "absolute" },
              ]}
              pointerEvents={i === index ? "auto" : "none"}
            >
              <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls={false}
              />
            </View>
          ))}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.heading}>{slide.heading}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index
                  ? { backgroundColor: slide.dotColor, width: 28, borderRadius: 5 }
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Bottom actions ────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <Pressable onPress={onNext} onPressIn={onBtnPressIn} onPressOut={onBtnPressOut}>
          <Animated.View
            style={[
              styles.btn,
              { backgroundColor: slide.btnColor, transform: [{ scale: btnScale }] },
            ]}
          >
            <Text style={styles.btnText}>{slide.btnLabel}</Text>
          </Animated.View>
        </Pressable>

        {/* Bottom skip link — hidden on final slide */}
        {!slide.isFinal ? (
          <TouchableOpacity onPress={finish} activeOpacity={0.6} style={styles.skipBottomWrap}>
            <Text style={styles.skipBottomLink}>Skip intro</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBottomWrap} />
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 24,
  },

  // ── Top bar ──
  topBar: {
    alignItems: "flex-end",
    paddingVertical: 12,
  },
  skipLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8E8E93",
    textDecorationLine: "underline",
  },

  // ── Content (fades on transition) ──
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },

  // ── Video badge container ──
  badgeContainer: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_RADIUS,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  video: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },

  // ── Info card ──
  card: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  heading: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 24,
  },

  // ── Progress dots ──
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#3A3A3C",
  },

  // ── Bottom actions ──
  bottom: {
    paddingBottom: 8,
  },
  btn: {
    width: width - 48,
    height: 62,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    letterSpacing: 0.2,
  },
  skipBottomWrap: {
    alignItems: "center",
    paddingVertical: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  skipBottomLink: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#636366",
    textDecorationLine: "underline",
  },
});
