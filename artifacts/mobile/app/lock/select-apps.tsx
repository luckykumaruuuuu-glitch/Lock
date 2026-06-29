import { FontAwesome5, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { DUMMY_APPS, AppItem, useLock } from "@/context/LockContext";
import { getActiveLocks } from "@/hooks/useLockStorage";
import { useSounds } from "@/hooks/useSounds";

function AppIcon({ app, dimmed }: { app: AppItem; dimmed: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed || !app.iconUrl) {
    return (
      <View style={[styles.iconFallback, { backgroundColor: dimmed ? "#2C2C2E" : app.iconColor }]}>
        <FontAwesome5
          name={app.iconName as any}
          size={28}
          color={dimmed ? "#3A3A3C" : "#FFFFFF"}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: app.iconUrl }}
      style={[styles.appIcon, { opacity: dimmed ? 0.3 : 1 }]}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

function AppCard({ app, selected, alreadyLocked, onToggle, index }: {
  app: AppItem; selected: boolean; alreadyLocked: boolean; onToggle: () => void; index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10, delay: index * 40 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim, index]);

  useEffect(() => {
    Animated.spring(checkScale, { toValue: selected ? 1 : 0, useNativeDriver: true, tension: 250, friction: 8 }).start();
  }, [selected, checkScale]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <Pressable onPress={alreadyLocked ? undefined : onToggle}>
        <GlassCard
          borderColor={alreadyLocked ? "rgba(255,255,255,0.05)" : selected ? "rgba(255,214,10,0.5)" : "rgba(255,255,255,0.1)"}
          backgroundColor={alreadyLocked ? "#1C1C1E" : selected ? "rgba(255,214,10,0.08)" : "#1C1C1E"}
          padding={14}
        >
          <View style={styles.appRow}>
            <AppIcon app={app} dimmed={alreadyLocked} />
            <View style={styles.appInfo}>
              <Text style={[styles.appName, { color: alreadyLocked ? "#3A3A3C" : "#FFFFFF" }]}>{app.name}</Text>
              <Text style={styles.appCategory}>{alreadyLocked ? "Already locked" : app.category}</Text>
            </View>
            {alreadyLocked ? (
              <View style={styles.lockedBadge}><Feather name="lock" size={12} color="#3A3A3C" /></View>
            ) : (
              <View style={[styles.checkbox, { borderColor: selected ? "#FFD60A" : "#3A3A3C" }]}>
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  {selected && (
                    <LinearGradient colors={["#FFD60A", "#FF9F0A"]} style={styles.checkFill}>
                      <Feather name="check" size={12} color="#000000" />
                    </LinearGradient>
                  )}
                </Animated.View>
              </View>
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function SelectAppsScreen() {
  const insets = useSafeAreaInsets();
  const { selection, setSelectedApps } = useLock();
  const { playClick } = useSounds();
  const [search, setSearch] = useState("");
  const [alreadyLockedPkgs, setAlreadyLockedPkgs] = useState<Set<string>>(new Set());
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    getActiveLocks().then((active) => setAlreadyLockedPkgs(new Set(active.flatMap((l) => l.apps.map((a) => a.packageName)))));
  }, []);

  const filtered = DUMMY_APPS.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
  const selectedIds = new Set(selection.selectedApps.map((a) => a.id));
  const alreadyLockedCount = filtered.filter((a) => alreadyLockedPkgs.has(a.packageName)).length;

  const toggle = useCallback((app: AppItem) => {
    if (alreadyLockedPkgs.has(app.packageName)) return;
    playClick();
    Haptics.selectionAsync();
    if (selectedIds.has(app.id)) {
      setSelectedApps(selection.selectedApps.filter((a) => a.id !== app.id));
    } else {
      setSelectedApps([...selection.selectedApps, app]);
    }
  }, [alreadyLockedPkgs, selectedIds, selection.selectedApps, setSelectedApps, playClick]);

  function handleNext() {
    if (selection.selectedApps.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/lock/duration");
  }

  return (
    <GradientBackground>
      <GlassCard style={styles.searchBar} borderColor="rgba(255,255,255,0.1)" radius={16}>
        <View style={styles.searchInner}>
          <Feather name="search" size={16} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps…"
            placeholderTextColor="#3A3A3C"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color="#8E8E93" /></Pressable>}
        </View>
      </GlassCard>

      {selection.selectedApps.length > 0 && (
        <View style={styles.selBanner}>
          <Feather name="check-circle" size={14} color="#FFD60A" />
          <Text style={styles.selText}>{selection.selectedApps.length} app{selection.selectedApps.length !== 1 ? "s" : ""} selected</Text>
        </View>
      )}

      {alreadyLockedCount > 0 && (
        <View style={styles.infoBanner}>
          <Feather name="info" size={12} color="#8E8E93" />
          <Text style={styles.infoText}>{alreadyLockedCount} app{alreadyLockedCount !== 1 ? "s are" : " is"} already locked</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AppCard app={item} selected={selectedIds.has(item.id)} alreadyLocked={alreadyLockedPkgs.has(item.packageName)} onToggle={() => toggle(item)} index={index} />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <Pressable onPress={handleNext} disabled={selection.selectedApps.length === 0} style={({ pressed }) => [{ opacity: selection.selectedApps.length === 0 ? 0.35 : pressed ? 0.85 : 1 }]}>
          <LinearGradient colors={["#FFD60A", "#FF9F0A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
            <Text style={styles.nextBtnText}>Next — Set Duration</Text>
            <Feather name="arrow-right" size={18} color="#000000" />
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  searchBar: { margin: 16, marginBottom: 8 },
  searchInner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  selBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,214,10,0.1)" },
  selText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFD60A" },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  list: { paddingHorizontal: 16, paddingBottom: 8 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  appIcon: { width: 56, height: 56, borderRadius: 14 },
  iconFallback: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  appCategory: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  checkFill: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  lockedBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#2C2C2E", alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#2C2C2E", backgroundColor: "rgba(0,0,0,0.95)" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: 18, shadowColor: "#FFD60A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  nextBtnText: { color: "#000000", fontSize: 16, fontFamily: "Inter_700Bold" },
});
