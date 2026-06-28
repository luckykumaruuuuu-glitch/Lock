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
  { id: "1d" as DurationPreset, label: "1 Day",   sublabel: "24 hours of focus",  icon: "sun"    as const, colors: ["#FFD580", "#FFA500"] as [string, string], glow: "#FFD580" },
  { id: "7d" as DurationPreset, label: "7 Days",  sublabel: "One full week",       icon: "calendar" as const, colors: ["#FFD580", "#FFA500"] as [string, string], glow: "#FFD580" },
  { id: "30d" as DurationPreset, label: "30 Days", sublabel: "Build a new habit",  icon: "award"  as const, colors: ["#FFD580", "#FFA500"] as [string, string], glow: "#FFD580" },
  { id: "custom" as DurationPreset, label: "Custom", sublabel: "Pick any date",   icon: "edit-2" as const, colors: ["#3D7A4A", "#4CAF60"] as [string, string], glow: "#4CAF50" },
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/* ── Helpers ── */
function msToDays(ms: number) { return Math.ceil(ms / 86400000); }
function startOfToday(): Date { const d = new Date(); d.setHours(0,0,0,0); return d; }
function tomorrowStart(): Date { const d = startOfToday(); d.setDate(d.getDate() + 1); return d; }
function maxDate(): Date { const d = startOfToday(); d.setDate(d.getDate() + 365); return d; }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfWeek(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ── Custom dark golden calendar ── */
function DarkCalendar({
  visible,
  initial,
  minDate,
  maxDateVal,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  initial: Date;
  minDate: Date;
  maxDateVal: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected,  setSelected]  = useState<Date>(initial);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const totalDays  = daysInMonth(viewYear, viewMonth);
  const startBlank = firstDayOfWeek(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array(startBlank).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isBefore(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0);
    return d < minDate;
  }
  function isAfter(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0);
    return d > maxDateVal;
  }
  function isSelected(day: number): boolean {
    return sameDay(selected, new Date(viewYear, viewMonth, day));
  }
  function isToday(day: number): boolean {
    return sameDay(new Date(), new Date(viewYear, viewMonth, day));
  }

  function selectDay(day: number) {
    if (isBefore(day) || isAfter(day)) return;
    Haptics.selectionAsync();
    setSelected(new Date(viewYear, viewMonth, day));
  }

  // Check if prev/next navigation should be disabled
  const canGoPrev = !(viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth());
  const canGoNext = !(viewYear === maxDateVal.getFullYear() && viewMonth === maxDateVal.getMonth());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>

          {/* Header — month/year + arrows */}
          <LinearGradient colors={["#1C0A00", "#2A1200"]} style={calStyles.header}>
            <Pressable
              onPress={prevMonth}
              disabled={!canGoPrev}
              style={({ pressed }) => [calStyles.navBtn, { opacity: !canGoPrev ? 0.22 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="chevron-left" size={22} color="#FFD580" />
            </Pressable>

            <View style={{ alignItems: "center" }}>
              <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]}</Text>
              <Text style={calStyles.yearLabel}>{viewYear}</Text>
            </View>

            <Pressable
              onPress={nextMonth}
              disabled={!canGoNext}
              style={({ pressed }) => [calStyles.navBtn, { opacity: !canGoNext ? 0.22 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="chevron-right" size={22} color="#FFD580" />
            </Pressable>
          </LinearGradient>

          {/* Day-of-week row */}
          <View style={calStyles.dayRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={calStyles.dayLabel}>{d}</Text>
            ))}
          </View>

          <View style={calStyles.divider} />

          {/* Calendar grid */}
          <View style={calStyles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`blank-${idx}`} style={calStyles.cell} />;
              const disabled = isBefore(day) || isAfter(day);
              const sel      = isSelected(day);
              const today    = isToday(day);
              return (
                <Pressable key={`${day}`} onPress={() => selectDay(day)} style={calStyles.cell} disabled={disabled}>
                  {sel ? (
                    <LinearGradient colors={["#FFD580", "#FFA500"]} style={calStyles.selCircle}>
                      <Text style={calStyles.selDayText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[calStyles.dayCircle, today && calStyles.todayRing]}>
                      <Text style={[
                        calStyles.dayText,
                        disabled && { color: "rgba(255,248,240,0.15)" },
                        today && !disabled && { color: "#FFD580" },
                      ]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Selected date summary */}
          <View style={calStyles.selectedRow}>
            <Feather name="calendar" size={13} color="#FFD580" />
            <Text style={calStyles.selectedText}>
              {selected.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>

          <View style={calStyles.divider} />

          {/* CANCEL / OK */}
          <View style={calStyles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [calStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={calStyles.cancelBtnText}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={() => onConfirm(selected)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient colors={["#FFD580", "#FFA500"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={calStyles.okBtn}>
                <Text style={calStyles.okBtnText}>OK</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  sheet:   { width: "100%", maxWidth: 360, backgroundColor: "#000000", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,213,128,0.2)" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18 },
  navBtn:  { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  yearLabel:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,213,128,0.45)", marginTop: 2 },
  dayRow:  { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  dayLabel:{ flex: 1, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,213,128,0.45)" },
  divider: { height: 1, backgroundColor: "rgba(255,213,128,0.08)", marginHorizontal: 16 },
  grid:    { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8 },
  cell:    { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  dayCircle: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  todayRing: { borderWidth: 1, borderColor: "rgba(255,213,128,0.45)" },
  dayText:   { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  selCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#FFD580", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  selDayText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  selectedText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,213,128,0.7)" },
  btnRow:  { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, paddingTop: 14 },
  cancelBtn:   { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5 },
  okBtn:       { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  okBtnText:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1A1A1A", letterSpacing: 0.5 },
});

/* ── Main Duration Screen ── */
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

  function handleCalendarConfirm(date: Date) {
    setShowPicker(false);
    const today = startOfToday();
    if (date <= today) return;
    setPickedDate(date);
    const days = msToDays(date.getTime() - Date.now());
    setCustomDays(String(Math.max(1, days)));
    setCustomHours("0");
  }

  function getSummary(): string {
    if (selection.durationPreset === "custom") {
      if (!pickedDate) return "No date selected";
      const days = msToDays(pickedDate.getTime() - Date.now());
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    return DURATION_OPTIONS.find(o => o.id === selection.durationPreset)?.label ?? "";
  }

  function getPickerLabel(): string {
    if (!pickedDate) return "Choose end date";
    return pickedDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }

  const canProceed =
    selection.durationPreset !== "custom" ||
    (pickedDate !== null && pickedDate > startOfToday());

  const selectedOpt = DURATION_OPTIONS.find(o => o.id === selection.durationPreset);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>How long?</Text>
        <Text style={styles.subheading}>Duration is final — you can't change it after confirming.</Text>

        {/* 2×2 Grid */}
        <View style={styles.grid}>
          {DURATION_OPTIONS.map(opt => {
            const selected = selection.durationPreset === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => handleSelect(opt.id)}
                style={({ pressed }) => [styles.gridCell, { opacity: pressed ? 0.82 : 1 }]}
              >
                <GlassCard
                  style={[styles.optCard, selected && { shadowColor: opt.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 16, elevation: 10 }]}
                  borderColor={selected ? opt.colors[0] + "80" : "rgba(255,213,128,0.18)"}
                  backgroundColor={selected ? opt.colors[0] + "22" : "rgba(28,28,30,0.85)"}
                  padding={0}
                >
                  <LinearGradient
                    colors={selected ? opt.colors : ["rgba(50,50,50,0.5)", "rgba(28,28,30,0.4)"]}
                    style={styles.iconBox}
                  >
                    <Feather name={opt.icon} size={26} color={selected ? "#1A1A1A" : "#FFD580"} />
                  </LinearGradient>
                  <Text style={[styles.optLabel, { color: selected ? "#FFFFFF" : "rgba(255,255,255,0.5)" }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optSublabel}>{opt.sublabel}</Text>
                  {selected && <View style={[styles.selectedDot, { backgroundColor: opt.colors[0] }]} />}
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        {/* Custom date picker card */}
        {selection.durationPreset === "custom" && (
          <GlassCard padding={20} borderColor="rgba(76,175,80,0.2)">
            <Text style={styles.customTitle}>Pick End Date</Text>
            <Text style={styles.customHint}>Select the date when you want your lock to expire.</Text>

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.dateButton}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={pickedDate ? ["rgba(76,175,80,0.25)", "rgba(61,143,50,0.15)"] : ["rgba(61,31,10,0.5)", "rgba(40,18,4,0.35)"]}
                style={styles.dateButtonInner}
              >
                <Feather name="calendar" size={18} color={pickedDate ? "#4CAF60" : "#C47B2B"} />
                <Text style={[styles.dateButtonText, { color: pickedDate ? "#7ED96A" : "rgba(212,165,116,0.55)" }]}>
                  {getPickerLabel()}
                </Text>
                <Feather name="chevron-right" size={16} color={pickedDate ? "#4CAF60" : "rgba(196,123,43,0.4)"} />
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

        {/* Dark golden custom calendar */}
        <DarkCalendar
          visible={showPicker}
          initial={pickedDate ?? tomorrowStart()}
          minDate={tomorrowStart()}
          maxDateVal={maxDate()}
          onCancel={() => setShowPicker(false)}
          onConfirm={handleCalendarConfirm}
        />

        {/* Duration summary pill */}
        <LinearGradient
          colors={selectedOpt
            ? [selectedOpt.colors[0] + "28", selectedOpt.colors[1] + "10"]
            : ["rgba(255,213,128,0.12)", "rgba(255,165,0,0.06)"]}
          style={styles.summary}
        >
          <Feather name="clock" size={14} color={selectedOpt?.colors[0] ?? "#FFD580"} />
          <Text style={styles.summaryText}>
            Duration:{" "}
            <Text style={[styles.summaryBold, { color: selectedOpt?.colors[0] ?? "#FFD580" }]}>
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
          style={({ pressed }) => [{ opacity: !canProceed ? 0.32 : pressed ? 0.82 : 1 }]}
        >
          <LinearGradient
            colors={["#FFD580", "#FFA500"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>Next — Review & Confirm</Text>
            <Feather name="arrow-right" size={18} color="#1A1A1A" />
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content:   { paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  heading:   { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 },
  subheading:{ fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", lineHeight: 20, marginTop: -4 },

  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCell:  { width: "47.5%" },
  optCard:   { alignItems: "center", minHeight: 148, justifyContent: "center", position: "relative", gap: 10, paddingVertical: 22, paddingHorizontal: 12, borderRadius: 20 },
  iconBox:   { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  optLabel:  { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  optSublabel:{ fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 15 },
  selectedDot:{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },

  customTitle:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 4 },
  customHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", lineHeight: 17, marginBottom: 14 },
  dateButton: { borderRadius: 14, overflow: "hidden" },
  dateButtonInner:{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,213,128,0.2)" },
  dateButtonText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  daysPreview:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  daysPreviewText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#4CAF60" },

  summary:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 15, borderRadius: 15 },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  summaryBold: { fontFamily: "Inter_700Bold" },

  footer:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,213,128,0.1)", backgroundColor: "rgba(0,0,0,0.92)" },
  nextBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 18, shadowColor: "#FFD580", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10 },
  nextBtnText: { color: "#1A1A1A", fontSize: 16, fontFamily: "Inter_700Bold" },
});
