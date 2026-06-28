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
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DUMMY_ACTIVE_LOCKS, useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";

function formatTimeLeft(days: number, hours: number): string {
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

function ActiveLockCard({
  lock,
  colors,
}: {
  lock: (typeof DUMMY_ACTIVE_LOCKS)[0];
  colors: ReturnType<typeof useColors>;
}) {
  const progress = Math.max(
    0,
    Math.min(1, 1 - lock.expiresInDays / 30)
  );

  return (
    <View
      style={[
        styles.lockCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.lockIconBg,
          { backgroundColor: lock.iconColor + "18" },
        ]}
      >
        <FontAwesome5 name={lock.iconName as any} size={20} color={lock.iconColor} />
      </View>
      <View style={styles.lockCardContent}>
        <Text style={[styles.lockAppName, { color: colors.foreground }]}>
          {lock.appName}
        </Text>
        <Text style={[styles.lockTimeLeft, { color: colors.mutedForeground }]}>
          {formatTimeLeft(lock.expiresInDays, lock.expiresInHours)}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.round((1 - lock.expiresInDays / 30) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={[styles.lockBadge, { backgroundColor: colors.muted }]}>
        <Feather name="lock" size={14} color={colors.mutedForeground} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resetSelection } = useLock();
  const colorScheme = useColorScheme();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

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
            { backgroundColor: colors.primary + "18" },
          ]}
        >
          <Feather name="shield" size={22} color={colors.primary} />
        </View>
      </View>

      <View
        style={[
          styles.statsRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {DUMMY_ACTIVE_LOCKS.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Active Locks
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            3
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Apps Blocked
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            14d
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Avg Duration
          </Text>
        </View>
      </View>

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

      <View style={styles.sectionHeader}>
        <Feather name="lock" size={15} color={colors.mutedForeground} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Active Locks
        </Text>
      </View>

      {DUMMY_ACTIVE_LOCKS.map((lock) => (
        <ActiveLockCard key={lock.id} lock={lock} colors={colors} />
      ))}

      <View
        style={[
          styles.warningBanner,
          { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" },
        ]}
      >
        <Feather name="alert-triangle" size={14} color={colors.destructive} />
        <Text style={[styles.warningText, { color: colors.destructive }]}>
          Active locks cannot be removed until the timer expires.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
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
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
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
  lockCardContent: {
    flex: 1,
    gap: 4,
  },
  lockAppName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  lockTimeLeft: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
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
