import { FontAwesome5, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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

import { useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";
import {
  ActiveLockDisplayItem,
  formatExpiryDate,
  formatTimeRemaining,
  getLockProgress,
  useActiveLocks,
} from "@/hooks/useLockStorage";

/* ───────────────────────────────────────────────
   Active Lock Card — real data
─────────────────────────────────────────────── */
function ActiveLockCard({
  item,
  colors,
}: {
  item: ActiveLockDisplayItem;
  colors: ReturnType<typeof useColors>;
}) {
  const progress = getLockProgress(item.startTime, item.endTime);
  const remaining = formatTimeRemaining(item.endTime);
  const expiry = formatExpiryDate(item.endTime);

  return (
    <View
      style={[
        styles.lockCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.lockIconBg, { backgroundColor: item.app.iconColor + "18" }]}
      >
        <FontAwesome5
          name={item.app.iconName as any}
          size={20}
          color={item.app.iconColor}
        />
      </View>
      <View style={styles.lockCardContent}>
        <Text style={[styles.lockAppName, { color: colors.foreground }]}>
          {item.app.name}
        </Text>
        <Text style={[styles.lockTimeLeft, { color: colors.mutedForeground }]}>
          {remaining}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.lockExpiry, { color: colors.mutedForeground }]}>
          Unlocks {expiry}
        </Text>
      </View>
      <View style={[styles.lockBadge, { backgroundColor: colors.muted }]}>
        <Feather name="lock" size={14} color={colors.mutedForeground} />
      </View>
    </View>
  );
}

/* ───────────────────────────────────────────────
   Empty state
─────────────────────────────────────────────── */
function EmptyLocksState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View
      style={[
        styles.emptyBox,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.primary + "12" }]}
      >
        <Feather name="unlock" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        No Active Locks
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
        Tap "Select Apps to Lock" to start your first lock session.
      </Text>
    </View>
  );
}

/* ───────────────────────────────────────────────
   Home Screen
─────────────────────────────────────────────── */
export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resetSelection } = useLock();
  const { displayItems, locks, loading } = useActiveLocks(30_000);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  const totalAppsBlocked = displayItems.length;
  const avgDays =
    locks.length > 0
      ? Math.round(
          locks.reduce(
            (acc, l) => acc + (l.endTime - l.startTime) / (24 * 60 * 60 * 1000),
            0
          ) / locks.length
        )
      : 0;

  function handleStartLock() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetSelection();
    router.push("/lock/select-apps");
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Stay focused,
          </Text>
          <Text style={[styles.appTitle, { color: colors.foreground }]}>
            FocusLock
          </Text>
        </View>
        <View
          style={[
            styles.shieldBadge,
            { backgroundColor: totalAppsBlocked > 0 ? colors.primary + "18" : colors.muted },
          ]}
        >
          <Feather
            name="shield"
            size={22}
            color={totalAppsBlocked > 0 ? colors.primary : colors.mutedForeground}
          />
        </View>
      </View>

      {/* Stats row */}
      <View
        style={[
          styles.statsRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {locks.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Active Locks
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {totalAppsBlocked}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Apps Blocked
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {avgDays > 0 ? `${avgDays}d` : "—"}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Avg Duration
          </Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable
        onPress={handleStartLock}
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <Feather name="plus-circle" size={20} color="#fff" />
        <Text style={styles.startButtonText}>Select Apps to Lock</Text>
      </Pressable>

      {/* Active Locks section */}
      <View style={styles.sectionHeader}>
        <Feather name="lock" size={15} color={colors.mutedForeground} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Active Locks
        </Text>
        {!loading && displayItems.length > 0 && (
          <View
            style={[
              styles.countBadge,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.countBadgeText}>{displayItems.length}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View
          style={[
            styles.loadingBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading locks…
          </Text>
        </View>
      ) : displayItems.length === 0 ? (
        <EmptyLocksState colors={colors} />
      ) : (
        displayItems.map((item) => (
          <ActiveLockCard
            key={`${item.lockId}-${item.app.id}`}
            item={item}
            colors={colors}
          />
        ))
      )}

      {/* Warning banner */}
      {displayItems.length > 0 && (
        <View
          style={[
            styles.warningBanner,
            {
              backgroundColor: colors.destructive + "12",
              borderColor: colors.destructive + "30",
            },
          ]}
        >
          <Feather name="alert-triangle" size={14} color={colors.destructive} />
          <Text style={[styles.warningText, { color: colors.destructive }]}>
            Active locks cannot be removed until the timer expires. No
            exceptions.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 2 },
  appTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  statDivider: { width: 1, height: 32, marginHorizontal: 8 },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 1 },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  countBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  lockCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  lockIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockCardContent: { flex: 1, gap: 3 },
  lockAppName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  lockTimeLeft: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%", borderRadius: 2 },
  lockExpiry: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBox: {
    alignItems: "center",
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
