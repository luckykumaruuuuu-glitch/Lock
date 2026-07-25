/**
 * walk.tsx — "Walk" challenge screen: draw a perfect circle to unlock.
 *
 * How it works:
 *   • Full-screen black canvas
 *   • Pencil emoji follows the finger; white stroke is drawn in real-time
 *   • On finger lift the shape is scored against a perfect circle (0–100%)
 *   • Score ≥ CIRCLE_SUCCESS_THRESHOLD → success (green badge, haptic, navigate)
 *   • Score <  CIRCLE_SUCCESS_THRESHOLD → fail (blue badge, "Try Again", reset)
 *
 * Drawing : react-native-svg Svg+Path (works on web and native)
 * Gesture : PanResponder (built-in React Native, works on web and native)
 * Animation: Animated API — spring bounce for the score badge
 *
 * To change the pass mark, edit CIRCLE_SUCCESS_THRESHOLD below.
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { getUnlockDestination } from "@/lib/unlockFlowState";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path as SvgPath } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Threshold — change freely ────────────────────────────────────────────────
const CIRCLE_SUCCESS_THRESHOLD = 75;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Circle perfection scoring ────────────────────────────────────────────────
/**
 * Returns a 0–100 score for how "circular" the drawn path is.
 *
 * Algorithm:
 *   1. Compute center of mass of all sampled points.
 *   2. Compute average radius from that center.
 *   3. Roundness  = 1 − (stddev of radii / avgRadius)  [low deviation = rounder]
 *   4. Closedness = 1 − (dist(start,end) / avgRadius)  [start ≈ end = closed]
 *   5. score = (roundness × 0.7 + closedness × 0.3) × 100
 */
function scoreCircle(points: Array<{ x: number; y: number }>): number {
  if (points.length < 20) return 0;

  // 1. Center of mass
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  // 2. Per-point radius and average
  const radii = points.map((p) =>
    Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)
  );
  const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
  if (avgR < 10) return 0; // scribble too tiny

  // 3. Roundness — punish radius variance
  const variance =
    radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length;
  const stddev = Math.sqrt(variance);
  const roundness = Math.max(0, 1 - stddev / avgR);

  // 4. Closedness — start and end should meet
  const start = points[0];
  const end = points[points.length - 1];
  const closeDist = Math.sqrt(
    (start.x - end.x) ** 2 + (start.y - end.y) ** 2
  );
  const closeness = Math.max(0, 1 - closeDist / avgR);

  // 5. Weighted combination
  const raw = roundness * 0.7 + closeness * 0.3;
  return Math.min(100, Math.max(0, Math.round(raw * 100)));
}

// ─── Build SVG path string from point array ───────────────────────────────────
function buildSvgD(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  let d = `M ${first.x} ${first.y}`;
  for (const p of rest) d += ` L ${p.x} ${p.y}`;
  return d;
}

// ─── Floating score badge ─────────────────────────────────────────────────────
interface BadgeProps {
  score: number;
  success: boolean;
  onDone: () => void;
}

function ScoreBadge({ score, success, onDone }: BadgeProps) {
  // Stable random entry side — chosen once on mount
  const [fromLeft] = useState(() => Math.random() < 0.5);

  const slideAnim = useRef(
    new Animated.Value(fromLeft ? -SCREEN_W * 0.65 : SCREEN_W * 0.65)
  ).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Keep latest onDone in a ref so the animation closure never stales
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // ── Enter: slide in + spring scale + fade in ──────────────────
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120,
        friction: 7, // slight overshoot → rubbery bounce
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 160,
        friction: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // ── Hold 1.5–2 s, then exit ───────────────────────────────
      const holdMs = 1500 + Math.random() * 500;
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: fromLeft ? -SCREEN_W * 0.55 : SCREEN_W * 0.55,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.7,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onDoneRef.current());
      }, holdMs);
    });
  }, []); // run once on mount

  const color = success ? "#4ADE80" : "#60A5FA"; // green : blue

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          borderColor: color,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Text style={[styles.badgePercent, { color }]}>{score}%</Text>
      <Text style={[styles.badgeSub, { color }]}>
        {success ? "Perfect!" : "Try Again"}
      </Text>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WalkScreen() {
  const insets = useSafeAreaInsets();

  // Drawn points → SVG path
  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [svgD, setSvgD] = useState("");

  // Pencil emoji position (null = finger not down)
  const [pencilPos, setPencilPos] = useState<{ x: number; y: number } | null>(
    null
  );

  // Score badge state
  const [badge, setBadge] = useState<{
    score: number;
    success: boolean;
  } | null>(null);

  // Guards: block new strokes while badge is showing
  const showingBadge = useRef(false);
  const successRef = useRef(false);

  // ── Result handler ─────────────────────────────────────────────────────────
  const handleResult = useCallback((score: number) => {
    const success = score >= CIRCLE_SUCCESS_THRESHOLD;
    successRef.current = success;
    showingBadge.current = true;
    setBadge({ score, success });

    if (success) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  // Called when badge finishes its exit animation
  const handleBadgeDone = useCallback(() => {
    showingBadge.current = false;
    setBadge(null);

    if (successRef.current) {
      router.replace(getUnlockDestination());
    } else {
      // Fail — reset for retry
      pointsRef.current = [];
      setSvgD("");
    }
  }, []);

  // ── PanResponder ───────────────────────────────────────────────────────────
  // Works identically on web and native; no native module required.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !showingBadge.current,
      onMoveShouldSetPanResponder: () => !showingBadge.current,

      onPanResponderGrant: (evt) => {
        if (showingBadge.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        pointsRef.current = [{ x, y }];
        setSvgD(`M ${x} ${y}`);
        setPencilPos({ x, y });
      },

      onPanResponderMove: (evt) => {
        if (showingBadge.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        pointsRef.current.push({ x, y });
        setSvgD(buildSvgD(pointsRef.current));
        setPencilPos({ x, y });
      },

      onPanResponderRelease: () => {
        setPencilPos(null);
        if (showingBadge.current) return;

        const pts = pointsRef.current;
        if (pts.length < 20) {
          // Too short — reset quietly
          pointsRef.current = [];
          setSvgD("");
          return;
        }
        handleResult(scoreCircle(pts));
      },

      onPanResponderTerminate: () => {
        setPencilPos(null);
      },
    })
  ).current;

  // ── Back navigation ────────────────────────────────────────────────────────
  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/unlock-tasks");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Drawing surface — captures all touch via PanResponder */}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <Svg
          style={StyleSheet.absoluteFill}
          width={SCREEN_W}
          height={SCREEN_H}
        >
          {svgD !== "" && (
            <SvgPath
              d={svgD}
              stroke="white"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
      </View>

      {/* Back button — rendered above the drawing surface */}
      <View
        style={[styles.topBar, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Hint — only shown before the user starts drawing */}
      {svgD === "" && !badge && (
        <View style={styles.hintContainer} pointerEvents="none">
          <Text style={styles.hintTitle}>Draw a circle</Text>
          <Text style={styles.hintSub}>Lift your finger when done</Text>
        </View>
      )}

      {/* Pencil emoji — follows the finger */}
      {pencilPos && (
        <View
          pointerEvents="none"
          style={[
            styles.pencil,
            { left: pencilPos.x - 14, top: pencilPos.y - 38 },
          ]}
        >
          <Text style={styles.pencilEmoji}>✏️</Text>
        </View>
      )}

      {/* Score badge */}
      {badge && (
        <View style={styles.badgeContainer} pointerEvents="none">
          <ScoreBadge
            score={badge.score}
            success={badge.success}
            onDone={handleBadgeDone}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    padding: 4,
  },

  // ── Hint ─────────────────────────────────────────────────────────────────
  hintContainer: {
    position: "absolute",
    bottom: SCREEN_H * 0.15,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  } as any,
  hintTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
  hintSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.30)",
    marginTop: 6,
    textAlign: "center",
  },

  // ── Pencil emoji ──────────────────────────────────────────────────────────
  pencil: {
    position: "absolute",
  },
  pencilEmoji: {
    fontSize: 26,
  },

  // ── Score badge ───────────────────────────────────────────────────────────
  badgeContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 2,
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  badgePercent: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    lineHeight: 72,
    letterSpacing: -2,
  },
  badgeSub: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
