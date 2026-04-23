import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zh from './locales/zh.json';
import en from './locales/en.json';
import th from './locales/th.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  th: { translation: th }
};

const isBrowser = typeof window !== 'undefined';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: isBrowser ? ['localStorage', 'navigator'] : ['navigator'],
      caches: isBrowser ? ['localStorage'] : []
    }
  });

export default i18n;
