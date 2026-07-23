/**
 * duration-selector.tsx — "How long to unlock?" screen.
 *
 * Opened automatically when the user fully completes one of the 5 unlock tasks
 * in the Reels-Lock flow. The user picks One Day / One Week / Forever, then
 * taps "Turn Off" to:
 *   1. Disable the native ReelsLock
 *   2. Persist the chosen duration to AsyncStorage (duckLockOffUntil)
 *   3. Return to the home screen
 *
 * Auto-expiry (timed durations) is checked on every home-screen focus inside
 * index.tsx — when the time is up the toggle automatically re-enables.
 * "Forever" is permanent until the user manually re-enables from Settings/Home.
 */

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { consumePendingReelsLockDisable } from "@/lib/reelsLockPending";
import { saveReelsLockOff, ReelsLockOffState } from "@/lib/reelsLockOff";
import { getUnlockSourceMode } from "@/lib/unlockFlowState";

// ── Duration options ──────────────────────────────────────────────────────────
type DurationId = "one_day" | "one_week" | "forever";

const OPTIONS: Array<{
  id: DurationId;
  label: string;
  sublabel: string;
}> = [
  { id: "one_day",  label: "One Day",  sublabel: "Lock comes back after 24 hours" },
  { id: "one_week", label: "One Week", sublabel: "Lock comes back after 7 days"   },
  { id: "forever",  label: "Forever",  sublabel: "Only you can turn it back on"   },
];

// ── Golden accent colour (matches rest of app) ───────────────────────────────
const GOLD   = "#FFBF80";
const GOLD2  = "#FFA660";

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DurationSelectorScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DurationId | null>(null);
  const [loading, setLoading]   = useState(false);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleTurnOff() {
    if (!selected || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      // Build the storage state
      let state: ReelsLockOffState;
      if (selected === "forever") {
        state = { type: "forever" };
      } else {
        const ms = selected === "one_day" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        state = { type: "timed", until: Date.now() + ms };
      }

      // Persist duration
      await saveReelsLockOff(state);

      // Consume the pending disable flag (may be false in dev preview — OK)
      consumePendingReelsLockDisable();

      // Disable native ReelsLock on Android
      if (Platform.OS === "android" && NativeModules.ReelsLock) {
        try { await NativeModules.ReelsLock.setEnabled(false); } catch (_) {}
      }

      // Route back to the correct tab based on which home screen started the flow.
      // "DuckLock" → Home Pro tab; "DuckPal" → Home tab (default index).
      const dest = getUnlockSourceMode() === "DuckPal" ? "/(tabs)" : "/(tabs)/home-pro";
      router.replace(dest as never);
    } catch (e) {
      console.warn("[DurationSelector] handleTurnOff error:", e);
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>

      {/* ── Content area ──────────────────────────────────────────────── */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <Feather name="unlock" size={34} color={GOLD} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>How long to unlock?</Text>
        <Text style={styles.subheading}>
          Reels will be available for this long.{"\n"}After that, the lock comes back automatically.
        </Text>

        {/* Options */}
        <View style={styles.optionList}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(opt.id);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  pressed && { opacity: 0.82 },
                ]}
              >
                {/* Left: radio circle */}
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>

                {/* Text */}
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionSublabel}>{opt.sublabel}</Text>
                </View>

                {/* Right: checkmark when selected */}
                {isSelected && (
                  <Feather name="check" size={18} color={GOLD} style={styles.checkIcon} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Bottom button ─────────────────────────────────────────────── */}
      <View style={styles.bottomArea}>
        <Pressable
          onPress={handleTurnOff}
          disabled={!selected || loading}
          style={({ pressed }) => [{ opacity: pressed || !selected ? 0.6 : 1 }]}
        >
          <LinearGradient
            colors={[GOLD, GOLD2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.turnOffBtn}
          >
            <Feather name="power" size={18} color="#000000" style={{ marginRight: 8 }} />
            <Text style={styles.turnOffText}>
              {loading ? "Turning off…" : "Turn Off"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,191,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    alignSelf: "center",
  },

  heading: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },

  subheading: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 36,
  },

  optionList: {
    gap: 12,
  },

  // Unselected card
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#3A3A3C",
    paddingVertical: 18,
    paddingHorizontal: 18,
  },

  // Selected card — golden border + subtle golden tint
  optionCardSelected: {
    borderColor: GOLD,
    backgroundColor: "rgba(255,191,128,0.12)",
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#5A5A5E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  radioSelected: {
    borderColor: GOLD,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
  },

  optionText: {
    flex: 1,
  },

  optionLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#EBEBF5",
    marginBottom: 2,
  },

  optionLabelSelected: {
    color: GOLD,
  },

  optionSublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#636366",
    lineHeight: 17,
  },

  checkIcon: {
    marginLeft: 8,
  },

  // Bottom area
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },

  turnOffBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    paddingVertical: 16,
  },

  turnOffText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#000000",
    letterSpacing: 0.2,
  },
});
