// 临时简化 i18n，避免白屏
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 直接初始化空配置
i18n
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    resources: {
      zh: { translation: {} },
      en: { translation: {} },
      th: { translation: {} }
    }
  });

export default i18n;
