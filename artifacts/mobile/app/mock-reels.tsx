/**
 * mock-reels.tsx — Fake Instagram Reels interface for "Phone Flip Down" unlock challenge.
 *
 * How it works:
 *   • Full-screen vertical FlatList — each "reel" is a solid-colour placeholder (no real video).
 *   • Right-side chrome: avatar, Like, Comment, Share, More — identical layout to real Reels.
 *   • Floating counter badge (top-right) tracks how many reels the user has scrolled through.
 *   • When TARGET_SCROLLS is reached:
 *       1. Haptic burst (Heavy × 3 rapid-fire)
 *       2. White flash overlay + counter scale-punch animation
 *       3. After 600 ms: ReelsLock toggled OFF via native bridge + Instagram opened
 *   • No popup, no dialog, no text message on completion.
 *
 * To change the target: edit TARGET_SCROLLS below.
 * Native ReelsLockActivity / DuckPal / permissions — all untouched.
 */

import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
/** Change this to 100, 200, or any number to adjust the unlock difficulty. */
const TARGET_SCROLLS = 10;
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Fake reel content ─────────────────────────────────────────────────────────
// Replace `bg` with real image sources when ready. Keep placeholder colours for now.
const REELS = [
  { id: "r1",  bg: "#0e0a1f", accent: "#7C3AED", user: "@cosmic.vibes",   caption: "the universe is vast 🌌",       likes: "48.2k", comments: "1.3k", shares: "892" },
  { id: "r2",  bg: "#070f1c", accent: "#2563EB", user: "@ocean.waves",    caption: "deep blue feelings 🌊",         likes: "31.7k", comments: "984",  shares: "512" },
  { id: "r3",  bg: "#071810", accent: "#16A34A", user: "@forest.walks",   caption: "into the wild 🌿",              likes: "22.4k", comments: "730",  shares: "411" },
  { id: "r4",  bg: "#1c1007", accent: "#D97706", user: "@golden.hour",    caption: "chasing sunsets 🌅",            likes: "64.1k", comments: "2.1k", shares: "1.8k" },
  { id: "r5",  bg: "#1c0710", accent: "#DB2777", user: "@night.city",     caption: "city lights never sleep 🌃",    likes: "18.9k", comments: "#442", shares: "290" },
  { id: "r6",  bg: "#071c1c", accent: "#0891B2", user: "@chill.sounds",   caption: "lofi & relax 🎵",               likes: "55.8k", comments: "1.7k", shares: "3.2k" },
  { id: "r7",  bg: "#101c07", accent: "#84CC16", user: "@minimal.art",    caption: "less is more ✨",               likes: "41.0k", comments: "1.1k", shares: "720" },
  { id: "r8",  bg: "#1c1c07", accent: "#CA8A04", user: "@retro.vibes",    caption: "good old days 📼",              likes: "27.3k", comments: "803",  shares: "560" },
  { id: "r9",  bg: "#1c071c", accent: "#9333EA", user: "@dream.state",    caption: "somewhere in my mind 💭",       likes: "39.5k", comments: "1.4k", shares: "910" },
  { id: "r10", bg: "#07071c", accent: "#6366F1", user: "@midnight.sky",   caption: "stars above 🌟",                likes: "72.0k", comments: "2.5k", shares: "2.1k" },
  { id: "r11", bg: "#141414", accent: "#D1D5DB", user: "@shadow.art",     caption: "contrast is key 🖤",            likes: "15.6k", comments: "511",  shares: "338" },
  { id: "r12", bg: "#0f1a1c", accent: "#34D399", user: "@wave.length",    caption: "feel the frequency 〰️",        likes: "29.8k", comments: "867",  shares: "614" },
] as const;

// ── Single reel item ──────────────────────────────────────────────────────────
const ReelItem = React.memo(function ReelItem({
  item,
  bottomInset,
}: {
  item: (typeof REELS)[number];
  bottomInset: number;
}) {
  return (
    <View style={[styles.reel, { backgroundColor: item.bg }]}>
      {/* Soft radial glow from accent colour */}
      <View style={[styles.reelGlow, { backgroundColor: item.accent + "18" }]} />

      {/* ── Right-side action column ──────────────────────────────── */}
      <View style={[styles.rightBar, { paddingBottom: bottomInset + 90 }]}>
        {/* Profile avatar + follow dot */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarCircle, { borderColor: item.accent }]}>
            <Feather name="user" size={17} color={item.accent} />
          </View>
          <View style={[styles.followDot, { backgroundColor: item.accent }]}>
            <Feather name="plus" size={9} color="#FFF" />
          </View>
        </View>

        <ActionBtn icon="heart"          label={item.likes}    />
        <ActionBtn icon="message-circle" label={item.comments} />
        <ActionBtn icon="send"           label={item.shares}   />
        <ActionBtn icon="more-vertical"  label=""              />
      </View>

      {/* ── Bottom info ───────────────────────────────────────────── */}
      <View style={[styles.bottomInfo, { paddingBottom: bottomInset + 90 }]}>
        <Text style={styles.reelUser}>{item.user}</Text>
        <Text style={styles.reelCaption} numberOfLines={2}>{item.caption}</Text>
        <View style={styles.musicRow}>
          <Feather name="music" size={12} color="rgba(255,255,255,0.75)" />
          <Text style={styles.musicText}>  Original Sound · {item.user}</Text>
        </View>
      </View>

      {/* Decorative playback-progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { backgroundColor: item.accent, width: "58%" }]} />
      </View>
    </View>
  );
});

// ── Action button (right-side chrome) ─────────────────────────────────────────
function ActionBtn({ icon, label }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string }) {
  return (
    <View style={styles.actionBtn}>
      <Feather name={icon} size={27} color="#FFFFFF" />
      {label ? <Text style={styles.actionLabel}>{label}</Text> : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MockReelsScreen() {
  const insets = useSafeAreaInsets();

  const [scrollCount, setScrollCount] = useState(0);
  const [isDone, setIsDone]           = useState(false);

  const completedRef    = useRef(false);
  const currentIdxRef   = useRef(0);
  const scrollCountRef  = useRef(0);

  const flashOpacity  = useRef(new Animated.Value(0)).current;
  const counterScale  = useRef(new Animated.Value(1)).current;

  // ── Completion effect ─────────────────────────────────────────────────────
  function triggerCompletion() {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsDone(true);

    // Haptic burst — three heavy impacts in rapid succession
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 110);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220);

    // Counter scale-punch
    Animated.sequence([
      Animated.spring(counterScale, {
        toValue: 1.6,
        useNativeDriver: true,
        speed: 40,
        bounciness: 14,
      }),
      Animated.spring(counterScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 8,
      }),
    ]).start();

    // White flash
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.72, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,    duration: 480, useNativeDriver: true }),
    ]).start();

    // After effect: disable ReelsLock + open Instagram
    setTimeout(() => {
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }
      Linking.openURL("instagram://").catch(() => {
        Linking.openURL("https://www.instagram.com").catch(() => {});
      });
    }, 620);
  }

  // ── Scroll-end handler ────────────────────────────────────────────────────
  const handleScrollEnd = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    if (completedRef.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.y / SCREEN_H);
    if (idx !== currentIdxRef.current) {
      currentIdxRef.current = idx;
      scrollCountRef.current += 1;
      setScrollCount(scrollCountRef.current);
      if (scrollCountRef.current >= TARGET_SCROLLS) {
        triggerCompletion();
      }
    }
  }, []);

  // ── Back handler ──────────────────────────────────────────────────────────
  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/unlock-tasks");
  }

  const isDoneFlag = scrollCount >= TARGET_SCROLLS;

  return (
    <View style={styles.root}>

      {/* ── Reels FlatList ─────────────────────────────────────────────── */}
      <FlatList
        data={REELS as unknown as typeof REELS[number][]}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ReelItem item={item as typeof REELS[number]} bottomInset={insets.bottom} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(_, index) => ({
          length: SCREEN_H,
          offset: SCREEN_H * index,
          index,
        })}
        scrollEnabled={!completedRef.current}
        bounces={false}
        overScrollMode="never"
      />

      {/* ── Top chrome: X button + For You / Following tabs ───────────── */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.topBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.tabsRow}>
          <Text style={styles.tabText}>Following</Text>
          <Text style={[styles.tabText, styles.tabActive]}>For You</Text>
        </View>

        {/* Spacer to balance the X button */}
        <View style={styles.topBtn} />
      </View>

      {/* ── Floating scroll counter ───────────────────────────────────── */}
      <Animated.View
        style={[
          styles.counterBadge,
          { top: insets.top + 62 },
          isDoneFlag && styles.counterBadgeDone,
          { transform: [{ scale: counterScale }] },
        ]}
      >
        <View style={styles.counterRow}>
          <Text style={[styles.counterNum, isDoneFlag && styles.counterNumDone]}>
            {scrollCount}
          </Text>
          <Text style={[styles.counterDenom, isDoneFlag && styles.counterNumDone]}>
            /{TARGET_SCROLLS}
          </Text>
        </View>
        <Text style={[styles.counterSub, isDoneFlag && styles.counterSubDone]}>
          {isDoneFlag ? "✓ done" : "scrolls"}
        </Text>
      </Animated.View>

      {/* ── White flash overlay (completion effect) ───────────────────── */}
      <Animated.View
        style={[styles.flashOverlay, { opacity: flashOpacity }]}
        pointerEvents="none"
      />

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },

  // ── Reel ──────────────────────────────────────────────────────────────────
  reel: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  reelGlow: {
    position: "absolute",
    top: "15%",
    left: "5%",
    right: "5%",
    bottom: "15%",
    borderRadius: SCREEN_W,
  },

  // ── Right action column ───────────────────────────────────────────────────
  rightBar: {
    position: "absolute",
    right: 10,
    bottom: 0,
    alignItems: "center",
    gap: 22,
  },

  avatarWrap: { alignItems: "center", marginBottom: 2 },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  followDot: {
    position: "absolute",
    bottom: -7,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#000000",
  },

  actionBtn: { alignItems: "center", gap: 3 },

  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Bottom info ───────────────────────────────────────────────────────────
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 76,
    gap: 4,
  },

  reelUser: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  reelCaption: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  musicRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },

  musicText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
  },

  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  progressFill: {
    height: 2,
    borderRadius: 1,
  },

  // ── Top overlay ───────────────────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },

  topBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  tabsRow: { flexDirection: "row", gap: 22 },

  tabText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  tabActive: {
    color: "#FFFFFF",
    borderBottomWidth: 2.5,
    borderBottomColor: "#FFFFFF",
  },

  // ── Floating counter badge ────────────────────────────────────────────────
  counterBadge: {
    position: "absolute",
    right: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  counterBadgeDone: {
    borderColor: "#30D158",
    backgroundColor: "rgba(48,209,88,0.14)",
  },

  counterRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },

  counterNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 26,
  },

  counterNumDone: { color: "#30D158" },

  counterDenom: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },

  counterSub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },

  counterSubDone: { color: "#30D158" },

  // ── Completion flash ──────────────────────────────────────────────────────
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
});
