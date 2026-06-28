import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { useLanguage } from "@/context/LanguageContext";

const FEEDBACK_EMAIL = "feedback@focuslock.app";

type FeedbackType = "issue" | "idea" | "appreciate" | null;

function RadioOption({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.radioRow, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<FeedbackType>(null);
  const [step, setStep] = useState<"select" | "write">("select");
  const [message, setMessage] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  function getSubject() {
    if (selected === "issue") return t("feedbackSubjectIssue");
    if (selected === "idea") return t("feedbackSubjectIdea");
    return t("feedbackSubjectAppreciate");
  }

  async function handleSubmit() {
    if (!message.trim()) return;
    const subject = encodeURIComponent(getSubject());
    const body = encodeURIComponent(message.trim());
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        router.back();
      } else {
        Alert.alert("No email app found", "Please send your feedback to " + FEEDBACK_EMAIL);
      }
    } catch {
      Alert.alert("Error", "Could not open email app. Please email: " + FEEDBACK_EMAIL);
    }
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable
            onPress={() => {
              if (step === "write") {
                setStep("select");
              } else {
                router.back();
              }
            }}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <GlassCard radius={20} padding={8}>
              <Feather name="arrow-left" size={18} color="#FFF8F0" />
            </GlassCard>
          </Pressable>

          {/* Title */}
          <Text style={styles.title}>{t("feedbackTitle")}</Text>

          {step === "select" ? (
            <>
              {/* Radio Options */}
              <GlassCard style={styles.optionsCard}>
                <RadioOption
                  selected={selected === "issue"}
                  label={t("reportIssue")}
                  onSelect={() => setSelected("issue")}
                />
                <View style={styles.divider} />
                <RadioOption
                  selected={selected === "idea"}
                  label={t("shareIdea")}
                  onSelect={() => setSelected("idea")}
                />
                <View style={styles.divider} />
                <RadioOption
                  selected={selected === "appreciate"}
                  label={t("appreciateTeam")}
                  onSelect={() => setSelected("appreciate")}
                />
              </GlassCard>

              {/* Continue Button */}
              <Pressable
                onPress={() => selected && setStep("write")}
                disabled={!selected}
                style={({ pressed }) => [{ opacity: pressed && selected ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={selected ? ["#C47B2B", "#E8943A"] : ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueBtn}
                >
                  <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
                    {t("continueBtn")}
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={selected ? "#FFF8F0" : "rgba(255,248,240,0.35)"}
                  />
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              {/* Selected Type Badge */}
              <GlassCard style={styles.badgeCard} padding={12}>
                <LinearGradient colors={["#C47B2B", "#E8943A"]} style={styles.badgeIcon}>
                  <Feather
                    name={
                      selected === "issue"
                        ? "alert-circle"
                        : selected === "idea"
                        ? "zap"
                        : "heart"
                    }
                    size={14}
                    color="#FFF8F0"
                  />
                </LinearGradient>
                <Text style={styles.badgeLabel}>
                  {selected === "issue"
                    ? t("reportIssue")
                    : selected === "idea"
                    ? t("shareIdea")
                    : t("appreciateTeam")}
                </Text>
              </GlassCard>

              {/* Text Box */}
              <GlassCard style={styles.textBoxCard} padding={0}>
                <TextInput
                  style={styles.textInput}
                  placeholder={t("feedbackPlaceholder")}
                  placeholderTextColor="rgba(212,165,116,0.4)"
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  autoFocus
                />
              </GlassCard>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={!message.trim()}
                style={({ pressed }) => [{ opacity: pressed && message.trim() ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={
                    message.trim()
                      ? ["#C47B2B", "#E8943A"]
                      : ["rgba(61,31,10,0.5)", "rgba(61,31,10,0.3)"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueBtn}
                >
                  <Feather
                    name="send"
                    size={18}
                    color={message.trim() ? "#FFF8F0" : "rgba(255,248,240,0.35)"}
                  />
                  <Text
                    style={[
                      styles.continueBtnText,
                      !message.trim() && styles.continueBtnTextDisabled,
                    ]}
                  >
                    {t("submitBtn")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },

  backBtn: { alignSelf: "flex-start", marginBottom: 4 },

  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFF8F0",
    letterSpacing: -0.6,
    marginBottom: 8,
    lineHeight: 34,
  },

  optionsCard: { gap: 0, paddingVertical: 4 },

  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(196,123,43,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: "#C47B2B" },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#C47B2B",
  },
  radioLabel: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,248,240,0.6)",
  },
  radioLabelSelected: {
    color: "#FFF8F0",
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(196,123,43,0.12)",
    marginLeft: 52,
  },

  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: "#C47B2B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  continueBtnText: {
    color: "#FFF8F0",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  continueBtnTextDisabled: { color: "rgba(255,248,240,0.35)" },

  badgeCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#D4A574",
  },

  textBoxCard: { minHeight: 180 },
  textInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FFF8F0",
    minHeight: 180,
  },
});
