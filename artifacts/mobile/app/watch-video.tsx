/**
 * watch-video.tsx — "Forehead Scan" unlock challenge.
 *
 * Task: Watch a full video in LANDSCAPE mode for VIDEO_DURATION_SECONDS.
 *
 * Rules:
 *   • Video only plays in LANDSCAPE orientation (width > height).
 *   • If phone is PORTRAIT → video pauses, rotate-prompt overlay appears.
 *   • Resume automatically when phone goes landscape again.
 *   • After full duration: haptic burst + white flash → ReelsLock OFF → Instagram.
 *
 * Orientation detection: useWindowDimensions() — no extra package needed.
 * Animated placeholder: shifting multi-blob gradient (no real video file).
 *
 * To change target duration: edit VIDEO_DURATION_SECONDS below.
 */

import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
/** Change this to 120, 300, etc. to adjust the watch duration. */
const VIDEO_DURATION_SECONDS = 60;
// ─────────────────────────────────────────────────────────────────────────────

// How long controls auto-hide after a tap while playing (ms)
const CONTROLS_AUTOHIDE_MS = 2800;

// ── Animated background blob ───────────────────────────────────────────────
type BlobConfig = {
  startX: number;   // 0..1 relative to screen
  startY: number;
  radius: number;
  color: string;
  duration: number; // loop duration ms
  toX: number;
  toY: number;
};

const BLOBS: BlobConfig[] = [
  { startX: 0.1, startY: 0.15, toX: 0.55, toY: 0.7,  radius: 200, color: "#6D28D9", duration: 7200 },
  { startX: 0.7, startY: 0.1,  toX: 0.15, toY: 0.75, radius: 170, color: "#1D4ED8", duration: 9400 },
  { startX: 0.5, startY: 0.55, toX: 0.8,  toY: 0.1,  radius: 150, color: "#0F766E", duration: 8100 },
  { startX: 0.85,startY: 0.65, toX: 0.05, toY: 0.3,  radius: 130, color: "#B45309", duration: 6800 },
  { startX: 0.25,startY: 0.8,  toX: 0.7,  toY: 0.35, radius: 110, color: "#9D174D", duration: 10200 },
];

function AnimatedBlob({ cfg, screenW, screenH }: { cfg: BlobConfig; screenW: number; screenH: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: cfg.duration,      useNativeDriver: true, isInteraction: false }),
        Animated.timing(anim, { toValue: 0, duration: cfg.duration * 0.9, useNativeDriver: true, isInteraction: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [cfg.startX * screenW - cfg.radius, cfg.toX * screenW - cfg.radius],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [cfg.startY * screenH - cfg.radius, cfg.toY * screenH - cfg.radius],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: cfg.radius * 2,
        height: cfg.radius * 2,
        borderRadius: cfg.radius,
        backgroundColor: cfg.color,
        opacity: 0.28,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

// ── Animated placeholder "video" background ────────────────────────────────
function AnimatedBackground({ screenW, screenH }: { screenW: number; screenH: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#080818", overflow: "hidden" }]}>
      {BLOBS.map((cfg, i) => (
        <AnimatedBlob key={i} cfg={cfg} screenW={screenW} screenH={screenH} />
      ))}
      {/* Dark vignette */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.45)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}

// ── Format seconds → "m:ss" ────────────────────────────────────────────────
function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function WatchVideoScreen() {
  const insets        = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape   = width > height;

  // ── Playback state ──────────────────────────────────────────────────────
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [showControls, setShowControls] = useState(true);

  const elapsedRef    = useRef(0);
  const completedRef  = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Completion overlay ──────────────────────────────────────────────────
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const counterScale = useRef(new Animated.Value(1)).current;

  // ── Helpers ─────────────────────────────────────────────────────────────
  function clearTick() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function startTick() {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (completedRef.current) { clearTick(); return; }
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= VIDEO_DURATION_SECONDS) {
        clearTick();
        triggerCompletion();
      }
    }, 1000);
  }

  // Pause when portrait, resume when landscape (if was playing)
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (!isLandscape) {
      // Went portrait — pause
      if (isPlaying) { wasPlayingRef.current = true; }
      setIsPlaying(false);
      clearTick();
    } else {
      // Went landscape — resume if was playing before
      if (wasPlayingRef.current && !completedRef.current) {
        wasPlayingRef.current = false;
        setIsPlaying(true);
        startTick();
      }
    }
  }, [isLandscape]);

  // Start/stop tick based on isPlaying
  useEffect(() => {
    if (isPlaying && isLandscape) startTick();
    else clearTick();
    return () => clearTick();
  }, [isPlaying]);

  // ── Controls auto-hide ───────────────────────────────────────────────────
  function bumpControlsVisibility() {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_AUTOHIDE_MS);
    }
  }

  useEffect(() => {
    if (!isPlaying) { setShowControls(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }
    else bumpControlsVisibility();
  }, [isPlaying]);

  // ── Completion effect ────────────────────────────────────────────────────
  function triggerCompletion() {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsPlaying(false);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 110);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220);

    Animated.sequence([
      Animated.spring(counterScale, { toValue: 1.5,  useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(counterScale, { toValue: 1,    useNativeDriver: true, speed: 16, bounciness: 8  }),
    ]).start();

    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,    duration: 520, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }
      Linking.openURL("instagram://").catch(() => {
        Linking.openURL("https://www.instagram.com").catch(() => {});
      });
    }, 650);
  }

  // ── Back / play-pause ────────────────────────────────────────────────────
  function handleBack() {
    clearTick();
    if (router.canGoBack()) router.back();
    else router.replace("/unlock-tasks");
  }

  function handlePlayPause() {
    if (completedRef.current) return;
    setIsPlaying((v) => !v);
  }

  function handleTap() {
    bumpControlsVisibility();
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const progress    = Math.min(elapsed / VIDEO_DURATION_SECONDS, 1);
  const remaining   = Math.max(VIDEO_DURATION_SECONDS - elapsed, 0);
  const isDone      = elapsed >= VIDEO_DURATION_SECONDS;
  const leftPad     = isLandscape ? Math.max(insets.left, 16) : 16;
  const rightPad    = isLandscape ? Math.max(insets.right, 16) : 16;

  return (
    <View style={styles.root}>

      {/* ── Animated placeholder background ──────────────────────────── */}
      <AnimatedBackground screenW={width} screenH={height} />

      {/* ── Tap-to-show-controls area ────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>

        {/* ── Controls overlay (fades when auto-hidden) ─────────────── */}
        {showControls && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

            {/* Top bar — X button */}
            <View style={[styles.topBar, { paddingTop: insets.top + 6, paddingLeft: leftPad, paddingRight: rightPad }]}>
              <Pressable onPress={handleBack} hitSlop={14} style={styles.topBtn}>
                <Feather name="x" size={22} color="rgba(255,255,255,0.9)" />
              </Pressable>
              {/* Duration badge */}
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{VIDEO_DURATION_SECONDS}s challenge</Text>
              </View>
            </View>

            {/* Centre play/pause button */}
            <View style={styles.centreZone} pointerEvents="box-none">
              <Pressable onPress={handlePlayPause} style={styles.playBtn} hitSlop={16}>
                <Feather
                  name={isPlaying ? "pause" : "play"}
                  size={36}
                  color="#FFFFFF"
                  style={isPlaying ? {} : { marginLeft: 4 }}
                />
              </Pressable>
            </View>

            {/* Bottom controls bar (YouTube-style) */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) + 4, paddingLeft: leftPad, paddingRight: rightPad }]}>

              {/* Time row */}
              <View style={styles.timeRow}>
                <Text style={styles.timeElapsed}>{fmt(elapsed)}</Text>
                <Text style={styles.timeSep}> / </Text>
                <Text style={styles.timeTotal}>{fmt(VIDEO_DURATION_SECONDS)}</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                {/* Filled portion */}
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                {/* Scrubber dot */}
                <View style={[styles.scrubberDot, { left: `${progress * 100}%` as any }]} />
              </View>

            </View>
          </View>
        )}

      </Pressable>

      {/* ── Portrait rotate-prompt overlay ───────────────────────────── */}
      {!isLandscape && (
        <View style={styles.rotateOverlay}>
          <RotateIcon />
          <Text style={styles.rotateTitle}>Rotate your phone</Text>
          <Text style={styles.rotateSubtitle}>Video plays in landscape mode only</Text>
        </View>
      )}

      {/* ── Completion flash overlay ──────────────────────────────────── */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

    </View>
  );
}

// ── Animated rotate icon ───────────────────────────────────────────────────
function RotateIcon() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 700, useNativeDriver: true, isInteraction: false }),
        Animated.delay(1400),
        Animated.timing(spin, { toValue: 0, duration: 100, useNativeDriver: true, isInteraction: false }),
        Animated.delay(300),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-90deg"] });

  return (
    <Animated.View style={[styles.rotateIconWrap, { transform: [{ rotate }] }]}>
      <Feather name="smartphone" size={52} color="#FFFFFF" />
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },

  // ── Top bar ───────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },

  topBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 18,
  },

  durationBadge: {
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  durationText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.72)",
  },

  // ── Centre zone ───────────────────────────────────────────────────────
  centreZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },

  // ── Bottom bar ────────────────────────────────────────────────────────
  bottomBar: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },

  timeRow: { flexDirection: "row", alignItems: "baseline" },

  timeElapsed: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },

  timeSep: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },

  timeTotal: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },

  // Progress bar — YouTube red
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
    marginBottom: 6,
    position: "relative",
    justifyContent: "center",
  },

  progressFill: {
    height: 4,
    backgroundColor: "#FF0000",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },

  scrubberDot: {
    position: "absolute",
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#FF0000",
    top: "50%",
    marginTop: -6.5,
    marginLeft: -6.5,
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },

  // ── Rotate overlay ────────────────────────────────────────────────────
  rotateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    zIndex: 20,
  },

  rotateIconWrap: { marginBottom: 4 },

  rotateTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  rotateSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },

  // ── Completion flash ──────────────────────────────────────────────────
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    zIndex: 30,
  },
});
