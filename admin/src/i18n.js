import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh from './locales/zh.json';
import en from './locales/en.json';
import th from './locales/th.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  th: { translation: th }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    lng: 'zh', // 默认中文
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
