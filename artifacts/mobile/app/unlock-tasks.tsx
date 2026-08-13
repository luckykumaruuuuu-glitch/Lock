/**
 * unlock-tasks.tsx — JS/React version of UnlockTasksActivity.
 *
 * Exact design replica of the Kotlin native screen:
 *   • Pure black background
 *   • Top bar: grey drag-handle (centre) + back-arrow (left)
 *   • Bold heading "Choose a challenge to unlock"
 *   • 2-column card grid — 5 challenge cards with placeholder bg colours,
 *     bottom gradient overlay, white bold label bottom-left
 *   • Rows: [PhoneFlip, Forehead], [Walk, Jump], [Scroll]
 *
 * Click handlers are placeholder stubs — wired up later.
 * Navigation: Settings → "Update" section → shortcut button.
 * Native UnlockTasksActivity.kt is unchanged and untouched.
 */

import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

// ── Challenge definitions ─────────────────────────────────────────────────────
// Colours match the Kotlin CHALLENGES companion-object exactly.
const CHALLENGES = [
  {
    id: "phone_flip",
    label: "Scroll",
    bg: "#2A1F14",
    image: require("@/assets/challenge_phone_flip.webp"),
  },
  {
    id: "forehead",
    label: "Watch",
    bg: "#112230",
    image: require("@/assets/challenge_forehead_scan.webp"),
  },
  {
    id: "walk",
    label: "Circle Draw",
    bg: "#0F2018",
    image: require("@/assets/challenge_walk.webp"),
  },
  {
    id: "jump",
    label: "Squat",
    bg: "#101828",
    image: require("@/assets/challenge_jump.webp"),
  },
  {
    id: "scroll",
    label: "Push Up",
    bg: "#1A1228",
    image: require("@/assets/challenge_scroll.webp"),
  },
] as const;

// Card layout — mirrors Kotlin geometry
const COL_PADDING = 20; // left + right padding = 20 each side
const CARD_GAP    = 12;
const COL_W       = SCREEN_W - COL_PADDING * 2;
const CARD_W      = (COL_W - CARD_GAP) / 2;
const CARD_H      = Math.round(CARD_W * 1.22);
const CARD_RADIUS = 20;

// 2-column row groups — same as Kotlin rows list
const ROWS: Array<Array<number>> = [[0, 1], [2, 3], [4]];

// ── Single challenge card ─────────────────────────────────────────────────────
function ChallengeCard({
  challenge,
  onPress,
  isLeft,
}: {
  challenge: (typeof CHALLENGES)[number];
  onPress: () => void;
  isLeft: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: challenge.bg, marginRight: isLeft ? CARD_GAP : 0 },
        pressed && { opacity: 0.82 },
      ]}
    >
      <Image
        source={challenge.image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />

      {/* Dark gradient overlay — transparent at top (35%) → near-black at bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* White bold label — bottom-centre */}
      <Text style={styles.cardLabel}>{challenge.label}</Text>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function UnlockTasksScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleCardPress(id: string) {
    if (id === "phone_flip") {
      router.push("/mock-reels");
      return;
    }
    if (id === "forehead") {
      router.push("/watch-video");
      return;
    }
    if (id === "jump") {
      console.log("[UnlockTasks] Jump challenge tapped — navigating to /jump");
      router.push("/jump");
      return;
    }
    if (id === "walk") {
      router.push("/walk");
      return;
    }
    // Scroll — wired up later
    console.log(`[UnlockTasks] Card tapped: ${id}`);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/settings");
    }
  }

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          {/* Drag-handle — grey pill, centre */}
          <View style={styles.dragHandle} />

          {/* Back arrow — left-aligned */}
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="chevron-left" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* ── Heading ─────────────────────────────────────────────── */}
        <Text style={styles.heading}>Choose a challenge to unlock</Text>

        {/* ── 2-column card grid ─────────────────────────────────── */}
        {ROWS.map((indices, rowIdx) => (
          <View key={rowIdx} style={styles.cardRow}>
            {indices.map((cardIdx, posInRow) => (
              <ChallengeCard
                key={CHALLENGES[cardIdx].id}
                challenge={CHALLENGES[cardIdx]}
                onPress={() => handleCardPress(CHALLENGES[cardIdx].id)}
                isLeft={posInRow === 0 && indices.length > 1}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  scroll: {
    paddingHorizontal: COL_PADDING,
    paddingBottom: 36,
  },

  // Top bar — 48dp tall, relative positioned for absolute children
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Drag-handle pill — centred in topBar
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#5A5A5E",
  },

  // Back arrow — absolute left
  backBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingRight: 20,
  },

  // Heading — matches the reference: 26sp bold, white, single line
  heading: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "left",
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 34,
  },

  // Card row — horizontal, gap handled by isLeft marginRight
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: CARD_GAP,
  },

  // Single card — matches Kotlin geometry exactly
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    justifyContent: "flex-end",
  },

  // White bold label — bottom-centre, padding matches Kotlin (12/12/14)
  cardLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 12,
    paddingBottom: 14,
    lineHeight: 20,
  },
});
