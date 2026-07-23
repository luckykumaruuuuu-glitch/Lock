/**
 * intro.tsx — 4-slide feature intro shown after Google Sign-In, before /setup.
 *
 * Layout matches reference screenshots exactly:
 *   - Large duck video centered on black bg (no box/container)
 *   - Dark rounded card below duck
 *   - Progress dots below card
 *   - Full-width CTA button pinned to bottom
 *   - "Skip intro" link below button (non-final slides only)
 *   - NO top-right skip link
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
    btnColor: "#FFBF80",
    dotColor: "#FFBF80",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "Unbreakable Locks",
    body: "Once set, a lock is permanent until the timer expires. No PIN override, no settings bypass — only the clock unlocks you.",
    btnColor: "#FFBF80",
    dotColor: "#FFBF80",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "Server-Verified Time",
    body: "FocusLock uses Firebase server time, not your device clock. Changing the date or time on your phone won't unlock a single app.",
    btnColor: "#FFBF80",
    dotColor: "#FFBF80",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    heading: "True Enforcement",
    body: "Device Administrator prevents uninstalling FocusLock while active. The Accessibility Service blocks apps in real-time.",
    btnColor: "#FFBF80",
    dotColor: "#FFBF80",
    btnLabel: "Get Started ✓",
    isFinal: true,
  },
];

// ─── Dimensions ──────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");

// Duck size: ~46% of screen width on mobile, capped at 200px so web preview
// (which reports full 1280px width) doesn't blow the layout.
// On a typical Android 360-393px phone: 166-181px — matches reference screenshots.
const DUCK_SIZE = Math.round(Math.min(SCREEN_W * 0.46, 200));

// Duck container height is taller than width to ensure the full character
// (head and feet) is never cropped regardless of video AR.
const DUCK_HEIGHT = Math.round(DUCK_SIZE * 1.42);

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  // Fade animation on slide transition
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Button press scale
  const btnScale = useRef(new Animated.Value(1)).current;

  // ── All 4 video players initialized unconditionally (Rules of Hooks) ────────
  const player1 = useVideoPlayer(VIDEO_1, (p) => { p.loop = true; p.muted = true; });
  const player2 = useVideoPlayer(VIDEO_2, (p) => { p.loop = true; p.muted = true; });
  const player3 = useVideoPlayer(VIDEO_3, (p) => { p.loop = true; p.muted = true; });
  const player4 = useVideoPlayer(VIDEO_4, (p) => { p.loop = true; p.muted = true; });

  const players = [player1, player2, player3, player4];

  // Play only the active slide's video; pause all others
  useEffect(() => {
    players.forEach((p, i) => {
      try {
        if (i === index) p.play();
        else p.pause();
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
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setIndex(toIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }

  function onNext() {
    if (slide.isFinal) finish();
    else transition(index + 1);
  }

  function onBtnPressIn() {
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }
  function onBtnPressOut() {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      {/* ── Animated content (upper flex area) ───────────────────────────── */}
      <Animated.View style={[styles.upper, { opacity: fadeAnim }]}>

        {/* Top spacer — absorbs ~60% of free space, pushing duck down from top */}
        <View style={styles.spacerTop} />

        {/* Duck video — large, NO box/container, floats on black background.
            Only the active slide's VideoView is mounted at a time.
            key={index} forces a full unmount+remount on slide change so the
            old native video layer is fully destroyed before the new one
            appears. The index swap happens at opacity=0 (mid-fade) so there
            is never a visible flash or overlap between videos. */}
        <View style={styles.duckWrap}>
          <VideoView
            key={index}
            player={players[index]}
            style={styles.duckVideo}
            contentFit="contain"
            nativeControls={false}
          />
        </View>

        {/* Gap: duck → card */}
        <View style={styles.duckCardGap} />

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.heading}>{slide.heading}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>

        {/* Gap: card → dots */}
        <View style={styles.cardDotsGap} />

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => transition(i)}
              hitSlop={12}
            >
              <View
                style={[
                  styles.dot,
                  i === index
                    ? { backgroundColor: slide.dotColor, width: 24, borderRadius: 4 }
                    : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Bottom spacer — absorbs ~40% of free space, setting dots→button gap */}
        <View style={styles.spacerBottom} />
      </Animated.View>

      {/* ── Bottom actions (pinned to bottom) ────────────────────────────── */}
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

        {/* Skip link — shown only on non-final slides */}
        {!slide.isFinal ? (
          <TouchableOpacity
            onPress={finish}
            activeOpacity={0.6}
            style={styles.skipWrap}
          >
            <Text style={styles.skipText}>Skip intro</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipWrap} />
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
    paddingHorizontal: 16,
  },

  // ── Upper section — flex spacers distribute space above/below the group ─────
  upper: {
    flex: 1,
    alignItems: "center",
  },
  // Top spacer takes ~60% of free space (heavier), placing duck at ~15% from top
  spacerTop: {
    flex: 1.5,
    width: "100%",
  },
  // Bottom spacer takes ~40% of free space, setting the dots→button gap
  spacerBottom: {
    flex: 1,
    width: "100%",
  },
  // Fixed gap between duck and card (~20px matches reference)
  duckCardGap: {
    height: 20,
  },
  // Fixed gap between card and dots (~14px matches reference)
  cardDotsGap: {
    height: 14,
  },

  // ── Duck video — tall container prevents head/feet from being cropped ───────
  duckWrap: {
    width: DUCK_SIZE,
    height: DUCK_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  duckVideo: {
    width: DUCK_SIZE,
    height: DUCK_HEIGHT,
  },

  // ── Info card ──────────────────────────────────────────────────────────────
  card: {
    width: "100%",
    marginHorizontal: 20,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  heading: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  body: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 22,
  },

  // ── Progress dots ──────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#3A3A3C",
  },

  // ── Bottom actions ─────────────────────────────────────────────────────────
  bottom: {
    // pinned below the upper flex area
  },
  btn: {
    width: "100%",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    letterSpacing: 0.2,
  },
  skipWrap: {
    alignItems: "center",
    paddingVertical: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#636366",
    textDecorationLine: "underline",
  },
});
