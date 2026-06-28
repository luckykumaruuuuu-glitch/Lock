import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DurationPreset, useLock } from "@/context/LockContext";
import { useColors } from "@/hooks/useColors";

interface DurationOption {
  id: DurationPreset;
  label: string;
  sublabel: string;
  icon: string;
}

const DURATION_OPTIONS: DurationOption[] = [
  { id: "1d", label: "1 Day", sublabel: "24 hours of focus", icon: "sun" },
  { id: "7d", label: "7 Days", sublabel: "One full week", icon: "calendar" },
  { id: "30d", label: "30 Days", sublabel: "Build a new habit", icon: "award" },
  { id: "custom", label: "Custom", sublabel: "Set your own duration", icon: "sliders" },
];

export default function DurationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { selection, setDurationPreset, setCustomDays, setCustomHours } = useLock();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleSelect(preset: DurationPreset) {
    Haptics.selectionAsync();
    setDurationPreset(preset);
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/lock/confirm");
  }

  function getDurationSummary(): string {
    if (selection.durationPreset === "custom") {
      const d = parseInt(selection.customDays) || 0;
      const h = parseInt(selection.customHours) || 0;
      if (d === 0 && h === 0) return "No duration set";
      const parts = [];
      if (d > 0) parts.push(`${d} day${d !== 1 ? "s" : ""}`);
      if (h > 0) parts.push(`${h} hour${h !== 1 ? "s" : ""}`);
      return parts.join(" and ");
    }
    const opt = DURATION_OPTIONS.find((o) => o.id === selection.durationPreset);
    return opt?.label ?? "";
  }

  const canProceed =
    selection.durationPreset !== "custom" ||
    parseInt(selection.customDays) > 0 ||
    parseInt(selection.customHours) > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: colors.foreground }]}>
          How long should the lock last?
        </Text>
        <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
          Once set, this duration cannot be changed or cancelled.
        </Text>

        <View style={styles.options}>
          {DURATION_OPTIONS.map((option) => {
            const selected = selection.durationPreset === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelect(option.id)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: selected
                      ? colors.primary + "12"
                      : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIcon,
                    {
                      backgroundColor: selected
                        ? colors.primary + "20"
                        : colors.muted,
                    },
                  ]}
                >
                  <Feather
                    name={option.icon as any}
                    size={20}
                    color={selected ? colors.primary : colors.mutedForeground}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected ? colors.primary : colors.foreground,
                        fontFamily: selected
                          ? "Inter_700Bold"
                          : "Inter_500Medium",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionSublabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {option.sublabel}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {selected && (
                    <View
                      style={[styles.radioDot, { backgroundColor: "#fff" }]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selection.durationPreset === "custom" && (
          <View
            style={[
              styles.customBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.customLabel, { color: colors.foreground }]}>
              Custom Duration
            </Text>
            <View style={styles.customInputRow}>
              <View style={styles.customInputGroup}>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={selection.customDays}
                  onChangeText={setCustomDays}
                  maxLength={3}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.customInputLabel, { color: colors.mutedForeground }]}>
                  days
                </Text>
              </View>
              <Text style={[styles.customSep, { color: colors.mutedForeground }]}>+</Text>
              <View style={styles.customInputGroup}>
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderColor: colors.border,
                    },
                  ]}
                  keyboardType="number-pad"
                  value={selection.customHours}
                  onChangeText={setCustomHours}
                  maxLength={2}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.customInputLabel, { color: colors.mutedForeground }]}>
                  hours
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.summaryBanner, { backgroundColor: colors.primary + "10" }]}>
          <Feather name="clock" size={14} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.primary }]}>
            Lock duration: <Text style={styles.summaryBold}>{getDurationSummary()}</Text>
          </Text>
        </View>

        <View style={{ height: bottomPad + 100 }} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 20,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleNext}
          disabled={!canProceed}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: colors.primary,
              opacity: !canProceed ? 0.4 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.nextButtonText}>Next — Review & Confirm</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 8,
  },
  options: { gap: 8 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 16,
    marginBottom: 2,
  },
  optionSublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  customBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  customLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customInputGroup: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  customInput: {
    width: "100%",
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  customInputLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  customSep: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    marginTop: -16,
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  summaryBold: {
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
