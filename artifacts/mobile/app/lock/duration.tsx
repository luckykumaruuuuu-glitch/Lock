import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
  { id: "1d" as DurationPreset, label: "1 Day",    sublabel: "24 hours of focus",  icon: "sun"      as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "7d" as DurationPreset, label: "7 Days",   sublabel: "One full week",       icon: "calendar" as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "30d" as DurationPreset, label: "30 Days",  sublabel: "Build a new habit",  icon: "award"    as const, colors: ["#FFBF80", "#FFA660"] as [string, string], glow: "#FFBF80" },
  { id: "custom" as DurationPreset, label: "Custom", sublabel: "Pick any date",     icon: "edit-2"   as const, colors: ["#32D74B", "#30C244"] as [string, string], glow: "#32D74B" },
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

/* ── Clean dark calendar ── */
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

  const canGoPrev = !(viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth());
  const canGoNext = !(viewYear === maxDateVal.getFullYear() && viewMonth === maxDateVal.getMonth());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>

          {/* Header */}
          <View style={calStyles.header}>
            <Pressable
              onPress={prevMonth}
              disabled={!canGoPrev}
              style={({ pressed }) => [calStyles.navBtn, { opacity: !canGoPrev ? 0.22 : pressed ? 0.55 : 1 }]}
            >
              <Feather name="chevron-left" size={22} color="#FFBF80" />
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
              <Feather name="chevron-right" size={22} color="#FFBF80" />
            </Pressable>
          </View>

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
                    <LinearGradient colors={["#FFBF80", "#FFA660"]} style={calStyles.selCircle}>
                      <Text style={calStyles.selDayText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[calStyles.dayCircle, today && calStyles.todayRing]}>
                      <Text style={[
                        calStyles.dayText,
                        disabled && { color: "#3A3A3C" },
                        today && !disabled && { color: "#FFBF80" },
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
            <Feather name="calendar" size={13} color="#FFBF80" />
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
              <LinearGradient colors={["#FFBF80", "#FFA660"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={calStyles.okBtn}>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  sheet:   { width: "100%", maxWidth: 360, backgroundColor: "#1C1C1E", borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 18, backgroundColor: "#1C1C1E" },
  navBtn:  { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  yearLabel:  { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 2 },
  dayRow:  { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  dayLabel:{ flex: 1, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8E8E93" },
  divider: { height: 1, backgroundColor: "#2C2C2E", marginHorizontal: 16 },
  grid:    { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8 },
  cell:    { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  dayCircle: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  todayRing: { borderWidth: 1, borderColor: "#FFBF80" },
  dayText:   { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  selCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#FFBF80", shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  selDayText:{ fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000" },
  selectedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  selectedText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#8E8E93" },
  btnRow:  { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, paddingTop: 14 },
  cancelBtn:   { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#8E8E93", letterSpacing: 0.5 },
  okBtn:       { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  okBtnText:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000000", letterSpacing: 0.5 },
});

/* ── Time Picker Modal (for today's date) ── */
function TimePickerModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (hours: number, minutes: number) => void;
}) {
  function getDefaultTime(): { h: number; m: number } {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return { h: d.getHours() % 24, m: 0 };
  }

  const def = getDefaultTime();
  const [hour,   setHour]   = useState(def.h);
  const [minute, setMinute] = useState(def.m);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (visible) {
      const d = getDefaultTime();
      setHour(d.h);
      setMinute(d.m);
      setError("");
    }
  }, [visible]);

  function adjustHour(delta: number) {
    setError("");
    setHour(h => (h + delta + 24) % 24);
  }
  function adjustMinute(delta: number) {
    setError("");
    setMinute(m => (m + delta + 60) % 60);
  }

  function confirm() {
    const now    = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) {
      setError("Please select a future time");
      return;
    }
    onConfirm(hour, minute);
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>

          {/* Header */}
          <View style={tpStyles.header}>
            <Text style={calStyles.monthLabel}>Select End Time</Text>
            <Text style={tpStyles.headerSub}>Today — pick a future time</Text>
          </View>

          <View style={calStyles.divider} />

          {/* Hour + Minute columns */}
          <View style={tpStyles.timeRow}>
            {/* Hours */}
            <View style={tpStyles.col}>
              <Text style={tpStyles.colLabel}>Hour</Text>
              <Pressable
                onPress={() => adjustHour(1)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-up" size={26} color="#FFBF80" />
              </Pressable>
              <View style={tpStyles.valueBox}>
                <Text style={tpStyles.valueText}>{pad(hour)}</Text>
              </View>
              <Pressable
                onPress={() => adjustHour(-1)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-down" size={26} color="#FFBF80" />
              </Pressable>
            </View>

            <Text style={tpStyles.colon}>:</Text>

            {/* Minutes */}
            <View style={tpStyles.col}>
              <Text style={tpStyles.colLabel}>Minute</Text>
              <Pressable
                onPress={() => adjustMinute(5)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-up" size={26} color="#FFBF80" />
              </Pressable>
              <View style={tpStyles.valueBox}>
                <Text style={tpStyles.valueText}>{pad(minute)}</Text>
              </View>
              <Pressable
                onPress={() => adjustMinute(-5)}
                style={({ pressed }) => [tpStyles.arrow, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="chevron-down" size={26} color="#FFBF80" />
              </Pressable>
            </View>
          </View>

          {/* Error / spacer */}
          <View style={tpStyles.errorRow}>
            {!!error && (
              <>
                <Feather name="alert-circle" size={13} color="#FF453A" />
                <Text style={tpStyles.errorText}>{error}</Text>
              </>
            )}
          </View>

          <View style={calStyles.divider} />

          {/* CANCEL / CONFIRM */}
          <View style={calStyles.btnRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [calStyles.cancelBtn, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={calStyles.cancelBtnText}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={confirm}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <LinearGradient
                colors={["#FFBF80", "#FFA660"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={calStyles.okBtn}
              >
                <Text style={calStyles.okBtnText}>CONFIRM</Text>
              </LinearGradient>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  header:    { alignItems: "center", paddingHorizontal: 20, paddingVertical: 20, backgroundColor: "#1C1C1E" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#8E8E93", marginTop: 4 },
  timeRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 20 },
  col:       { alignItems: "center", gap: 10 },
  colLabel:  { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#8E8E93", letterSpacing: 0.8, textTransform: "uppercase" },
  arrow:     { padding: 4 },
  valueBox:  { width: 76, height: 68, alignItems: "center", justifyContent: "center", backgroundColor: "#2C2C2E", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,191,128,0.25)" },
  valueText: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#FFBF80" },
  colon:     { fontSize: 38, fontFamily: "Inter_700Bold", color: "#FFBF80", marginTop: 26 },
  errorRow:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingBottom: 14, minHeight: 30 },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF453A" },
});

/* ── Main Duration Screen ── */
export default function DurationScreen() {
  const insets = useSafeAreaInsets();
  const { selection, setDurationPreset, setCustomDays, setCustomHours } = useLock();
  const { playClick } = useSounds();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [showPicker,     setShowPicker]     = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickedDate,     setPickedDate]     = useState<Date | null>(null);

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

    // Today selected → open time picker instead
    if (sameDay(date, new Date())) {
      setShowTimePicker(true);
      return;
    }

    // Future date → existing logic
    const today = startOfToday();
    if (date <= today) return;
    setPickedDate(date);
    const days = msToDays(date.getTime() - Date.now());
    setCustomDays(String(Math.max(1, days)));
    setCustomHours("0");
  }

  function handleTimeConfirm(hours: number, minutes: number) {
    const now    = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target <= now) return; // validation already done in modal, safety guard

    const durationMs  = target.getTime() - now.getTime();
    const totalHours  = Math.ceil(durationMs / (60 * 60 * 1000));

    setPickedDate(target);
    setCustomDays("0");
    setCustomHours(String(Math.max(1, totalHours)));
    setShowTimePicker(false);
  }

  function getSummary(): string {
    if (selection.durationPreset === "custom") {
      if (!pickedDate) return "No date selected";
      if (sameDay(pickedDate, new Date())) {
        const durationMs = pickedDate.getTime() - Date.now();
        const totalHours = Math.ceil(durationMs / (60 * 60 * 1000));
        return `Today, ~${totalHours}h`;
      }
      const days = msToDays(pickedDate.getTime() - Date.now());
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    return DURATION_OPTIONS.find(o => o.id === selection.durationPreset)?.label ?? "";
  }

  function getPickerLabel(): string {
    if (!pickedDate) return "Choose end date";
    if (sameDay(pickedDate, new Date())) {
      return `Today at ${pickedDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
    }
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
                  style={[styles.optCard, selected && { shadowColor: opt.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 }]}
                  borderColor={selected ? opt.colors[0] + "80" : "rgba(255,255,255,0.1)"}
                  backgroundColor={selected ? "rgba(255,214,10,0.08)" : "#1C1C1E"}
                  padding={0}
                >
                  <View style={[styles.iconBox, { backgroundColor: selected ? opt.colors[0] + "22" : "#2C2C2E" }]}>
                    <Feather name={opt.icon} size={26} color={selected ? opt.colors[0] : "#8E8E93"} />
                  </View>
                  <Text style={[styles.optLabel, { color: selected ? "#FFFFFF" : "#8E8E93" }]}>
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
          <GlassCard padding={20} borderColor="rgba(50,215,75,0.2)">
            <Text style={styles.customTitle}>Pick End Date</Text>
            <Text style={styles.customHint}>Select the date when you want your lock to expire.</Text>

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              style={styles.dateButton}
              activeOpacity={0.75}
            >
              <View style={[styles.dateButtonInner, { backgroundColor: pickedDate ? "rgba(50,215,75,0.1)" : "#2C2C2E" }]}>
                <Feather name="calendar" size={18} color={pickedDate ? "#32D74B" : "#8E8E93"} />
                <Text style={[styles.dateButtonText, { color: pickedDate ? "#32D74B" : "#8E8E93" }]}>
                  {getPickerLabel()}
                </Text>
                <Feather name="chevron-right" size={16} color={pickedDate ? "#32D74B" : "#3A3A3C"} />
              </View>
            </TouchableOpacity>

            {pickedDate && (
              <View style={styles.daysPreview}>
                <Feather name="clock" size={13} color="#32D74B" />
                <Text style={styles.daysPreviewText}>
                  {sameDay(pickedDate, new Date())
                    ? `~${Math.ceil((pickedDate.getTime() - Date.now()) / (60 * 60 * 1000))} hours from now`
                    : `${msToDays(pickedDate.getTime() - Date.now())} days from today`}
                </Text>
              </View>
            )}
          </GlassCard>
        )}

        {/* Calendar — minDate includes today so user can select today */}
        <DarkCalendar
          visible={showPicker}
          initial={pickedDate ?? startOfToday()}
          minDate={startOfToday()}
          maxDateVal={maxDate()}
          onCancel={() => setShowPicker(false)}
          onConfirm={handleCalendarConfirm}
        />

        {/* Time picker — shown when today is selected */}
        <TimePickerModal
          visible={showTimePicker}
          onCancel={() => setShowTimePicker(false)}
          onConfirm={handleTimeConfirm}
        />

        {/* Duration summary pill */}
        <View style={[styles.summary, { backgroundColor: "#1C1C1E" }]}>
          <Feather name="clock" size={14} color={selectedOpt?.colors[0] ?? "#FFBF80"} />
          <Text style={styles.summaryText}>
            Duration:{" "}
            <Text style={[styles.summaryBold, { color: selectedOpt?.colors[0] ?? "#FFBF80" }]}>
              {getSummary()}
            </Text>
          </Text>
        </View>
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
            colors={["#FFBF80", "#FFA660"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>Next — Review & Confirm</Text>
            <Feather name="arrow-right" size={18} color="#000000" />
          </LinearGradient>
        </Pressable>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content:   { paddingHorizontal: 20, paddingTop: 24, gap: 18 },
  heading:   { fontSize: 34, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -1 },
  subheading:{ fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 20, marginTop: -4 },

  grid:      { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCell:  { width: "47.5%" },
  optCard:   { alignItems: "center", minHeight: 148, justifyContent: "center", position: "relative", gap: 10, paddingVertical: 22, paddingHorizontal: 12, borderRadius: 20 },
  iconBox:   { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  optLabel:  { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  optSublabel:{ fontSize: 11, fontFamily: "Inter_400Regular", color: "#3A3A3C", textAlign: "center", lineHeight: 15 },
  selectedDot:{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },

  customTitle:{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF", marginBottom: 4 },
  customHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8E8E93", lineHeight: 17, marginBottom: 14 },
  dateButton: { borderRadius: 14, overflow: "hidden" },
  dateButtonInner:{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  dateButtonText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  daysPreview:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  daysPreviewText:{ fontSize: 13, fontFamily: "Inter_500Medium", color: "#32D74B" },

  summary:     { flexDirection: "row", alignItems: "center", gap: 8, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#8E8E93" },
  summaryBold: { fontFamily: "Inter_700Bold" },

  footer:   { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#2C2C2E", backgroundColor: "rgba(0,0,0,0.95)" },
  nextBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 18, borderRadius: 18, shadowColor: "#FFBF80", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 10 },
  nextBtnText: { color: "#000000", fontSize: 16, fontFamily: "Inter_700Bold" },
});
