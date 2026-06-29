import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { Toast } from "@/components/ui/Toast";
import { LANGUAGES, useLanguage } from "@/context/LanguageContext";
import theme from "@/constants/theme";
import type { LangKey } from "@/lib/i18n/translations";

function LanguageRow({
  name,
  nativeName,
  selected,
  onSelect,
  last,
}: {
  name: string;
  nativeName: string;
  selected: boolean;
  onSelect: () => void;
  last?: boolean;
}) {
  return (
    <>
      <Pressable
        onPress={onSelect}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={styles.rowLeft}>
          <Text style={[styles.rowName, selected && styles.rowNameSelected]}>{name}</Text>
          <Text style={styles.rowNative}>{nativeName}</Text>
        </View>
        {selected ? (
          <LinearGradient colors={theme.gradientPrimary} style={styles.checkCircle}>
            <Feather name="check" size={14} color={theme.buttonText} />
          </LinearGradient>
        ) : (
          <View style={styles.checkCircleEmpty} />
        )}
      </Pressable>
      {!last && <View style={styles.divider} />}
    </>
  );
}

export default function LanguageScreen() {
  const insets = useSafeAreaInsets();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const [pendingLang, setPendingLang] = useState<LangKey>(currentLanguage);
  const [toastVisible, setToastVisible] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 24 : insets.bottom + 16;
  const hasChanged = pendingLang !== currentLanguage;

  async function handleSave() {
    if (!hasChanged) return;
    await setLanguage(pendingLang);
    setToastVisible(true);
    setTimeout(() => router.back(), 1200);
  }

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16, paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <GlassCard radius={20} padding={8}>
            <Feather name="arrow-left" size={18} color={theme.primaryText} />
          </GlassCard>
        </Pressable>

        <Text style={styles.title}>{t("selectLanguage")}</Text>
        <Text style={styles.subtitle}>{t("languageSubtitle")}</Text>

        <GlassCard style={styles.listCard} padding={0}>
          {LANGUAGES.map((lang, idx) => (
            <LanguageRow
              key={lang.code}
              name={lang.name}
              nativeName={lang.nativeName}
              selected={pendingLang === lang.code}
              onSelect={() => setPendingLang(lang.code)}
              last={idx === LANGUAGES.length - 1}
            />
          ))}
        </GlassCard>
      </ScrollView>

      {/* Fixed Save button */}
      <View style={[styles.stickyFooter, { paddingBottom: bottomInset }]}>
        <Pressable
          onPress={handleSave}
          disabled={!hasChanged}
          style={({ pressed }) => [{ opacity: pressed && hasChanged ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={hasChanged ? theme.gradientPrimary : theme.gradientDisabled}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            <Feather name="check" size={18} color={hasChanged ? theme.buttonText : theme.secondaryText} />
            <Text style={[styles.saveBtnText, !hasChanged && styles.saveBtnTextDisabled]}>
              {t("saveLanguage")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Toast visible={toastVisible} message={t("languageSaved")} type="success" onHide={() => setToastVisible(false)} />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, gap: 14 },

  backBtn: { alignSelf: "flex-start", marginBottom: 4 },

  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: theme.primaryText,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    marginBottom: 6,
  },

  listCard: { gap: 0 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  rowLeft: { flex: 1 },
  rowName: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: theme.secondaryText,
    marginBottom: 2,
  },
  rowNameSelected: {
    color: theme.primaryText,
    fontFamily: "Inter_600SemiBold",
  },
  rowNative: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: theme.tertiaryText,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  checkCircleEmpty: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.radioInactive,
  },
  divider: {
    height: 1,
    backgroundColor: theme.divider,
    marginLeft: 18,
  },

  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: theme.footerBg,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: theme.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  saveBtnText: {
    color: theme.buttonText,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  saveBtnTextDisabled: {
    color: theme.secondaryText,
  },
});
