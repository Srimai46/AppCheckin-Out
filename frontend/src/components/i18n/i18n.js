import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import th from "./locales/th";
import ja from "./locales/ja";

i18n.use(initReactI18next).init({
  lng: "th",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources: {
    en,
    th,
    ja,
  },
});

export default i18n;
