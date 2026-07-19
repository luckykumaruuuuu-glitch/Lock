/**
 * walk.tsx — "Walk" (Shout!) challenge screen for DuckLock unlock tasks.
 *
 * Uses expo-av audio metering to show a real-time vertical loudness bar
 * with a ruler-style scale (0 → 100 in steps of 10).
 *
 * Works in Expo Go on Android/iOS — no custom native modules needed.
 * Web shows a graceful fallback.
 *
 * To change difficulty, edit TARGET_DB below.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

// ─── Target loudness — configurable ──────────────────────────────────────────
// Scale is 0-100 (normalized from dBFS). 96 = near-impossible scream (~-2.4 dBFS).
const TARGET_DB = 96;

// Ruler scale markings shown alongside the bar
const SCALE_MARKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

// expo-av metering is in dBFS (−160..0). Map the useful range to 0-100.
// Values below DBFS_FLOOR are treated as silence (0).
const DBFS_FLOOR = -60;

function dbfsToDisplay(dbfs: number): number {
  if (dbfs == null || isNaN(dbfs)) return 0;
  return Math.max(
    0,
    Math.min(100, ((dbfs - DBFS_FLOOR) / Math.abs(DBFS_FLOOR)) * 100)
  );
}

// ─── Web fallback ─────────────────────────────────────────────────────────────
function WebFallback() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={26} color="#FFFFFF" />
      </Pressable>
      <View style={styles.fallbackCenter}>
        <Text style={styles.fallbackIcon}>🎤</Text>
        <Text style={styles.fallbackTitle}>Mobile Only</Text>
        <Text style={styles.fallbackBody}>
          The Shout challenge uses your microphone{"\n"}
          and works in Expo Go (Android / iOS){"\n"}— not available in web preview.
        </Text>
      </View>
    </View>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function WalkScreen() {
  if (Platform.OS === "web") return <WebFallback />;
  return <WalkMeter />;
}

// ─── Loudness meter ───────────────────────────────────────────────────────────
function WalkMeter() {
  const insets = useSafeAreaInsets();

  // Permission / init state
  const [permStatus, setPermStatus] = useState<"checking" | "granted" | "denied">("checking");

  // Live level (0-100) for text readout
  const [displayLevel, setDisplayLevel] = useState(0);

  // Animated level drives bar height + color
  const animLevel = useRef(new Animated.Value(0)).current;

  // Bar container height — measured on layout so bar fills correctly
  const [meterHeight, setMeterHeight] = useState(0);

  // Recording ref (cleaned up on unmount)
  const recordingRef = useRef<Audio.Recording | null>(null);
  const completedRef = useRef(false);

  // Completion animation refs
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const levelScale   = useRef(new Animated.Value(1)).current;

  // ── Completion effect ──────────────────────────────────────────────────────
  const triggerCompletion = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Stop recording
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});

    // Haptic burst — three heavy impacts in rapid succession
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 110);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220);

    // Level badge scale-punch
    Animated.sequence([
      Animated.spring(levelScale, { toValue: 1.6, useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(levelScale, { toValue: 1,   useNativeDriver: true, speed: 16, bounciness: 8  }),
    ]).start();

    // White flash
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.72, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,    duration: 480, useNativeDriver: true }),
    ]).start();

    // Navigate
    setTimeout(() => router.replace("/coming-soon"), 620);
  }, [flashOpacity, levelScale]);

  // ── Smooth bar update ──────────────────────────────────────────────────────
  const updateLevel = useCallback(
    (level: number) => {
      setDisplayLevel(Math.round(level));
      Animated.timing(animLevel, {
        toValue: level,
        duration: 60,
        useNativeDriver: false, // animating height — cannot use native driver
      }).start();

      if (level >= TARGET_DB && !completedRef.current) {
        triggerCompletion();
      }
    },
    [animLevel, triggerCompletion]
  );

  // ── Microphone permission + recording lifecycle ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function start() {
      const { status } = await Audio.requestPermissionsAsync();
      if (cancelled) return;

      if (status !== "granted") {
        setPermStatus("denied");
        return;
      }
      setPermStatus("granted");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        },
        (status) => {
          if (cancelled) return;
          if (status.isRecording && status.metering != null) {
            updateLevel(dbfsToDisplay(status.metering));
          }
        },
        50 // callback interval ms
      );

      if (cancelled) {
        recording.stopAndUnloadAsync().catch(() => {});
        return;
      }
      recordingRef.current = recording;
    }

    start().catch(() => setPermStatus("denied"));

    return () => {
      cancelled = true;
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    };
  }, [updateLevel]);

  // ── Animated bar height (grows upward from bottom of track) ───────────────
  const barHeight = animLevel.interpolate({
    inputRange: [0, 100],
    outputRange: [0, meterHeight],
    extrapolate: "clamp",
  });

  // ── Animated bar color: green → orange → red as level rises ───────────────
  const barColor = animLevel.interpolate({
    inputRange: [0, 50, 80, 100],
    outputRange: ["#30D158", "#34C759", "#FF9500", "#FF3B30"],
    extrapolate: "clamp",
  });

  // ── Permission denied ──────────────────────────────────────────────────────
  if (permStatus === "denied") {
    return (
      <View style={[styles.root, styles.centerContent, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>
        <Feather name="mic-off" size={48} color="#8A8A8E" style={{ marginBottom: 16 }} />
        <Text style={styles.permTitle}>Microphone Access Needed</Text>
        <Text style={styles.permBody}>
          The Shout challenge requires your microphone{"\n"}to measure loudness.{"\n\n"}
          Enable it in{"\n"}Settings → Apps → DuckLock → Permissions.
        </Text>
      </View>
    );
  }

  // ── Loading (permission dialog showing) ───────────────────────────────────
  if (permStatus === "checking") {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <Text style={styles.hintText}>Requesting microphone…</Text>
      </View>
    );
  }

  // ── Main meter UI ──────────────────────────────────────────────────────────
  // Target line Y position from top of bar track
  const targetLineTop = meterHeight > 0
    ? (1 - TARGET_DB / 100) * meterHeight
    : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Feather name="chevron-left" size={26} color="#FFFFFF" />
      </Pressable>

      {/* Title */}
      <Text style={styles.title}>Shout!</Text>
      <Text style={styles.hint}>
        Reach <Text style={styles.hintTarget}>{TARGET_DB}</Text> to unlock
      </Text>

      {/* World-record context */}
      <Text style={styles.worldRecord}>
        🏆 Guinness World Record — Loudest Human Scream: 129 dB (by Jill Drake)
      </Text>

      {/* ── Meter row: scale | bar ─────────────────────────────────────────── */}
      <View style={styles.meterRow}>

        {/* Left: ruler scale */}
        <View style={styles.scaleColumn}>
          {meterHeight > 0 && SCALE_MARKS.slice().reverse().map((mark) => {
            const topFraction = (100 - mark) / 100;
            const top = topFraction * meterHeight - 9; // -9 centers the 18px text
            const isTarget = mark === TARGET_DB;
            return (
              <View
                key={mark}
                style={[styles.scaleMarkRow, { top }]}
              >
                <Text style={[styles.scaleLabel, isTarget && styles.scaleLabelTarget]}>
                  {mark}
                </Text>
                <View style={[styles.scaleTick, isTarget && styles.scaleTickTarget]} />
              </View>
            );
          })}
        </View>

        {/* Right: bar track */}
        <View
          style={styles.barTrack}
          onLayout={(e) => setMeterHeight(e.nativeEvent.layout.height)}
        >
          {/* Target dashed line */}
          {meterHeight > 0 && (
            <View style={[styles.targetLine, { top: targetLineTop - 1 }]} />
          )}

          {/* Animated fill — grows upward from bottom */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.barFill,
              {
                top: undefined,
                bottom: 0,
                height: barHeight,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Current level badge */}
      <Animated.View style={[styles.levelBadge, { transform: [{ scale: levelScale }] }]}>
        <Text style={styles.levelNumber}>{displayLevel}</Text>
        <Text style={styles.levelUnit}>/ 100</Text>
      </Animated.View>

      {/* White flash overlay (completion effect) */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashOpacity }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  // ── Back button ──
  backBtn: {
    position: "absolute",
    top: 56,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Web fallback ──
  fallbackCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  fallbackIcon: {
    fontSize: 64,
  },
  fallbackTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  fallbackBody: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Permission denied ──
  permTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  permBody: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Header ──
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 56,    // space below back button row
    marginBottom: 4,
  },
  hint: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
    marginBottom: 20,
  },
  hintTarget: {
    color: "#FF3B30",
    fontFamily: "Inter_700Bold",
  },
  hintText: {
    fontSize: 15,
    color: "#8A8A8E",
    textAlign: "center",
  },
  worldRecord: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,215,0,0.55)", // muted gold — subtle, matches dark theme
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    lineHeight: 17,
  },

  // ── Meter row ──
  meterRow: {
    flex: 1,
    flexDirection: "row",
    marginHorizontal: 32,
    marginBottom: 16,
  },

  // ── Scale column (ruler on the left) ──
  scaleColumn: {
    width: 44,
    position: "relative",
  },
  scaleMarkRow: {
    position: "absolute",
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scaleLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.45)",
    textAlign: "right",
    width: 28,
  },
  scaleLabelTarget: {
    color: "#FF3B30",
  },
  scaleTick: {
    width: 6,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  scaleTickTarget: {
    width: 8,
    backgroundColor: "#FF3B30",
  },

  // ── Bar track ──
  barTrack: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    overflow: "hidden",
    marginLeft: 8,
    position: "relative",
  },
  barFill: {
    borderRadius: 8,
  },

  // ── Target line across the bar ──
  targetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FF3B30",
    opacity: 0.9,
    zIndex: 2,
    // Dashed effect via shadow
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Level badge ──
  levelBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginBottom: 32,
  },
  levelNumber: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#FFAD60",
  },
  levelUnit: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.5)",
  },

  // ── Flash overlay ──
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    zIndex: 99,
  },
});
