import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { Toast } from "@/components/ui/Toast";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useLock } from "@/context/LockContext";
import {
  ActiveLockDisplayItem,
  formatExpiryDate,
  formatTimeRemaining,
  getLockProgress,
  useActiveLocks,
} from "@/hooks/useLockStorage";

/* ── Animated stat card ── */
function StatCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.statWrapper,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <GlassCard style={styles.statCard} padding={16}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </GlassCard>
    </Animated.View>
  );
}

/* ── Lock card with glass and progress ── */
function LockCard({
  item,
  index,
}: {
  item: ActiveLockDisplayItem;
  index: number;
}) {
  const progress = getLockProgress(item.startTime, item.endTime);
  const remaining = formatTimeRemaining(item.endTime);
  const expiry = formatExpiryDate(item.endTime);

  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 150,
        friction: 12,
        delay: index * 80,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <GlassCard style={styles.lockCard}>
        <View style={styles.lockCardInner}>
          {/* App icon */}
          <LinearGradient
            colors={[item.app.iconColor + "33", item.app.iconColor + "18"]}
            style={styles.lockIconBg}
          >
            <FontAwesome5
              name={item.app.iconName as any}
              size={22}
              color={item.app.iconColor}
            />
          </LinearGradient>

          {/* Info */}
          <View style={styles.lockInfo}>
            <Text style={styles.lockAppName}>{item.app.name}</Text>
            <Text style={styles.lockRemaining}>{remaining}</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>

            <Text style={styles.lockExpiry}>Unlocks {expiry}</Text>
          </View>

          {/* Lock badge */}
          <View style={styles.lockBadge}>
            <Feather name="lock" size={14} color="rgba(255,255,255,0.5)" />
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

/* ── Empty state ── */
function EmptyState() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  return (
    <GlassCard style={styles.emptyCard} padding={32}>
      <Animated.View
        style={[styles.emptyIcon, { transform: [{ scale: pulseAnim }] }]}
      >
        <LinearGradient
          colors={["rgba(99,102,241,0.3)", "rgba(99,102,241,0.1)"]}
          style={styles.emptyIconGrad}
        >
          <Feather name="unlock" size={32} color="#6366F1" />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.emptyTitle}>No Active Locks</Text>
      <Text style={styles.emptyBody}>
        Tap "Lock Apps Now" to commit to a distraction-free session.
      </Text>
    </GlassCard>
  );
}

/* ── Home Screen ── */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resetSelection } = useLock();
  const { displayItems, locks, loading } = useActiveLocks(30_000);
  const [toast, setToast] = React.useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : 84;

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerY, { toValue: 0, useNativeDriver: true, tension: 150, friction: 10 }),
    ]).start();
  }, [headerOpacity, headerY]);

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
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { transform: [{ translateY: headerY }], opacity: headerOpacity },
          ]}
        >
          <View>
            <Text style={styles.greeting}>Stay focused,</Text>
            <Text style={styles.appTitle}>FocusLock</Text>
          </View>
          <View style={styles.shieldBadge}>
            <LinearGradient
              colors={
                totalAppsBlocked > 0
                  ? ["#6366F1", "#8B5CF6"]
                  : ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.04)"]
              }
              style={styles.shieldGrad}
            >
              <Feather
                name="shield"
                size={22}
                color={totalAppsBlocked > 0 ? "#fff" : "rgba(255,255,255,0.4)"}
              />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            value={locks.length}
            label="Locks"
            color="#6366F1"
          />
          <StatCard
            value={totalAppsBlocked}
            label="Blocked"
            color="#FF006E"
          />
          <StatCard
            value={avgDays > 0 ? `${avgDays}d` : "—"}
            label="Avg"
            color="#00FF88"
          />
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={handleStartLock}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Feather name="plus-circle" size={22} color="#fff" />
            <Text style={styles.ctaBtnText}>Lock Apps Now</Text>
          </LinearGradient>
        </Pressable>

        {/* Active Locks */}
        <View style={styles.sectionRow}>
          <Feather name="lock" size={15} color="rgba(255,255,255,0.45)" />
          <Text style={styles.sectionTitle}>Active Locks</Text>
          {!loading && displayItems.length > 0 && (
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.countBadge}
            >
              <Text style={styles.countText}>{displayItems.length}</Text>
            </LinearGradient>
          )}
        </View>

        {loading ? (
          <GlassCard style={styles.loadingCard} padding={24}>
            <Text style={styles.loadingText}>Loading locks…</Text>
          </GlassCard>
        ) : displayItems.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.lockList}>
            {displayItems.map((item, i) => (
              <LockCard
                key={`${item.lockId}-${item.app.id}`}
                item={item}
                index={i}
              />
            ))}
          </View>
        )}

        {displayItems.length > 0 && (
          <GlassCard
            style={styles.warningCard}
            borderColor="rgba(255,0,85,0.25)"
            padding={14}
          >
            <Feather name="alert-triangle" size={14} color="#FF0055" />
            <Text style={styles.warningText}>
              Active locks cannot be removed until the timer expires. No
              exceptions.
            </Text>
          </GlassCard>
        )}
      </ScrollView>

      <Toast
        visible={toast}
        message="✓ Lock activated successfully!"
        type="success"
        onHide={() => setToast(false)}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  shieldBadge: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  shieldGrad: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statWrapper: { flex: 1 },
  statCard: { alignItems: "center" },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  lockList: { gap: 10 },
  lockCard: {},
  lockCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  lockIconBg: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  lockInfo: { flex: 1, gap: 4 },
  lockAppName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  lockRemaining: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginVertical: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  lockExpiry: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
  lockBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: { alignItems: "center" },
  loadingText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  emptyCard: { alignItems: "center", gap: 12 },
  emptyIcon: {},
  emptyIconGrad: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF0055",
    lineHeight: 18,
  },
});
