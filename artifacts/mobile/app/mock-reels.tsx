/**
 * mock-reels.tsx — Fake Instagram Reels interface for "Phone Flip Down" unlock challenge.
 *
 * Counting rule (mirrors ReelSessionTracker.kt):
 *   • maxForwardIndex tracks the highest reel index EVER reached this session.
 *   • A scroll only counts when the new index > maxForwardIndex — i.e. a genuinely
 *     never-seen-before reel. Going back and re-scrolling forward never increments.
 *
 * Visual-only interactions (no backend / no persistence):
 *   • Like button  — heart fill/pulse animation on tap; local state only.
 *   • Follow button — toggles "Follow" ↔ "Following" text/style; local state only.
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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
/** Change this to 100, 200, or any number to adjust the unlock difficulty. */
const TARGET_SCROLLS = 10;
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Fake reel content ─────────────────────────────────────────────────────────
const REELS = [
  { id: "r1",  bg: "#0e0a1f", accent: "#7C3AED", user: "@cosmic.vibes",   caption: "the universe is vast 🌌",       likes: "48.2k", comments: "1.3k", shares: "892"  },
  { id: "r2",  bg: "#070f1c", accent: "#2563EB", user: "@ocean.waves",    caption: "deep blue feelings 🌊",         likes: "31.7k", comments: "984",  shares: "512"  },
  { id: "r3",  bg: "#071810", accent: "#16A34A", user: "@forest.walks",   caption: "into the wild 🌿",              likes: "22.4k", comments: "730",  shares: "411"  },
  { id: "r4",  bg: "#1c1007", accent: "#D97706", user: "@golden.hour",    caption: "chasing sunsets 🌅",            likes: "64.1k", comments: "2.1k", shares: "1.8k" },
  { id: "r5",  bg: "#1c0710", accent: "#DB2777", user: "@night.city",     caption: "city lights never sleep 🌃",    likes: "18.9k", comments: "442",  shares: "290"  },
  { id: "r6",  bg: "#071c1c", accent: "#0891B2", user: "@chill.sounds",   caption: "lofi & relax 🎵",               likes: "55.8k", comments: "1.7k", shares: "3.2k" },
  { id: "r7",  bg: "#101c07", accent: "#84CC16", user: "@minimal.art",    caption: "less is more ✨",               likes: "41.0k", comments: "1.1k", shares: "720"  },
  { id: "r8",  bg: "#1c1c07", accent: "#CA8A04", user: "@retro.vibes",    caption: "good old days 📼",              likes: "27.3k", comments: "803",  shares: "560"  },
  { id: "r9",  bg: "#1c071c", accent: "#9333EA", user: "@dream.state",    caption: "somewhere in my mind 💭",       likes: "39.5k", comments: "1.4k", shares: "910"  },
  { id: "r10", bg: "#07071c", accent: "#6366F1", user: "@midnight.sky",   caption: "stars above 🌟",                likes: "72.0k", comments: "2.5k", shares: "2.1k" },
  { id: "r11", bg: "#141414", accent: "#D1D5DB", user: "@shadow.art",     caption: "contrast is key 🖤",            likes: "15.6k", comments: "511",  shares: "338"  },
  { id: "r12", bg: "#0f1a1c", accent: "#34D399", user: "@wave.length",    caption: "feel the frequency 〰️",        likes: "29.8k", comments: "867",  shares: "614"  },
] as const;

type ReelData = (typeof REELS)[number];

/** Extended list item — uid is unique per instance for infinite-list keyExtractor */
type ReelListItem = ReelData & { uid: string };

/** Builds one "page" of reels with globally unique uids (pageIndex prevents key collisions) */
function makeReelPage(pageIndex: number): ReelListItem[] {
  return (REELS as readonly ReelData[]).map((r) => ({
    ...r,
    uid: `${pageIndex}-${r.id}`,
  }));
}

// ── Static action button ───────────────────────────────────────────────────────
function ActionBtn({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}) {
  return (
    <View style={styles.actionBtn}>
      <Feather name={icon} size={27} color="#FFFFFF" />
      {label ? <Text style={styles.actionLabel}>{label}</Text> : null}
    </View>
  );
}

// ── Like button — visual-only, heart fill + pulse on tap ──────────────────────
function LikeBtn({ likes }: { likes: string }) {
  const [isLiked, setIsLiked] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    setIsLiked((v) => !v);
    // Scale-punch: grow then settle back
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.42,
        useNativeDriver: true,
        speed: 50,
        bounciness: 18,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  return (
    <Pressable onPress={handlePress} style={styles.actionBtn} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {/* Feather "heart" is always outline; colour change to red gives the liked look */}
        <Feather name="heart" size={27} color={isLiked ? "#FF3B30" : "#FFFFFF"} />
      </Animated.View>
      <Text style={[styles.actionLabel, isLiked && styles.likedLabel]}>{likes}</Text>
    </Pressable>
  );
}

// ── Follow button — visual-only toggle "Follow" ↔ "Following" ────────────────
function FollowBtn({ accent }: { accent: string }) {
  const [isFollowing, setIsFollowing] = useState(false);
  return (
    <Pressable
      onPress={() => setIsFollowing((v) => !v)}
      style={[styles.followBtn, isFollowing && styles.followBtnActive]}
      hitSlop={6}
    >
      <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
        {isFollowing ? "Following" : "Follow"}
      </Text>
    </Pressable>
  );
}

// ── Single reel item ──────────────────────────────────────────────────────────
// React.memo is kept — it prevents re-renders from the parent FlatList passing
// new props. Internal useState/useRef hooks work normally inside memo-wrapped components.
const ReelItem = React.memo(function ReelItem({
  item,
  bottomInset,
}: {
  item: ReelData;
  bottomInset: number;
}) {
  return (
    <View style={[styles.reel, { backgroundColor: item.bg }]}>
      {/* Soft radial glow from accent colour */}
      <View style={[styles.reelGlow, { backgroundColor: item.accent + "18" }]} />

      {/* ── Right-side action column ──────────────────────────────── */}
      <View style={[styles.rightBar, { paddingBottom: bottomInset + 90 }]}>

        {/* Like — animated heart, visual only */}
        <LikeBtn likes={item.likes} />

        {/* Comment, Share, More — static */}
        <ActionBtn icon="message-circle" label={item.comments} />
        <ActionBtn icon="send"           label={item.shares}   />
        <ActionBtn icon="more-vertical"  label=""              />
      </View>

      {/* ── Bottom info ───────────────────────────────────────────── */}
      <View style={[styles.bottomInfo, { paddingBottom: bottomInset + 18 }]}>
        {/* Avatar + username + Follow — single row (Instagram layout) */}
        <View style={styles.userRow}>
          <View style={[styles.avatarCircle, { borderColor: item.accent }]}>
            <Feather name="user" size={14} color={item.accent} />
          </View>
          <Text style={styles.reelUser} numberOfLines={1}>{item.user}</Text>
          <FollowBtn accent={item.accent} />
        </View>
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function MockReelsScreen() {
  const insets = useSafeAreaInsets();
  // useWindowDimensions gives live height — avoids stale SCREEN_H at module load.
  // Stored in a ref so handleScrollEnd (stable useCallback) always reads current value.
  const { height: windowHeight } = useWindowDimensions();
  const itemHeightRef = useRef(windowHeight);
  itemHeightRef.current = windowHeight;

  // ── FIX 3: Infinite reel list ─────────────────────────────────────────────
  // Start with 3 pages (36 items) so there is always content ahead.
  // onEndReached appends another page automatically.
  const [reelList, setReelList] = useState<ReelListItem[]>(() => [
    ...makeReelPage(0),
    ...makeReelPage(1),
    ...makeReelPage(2),
  ]);
  const reelPageRef = useRef(2); // index of last appended page

  const [scrollCount, setScrollCount] = useState(0);

  const completedRef     = useRef(false);
  // currentIdxRef  — which reel is currently on screen (updated on every scroll)
  const currentIdxRef    = useRef(0);
  // maxForwardIdxRef — highest index ever reached this session (mirrors ReelSessionTracker.kt).
  // A scroll is counted ONLY when newIdx > maxForwardIdx (never-seen-before reel).
  // Back-scrolling and then re-scrolling forward does NOT increment the count.
  const maxForwardIdxRef = useRef(-1);   // -1 = session start, reel-0 not yet counted
  const scrollCountRef   = useRef(0);

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const counterScale = useRef(new Animated.Value(1)).current;

  // ── Completion effect ─────────────────────────────────────────────────────
  // useCallback with [] — all deps (completedRef, counterScale, flashOpacity, router)
  // are stable refs / module-level singletons. This stable reference lets the
  // onViewableItemsChanged ref (initialized once) safely close over it.
  const triggerCompletion = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Haptic burst — three heavy impacts in rapid succession
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 110);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 220);

    // Counter scale-punch
    Animated.sequence([
      Animated.spring(counterScale, { toValue: 1.6,  useNativeDriver: true, speed: 40, bounciness: 14 }),
      Animated.spring(counterScale, { toValue: 1,    useNativeDriver: true, speed: 16, bounciness: 8  }),
    ]).start();

    // White flash
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.72, duration: 100, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0,    duration: 480, useNativeDriver: true }),
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
    }, 620);
  }, []);

  // Refs for onScroll debounce (mouse/trackpad web — see handleScroll below)
  const scrollDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY          = useRef(0);

  // ── Core scroll logic ─────────────────────────────────────────────────────
  // Takes a settled y-offset and applies maxForwardIdx duplicate-prevention.
  // Uses SCREEN_H (same value as reel item style height) — critical for correct
  // Math.round() snapping.  getItemLayout also uses SCREEN_H for consistency.
  const handleScrollEnd = useCallback(
    (y: number) => {
      if (completedRef.current) return;
      const newIdx = Math.round(y / SCREEN_H);
      if (newIdx === currentIdxRef.current) return;
      currentIdxRef.current = newIdx;

      if (newIdx > maxForwardIdxRef.current) {
        // Genuinely new reel (maxForwardIndex pattern — mirrors ReelSessionTracker.kt)
        maxForwardIdxRef.current = newIdx;
        scrollCountRef.current  += 1;
        setScrollCount(scrollCountRef.current);
        if (scrollCountRef.current >= TARGET_SCROLLS) {
          triggerCompletion();
        }
      }
      // else: back-scroll or re-scroll to already-seen reel → no-op
    },
    // triggerCompletion has [] deps (stable); SCREEN_H is module-level const.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // onMomentumScrollEnd (native) + onScrollEndDrag (touch-web):
  // fires AFTER the snap animation completes — safe to update state here.
  const handleSnapEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      // Cancel any pending debounce — native event takes priority.
      if (scrollDebounceTimer.current) clearTimeout(scrollDebounceTimer.current);
      handleScrollEnd(e.nativeEvent.contentOffset.y);
    },
    [handleScrollEnd],
  );

  // onScroll debounce — catches mouse-wheel / trackpad scrolls on web where
  // onMomentumScrollEnd / onScrollEndDrag do not fire.
  // Fires 150 ms after the LAST scroll tick, i.e. after the CSS snap has settled.
  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      lastScrollY.current = e.nativeEvent.contentOffset.y;
      if (scrollDebounceTimer.current) clearTimeout(scrollDebounceTimer.current);
      scrollDebounceTimer.current = setTimeout(() => {
        handleScrollEnd(lastScrollY.current);
      }, 150);
    },
    [handleScrollEnd],
  );

  // ── FIX 3: Append another page when approaching the end ──────────────────
  const handleEndReached = useCallback(() => {
    reelPageRef.current += 1;
    setReelList((prev) => [...prev, ...makeReelPage(reelPageRef.current)]);
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
        data={reelList}
        keyExtractor={(r) => r.uid}
        renderItem={({ item }) => (
          <ReelItem item={item} bottomInset={insets.bottom} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        // Native snap (fires AFTER animation completes — no mid-scroll re-renders)
        onMomentumScrollEnd={handleSnapEnd}
        onScrollEndDrag={handleSnapEnd}
        // Web mouse/trackpad fallback: debounce fires 150 ms after last scroll tick
        onScroll={handleScroll}
        scrollEventThrottle={100}
        // SCREEN_H matches reel item style height exactly — critical for correct
        // Math.round(offset/SCREEN_H) index calculation and pagingEnabled snapping.
        getItemLayout={(_, index) => ({
          length: SCREEN_H,
          offset: SCREEN_H * index,
          index,
        })}
        // FIX 3: append another page when user is 50% from the end
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        scrollEnabled={!completedRef.current}
        bounces={false}
        overScrollMode="never"
        windowSize={9}
        maxToRenderPerBatch={4}
        initialNumToRender={3}
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
    gap: 20,
  },

  // Avatar circle (now lives in bottomInfo / userRow)
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Follow / Following pill button
  followBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "transparent",
  },

  followBtnActive: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  followBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  followBtnTextActive: {
    color: "rgba(255,255,255,0.55)",
  },

  // Generic action button
  actionBtn: { alignItems: "center", gap: 3 },

  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Like label when liked
  likedLabel: { color: "#FF3B30" },

  // ── Bottom info ───────────────────────────────────────────────────────────
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 14,
    right: 76,
    gap: 4,
  },

  // Avatar + username + Follow on one row
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
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

  progressFill: { height: 2, borderRadius: 1 },

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
