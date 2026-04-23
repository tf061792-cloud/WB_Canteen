// 临时 mock i18n，避免白屏
export function useTranslation() {
  return {
    t: (key) => key // 直接返回 key 作为临时翻译
  };
}

// 如果有其他导入也需要 mock，这里继续加
