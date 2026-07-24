import { FontAwesome5, Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
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

const DAY_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_LONG = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function formatDate(d: Date) {
  return `${DAY_LONG[d.getDay()]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;
}

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "instagram", color: "#E1306C", count: 0 },
  { key: "youtube",   label: "YouTube",   icon: "youtube",   color: "#FF0000", count: 0 },
  { key: "facebook",  label: "Facebook",  icon: "facebook",  color: "#1877F2", count: 0 },
] as const;

const MAX_REELS = 20; // scale bars against this ceiling

// ── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBar({ count, color }: { count: number; color: string }) {
  const pct = Math.max(4, Math.min(100, (count / MAX_REELS) * 100));
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${count === 0 ? 4 : pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: "#2C2C2E",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function DateDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ? new Date(params.date) : new Date();
  const isToday = date.toDateString() === new Date().toDateString();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <GradientBackground>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerDate}>{formatDate(date)}</Text>
            {isToday && <Text style={styles.headerToday}>Today</Text>}
          </View>
        </View>

        {/* ── Summary label ── */}
        <Text style={styles.sectionLabel}>Reels watched by platform</Text>

        {/* ── Platform cards ── */}
        {PLATFORMS.map((p) => (
          <View key={p.key} style={styles.platformCard}>
            {/* Icon */}
            <View style={[styles.platformIcon, { backgroundColor: p.color }]}>
              <FontAwesome5 name={p.icon} size={18} color="#FFF" />
            </View>

            {/* Name + bar + count */}
            <View style={styles.platformBody}>
              <View style={styles.platformRow}>
                <Text style={styles.platformName}>{p.label}</Text>
                <Text style={[styles.platformCount, { color: p.color }]}>
                  {p.count}
                </Text>
              </View>
              <MiniBar count={p.count} color={p.color} />
              <Text style={styles.platformSub}>
                {p.count === 0
                  ? "No reels recorded for this day"
                  : `${p.count} reel${p.count !== 1 ? "s" : ""} watched`}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Empty state note ── */}
        <View style={styles.emptyNote}>
          <Feather name="info" size={14} color="#8E8E93" />
          <Text style={styles.emptyNoteText}>
            Per-platform tracking will populate once your focus sessions are recorded.
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: { flex: 1, gap: 2 },
  headerDate: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  headerToday: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FFBF80",
    letterSpacing: 0.4,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  platformCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  platformBody: { flex: 1, gap: 8 },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  platformName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  platformCount: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  platformSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
  },

  emptyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
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
