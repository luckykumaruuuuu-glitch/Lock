import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { Toast } from "@/components/ui/Toast";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { PermissionGuardPopup } from "@/components/ui/PermissionGuardPopup";
import { useLanguage } from "@/context/LanguageContext";
import { useLock } from "@/context/LockContext";
import {
  ActiveLockDisplayItem,
  formatExpiryDate,
  formatTimeRemaining,
  getLockProgress,
  useActiveLocks,
} from "@/hooks/useLockStorage";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";

// Single combined video: 0–4 s = idle loop, 4–6 s = touch animation.
// Sound is already baked into the file by the user — no mute/unmute needed.
const DUCK_FULL = require("../../assets/duck-full.mp4");

function DuckCharacter() {
  // Ref instead of state: avoids re-subscribing the timeUpdate listener on
  // every tap. The listener reads isTouchedRef.current directly.
  const isTouchedRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(DUCK_FULL, (p) => {
    p.loop = false;
    // CRITICAL: timeUpdateEventInterval defaults to 0 in expo-video 3.x,
    // which means the timeUpdate event is NEVER emitted until this is set.
    // Without this, the idle loop (currentTime >= 4 → seek to 0) never fires,
    // the video plays 0→6 s once and freezes on the last frame.
    p.timeUpdateEventInterval = 0.1; // fire every 100 ms — accurate for 4 s / 6 s boundary
    p.play();
    console.log("[duck] initializer: loop=false, timeUpdateEventInterval=0.1, play() called, playing=", p.playing);
  });

  useEffect(() => {
    const sub = player.addListener("timeUpdate", ({ currentTime }) => {
      // Debug: confirm event fires and show values.
      // Remove these logs once behaviour is verified on device.
      console.log("[duck] timeUpdate:", currentTime.toFixed(2), "s | isTouched=", isTouchedRef.current, "| playing=", player.playing);

      if (!isTouchedRef.current && currentTime >= 4) {
        // Idle loop: 4 s reached → jump back to 0
        console.log("[duck] idle >=4 s → seek 0 + play()");
        player.currentTime = 0;
        player.play();
      }
      if (isTouchedRef.current && currentTime >= 6) {
        // Touch segment done → back to idle loop
        console.log("[duck] touch >=6 s → reset to idle, seek 0 + play()");
        isTouchedRef.current = false;
        player.currentTime = 0;
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  function handlePress() {
    // Tap during touch segment → restart from 4 s immediately
    // Tap during idle → enter touch segment from 4 s
    isTouchedRef.current = true;
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

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { resetSelection } = useLock();
  const { displayItems, locks, loading } = useActiveLocks(30_000);
  const { t } = useLanguage();
  const [toast, setToast] = React.useState(false);
  const { missingPerms, recheck } = usePermissionGuard();

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
        {/* Header */}
        <Animated.View style={[styles.header, { transform: [{ translateY: headerY }], opacity: headerOpacity }]}>
          <View>
            <Text style={styles.greeting}>{t("stayFocused")}</Text>
            <Text style={styles.appTitle}>{t("appTitle")}</Text>
          </View>
          <DuckCharacter />
        </Animated.View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={locks.length} label={t("locks")} color="#FFBF80" />
          <StatCard value={displayItems.length} label={t("blocked")} color="#FF453A" />
          <StatCard value={avgDays > 0 ? `${avgDays}d` : "—"} label={t("avg")} color="#32D74B" />
        </View>

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

      <PermissionGuardPopup missing={missingPerms} onRecheck={recheck} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", marginBottom: 2 },
  appTitle: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.8 },
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
  lockIconBg: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,203,142,0.12)" },
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
});
