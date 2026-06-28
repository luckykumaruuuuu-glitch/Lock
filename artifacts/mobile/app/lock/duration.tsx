import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
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
import { GradientBackground } from "@/components/ui/GradientBackground";
import { DurationPreset, useLock } from "@/context/LockContext";
import { useSounds } from "@/hooks/useSounds";

/* ── Duration options ── */
const DURATION_OPTIONS = [
  {
    id: "1d" as DurationPreset,
    label: "1 Day",
    sublabel: "24 hours of focus",
    icon: "sun" as const,
    colors: ["#C47B2B", "#E8943A"] as [string, string],
    glow: "#C47B2B",
  },
  {
    id: "7d" as DurationPreset,
    label: "7 Days",
    sublabel: "One full week",
    icon: "calendar" as const,
    colors: ["#E07040", "#C45020"] as [string, string],
    glow: "#E07040",
  },
  {
    id: "30d" as DurationPreset,
    label: "30 Days",
    sublabel: "Build a new habit",
    icon: "award" as const,
    colors: ["#A0522D", "#C47B2B"] as [string, string],
    glow: "#C47B2B",
  },
  {
    id: "custom" as DurationPreset,
    label: "Custom",
    sublabel: "Pick any date",
    icon: "edit-2" as const,
    colors: ["#3D7A4A", "#4CAF60"] as [string, string],
    glow: "#4CAF50",
  },
];

/* ── Helper: ms to day count ── */
function msToDays(ms: number): number {
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrowStart(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function maxDate(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 365);
  return d;
}

export default function DurationScreen() {
  const insets = useSafeAreaInsets();
  const { selection, setDurationPreset, setCustomDays, setCustomHours } = useLock();
  const { playClick } = useSounds();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showPicker, setShowPicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);

  function handleSelect(preset: DurationPreset) {
    playClick();
    Haptics.selectionAsync();
    setDurationPreset(preset);
    if (preset !== "custom") {
      setPickedDate(null);
      setCustomDays("0");
      setCustomHours("0");
    }
  }

  function onDateChange(_: any, selectedDate?: Date) {
    setShowPicker(false);
    if (!selectedDate) return;

    const today = startOfToday();
    if (selectedDate <= today) return;

    setPickedDate(selectedDate);

    const diffMs = selectedDate.getTime() - Date.now();
    const days = msToDays(diffMs);
    setCustomDays(String(Math.max(1, days)));
    setCustomHours("0");
  }

  function getSummary(): string {
    if (selection.durationPreset === "custom") {
      if (!pickedDate) return "No date selected";
      const days = msToDays(pickedDate.getTime() - Date.now());
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    return DURATION_OPTIONS.find((o) => o.id === selection.durationPreset)?.label ?? "";
  }

  function getPickerLabel(): string {
    if (!pickedDate) return "Choose end date";
    return pickedDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const canProceed =
    selection.durationPreset !== "custom" ||
    (pickedDate !== null && pickedDate > startOfToday());

  const selectedOpt = DURATION_OPTIONS.find((o) => o.id === selection.durationPreset);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>How long?</Text>
        <Text style={styles.subheading}>
          Duration is final — you can't change it after confirming.
        </Text>

        {/* 2×2 Grid */}
        <View style={styles.grid}>
          {DURATION_OPTIONS.map((opt) => {
            const selected = selection.durationPreset === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={({ pressed }) => [
                  styles.gridCell,
                  { opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <GlassCard
                  style={[
                    styles.optCard,
                    selected && {
                      shadowColor: opt.glow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.55,
                      shadowRadius: 16,
                      elevation: 10,
                    },
                  ]}
                  borderColor={
                    selected ? opt.colors[0] + "80" : "rgba(196,123,43,0.18)"
                  }
                  backgroundColor={
                    selected ? opt.colors[0] + "22" : "rgba(40,18,4,0.7)"
                  }
                  padding={0}
                >
                  {/* Top: icon */}
                  <LinearGradient
                    colors={
                      selected
                        ? opt.colors
                        : ["rgba(61,31,10,0.55)", "rgba(40,18,4,0.4)"]
                    }
                    style={styles.iconBox}
                  >
                    <Feather
                      name={opt.icon}
                      size={26}
                      color={selected ? "#FFF8F0" : "#C47B2B"}
                    />
                  </LinearGradient>

                  {/* Label */}
                  <Text
                    style={[
                      styles.optLabel,
                      { color: selected ? "#FFF8F0" : "rgba(212,165,116,0.65)" },
                    ]}
                  >
                    {opt.label}
                  </Text>

                  {/* Sublabel */}
                  <Text style={styles.optSublabel}>{opt.sublabel}</Text>

                  {/* Selected indicator */}
                  {selected && (
                    <View
                      style={[
                        styles.selectedDot,
                        { backgroundColor: opt.colors[0] },
                      ]}
                    />
                  )}
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        {/* Custom date picker — shown when Custom is selected */}
        {selection.durationPreset === "custom" && (
          <GlassCard padding={20} borderColor="rgba(76,175,80,0.2)">
            <Text style={styles.customTitle}>Pick End Date</Text>
            <Text style={styles.customHint}>
              Select the date when you want your lock to expire.
            </Text>

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.dateButton}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={
                  pickedDate
                    ? ["rgba(76,175,80,0.25)", "rgba(61,143,50,0.15)"]
                    : ["rgba(61,31,10,0.5)", "rgba(40,18,4,0.35)"]
                }
                style={styles.dateButtonInner}
              >
                <Feather
                  name="calendar"
                  size={18}
                  color={pickedDate ? "#4CAF60" : "#C47B2B"}
                />
                <Text
                  style={[
                    styles.dateButtonText,
                    { color: pickedDate ? "#7ED96A" : "rgba(212,165,116,0.55)" },
                  ]}
                >
                  {getPickerLabel()}
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={pickedDate ? "#4CAF60" : "rgba(196,123,43,0.4)"}
                />
              </LinearGradient>
            </TouchableOpacity>

            {pickedDate && (
              <View style={styles.daysPreview}>
                <Feather name="clock" size={13} color="#4CAF60" />
                <Text style={styles.daysPreviewText}>
                  {msToDays(pickedDate.getTime() - Date.now())} days from today
                </Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Android date picker — shown inline as modal */}
        {showPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={pickedDate ?? tomorrowStart()}
            mode="date"
            display="calendar"
            minimumDate={tomorrowStart()}
            maximumDate={maxDate()}
            onChange={onDateChange}
          />
        )}

        {/* iOS picker inside a modal */}
        {Platform.OS === "ios" && (
          <Modal transparent visible={showPicker} animationType="slide">
            <View style={styles.iosModalOverlay}>
              <View style={styles.iosPickerCard}>
                <View style={styles.iosPickerHeader}>
                  <Text style={styles.iosPickerTitle}>Select End Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowPicker(false)}
                    style={styles.iosDoneBtn}
                  >
                    <Text style={styles.iosDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickedDate ?? tomorrowStart()}
                  mode="date"
                  display="spinner"
                  minimumDate={tomorrowStart()}
                  maximumDate={maxDate()}
                  onChange={onDateChange}
                  style={{ backgroundColor: "#1A0D00" }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Duration summary pill */}
        <LinearGradient
          colors={
            selectedOpt
              ? [selectedOpt.colors[0] + "28", selectedOpt.colors[1] + "10"]
              : ["rgba(196,123,43,0.18)", "rgba(232,148,58,0.08)"]
          }
          style={styles.summary}
        >
          <Feather
            name="clock"
            size={14}
            color={selectedOpt?.colors[0] ?? "#C47B2B"}
          />
          <Text style={styles.summaryText}>
            Duration:{" "}
            <Text
              style={[
                styles.summaryBold,
                { color: selectedOpt?.colors[0] ?? "#E8943A" },
              ]}
            >
              {getSummary()}
            </Text>
          </Text>
        </LinearGradient>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/lock/confirm");
          }}
          disabled={!canProceed}
          style={({ pressed }) => [
            { opacity: !canProceed ? 0.32 : pressed ? 0.82 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#C47B2B", "#E8943A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>Next — Review & Confirm</Text>
            <Feather name="arrow-right" size={18} color="#FFF8F0" />
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 18 },

  heading: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#FFF8F0",
    letterSpacing: -1,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.7)",
    lineHeight: 20,
    marginTop: -4,
  },

  /* 2×2 grid */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCell: {
    width: "47.5%",
  },
  optCard: {
    alignItems: "center",
    minHeight: 148,
    justifyContent: "center",
    position: "relative",
    gap: 10,
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  optSublabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.38)",
    textAlign: "center",
    lineHeight: 15,
  },
  selectedDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  /* Custom date picker */
  customTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF8F0",
    marginBottom: 4,
  },
  customHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(212,165,116,0.5)",
    lineHeight: 17,
    marginBottom: 14,
  },
  dateButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  dateButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(196,123,43,0.25)",
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  daysPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  daysPreviewText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#4CAF60",
  },

  /* iOS modal */
  iosModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  iosPickerCard: {
    backgroundColor: "#1A0D00",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(196,123,43,0.2)",
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196,123,43,0.15)",
  },
  iosPickerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFF8F0",
  },
  iosDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(196,123,43,0.2)",
    borderRadius: 10,
  },
  iosDoneText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#E8943A",
  },

  /* Summary */
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 15,
    borderRadius: 15,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#D4A574",
  },
  summaryBold: { fontFamily: "Inter_700Bold" },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(196,123,43,0.1)",
    backgroundColor: "rgba(13,5,0,0.9)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 18,
    shadowColor: "#C47B2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
  },
  nextBtnText: {
    color: "#FFF8F0",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
