import { FontAwesome5, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientBackground } from "@/components/ui/GradientBackground";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDate(d: Date) {
  return `${DAY_LONG[d.getDay()]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

// ── Platform config (counts will come from real data later) ───────────────────

const PLATFORM_DEFS = [
  { key: "instagram", label: "Instagram", icon: "instagram" as const, color: "#E1306C" },
  { key: "youtube",   label: "YouTube",   icon: "youtube"   as const, color: "#FF0000" },
  { key: "facebook",  label: "Facebook",  icon: "facebook"  as const, color: "#1877F2" },
];

// Placeholder: in a real integration these come from the daily reel-count store.
// Counts are intentionally 0 until per-platform tracking is wired up.
const MOCK_COUNTS: Record<string, number> = {
  instagram: 0,
  youtube:   0,
  facebook:  0,
};

// ── Vertical bar chart ────────────────────────────────────────────────────────

const BAR_MAX_H = 140; // px — tallest possible bar

function PlatformBarChart({
  platforms,
}: {
  platforms: Array<{ key: string; label: string; icon: typeof PLATFORM_DEFS[number]["icon"]; color: string; count: number }>;
}) {
  const maxCount = Math.max(...platforms.map((p) => p.count), 1); // avoid ÷0

  return (
    <View style={chartStyles.wrap}>
      {platforms.map((p) => {
        const barH = Math.max(6, Math.round((p.count / maxCount) * BAR_MAX_H));
        return (
          <View key={p.key} style={chartStyles.col}>
            {/* count label above bar */}
            <Text style={chartStyles.countLabel}>
              {p.count > 0 ? p.count : ""}
            </Text>
            {/* bar track — bar sits at bottom */}
            <View style={chartStyles.track}>
              <View
                style={[
                  chartStyles.bar,
                  { height: barH, backgroundColor: p.color },
                ]}
              />
            </View>
            {/* platform icon below bar */}
            <View style={[chartStyles.iconCircle, { backgroundColor: p.color + "22" }]}>
              <FontAwesome5 name={p.icon} size={15} color={p.color} />
            </View>
            <Text style={chartStyles.iconLabel} numberOfLines={1}>
              {p.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    marginBottom: 24,
    // reserve fixed height = BAR_MAX_H + labels above + labels below
    minHeight: BAR_MAX_H + 80,
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  countLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    minHeight: 18,
  },
  track: {
    width: 36,
    height: BAR_MAX_H,
    justifyContent: "flex-end",
    backgroundColor: "#2C2C2E",
    borderRadius: 8,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
  },
});

// ── Ranked list row ───────────────────────────────────────────────────────────

function PlatformRow({
  platform,
  rank,
}: {
  platform: { key: string; label: string; icon: typeof PLATFORM_DEFS[number]["icon"]; color: string; count: number };
  rank: number;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.rank}>#{rank}</Text>
      <View style={[rowStyles.iconBox, { backgroundColor: platform.color }]}>
        <FontAwesome5 name={platform.icon} size={18} color="#FFF" />
      </View>
      <Text style={rowStyles.name}>{platform.label}</Text>
      <Text style={rowStyles.count}>
        {platform.count > 0 ? platform.count : "—"}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rank: {
    width: 22,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  count: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFBF80",
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DateDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ? new Date(params.date) : new Date();
  const isToday = date.toDateString() === new Date().toDateString();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Build platform list with counts, sorted highest first
  const platforms = useMemo(() => {
    return PLATFORM_DEFS
      .map((p) => ({ ...p, count: MOCK_COUNTS[p.key] ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, []);

  return (
    <GradientBackground>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerDate}>{formatDate(date)}</Text>
            {isToday && <Text style={styles.headerBadge}>Today</Text>}
          </View>
        </View>

        {/* ── Platform bar chart ── */}
        <Text style={styles.sectionLabel}>Reels by platform</Text>
        <PlatformBarChart platforms={platforms} />

        {/* ── Ranked list ── */}
        <Text style={styles.sectionLabel}>Ranking</Text>
        {platforms.map((p, i) => (
          <PlatformRow key={p.key} platform={p} rank={i + 1} />
        ))}

        {/* ── Empty-state note (shown when all counts are 0) ── */}
        {platforms.every((p) => p.count === 0) && (
          <View style={styles.emptyNote}>
            <Feather name="info" size={13} color="#8E8E93" />
            <Text style={styles.emptyNoteText}>
              Per-platform counts will appear here once focus sessions are recorded for this day.
            </Text>
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: { flex: 1, gap: 3 },
  headerDate: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  headerBadge: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FFBF80",
    letterSpacing: 0.4,
  },

  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  emptyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  emptyNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    lineHeight: 18,
  },
});
