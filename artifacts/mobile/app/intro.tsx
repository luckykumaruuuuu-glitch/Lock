/**
 * intro.tsx — 4-slide feature intro shown after Google Sign-In, before /setup.
 *
 * Slides:
 *   1. Take Back Control   — shield icon, orange badge
 *   2. Unbreakable Locks   — lock icon, orange-red badge
 *   3. Server-Verified Time — clock icon, green badge
 *   4. True Enforcement    — warning-triangle icon, orange badge
 *
 * Navigation:
 *   "Next →"      → next slide
 *   "Get Started ✓" (slide 4) → marks INTRO_DONE_KEY → /setup
 *   "Skip intro"  → marks INTRO_DONE_KEY → /setup (any slide)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
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

// ─── Slide data ──────────────────────────────────────────────────────────────
type SlideData = {
  badgeColor: string;
  badgeShadow: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  heading: string;
  body: string;
  btnColor: string;
  btnLabel: string;
  isFinal: boolean;
};

const SLIDES: SlideData[] = [
  {
    badgeColor: "#F5A44A",
    badgeShadow: "#E8902A",
    icon: "shield",
    heading: "Take Back Control",
    body: "DuckPal lets you lock distracting apps for a set period — with absolutely no way to bypass it early. Your commitment, enforced.",
    btnColor: "#F5A44A",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    badgeColor: "#E8621A",
    badgeShadow: "#C04A0A",
    icon: "lock",
    heading: "Unbreakable Locks",
    body: "Once set, a lock is permanent until the timer expires. No PIN override, no settings bypass — only the clock unlocks you.",
    btnColor: "#E8621A",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    badgeColor: "#22C55E",
    badgeShadow: "#16A34A",
    icon: "clock",
    heading: "Server-Verified Time",
    body: "DuckPal uses server time, not your device clock. Changing the date or time on your phone won't unlock a single app.",
    btnColor: "#22C55E",
    btnLabel: "Next →",
    isFinal: false,
  },
  {
    badgeColor: "#F5A44A",
    badgeShadow: "#E8902A",
    icon: "alert-triangle",
    heading: "True Enforcement",
    body: "Device Administrator prevents uninstalling DuckPal while active. The Accessibility Service blocks apps in real-time.",
    btnColor: "#F5A44A",
    btnLabel: "Get Started ✓",
    isFinal: true,
  },
];

const { width } = Dimensions.get("window");

// ─── Component ───────────────────────────────────────────────────────────────
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  // Fade animation on slide transition
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Button press scale
  const btnScale = useRef(new Animated.Value(1)).current;

  async function finish() {
    await AsyncStorage.setItem(INTRO_DONE_KEY, "true");
    router.replace("/setup");
  }

  function transition(toIndex: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
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
        {/* Icon badge */}
        <View style={[styles.badge, { backgroundColor: slide.badgeColor, shadowColor: slide.badgeShadow }]}>
          <Feather name={slide.icon} size={56} color="#1A1A1A" strokeWidth={1.8} />
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
                  ? { backgroundColor: slide.btnColor, width: 28, borderRadius: 5 }
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Bottom actions ────────────────────────────────────────────── */}
      <View style={styles.bottom}>
        <Pressable
          onPress={onNext}
          onPressIn={onBtnPressIn}
          onPressOut={onBtnPressOut}
        >
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

  // ── Icon badge ──
  badge: {
    width: 120,
    height: 120,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
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
    gap: 0,
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
