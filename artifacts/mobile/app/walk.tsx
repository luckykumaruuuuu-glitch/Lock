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
const CIRCLE_SUCCESS_THRESHOLD = 95;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Circle perfection scoring ────────────────────────────────────────────────
/**
 * Returns a 0–100 score for how "circular" the drawn path is.
 *
 * Three independent checks — all must pass for a high score:
 *   1. Roundness   — mean absolute deviation of radii from avgRadius (60%)
 *   2. Closedness  — distance between start and end points            (20%)
 *   3. Coverage    — largest angular gap in the path must be small    (20%)
 *
 * The coverage check is what rejects triangles, squares, and rectangles:
 * those shapes leave large angular gaps between their corners, even when
 * the start/end points happen to be close.
 */
function scoreCircle(points: Array<{ x: number; y: number }>): number {
  if (!points || points.length < 20) return 0;

  // 1. Center of mass
  let sumX = 0, sumY = 0;
  for (const p of points) { sumX += p.x; sumY += p.y; }
  const center = { x: sumX / points.length, y: sumY / points.length };

  // 2. Distance of every point from center
  const distances = points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return Math.sqrt(dx * dx + dy * dy);
  });

  const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgRadius < 20) return 0; // circle too tiny

  // 3. Roundness — penalise mean absolute deviation from avgRadius
  let totalDeviation = 0;
  for (const d of distances) totalDeviation += Math.abs(d - avgRadius);
  const avgDeviation = totalDeviation / distances.length;
  const roundnessScore = Math.max(0, 100 - (avgDeviation / avgRadius) * 160);

  // 4. Closing score — start and end must be near each other
  const start = points[0];
  const end = points[points.length - 1];
  const closingDist = Math.sqrt(
    Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2)
  );
  const closingScore = Math.max(0, 100 - (closingDist / avgRadius) * 90);

  // 5. Angle coverage — path must span a full 360°, not leave big gaps
  //    (this is what rejects triangles, squares, rectangles, etc.)
  const angles = points.map((p) =>
    Math.atan2(p.y - center.y, p.x - center.x)
  );
  angles.sort((a, b) => a - b);

  let maxGap = 0;
  for (let i = 1; i < angles.length; i++) {
    maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
  }
  // wrap-around gap between last and first angle
  maxGap = Math.max(maxGap, angles[0] + Math.PI * 2 - angles[angles.length - 1]);
  const coverageScore = Math.max(0, 100 - maxGap * 45);

  // Final weighted score
  const finalScore =
    roundnessScore * 0.60 +
    closingScore   * 0.20 +
    coverageScore  * 0.20;

  return Math.round(Math.min(100, Math.max(0, finalScore)));
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
          shadowColor: color,
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

      {/* Apple Pencil cursor — small, ~30° clockwise tilt matching reference */}
      {pencilPos && (
        <View
          pointerEvents="none"
          style={[
            styles.pencil,
            {
              // Tip of 8×63 SVG rotated 30° CW lands at (20, 59) in view space
              left: pencilPos.x - 20,
              top: pencilPos.y - 59,
              transform: [{ rotate: "30deg" }],
            },
          ]}
        >
          {/* 8×63 dp ≈ 1 cm tall at standard mobile DPI (160 dp/in ÷ 2.54) */}
          <Svg width={8} height={63} viewBox="0 0 8 63">
            {/* Eraser cap */}
            <SvgPath
              d="M 1 0 Q 4 0 7 0 Q 8 0 8 2 L 8 6 L 0 6 L 0 2 Q 0 0 1 0 Z"
              fill="#D8D8D8"
            />
            {/* Cap band */}
            <SvgPath d="M 0 6 L 8 6 L 8 9 L 0 9 Z" fill="#B0B0B0" />
            {/* White body */}
            <SvgPath d="M 0 9 L 8 9 L 8 53 L 0 53 Z" fill="#FFFFFF" />
            {/* Taper */}
            <SvgPath d="M 0 53 L 8 53 L 5.5 59 L 2.5 59 Z" fill="#E0E0E0" />
            {/* Metal tip */}
            <SvgPath d="M 2.5 59 L 5.5 59 L 4 63 Z" fill="#A8A8A8" />
          </Svg>
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

  // ── Apple Pencil cursor ───────────────────────────────────────────────────
  pencil: {
    position: "absolute",
  },

  // ── Score badge ───────────────────────────────────────────────────────────
  badgeContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(6, 8, 18, 0.97)",
    borderWidth: 2.5,
    borderRadius: 22,
    paddingHorizontal: 36,
    paddingVertical: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 18,
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
