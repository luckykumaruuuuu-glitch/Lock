import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { DurationPreset, useLock } from "@/context/LockContext";
import { useSounds } from "@/hooks/useSounds";

const DURATION_OPTIONS = [
  { id: "1d" as DurationPreset, label: "1 Day", sublabel: "24 hours of focus", icon: "sun" as const, colors: ["#C47B2B", "#E8943A"] as const, glow: "#C47B2B" },
  { id: "7d" as DurationPreset, label: "7 Days", sublabel: "One full week", icon: "calendar" as const, colors: ["#FF6B35", "#E85A20"] as const, glow: "#FF6B35" },
  { id: "30d" as DurationPreset, label: "30 Days", sublabel: "Build a new habit", icon: "award" as const, colors: ["#A0522D", "#C47B2B"] as const, glow: "#C47B2B" },
  { id: "custom" as DurationPreset, label: "Custom", sublabel: "Up to 365 days", icon: "sliders" as const, colors: ["#3D9142", "#4CAF50"] as const, glow: "#4CAF50" },
];

const MAX_DAYS = 365;

export default function DurationScreen() {
  const insets = useSafeAreaInsets();
  const { selection, setDurationPreset, setCustomDays, setCustomHours } = useLock();
  const { playClick } = useSounds();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleSelect(preset: DurationPreset) {
    playClick();
    Haptics.selectionAsync();
    setDurationPreset(preset);
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/lock/confirm");
  }

  function handleCustomDays(val: string) {
    const n = parseInt(val) || 0;
    setCustomDays(n > MAX_DAYS ? String(MAX_DAYS) : val);
  }

  function handleCustomHours(val: string) {
    const n = parseInt(val) || 0;
    setCustomHours(n > 23 ? "23" : val);
  }

  function getSummary(): string {
    if (selection.durationPreset === "custom") {
      const d = Math.min(parseInt(selection.customDays) || 0, MAX_DAYS);
      const h = Math.min(parseInt(selection.customHours) || 0, 23);
      if (d === 0 && h === 0) return "No duration set";
      const parts = [];
      if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
      if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
      return parts.join(" and ");
    }
    return DURATION_OPTIONS.find((o) => o.id === selection.durationPreset)?.label ?? "";
  }

  const customDays = parseInt(selection.customDays) || 0;
  const customHours = parseInt(selection.customHours) || 0;
  const canProceed = selection.durationPreset !== "custom" || customDays > 0 || customHours > 0;
  const selectedOpt = DURATION_OPTIONS.find((o) => o.id === selection.durationPreset);

  return (
    <GradientBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.heading}>How long?</Text>
          <Text style={styles.subheading}>This duration is final — you can't change it after confirming.</Text>

          <View style={styles.optionsGrid}>
            {DURATION_OPTIONS.map((opt) => {
              const selected = selection.durationPreset === opt.id;
              return (
                <Pressable key={opt.id} onPress={() => handleSelect(opt.id)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, flex: 1 }]}>
                  <GlassCard
                    style={[styles.optCard, selected && { shadowColor: opt.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }]}
                    borderColor={selected ? opt.colors[0] + "60" : "rgba(196,123,43,0.22)"}
                    backgroundColor={selected ? opt.colors[0] + "18" : "rgba(61,31,10,0.65)"}
                    padding={16}
                  >
                    <LinearGradient colors={selected ? opt.colors : ["rgba(61,31,10,0.6)", "rgba(61,31,10,0.3)"]} style={styles.optIcon}>
                      <Feather name={opt.icon} size={20} color={selected ? "#FFF8F0" : "#D4A574"} />
                    </LinearGradient>
                    <Text style={[styles.optLabel, { color: selected ? "#FFF8F0" : "rgba(212,165,116,0.7)" }]}>{opt.label}</Text>
                    <Text style={styles.optSublabel}>{opt.sublabel}</Text>
                    {selected && <View style={[styles.selectedDot, { backgroundColor: opt.colors[0] }]} />}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>

          {selection.durationPreset === "custom" && (
            <GlassCard padding={20} style={styles.customBox}>
              <Text style={styles.customTitle}>Custom Duration</Text>
              <View style={styles.customRow}>
                <View style={styles.customGroup}>
                  <GlassCard backgroundColor="rgba(61,31,10,0.5)" borderColor="rgba(196,123,43,0.3)" radius={14}>
                    <TextInput style={styles.customInput} keyboardType="number-pad" value={selection.customDays} onChangeText={handleCustomDays} maxLength={3} placeholder="0" placeholderTextColor="rgba(212,165,116,0.3)" />
                  </GlassCard>
                  <Text style={styles.customUnit}>days</Text>
                </View>
                <Text style={styles.customPlus}>+</Text>
                <View style={styles.customGroup}>
                  <GlassCard backgroundColor="rgba(61,31,10,0.5)" borderColor="rgba(196,123,43,0.3)" radius={14}>
                    <TextInput style={styles.customInput} keyboardType="number-pad" value={selection.customHours} onChangeText={handleCustomHours} maxLength={2} placeholder="0" placeholderTextColor="rgba(212,165,116,0.3)" />
                  </GlassCard>
                  <Text style={styles.customUnit}>hours (0–23)</Text>
                </View>
              </View>
              <Text style={styles.maxNote}>Max: {MAX_DAYS} days</Text>
            </GlassCard>
          )}

          <LinearGradient
            colors={selectedOpt ? [selectedOpt.colors[0] + "20", selectedOpt.colors[1] + "10"] : ["rgba(196,123,43,0.15)", "rgba(232,148,58,0.08)"]}
            style={styles.summary}
          >
            <Feather name="clock" size={15} color={selectedOpt?.colors[0] ?? "#C47B2B"} />
            <Text style={styles.summaryText}>
              Duration: <Text style={[styles.summaryBold, { color: selectedOpt?.colors[0] ?? "#E8943A" }]}>{getSummary()}</Text>
            </Text>
          </LinearGradient>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
          <Pressable onPress={handleNext} disabled={!canProceed} style={({ pressed }) => [{ opacity: !canProceed ? 0.35 : pressed ? 0.85 : 1 }]}>
            <LinearGradient colors={["#C47B2B", "#E8943A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>Next — Review & Confirm</Text>
              <Feather name="arrow-right" size={18} color="#FFF8F0" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
  heading: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFF8F0", letterSpacing: -1 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#D4A574", lineHeight: 20, marginBottom: 4 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optCard: { alignItems: "center", gap: 8, minHeight: 120, justifyContent: "center", position: "relative" },
  optIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  optLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  optSublabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.4)", textAlign: "center" },
  selectedDot: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  customBox: { gap: 16 },
  customTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFF8F0" },
  customRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  customGroup: { flex: 1, alignItems: "center", gap: 8 },
  customInput: { height: 64, textAlign: "center", fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFF8F0", paddingHorizontal: 16 },
  customUnit: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#D4A574", textAlign: "center" },
  customPlus: { fontSize: 24, color: "rgba(212,165,116,0.35)", fontFamily: "Inter_400Regular", marginBottom: 20 },
  maxNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(212,165,116,0.3)", textAlign: "center" },
  summary: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, marginTop: 4 },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#D4A574" },
  summaryBold: { fontFamily: "Inter_700Bold" },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(196,123,43,0.12)", backgroundColor: "rgba(13,5,0,0.88)" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 17, borderRadius: 18, shadowColor: "#C47B2B", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  nextBtnText: { color: "#FFF8F0", fontSize: 16, fontFamily: "Inter_700Bold" },
});
