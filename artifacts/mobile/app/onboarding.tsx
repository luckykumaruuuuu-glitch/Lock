import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import theme from "@/constants/theme";
import { useSounds } from "@/hooks/useSounds";

const { width } = Dimensions.get("window");

export const ONBOARDING_DONE_KEY = "focuslock_onboarding_done";

const SLIDES = [
  {
    icon: "shield" as const,
    gradient: ["#F5A94E", "#E07830"] as const,
    glowColor: "#F5A94E",
    title: "Take Back\nControl",
    body: "FocusLock lets you lock distracting apps for a set period — with absolutely no way to bypass it early. Your commitment, enforced.",
    accent: "#F5A94E",
  },
  {
    icon: "lock" as const,
    gradient: ["#FF6B35", "#E85A20"] as const,
    glowColor: "#FF6B35",
    title: "Unbreakable\nLocks",
    body: "Once set, a lock is permanent until the timer expires. No PIN override, no settings bypass — only the clock unlocks you.",
    accent: "#FF6B35",
  },
  {
    icon: "clock" as const,
    gradient: ["#32D74B", "#30C244"] as const,
    glowColor: "#32D74B",
    title: "Server-Verified\nTime",
    body: "FocusLock uses Firebase server time, not your device clock. Changing the date or time on your phone won't unlock a single app.",
    accent: "#32D74B",
  },
  {
    icon: "alert-triangle" as const,
    gradient: ["#F5A94E", "#E07830"] as const,
    glowColor: "#F5A94E",
    title: "True\nEnforcement",
    body: "Device Administrator prevents uninstalling FocusLock while active. The Accessibility Service blocks apps in real-time.",
    accent: "#F5A94E",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { playClick, playSuccess } = useSounds();
  const [currentIndex, setCurrentIndex] = useState(0);
  const iconScale = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const slide = SLIDES[currentIndex];

  function animateIcon() {
    iconScale.setValue(0.6);
    Animated.spring(iconScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 250,
      friction: 8,
    }).start();
  }

  function goTo(index: number) {
    playClick();
    animateIcon();
    setCurrentIndex(index);
  }

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      goTo(currentIndex + 1);
    } else {
      handleFinish();
    }
  }

  async function handleFinish() {
    playSuccess();
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    router.replace("/setup");
  }

  return (
    <View style={styles.root}>
      <View style={[styles.container, { paddingTop: topPad + 20 }]}>
        {/* Icon with glow */}
        <Animated.View
          style={[
            styles.iconWrap,
            { transform: [{ scale: iconScale }], shadowColor: slide.glowColor },
          ]}
        >
          <LinearGradient
            colors={slide.gradient}
            style={styles.iconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name={slide.icon} size={60} color="#000000" />
          </LinearGradient>
        </Animated.View>

        {/* Slide card */}
        <GlassCard style={styles.slideCard} padding={28}>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideBody}>{slide.body}</Text>
        </GlassCard>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <Pressable key={i} onPress={() => goTo(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === currentIndex ? slide.accent : theme.elevated,
                    width: i === currentIndex ? 28 : 8,
                    shadowColor: i === currentIndex ? slide.accent : "transparent",
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* Buttons */}
        <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={slide.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.nextBtn, { shadowColor: slide.glowColor }]}
            >
              <Text style={styles.nextBtnText}>
                {currentIndex < SLIDES.length - 1 ? "Next" : "Get Started"}
              </Text>
              <Feather
                name={currentIndex < SLIDES.length - 1 ? "arrow-right" : "check"}
                size={20}
                color="#000000"
              />
            </LinearGradient>
          </Pressable>

          {currentIndex < SLIDES.length - 1 && (
            <Pressable onPress={handleFinish} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip intro</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  iconWrap: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  slideCard: { width: "100%", maxWidth: 380 },
  slideTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    marginBottom: 14,
    lineHeight: 40,
    color: theme.primaryText,
  },
  slideBody: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
    color: theme.secondaryText,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  footer: {
    width: "100%",
    gap: 14,
    alignItems: "center",
  },
  nextBtn: {
    width: width - 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  nextBtnText: {
    color: theme.buttonText,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: { paddingVertical: 8 },
  skipText: {
    color: theme.secondaryText,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
});
