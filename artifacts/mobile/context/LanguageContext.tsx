import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { translations } from "@/lib/i18n";
import type { LangKey } from "@/lib/i18n/translations";

const LANGUAGE_KEY = "@focuslock_language";

export const LANGUAGES: { code: LangKey; name: string; nativeName: string }[] = [
  { code: "ar",  name: "Arabic",     nativeName: "العربية" },
  { code: "en",  name: "English",    nativeName: "English" },
  { code: "fr",  name: "French",     nativeName: "Français" },
  { code: "de",  name: "German",     nativeName: "Deutsch" },
  { code: "hi",  name: "Hindi",      nativeName: "हिन्दी" },
  { code: "id",  name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it",  name: "Italian",    nativeName: "Italiano" },
  { code: "ko",  name: "Korean",     nativeName: "한국어" },
  { code: "pl",  name: "Polish",     nativeName: "Polski" },
  { code: "pt",  name: "Portuguese", nativeName: "Português" },
  { code: "es",  name: "Spanish",    nativeName: "Español" },
  { code: "ta",  name: "Tamil",      nativeName: "தமிழ்" },
  { code: "tr",  name: "Turkish",    nativeName: "Türkçe" },
];

interface LanguageContextType {
  currentLanguage: LangKey;
  setLanguage: (lang: LangKey) => Promise<void>;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: "en",
  setLanguage: async () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LangKey>("en");
  const { t: i18nT } = useTranslation();

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => {
      if (saved && saved in translations) {
        const lang = saved as LangKey;
        setCurrentLanguage(lang);
        i18n.changeLanguage(lang);
      }
    });
  }, []);

  async function setLanguage(lang: LangKey) {
    setCurrentLanguage(lang);
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }

  function t(key: keyof typeof translations.en): string {
    return i18nT(key) as string;
  }

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
