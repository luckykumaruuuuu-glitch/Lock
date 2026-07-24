/**
 * StreakCarousel
 *
 * Architecture:
 * - All 9 virtual pages (7 real + 2 clones for infinite looping) are always
 *   mounted and never remounted during swipe.
 * - A single Animated.View "track" slides horizontally via a shared value on the
 *   UI thread — no React state updates happen during drag.
 * - The dot indicator is a sibling of the track, absolutely positioned at the
 *   bottom of the card. It never enters the track, so it never slides with pages.
 * - React state (`activePage`) is updated exactly once per snap, via runOnJS,
 *   after the spring animation finishes.
 * - Gesture.Pan uses activeOffsetX + failOffsetY so vertical parent ScrollView
 *   scrolling is never stolen.
 */

import React, { memo, useCallback, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// ─── Page data ────────────────────────────────────────────────────────────────
const PAGES = [
  { emoji: "🏆", title: "Keep it up!",      sub: "Lock apps every\nday to build streak" },
  { emoji: "🌱", title: "Day 1 done!",       sub: "Your streak begins.\nCome back tomorrow!" },
  { emoji: "🔥", title: "3-day streak!",     sub: "You're on fire!\nKeep the habit going" },
  { emoji: "💪", title: "Halfway there!",    sub: "4 of 7 days locked.\nYou're crushing it!" },
  { emoji: "⭐", title: "5 days strong!",    sub: "Almost a full week.\n2 more days to go!" },
  { emoji: "🎯", title: "One more day!",     sub: "Complete tomorrow\nto earn your badge" },
  { emoji: "👑", title: "Full week!",        sub: "7 days complete!\nYou've earned it" },
] as const;

const PAGE_COUNT = PAGES.length; // 7

// Virtual layout for seamless infinite looping:
// [clone_last, p0, p1, p2, p3, p4, p5, p6, clone_first]
//  vIdx=0       1   2   3   4   5   6   7   vIdx=8
const VIRTUAL_TOTAL = PAGE_COUNT + 2; // 9
const V_FIRST_REAL  = 1;              // virtual index of real page 0
const V_LAST_REAL   = PAGE_COUNT;     // virtual index of real page 6

const VIRTUAL_PAGES = [PAGES[PAGE_COUNT - 1], ...PAGES, PAGES[0]] as const;

const SPRING = {
  damping: 42,
  stiffness: 420,
  mass: 0.85,
  overshootClamping: true,
} as const;

const VELOCITY_THRESHOLD = 400; // px/s — above this, always flip one page

// ─── Individual page ──────────────────────────────────────────────────────────
// memo: never re-renders while the user is dragging.
const StreakPage = memo(function StreakPage({
  emoji,
  title,
  sub,
  width,
}: {
  emoji: string;
  title: string;
  sub: string;
  width: number;
}) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.pageLeft}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSub}>{sub}</Text>
      </View>
      <View style={styles.trophyBox}>
        <Text style={styles.trophyEmoji}>{emoji}</Text>
      </View>
    </View>
  );
});

// ─── Fixed dot indicator ──────────────────────────────────────────────────────
// Lives OUTSIDE the track so it is never transformed with the pages.
// memo: only re-renders when activePage changes (once per swipe, after snap).
const Indicator = memo(function Indicator({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={styles.indicator} pointerEvents="none">
      {Array.from({ length: PAGE_COUNT }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
});

// ─── StreakCarousel ───────────────────────────────────────────────────────────
export const StreakCarousel = memo(function StreakCarousel() {
  // React state: only the card width (set once on layout) and active page index
  // (set once per snap). Neither changes during drag.
  const [cardWidth, setCardWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);

  // UI-thread shared values — all animation state lives here, zero React renders during drag.
  const translateX       = useSharedValue(0);
  const widthSV          = useSharedValue(0);
  const dragStartX       = useSharedValue(0);
  const currentVirtualSV = useSharedValue(V_FIRST_REAL);

  // Called from worklet via runOnJS — updates the indicator dot only after snap.
  const commitPage = useCallback((realIdx: number) => {
    setActivePage(realIdx);
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setCardWidth(w);
      widthSV.value = w;
      // Position track so virtual page V_FIRST_REAL (= real page 0) is visible.
      translateX.value = -V_FIRST_REAL * w;
    },
    [widthSV, translateX]
  );

  // ── Pan gesture (runs entirely on UI thread) ──────────────────────────────
  const pan = Gesture.Pan()
    // Activate only for horizontal-first movement — lets the parent ScrollView
    // handle vertical scrolls without any gesture competition.
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((e) => {
      const w = widthSV.value;
      if (w === 0) return;

      // Pages follow the finger 1:1 — no rubber-banding.
      const proposed = dragStartX.value + e.translationX;

      // Hard clamp at virtual boundaries (prevents dragging past the clone pages).
      const minX = -(VIRTUAL_TOTAL - 1) * w;
      translateX.value = Math.max(minX, Math.min(0, proposed));
    })
    .onEnd((e) => {
      const w = widthSV.value;
      if (w === 0) return;

      const posInVirtual = -translateX.value / w; // current float position in virtual space
      const velocity     = e.velocityX;

      // Decide which virtual page to snap to (one page at a time).
      let targetVirtual: number;
      if (velocity < -VELOCITY_THRESHOLD) {
        // Fast flick forward → snap to next page
        targetVirtual = Math.floor(posInVirtual) + 1;
      } else if (velocity > VELOCITY_THRESHOLD) {
        // Fast flick backward → snap to previous page
        targetVirtual = Math.ceil(posInVirtual) - 1;
      } else {
        // Slow drag → snap to nearest
        targetVirtual = Math.round(posInVirtual);
      }

      // Guard: always within virtual range.
      targetVirtual = Math.max(0, Math.min(VIRTUAL_TOTAL - 1, targetVirtual));

      // Animate snap.
      translateX.value = withSpring(
        -targetVirtual * w,
        SPRING,
        (finished) => {
          if (!finished) return;

          // ── Infinite loop jump ────────────────────────────────────────────
          // After snapping to a clone page, silently jump to the matching real page.
          // This happens in one frame with no visible change (same pixels, different offset).
          let finalVirtual = targetVirtual;

          if (targetVirtual === 0) {
            // Clone of last page → teleport to real last page
            finalVirtual = V_LAST_REAL;
            translateX.value = -finalVirtual * w;
          } else if (targetVirtual === VIRTUAL_TOTAL - 1) {
            // Clone of first page → teleport to real first page
            finalVirtual = V_FIRST_REAL;
            translateX.value = -finalVirtual * w;
          }

          currentVirtualSV.value = finalVirtual;

          // Update indicator on JS thread — one setState call per swipe.
          const realPage = finalVirtual - V_FIRST_REAL; // 0..6
          runOnJS(commitPage)(realPage);
        }
      );
    });

  const animatedTrack = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container} onLayout={onLayout}>
      {cardWidth > 0 && (
        <>
          {/* Swipeable track — contains all virtual pages side-by-side.
              Clipped by the card's overflow:hidden. Never renders the indicator. */}
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.track, { width: VIRTUAL_TOTAL * cardWidth }, animatedTrack]}
            >
              {VIRTUAL_PAGES.map((page, vIdx) => (
                <StreakPage
                  key={vIdx}
                  emoji={page.emoji}
                  title={page.title}
                  sub={page.sub}
                  width={cardWidth}
                />
              ))}
            </Animated.View>
          </GestureDetector>

          {/* ONE indicator — outside the track, fixed to the card bottom.
              Never receives any transform — only its active dot changes. */}
          <Indicator activeIndex={activePage} />
        </>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // The animated track: all virtual pages laid out in a single row.
  // Width is set inline (VIRTUAL_TOTAL * cardWidth).
  track: {
    flexDirection: "row",
  },

  // Each page matches the card width exactly.
  // paddingBottom is taller to avoid content hiding under the indicator.
  page: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 30,
  },
  pageLeft: {
    flex: 1,
    gap: 5,
  },
  pageTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  pageSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 16,
  },
  trophyBox: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trophyEmoji: {
    fontSize: 42,
  },

  // Fixed indicator — absolutely positioned at the bottom of the card.
  // This View is a sibling of the track, not a child of it.
  indicator: {
    position: "absolute",
    bottom: 10,
    left: 14,
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3A3A3C",
  },
  dotActive: {
    backgroundColor: "#FFBF80",
  },
});
