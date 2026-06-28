import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export const ONBOARDING_DONE_KEY = "focuslock_onboarding_done";

interface OnboardingSlide {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: "shield",
    iconColor: "#1E40AF",
    title: "Take Back Control",
    body: "FocusLock lets you lock distracting apps for a set period — with no way to bypass it early. Your commitment, enforced.",
    accent: "#1E40AF",
  },
  {
    icon: "lock",
    iconColor: "#7C3AED",
    title: "Unbreakable Locks",
    body: "Once you set a lock, it's permanent until the timer expires. No PIN bypass, no override — only the clock can unlock you.",
    accent: "#7C3AED",
  },
  {
    icon: "clock",
    iconColor: "#059669",
    title: "Server-Verified Time",
    body: "FocusLock uses Firebase server time, not your phone's clock. Changing the date or time won't unlock early.",
    accent: "#059669",
  },
  {
    icon: "alert-triangle",
    iconColor: "#DC2626",
    title: "True Enforcement",
    body: "Device Administrator access prevents uninstalling FocusLock while locks are active. The Accessibility Service blocks apps in real time.",
    accent: "#DC2626",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function goToSlide(index: number) {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
    Haptics.selectionAsync();
  }

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleFinish();
    }
  }

  async function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
    router.replace("/setup");
  }

  const slide = SLIDES[currentIndex];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPad },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.slideScroll}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: s.iconColor + "18" },
              ]}
            >
              <Feather name={s.icon as any} size={56} color={s.iconColor} />
            </View>
            <Text style={[styles.slideTitle, { color: colors.foreground }]}>
              {s.title}
            </Text>
            <Text
              style={[styles.slideBody, { color: colors.mutedForeground }]}
            >
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goToSlide(i)}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? slide.accent : colors.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 24 },
        ]}
      >
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: slide.accent,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex < SLIDES.length - 1 ? "Next" : "Get Started"}
          </Text>
          <Feather
            name={
              currentIndex < SLIDES.length - 1 ? "arrow-right" : "check"
            }
            size={18}
            color="#fff"
          />
        </Pressable>

        {currentIndex < SLIDES.length - 1 && (
          <Pressable onPress={handleFinish} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Skip
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slideScroll: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  slideBody: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
});
