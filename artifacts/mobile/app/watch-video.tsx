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

// ── Smoke color fade background ────────────────────────────────────────────
const SMOKE_COLORS = [
  "#6D28D9", // deep purple
  "#1D4ED8", // royal blue
  "#0F766E", // teal
  "#9D174D", // rose
  "#B45309", // amber
  "#065F46", // emerald
  "#4A1942", // dark plum
  "#7C3AED", // violet
  "#0369A1", // sky blue
  "#BE185D", // pink
];

type SmokeConfig = {
  color: string;
  blobSize: number;
  x: number;
  y: number;
};

function makeSmokeConfig(screenW: number, screenH: number): SmokeConfig {
  const color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)];
  const blobSize = Math.max(screenW, screenH) * 2.2;
  const half = blobSize / 2;
  // Six spawn positions — each corner + top/bottom center
  const positions = [
    { x: -half * 0.65, y: -half * 0.65 },                 // top-left corner
    { x: screenW - half * 0.35, y: -half * 0.65 },        // top-right corner
    { x: -half * 0.65, y: screenH - half * 0.35 },        // bottom-left corner
    { x: screenW - half * 0.35, y: screenH - half * 0.35 }, // bottom-right corner
    { x: screenW / 2 - half, y: -half * 0.55 },           // top center
    { x: screenW / 2 - half, y: screenH - half * 0.45 },  // bottom center
  ];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  return { color, blobSize, x: pos.x, y: pos.y };
}

function SmokeBackground({ screenW, screenH }: { screenW: number; screenH: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.55)).current;
  const [cfg, setCfg] = useState<SmokeConfig>(() => makeSmokeConfig(screenW, screenH));
  const activeRef = useRef(true);

  function runCycle() {
    if (!activeRef.current) return;
    // Config update happens while opacity=0, so change is invisible
    const next = makeSmokeConfig(screenW, screenH);
    setCfg(next);
    scale.setValue(0.55);

    Animated.sequence([
      // Smoke drifts in — grows and brightens
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.62, duration: 4500, useNativeDriver: true, isInteraction: false }),
        Animated.timing(scale,   { toValue: 1.0,  duration: 4500, useNativeDriver: true, isInteraction: false }),
      ]),
      // Hold — smoke hangs in air
      Animated.delay(2800),
      // Smoke disperses — expands slightly and fades out
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0,    duration: 4200, useNativeDriver: true, isInteraction: false }),
        Animated.timing(scale,   { toValue: 1.18, duration: 4200, useNativeDriver: true, isInteraction: false }),
      ]),
      // Brief pause before next color
      Animated.delay(400),
    ]).start(({ finished }) => {
      if (finished && activeRef.current) runCycle();
    });
  }

  useEffect(() => {
    activeRef.current = true;
    const t = setTimeout(runCycle, 80);
    return () => {
      activeRef.current = false;
      clearTimeout(t);
      opacity.stopAnimation();
      scale.stopAnimation();
    };
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", overflow: "hidden" }]}>
      <Animated.View
        style={{
          position: "absolute",
          width: cfg.blobSize,
          height: cfg.blobSize,
          borderRadius: cfg.blobSize / 2,
          backgroundColor: cfg.color,
          left: cfg.x,
          top: cfg.y,
          opacity,
          transform: [{ scale }],
        }}
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

// ── Autoplay toggle pill (visual only) ────────────────────────────────────
function AutoplayToggle() {
  return (
    <View style={apStyles.pill}>
      <View style={apStyles.iconWrap}>
        {/* small play triangle */}
        <View style={apStyles.triangle} />
      </View>
    </View>
  );
}
const apStyles = StyleSheet.create({
  pill: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 7,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#000",
    marginLeft: 1,
  },
});

// ── CC badge (visual only) ─────────────────────────────────────────────────
function CCBadge() {
  return (
    <View style={ccStyles.box}>
      <Text style={ccStyles.text}>CC</Text>
    </View>
  );
}
const ccStyles = StyleSheet.create({
  box: {
    width: 30,
    height: 22,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────
export default function WatchVideoScreen() {
  const insets        = useSafeAreaInsets();

  // Dual orientation detection for reliability in Expo Go:
  //   1. useWindowDimensions() — works on web and in most RN environments.
  //   2. Dimensions.addEventListener('change', ...) — fires reliably on Expo Go
  //      when the device is physically rotated, bypassing React Navigation's
  //      context which can cause useWindowDimensions to return stale values.
  // Both feed into a single isLandscape state. Whichever fires first wins.
  const { width: wdWidth, height: wdHeight } = useWindowDimensions();
  const [dims, setDims] = useState(() => Dimensions.get("window"));

  useEffect(() => {
    // Keep dims in sync via the native listener — more reliable than
    // useWindowDimensions alone in Expo Go on physical rotation.
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  // isLandscape: true if EITHER source reports landscape.
  // Prefer the Dimensions listener (dims) for native; fall back to
  // useWindowDimensions for web preview.
  const isLandscape = dims.width > dims.height || wdWidth > wdHeight;

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

    // After effect: navigate to Coming Soon screen
    // (toggle-off + Instagram redirect kept below for future use)
    setTimeout(() => {
      router.replace("/coming-soon");
      // if (Platform.OS === "android" && NativeModules.ReelsLock) {
      //   try { NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      // }
      // Linking.openURL("instagram://").catch(() => {
      //   Linking.openURL("https://www.instagram.com").catch(() => {});
      // });
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

      {/* ── Smoke color-fade background ───────────────────────────────── */}
      <SmokeBackground screenW={width} screenH={height} />

      {/* ── Tap-to-show-controls area ────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>

        {/* ── Controls overlay (fades when auto-hidden) ─────────────── */}
        {showControls && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

            {/* ── TOP BAR ──────────────────────────────────────────────── */}
            <View style={[styles.topBar, { paddingTop: insets.top + 4, paddingLeft: leftPad, paddingRight: rightPad }]}>

              {/* Back chevron */}
              <Pressable onPress={handleBack} hitSlop={14} style={styles.topBackBtn}>
                <Feather name="chevron-down" size={24} color="#FFFFFF" />
              </Pressable>

              {/* Title + channel */}
              <View style={styles.topTitleBlock}>
                <Text style={styles.topTitle} numberOfLines={1}>Video Title</Text>
                <Text style={styles.topChannel}>@channelname</Text>
              </View>

              {/* Right icon group */}
              <View style={styles.topRightIcons}>
                <AutoplayToggle />
                <Pressable hitSlop={10} style={styles.topIconBtn}>
                  <Feather name="cast" size={20} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.topIconBtn}>
                  <CCBadge />
                </Pressable>
                <Pressable hitSlop={10} style={styles.topIconBtn}>
                  <Feather name="settings" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* ── CENTRE TRANSPORT CONTROLS ────────────────────────────── */}
            <View style={styles.centreZone} pointerEvents="box-none">
              {/* Skip previous */}
              <Pressable hitSlop={16} style={styles.skipBtn}>
                <Feather name="skip-back" size={34} color="rgba(210,210,210,0.85)" />
              </Pressable>

              {/* Play / Pause — plain icon, no circle */}
              <Pressable onPress={handlePlayPause} hitSlop={16} style={styles.playBtnArea}>
                <Feather
                  name={isPlaying ? "pause" : "play"}
                  size={52}
                  color="#FFFFFF"
                  style={isPlaying ? {} : { marginLeft: 5 }}
                />
              </Pressable>

              {/* Skip next */}
              <Pressable hitSlop={16} style={styles.skipBtn}>
                <Feather name="skip-forward" size={34} color="rgba(210,210,210,0.85)" />
              </Pressable>
            </View>

            {/* ── BOTTOM AREA ──────────────────────────────────────────── */}
            <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: leftPad, paddingRight: rightPad }]}>

              {/* Time + chapter name + fullscreen */}
              <View style={styles.timeChapterRow}>
                <Text style={styles.timeText}>
                  {fmt(elapsed)}
                  <Text style={styles.timeSep}> / </Text>
                  {fmt(VIDEO_DURATION_SECONDS)}
                </Text>
                <Text style={styles.chapterText}>{"  "}Chapter Name{"  "}›</Text>
                <View style={{ flex: 1 }} />
                <Pressable hitSlop={10}>
                  <Feather name="minimize" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              {/* Progress bar — YouTube red */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                <View style={[styles.scrubberDot, { left: `${progress * 100}%` as any }]} />
              </View>

              {/* Action bar */}
              <View style={styles.actionBar}>
                {/* Left icons */}
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="thumbs-up" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="thumbs-down" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="message-square" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="bookmark" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="share-2" size={22} color="#FFFFFF" />
                </Pressable>
                <Pressable hitSlop={10} style={styles.actionBtn}>
                  <Feather name="more-horizontal" size={22} color="#FFFFFF" />
                </Pressable>

                <View style={{ flex: 1 }} />

                {/* More videos */}
                <Pressable hitSlop={6} style={styles.moreVideosBtn}>
                  <Text style={styles.moreVideosText}>More videos</Text>
                  <View style={styles.moreVideosThumbnail}>
                    <Feather name="play-circle" size={20} color="rgba(255,255,255,0.7)" />
                  </View>
                </Pressable>
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
    paddingBottom: 6,
    gap: 8,
  },

  topBackBtn: {
    paddingRight: 2,
  },

  topTitleBlock: {
    flex: 1,
    justifyContent: "center",
  },

  topTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    lineHeight: 18,
  },

  topChannel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },

  topRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  topIconBtn: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Centre transport controls ─────────────────────────────────────────
  centreZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
  },

  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
  },

  playBtnArea: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bottom area ────────────────────────────────────────────────────────
  bottomArea: {
    gap: 6,
    paddingTop: 4,
  },

  timeChapterRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },

  timeSep: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },

  chapterText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },

  // Progress bar — YouTube red
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 2,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FF0000",
    top: "50%" as any,
    marginTop: -7,
    marginLeft: -7,
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 3,
  },

  // Action bar
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },

  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  moreVideosBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  moreVideosText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },

  moreVideosThumbnail: {
    width: 52,
    height: 36,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
