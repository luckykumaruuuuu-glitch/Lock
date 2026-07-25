import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { GOOGLE_USER_PROFILE_KEY } from "@/app/google-signin";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { StreakCarousel } from "@/components/ui/StreakCarousel";
import { useFriendAvatars } from "@/hooks/useFriendAvatars";

const lockIconImg = require("@/assets/images/lock-icon.png");
import { Toast } from "@/components/ui/Toast";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useAppMode } from "@/context/AppModeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLock } from "@/context/LockContext";
import { setPendingReelsLockDisable } from "@/lib/reelsLockPending";
import {
  getReelsLockOff,
  clearReelsLockOff,
  formatOffTimeRemaining,
  ReelsLockOffState,
} from "@/lib/reelsLockOff";
import { setUnlockFlowState } from "@/lib/unlockFlowState";
import {
  getReelsRemaining,
  clearReelsRemaining,
  ReelsRemainingState,
} from "@/lib/reelsLockReels";
import {
  ActiveLockDisplayItem,
  formatExpiryDate,
  formatTimeRemaining,
  getLockProgress,
  useActiveLocks,
} from "@/hooks/useLockStorage";
import { useSounds } from "@/hooks/useSounds";
import { useReelCount } from "@/hooks/useReelCount";

// Single combined video: 0–4 s = idle loop, 4–6 s = touch animation.
// Sound is already baked into the file by the user — no mute/unmute needed.
const DUCK_FULL = require("../../assets/duck-full.mp4");

// DuckPal home hero character — always-muted, always-looping ambient animation.
const DUCKPAL_HERO = require("../../assets/duckpal-hero.mp4");


function DuckCharacter() {
  const isTouchedRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  // Read user sound preference so we know whether to unmute on tap.
  const { muted: soundsMuted } = useSounds();

  const player = useVideoPlayer(DUCK_FULL, (p) => {
    p.loop = false;
    // timeUpdateEventInterval=0 by default in expo-video 3.x → events never fire.
    p.timeUpdateEventInterval = 0.1;
    // ── MUTED for idle ────────────────────────────────────────────────────────
    // Web browsers block autoplay of videos that have an audio track unless the
    // video is muted. Without this, player.play() silently returns playing=false
    // and the duck freezes on launch. Muted autoplay is always allowed.
    // Sound is re-enabled during the touch segment (4–6 s) on user tap — a tap
    // counts as a user gesture, so the browser permits unmuted playback then.
    p.muted = true;
    p.play();
    console.log("[duck] initializer: muted=true, play() called, playing=", p.playing);
  });

  // ── Primary auto-play: fires when home screen comes into focus ────────────
  // Root cause of freeze: DuckCharacter pre-renders in the background while
  // onboarding is shown. The VideoView isn't visible yet, so player.play()
  // fails silently. useEffect only runs once on mount — it doesn't re-run when
  // the tab becomes active. useFocusEffect fires EVERY TIME the screen focuses,
  // including the first real navigation to home. This is the correct hook.
  useFocusEffect(
    useCallback(() => {
      console.log("[duck] screen focused — playing=", player.playing);
      if (!player.playing) {
        player.muted = true;
        player.play();
        console.log("[duck] focus: play() called, playing=", player.playing);
      }
      // No cleanup needed — we don't pause on blur (duck keeps looping in bg).
    }, [player])
  );

  // ── Fallback: statusChange + retry for native timing edge cases ──────────
  // statusChange covers native platforms where play() in the focus effect fires
  // slightly before the video finishes loading (readyToPlay not yet reached).
  // The retry loop covers the race where readyToPlay already fired before the
  // listener registered (local bundled assets load near-instantly on device).
  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      console.log("[duck] statusChange:", status, "| playing=", player.playing);
      if (status === "readyToPlay" && !player.playing) {
        player.muted = true;
        player.play();
        console.log("[duck] readyToPlay → play() called, playing=", player.playing);
      }
    });

    let attempts = 0;
    const tryPlay = () => {
      if (player.playing) {
        console.log("[duck] tryPlay: playing after", attempts, "attempt(s) ✓");
        return;
      }
      attempts++;
      player.muted = true;
      player.play();
      console.log("[duck] tryPlay attempt", attempts, "| playing=", player.playing);
      if (!player.playing && attempts < 8) setTimeout(tryPlay, 250);
    };
    setTimeout(tryPlay, 50);

    return () => sub.remove();
  }, [player]);

  // ── Segment loop control ──────────────────────────────────────────────────
  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (!isTouchedRef.current && currentTime >= 4) {
        // Idle loop: 4 s reached → mute + seek to 0
        player.muted = true;
        player.currentTime = 0;
        player.play();
      }
      if (isTouchedRef.current && currentTime >= 6) {
        // Touch segment done → mute + return to idle
        isTouchedRef.current = false;
        player.muted = true;
        player.currentTime = 0;
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  function handlePress() {
    isTouchedRef.current = true;
    // Tap = user gesture → browser allows unmuted playback.
    // Unmute only if the user hasn't disabled sound effects.
    player.muted = soundsMuted;
    player.currentTime = 4;
    player.play();
    // Bounce: compress → spring back
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.duckContainer}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <VideoView
          player={player}
          style={styles.duckVideo}
          contentFit="contain"
          nativeControls={false}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── DuckPal home hero character ─────────────────────────────────────────────
// Always-muted, always-looping ambient animation that fills the hero
// placeholder box. Follows the same mount/focus/retry pattern proven on
// DuckCharacter to avoid the freeze-on-mount / tab-visibility issues found
// there — but simpler since there's no touch interaction or segment logic.
function DuckPalHeroCharacter() {
  const player = useVideoPlayer(DUCKPAL_HERO, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.1;
    // Muted: this is an ambient/idle animation only, same rationale as the
    // top-right duck icon's idle segment. Muted autoplay is always allowed.
    p.muted = true;
    p.play();
    console.log("[duckpal-hero] initializer: muted=true, play() called, playing=", p.playing);
  });

  // Primary auto-play: fires every time the DuckPal screen comes into focus.
  // Without this, the video can freeze if it pre-rendered while the tab/mode
  // wasn't visible yet (same root cause as the original duck-icon freeze).
  useFocusEffect(
    useCallback(() => {
      console.log("[duckpal-hero] screen focused — playing=", player.playing);
      if (!player.playing) {
        player.muted = true;
        player.play();
        console.log("[duckpal-hero] focus: play() called, playing=", player.playing);
      }
    }, [player])
  );

  // Fallback: statusChange + retry loop for native timing edge cases where
  // play() fires before the player reaches readyToPlay.
  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      console.log("[duckpal-hero] statusChange:", status, "| playing=", player.playing);
      if (status === "readyToPlay" && !player.playing) {
        player.muted = true;
        player.play();
        console.log("[duckpal-hero] readyToPlay → play() called, playing=", player.playing);
      }
    });

    let attempts = 0;
    const tryPlay = () => {
      if (player.playing) {
        console.log("[duckpal-hero] tryPlay: playing after", attempts, "attempt(s) ✓");
        return;
      }
      attempts++;
      player.muted = true;
      player.play();
      console.log("[duckpal-hero] tryPlay attempt", attempts, "| playing=", player.playing);
      if (!player.playing && attempts < 8) setTimeout(tryPlay, 250);
    };
    setTimeout(tryPlay, 50);

    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.duckPalHeroPlaceholder}>
      <VideoView
        player={player}
        style={styles.duckPalHeroVideo}
        contentFit="contain"
        nativeControls={false}
      />
    </View>
  );
}

// ─── Google profile data (for home-screen header avatar) ─────────────────────
type GoogleProfile = { name: string | null; email: string | null; photo: string | null } | null;

function useGoogleProfile(): GoogleProfile {
  const [profile, setProfile] = useState<GoogleProfile>(null);
  useEffect(() => {
    AsyncStorage.getItem(GOOGLE_USER_PROFILE_KEY).then((raw) => {
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
  }, []);
  return profile;
}

// ─── HomeHeader ───────────────────────────────────────────────────────────────
// Left: circular Google avatar (tap → Settings) + glassy app name (tap → mode toggle)
// Right: DuckCharacter (unchanged)
//
// `source` identifies which home screen opened Settings so the navigation stack
// preserves it automatically.  Since we use router.push() (not replace()), the
// stack underneath the Settings screen keeps the correct active tab — swiping
// right from Settings pops the stack and returns to whichever tab was active.
function HomeHeader({ appName, source }: { appName: string; source: "duckpal" | "ducklock" }) {
  const profile = useGoogleProfile();

  return (
    <View style={styles.headerLeft}>
      {/* Avatar — taps open Settings with left-slide.
          `from` param records which home triggered the navigation; the swipe-back
          gesture naturally returns here via router.back() on the stack. */}
      <Pressable
        onPress={() => router.push({ pathname: "/settings", params: { from: source } } as never)}
        hitSlop={10}
      >
        {profile?.photo ? (
          <Image
            source={{ uri: profile.photo }}
            style={styles.headerAvatar}
          />
        ) : (
          <View style={styles.headerAvatarFallback}>
            <Feather name="user" size={16} color="#8E8E93" />
          </View>
        )}
      </Pressable>

      {/* App name — plain text, no background/pill */}
      <Text style={styles.headerBrandText}>{appName}</Text>
    </View>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View style={[styles.statWrapper, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <GlassCard style={styles.statCard} padding={16}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

function LockCard({ item, index }: { item: ActiveLockDisplayItem; index: number }) {
  const { t } = useLanguage();
  const progress = getLockProgress(item.startTime, item.endTime);
  const remaining = formatTimeRemaining(item.endTime);
  const expiry = formatExpiryDate(item.endTime);

  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 150, friction: 12, delay: index * 80 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <GlassCard style={styles.lockCard}>
        <View style={styles.lockCardInner}>
          <View style={styles.lockIconBg}>
            <FontAwesome5 name={item.app.iconName as any} size={22} color="#FFBF80" />
          </View>

          <View style={styles.lockInfo}>
            <Text style={styles.lockAppName}>{item.app.name}</Text>
            <Text style={styles.lockRemaining}>{remaining}</Text>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#FFBF80", "#FFA660"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
              />
            </View>
            <Text style={styles.lockExpiry}>{t("unlocksAt")} {expiry}</Text>
          </View>

          <View style={styles.lockBadge}>
            <Feather name="lock" size={14} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// ── Dummy data — replaced with real reel-tracking logic in a later step ──────
const DUMMY_REELS_TODAY = 0;
const DUMMY_INSTAGRAM_TODAY = 0;
const DUMMY_YOUTUBE_TODAY = 0;
const DUMMY_WEEKLY = [
  { day: "Mon", count: 0 },
  { day: "Tue", count: 0 },
  { day: "Wed", count: 0 },
  { day: "Thu", count: 0 },
  { day: "Fri", count: 0 },
  { day: "Sat", count: 0 },
  { day: "Sun", count: 0 },
];
const DUMMY_TOTAL_REELS = 0;
const DUMMY_DAILY_AVG = 0;

// Fallback colors shown when a friend has no profile photo.
// Index maps to position in the avatar stack (rank 1 = index 0).
const AVATAR_FALLBACK_COLORS = ["#FFBF80", "#FF6B6B", "#4ECDC4"] as const;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Monday of the week containing `date`.
function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(monday: Date) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startLabel = `${MONTH_SHORT[monday.getMonth()]} ${monday.getDate()}`;
  const endLabel =
    monday.getMonth() === sunday.getMonth()
      ? `${sunday.getDate()}`
      : `${MONTH_SHORT[sunday.getMonth()]} ${sunday.getDate()}`;

  return `${startLabel} - ${endLabel}`;
}

function WeeklyBarChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.chartRow}>
      {data.map((d) => (
        <View key={d.day} style={styles.chartBarWrapper}>
          <View style={styles.chartBarTrack}>
            <LinearGradient
              colors={d.count > 0 ? ["#FFBF80", "#FFA660"] : ["#3A3A3C", "#3A3A3C"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={[styles.chartBarFill, { height: `${d.count > 0 ? Math.max(6, (d.count / max) * 100) : 4}%` }]}
            />
          </View>
          <Text style={styles.chartBarLabel}>{d.day}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Day labels for calendar strip ────────────────────────────────────────────
const CAL_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Sun=0 Mon=1 … Sat=6  →  short label
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DuckPalScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 60 + insets.bottom;

  const { count: instagramCount } = useReelCount();
  const { displayItems } = useActiveLocks(60_000);
  const profile = useGoogleProfile();
  const { avatars: friendAvatars, count: friendCount } = useFriendAvatars();

  // ── Day-by-day calendar state ─────────────────────────────────────────────
  const { width: screenWidth } = useWindowDimensions();
  // Floor to a whole pixel so snapToInterval always lands on an exact integer
  // boundary — fractional cell widths cause the FlatList to snap to
  // non-integer offsets, making boxes wobble/land in half-positions.
  const calCellWidth = Math.floor((screenWidth - 40) / 7);

  // 801 dates centred on today: 400 before + today + 400 after.
  // Generated once — never recreated — so FlatList never sees a new data array.
  const CAL_TOTAL = 801;
  const CAL_CENTER = 400; // index of today in the array

  const calDates = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: CAL_TOTAL }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + (i - CAL_CENTER));
      return d;
    });
  }, []); // intentionally empty — today captured once on mount

  // Index of the currently centred (selected) date
  const [selectedCalIdx, setSelectedCalIdx] = useState(CAL_CENTER);
  const selectedCalIdxRef = useRef(CAL_CENTER);
  selectedCalIdxRef.current = selectedCalIdx;

  const calListRef = useRef<FlatList<Date>>(null);
  const calCellWidthRef = useRef(calCellWidth);
  calCellWidthRef.current = calCellWidth;

  // Required by FlatList for initialScrollIndex + no blank gaps
  const getCalItemLayout = (_: ArrayLike<Date> | null | undefined, index: number) => ({
    length: calCellWidthRef.current,
    offset: calCellWidthRef.current * index,
    index,
  });

  // Called when momentum scroll settles — figure out which date is centred
  const handleCalScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const cellW = calCellWidthRef.current;
      const offset = e.nativeEvent.contentOffset.x;
      // The FlatList scrolls so that item[n] is flush with the left edge.
      // Centre slot is visual position 3 (0-indexed), so centred item = n + 3.
      const centeredIdx = Math.round(offset / cellW) + 3;
      const clamped = Math.max(0, Math.min(CAL_TOTAL - 1, centeredIdx));
      setSelectedCalIdx(clamped);
    },
    []
  );

  // Tap any of the 7 visible cells → snap it to centre (slot 3) + navigate
  const handleDateTap = useCallback(
    (globalIdx: number, date: Date) => {
      const cellW = calCellWidthRef.current;
      // Scroll so globalIdx lands at visual slot 3 (centre of 7)
      const targetOffset = (globalIdx - 3) * cellW;
      calListRef.current?.scrollToOffset({ offset: targetOffset, animated: true });
      setSelectedCalIdx(globalIdx);
      setTimeout(() => {
        router.push({
          pathname: "/date-detail",
          params: { date: date.toISOString() },
        } as never);
      }, 260);
    },
    []
  );

  const reelsToday = instagramCount ?? 0;
  const appsBlocked = displayItems.length;

  // ── Revolut-style task card press animation ───────────────────────────────
  const taskCardScale = useRef(new Animated.Value(1)).current;
  const handleTaskCardPressIn = useCallback(() => {
    Animated.spring(taskCardScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }, [taskCardScale]);
  const handleTaskCardPressOut = useCallback(() => {
    Animated.spring(taskCardScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  }, [taskCardScale]);

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.dpScrollContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top header — identical structure to DuckLock (same styles.header) ── */}
        <View style={styles.header}>
          <HomeHeader appName="DuckPal" source="duckpal" />
          <DuckCharacter />
        </View>

        {/* ── Centered profile section (big avatar + name + email) ── */}
        <View style={styles.dpProfileSection}>
          <View style={styles.dpAvatarRing}>
            {profile?.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.dpAvatarImg} />
            ) : (
              <View style={styles.dpAvatarFallback}>
                <Feather name="user" size={36} color="#8E8E93" />
              </View>
            )}
          </View>
          <Text style={styles.dpProfileName} numberOfLines={1}>
            {profile?.name ?? "Your Name"}
          </Text>
          <Text style={styles.dpProfileEmail} numberOfLines={1}>
            {profile?.email ?? "your@email.com"}
          </Text>
        </View>

        {/* ── Stats row — 3 metrics ── */}
        <View style={styles.dpStatsCard}>
          <View style={styles.dpStatCol}>
            <View style={styles.dpStatIconRow}>
              <Feather name="refresh-cw" size={15} color="#FFBF80" />
              <Text style={styles.dpStatNum}>{reelsToday}</Text>
            </View>
            <Text style={styles.dpStatLbl}>Reels Today</Text>
          </View>
          <View style={styles.dpStatDiv} />
          <View style={styles.dpStatCol}>
            <View style={styles.dpStatIconRow}>
              <Feather name="check-circle" size={15} color="#FFBF80" />
              <Text style={styles.dpStatNum}>0</Text>
            </View>
            <Text style={styles.dpStatLbl}>Streak Days</Text>
          </View>
          <View style={styles.dpStatDiv} />
          <View style={styles.dpStatCol}>
            <View style={styles.dpStatIconRow}>
              <Feather name="shield" size={15} color="#FFBF80" />
              <Text style={styles.dpStatNum}>{appsBlocked}</Text>
            </View>
            <Text style={styles.dpStatLbl}>Apps Blocked</Text>
          </View>
        </View>

        {/* ── Day-by-day calendar strip ─────────────────────────────────────────
            FlatList with snapToInterval so native scroll physics handle
            momentum/fling naturally. 801 pre-generated dates (400 each side)
            with getItemLayout mean no lazy-load pop-in or blank gaps ever.

            Layer 1: FlatList — scrolls freely, snaps per cell
            Layer 2: fixed highlight frame pinned to centre slot (3 of 0–6)  ── */}
        <View style={[styles.dpCalOuter, { width: calCellWidth * 7 }]}>
          <FlatList<Date>
            ref={calListRef}
            data={calDates}
            horizontal
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: d, index: idx }) => {
              const isSelected = idx === selectedCalIdx;
              return (
                <Pressable
                  onPress={() => handleDateTap(idx, d)}
                  style={[styles.dpCalItem, { width: calCellWidth }]}
                >
                  <View
                    style={[
                      styles.dpCalDot,
                      isSelected && styles.dpCalDotSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.dpCalDayName,
                      isSelected && styles.dpCalDayNameSelected,
                    ]}
                  >
                    {DAY_NAMES_SHORT[d.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.dpCalDateNum,
                      isSelected && styles.dpCalDateNumSelected,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            }}
            getItemLayout={getCalItemLayout}
            initialScrollIndex={CAL_CENTER - 3}
            snapToInterval={calCellWidth}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCalScrollEnd}
            onScrollToIndexFailed={({ index }) => {
              // fallback: jump directly to offset without animation
              calListRef.current?.scrollToOffset({
                offset: (index - 3) * calCellWidthRef.current,
                animated: false,
              });
            }}
            // Keep enough rendered items on both sides so there is never
            // a blank gap during fast flings in either direction.
            windowSize={21}
            maxToRenderPerBatch={21}
            initialNumToRender={21}
            removeClippedSubviews={false}
          />

          {/* Fixed highlight frame — always at centre slot (3), never moves */}
          <View
            pointerEvents="none"
            style={[
              styles.dpCalFrame,
              {
                left: 3 * calCellWidth,
                width: calCellWidth,
              },
            ]}
          />
        </View>

        {/* ── Friends section + Streak card (side by side) ── */}
        <View style={styles.dpMidRow}>
          {/* Friends — real-time ranked avatars from Friend Battle */}
          <Pressable
            style={styles.dpFriendsSection}
            onPress={() => router.push("/friend-battle" as never)}
          >
            <View style={styles.dpAvatarStack}>
              {friendCount === 0 ? (
                // No friends yet — show placeholder circles so layout is stable
                (["#FFBF80", "#FF6B6B", "#4ECDC4"] as const).map((color, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dpFriendBubble,
                      { backgroundColor: color, marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i },
                    ]}
                  />
                ))
              ) : (
                // friendAvatars is already sorted rank-ascending (rank 1 at index 0).
                // index 0 → front (highest zIndex), last index → back.
                friendAvatars.map((avatar, i) => (
                  <View
                    key={avatar.userId}
                    style={[
                      styles.dpFriendBubble,
                      { marginLeft: i > 0 ? -10 : 0, zIndex: friendAvatars.length - i },
                      !avatar.photo && { backgroundColor: AVATAR_FALLBACK_COLORS[i % AVATAR_FALLBACK_COLORS.length] },
                    ]}
                  >
                    {avatar.photo ? (
                      <Image
                        source={{ uri: avatar.photo }}
                        style={styles.dpFriendBubbleImg}
                      />
                    ) : (
                      // Initials fallback when photo URL is empty
                      <Text style={styles.dpFriendBubbleInitial}>
                        {avatar.name ? avatar.name.charAt(0).toUpperCase() : "?"}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
            <Text style={styles.dpFriendsTitle}>Friends</Text>
            <Text style={styles.dpFriendsSub}>
              {friendCount === 0
                ? "3 friends"
                : friendCount === 1
                ? "1 friend"
                : `${friendCount} friends`}
            </Text>
          </Pressable>

          {/* Keep it up card — swipeable carousel */}
          <View style={styles.dpStreakCard}>
            <StreakCarousel />
          </View>
        </View>

        {/* ── Task card — Revolut-style dark elevated promo card ── */}
        <Animated.View style={[styles.dpTaskCard, { transform: [{ scale: taskCardScale }] }]}>
          <View style={styles.dpTaskContent}>
            <Text style={styles.dpTaskTitle}>Complete new tasks</Text>
            <Text style={styles.dpTaskSub}>Lock apps and build your focus streak</Text>
          </View>
          <Pressable
            onPress={() => router.push("/coming-soon" as never)}
            onPressIn={handleTaskCardPressIn}
            onPressOut={handleTaskCardPressOut}
            style={styles.dpTaskBtn}
          >
            <Text style={styles.dpTaskBtnText}>Start Now</Text>
          </Pressable>
        </Animated.View>


      </ScrollView>
    </GradientBackground>
  );
}

function EmptyState() {
  const { t } = useLanguage();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  return (
    <GlassCard padding={32}>
      <View style={styles.emptyCard}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.emptyIconBox}>
            <Feather name="unlock" size={32} color="#FFBF80" />
          </View>
        </Animated.View>
        <Text style={styles.emptyTitle}>{t("noActiveLocks")}</Text>
        <Text style={styles.emptyBody}>{t("noActiveLocksBody")}</Text>
      </View>
    </GlassCard>
  );
}

export function DuckLockHomeContent() {
  const insets = useSafeAreaInsets();
  const { resetSelection } = useLock();
  const { displayItems, locks, loading } = useActiveLocks(30_000);
  const { t } = useLanguage();
  const [toast, setToast] = React.useState(false);
  const [reelsLockEnabled, setReelsLockEnabled] = useState(false);
  const [reelsLockOffState, setReelsLockOffState] = useState<ReelsLockOffState | null>(null);
  const [reelsRemaining, setReelsRemaining] = useState<ReelsRemainingState | null>(null);
  // Load persisted Reels Lock toggle state on mount (Android only)
  useEffect(() => {
    if (Platform.OS === "android" && NativeModules.ReelsLock) {
      NativeModules.ReelsLock.getEnabled()
        .then((enabled: boolean) => setReelsLockEnabled(enabled))
        .catch(() => {/* ignore — defaults to false */});
    }
  }, []);

  // Re-sync toggle + off-state on every focus so the strip always reflects
  // the real state (duration-selector may have disabled the lock, or a timed
  // duration may have expired while the user was elsewhere).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function syncReelsLock() {
        // 1. Read both unlock states in parallel
        const [offState, reelState] = await Promise.all([
          getReelsLockOff(),
          getReelsRemaining(),
        ]);

        // 2. If a timed duration has expired, auto-re-enable and clear storage
        if (offState?.type === "timed" && offState.until <= Date.now()) {
          await Promise.all([clearReelsLockOff(), clearReelsRemaining()]);
          if (Platform.OS === "android" && NativeModules.ReelsLock) {
            try { await NativeModules.ReelsLock.setEnabled(true); } catch (_) {}
          }
          if (!cancelled) {
            setReelsLockOffState(null);
            setReelsRemaining(null);
            setReelsLockEnabled(true);
          }
          return;
        }

        if (!cancelled) {
          setReelsLockOffState(offState);
          setReelsRemaining(reelState);
        }

        // 3. Sync toggle state from native
        if (Platform.OS === "android" && NativeModules.ReelsLock) {
          try {
            const enabled: boolean = await NativeModules.ReelsLock.getEnabled();
            if (!cancelled) setReelsLockEnabled(enabled);
          } catch (_) { /* ignore */ }
        }
      }

      syncReelsLock();
      return () => { cancelled = true; };
    }, [])
  );

  const { toggleAppMode } = useAppMode();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 60 + insets.bottom;

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerY, { toValue: 0, useNativeDriver: true, tension: 150, friction: 10 }),
    ]).start();
  }, [headerOpacity, headerY]);

  const avgDays =
    locks.length > 0
      ? Math.round(locks.reduce((acc, l) => acc + (l.endTime - l.startTime) / 86400000, 0) / locks.length)
      : 0;

  function handleStartLock() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetSelection();
    router.push("/lock/select-apps");
  }

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — avatar + glassy brand left, duck icon right */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerY }], opacity: headerOpacity }]}>
          <HomeHeader appName={t("appTitle")} source="ducklock" />
          <DuckCharacter />
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={locks.length} label={t("locks")} color="#FFBF80" />
          <StatCard value={displayItems.length} label={t("blocked")} color="#FF453A" />
          <StatCard value={avgDays > 0 ? `${avgDays}d` : "—"} label={t("avg")} color="#32D74B" />
        </View>

        {/* Reels Lock */}
        <GlassCard style={styles.reelsLockCard} padding={16}>
          <View style={styles.reelsLockRow}>
            <Image source={lockIconImg} style={styles.reelsLockEmoji} />
            <View style={styles.reelsLockCenter}>
              <Text style={styles.reelsLockTitle}>Lock Reels</Text>
              {(() => {
                // Four visual states for the status strip:
                //  1. ON              → green  "Locked"
                //  2. OFF + reel-count → neutral "X Reels/Shorts left"
                //  3. OFF + timed      → neutral "Unlocks in Xh Ym"
                //  4. OFF + forever/bare → red "Unlocked"
                const isTimed    = !reelsLockEnabled && reelsLockOffState?.type === "timed";
                const isReelMode = !reelsLockEnabled && reelsRemaining !== null;
                const isNeutral  = isTimed || isReelMode;
                const pillBg   = reelsLockEnabled
                  ? "rgba(48,209,88,0.13)"
                  : isNeutral
                    ? "rgba(120,120,128,0.15)"
                    : "rgba(255,59,48,0.13)";
                const dotColor  = reelsLockEnabled ? "#30D158" : isNeutral ? "#8E8E93" : "#FF3B30";
                const textColor = reelsLockEnabled ? "#30D158" : isNeutral ? "#AEAEB2" : "#FF3B30";
                const unit = reelsRemaining?.platform === "youtube" ? "Shorts" : "Reels";
                const label = reelsLockEnabled
                  ? "Locked"
                  : isReelMode
                    ? `${reelsRemaining!.count} ${unit} left`
                    : isTimed
                      ? `Unlocks in ${formatOffTimeRemaining(reelsLockOffState!) ?? "soon"}`
                      : "Unlocked";
                return (
                  <View style={[styles.reelsLockPill, { backgroundColor: pillBg }]}>
                    <View style={[styles.reelsLockDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.reelsLockPillText, { color: textColor }]}>{label}</Text>
                  </View>
                );
              })()}
            </View>
            <ToggleSwitch
              value={reelsLockEnabled}
              onValueChange={(v: boolean) => {
                if (!v && reelsLockEnabled) {
                  // User is trying to turn OFF — don't disable yet.
                  // Set the pending flag, fix destination to duration-selector,
                  // and open the unlock-task flow.
                  setPendingReelsLockDisable();
                  // Always DuckLock context here — record it so the
                  // destination screen returns to the right home.
                  setUnlockFlowState("duration-selector", null, "DuckLock");
                  router.push("/unlock-tasks");
                  return;
                }
                // Turning ON — apply immediately and clear any unlock state.
                setReelsLockEnabled(v);
                setReelsLockOffState(null);
                setReelsRemaining(null);
                clearReelsLockOff();
                clearReelsRemaining();
                if (Platform.OS === "android" && NativeModules.ReelsLock) {
                  NativeModules.ReelsLock.setEnabled(v);
                }
              }}
              trackColorOff="#3A3A3C"
              trackColorOn="#30D158"
            />
          </View>
        </GlassCard>

        {/* CTA */}
        <View style={styles.ctaBtnShadow}>
          <Pressable onPress={handleStartLock} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
            <LinearGradient
              colors={["#FFBF80", "#FFA660"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Feather name="plus-circle" size={22} color="#000000" />
              <Text style={styles.ctaBtnText}>{t("lockAppsNow")}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Active locks section */}
        <View style={styles.sectionRow}>
          <Feather name="lock" size={15} color="#FFBF80" />
          <Text style={styles.sectionTitle}>{t("activeLocks")}</Text>
          {!loading && displayItems.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{displayItems.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <GlassCard style={styles.loadingCard} padding={24}>
            <Text style={styles.loadingText}>{t("loadingLocks")}</Text>
          </GlassCard>
        ) : displayItems.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.lockList}>
            {displayItems.map((item, i) => (
              <LockCard key={`${item.lockId}-${item.app.id}`} item={item} index={i} />
            ))}
          </View>
        )}

        {displayItems.length > 0 && (
          <GlassCard
            style={styles.warningCard}
            borderColor="rgba(255,69,58,0.3)"
            backgroundColor="rgba(255,69,58,0.08)"
            padding={14}
          >
            <Feather name="alert-triangle" size={14} color="#FF453A" />
            <Text style={styles.warningText}>{t("warningText")}</Text>
          </GlassCard>
        )}
      </ScrollView>

      <Toast visible={toast} message={t("lockActivated")} type="success" onHide={() => setToast(false)} />
    </GradientBackground>
  );
}

// "Home" tab — always shows DuckPal skin.
// "Home Pro" tab (home-pro.tsx) always shows DuckLock skin.
// Switching is done via the tab bar; AppModeContext is no longer used for routing.
export default function HomeScreen() {
  return <DuckPalScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 2 },
  appTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.8 },

  // ── Home header: avatar + glassy brand ──────────────────────────────────────
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255,191,128,0.5)",
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrandPill: {},
  headerBrandText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.4,
  },
  duckContainer: {
    width: 72,
    height: 72,
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  duckVideo: {
    width: 72,
    height: 72,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statWrapper: { flex: 1 },
  statCard: { alignItems: "center" },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 3 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  ctaBtnShadow: {
    borderRadius: 20,
    shadowColor: "#FFBF80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 18, borderRadius: 20,
  },
  ctaBtnText: { color: "#000000", fontSize: 17, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", flex: 1 },
  countBadge: { backgroundColor: "#FFBF80", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, minWidth: 24, alignItems: "center" },
  countText: { color: "#000000", fontSize: 12, fontFamily: "Inter_700Bold" },
  lockList: { gap: 10 },
  lockCard: {},
  lockCardInner: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  lockIconBg: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,203,142,0.12)", overflow: "hidden" },
  lockInfo: { flex: 1, gap: 4 },
  lockAppName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  lockRemaining: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#FFBF80" },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#2C2C2E", overflow: "hidden", marginVertical: 4 },
  progressFill: { height: "100%", borderRadius: 2 },
  lockExpiry: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  lockBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" },
  loadingCard: { alignItems: "center" },
  loadingText: { color: "#8E8E93", fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyCard: { alignItems: "center", gap: 12 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,203,142,0.12)" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF", textAlign: "center" },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", textAlign: "center", lineHeight: 22 },
  warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 4 },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#FF453A", lineHeight: 18 },
  reelsLockCard: {},
  reelsLockRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  reelsLockEmoji: { width: 28, height: 28 },
  reelsLockCenter: { flex: 1, gap: 8 },
  reelsLockTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  reelsLockPill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  reelsLockDot: { width: 9, height: 9, borderRadius: 5 },
  reelsLockPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  duckPalHeroPlaceholder: {
    alignSelf: "stretch",
    height: 280,
  },
  duckPalHeroVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  duckPalReelsCountBlock: { alignItems: "center", gap: 2 },
  duckPalReelsCountNumber: {
    fontSize: 64,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 72,
  },
  duckPalReelsCountLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#8E8E93",
    textAlign: "center",
  },
  duckPalSplitCard: { alignSelf: "stretch" },
  duckPalSplitRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  duckPalSplitItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  duckPalSplitIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  duckPalSplitCount: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  duckPalSplitDivider: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.1)" },
  duckPalScrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  duckPalWeekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 16,
  },
  duckPalWeekLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", minWidth: 90, textAlign: "center" },
  chartRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120, gap: 8 },
  chartBarWrapper: { flex: 1, alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" },
  chartBarTrack: {
    width: "100%",
    height: 90,
    justifyContent: "flex-end",
  },
  chartBarFill: { width: "100%", borderRadius: 8 },
  chartBarLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  duckPalTotalsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  duckPalTotalItem: { flex: 1, alignItems: "center", gap: 4 },
  duckPalTotalValue: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  duckPalTotalLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  duckPalTotalsDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.1)" },
  duckPalTopAppCount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  // ── DuckPal redesign ─────────────────────────────────────────────────────────

  dpScrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },

  // Centered profile section — big avatar + name + email below the shared header row
  dpProfileSection: { alignItems: "center", gap: 6, paddingBottom: 4 },

  // Avatar with dashed accent ring
  dpAvatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: "#FFBF80",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    padding: 4,
  },
  dpAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  dpAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  dpProfileName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  dpProfileEmail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
  },

  // Stats row
  dpStatsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  dpStatCol: { flex: 1, alignItems: "center", gap: 5 },
  dpStatIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dpStatNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#FFBF80" },
  dpStatLbl: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
  },
  dpStatDiv: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.1)" },

  // Day-by-day calendar strip — FlatList-based, 801 pre-generated dates.
  // dpCalOuter clips to exactly 7 cells; position:relative anchors the fixed frame.
  dpCalOuter: { overflow: "hidden", position: "relative" },
  dpCalItem: {
    // width set dynamically via inline style (calCellWidth)
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
  },
  // Fixed highlight frame — absolutely positioned at centre slot (3 of 0–6).
  dpCalFrame: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFBF80",
    backgroundColor: "rgba(255,191,128,0.07)",
  },
  dpCalDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#3A3A3C" },
  dpCalDotSelected: { backgroundColor: "#FFBF80" },
  dpCalDayName: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  dpCalDayNameSelected: { color: "#FFBF80" },
  dpCalDateNum: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  dpCalDateNumSelected: { color: "#FFBF80" },

  // Friends + Streak row
  dpMidRow: { flexDirection: "row", gap: 12, alignItems: "stretch" },

  dpFriendsSection: {
    flex: 0.38,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  dpAvatarStack: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dpFriendBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#000000",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  dpFriendBubbleImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  dpFriendBubbleInitial: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000000",
  },
  dpFriendsTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  dpFriendsSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#FFBF80" },

  // Carousel outer shell — no padding/flexDirection here; StreakCarousel owns its own layout.
  dpStreakCard: {
    flex: 0.62,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    overflow: "hidden",
  },

  // Task card — Revolut-style dark elevated promo card
  dpTaskCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: "#18181F",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    // Android elevation
    elevation: 8,
  },
  dpTaskContent: { gap: 6 },
  dpTaskTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  dpTaskSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
    lineHeight: 19,
  },
  dpTaskBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  dpTaskBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
  },

});
