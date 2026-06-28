import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./translations";

const resources = Object.fromEntries(
  Object.entries(translations).map(([lang, keys]) => [lang, { translation: keys }])
);

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  compatibilityJSON: "v4",
});

export default i18n;
export { translations };
