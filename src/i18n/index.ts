import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const VALID_LANGS = ['zh-CN', 'en-US'];
const SETTINGS_KEY = 'dev-switch-settings';

function readStoredLanguage(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (VALID_LANGS.includes(parsed?.language)) return parsed.language;
    }
  } catch (e) {
    // 忽略解析失败，回退到浏览器语言
  }
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS },
  },
  lng: readStoredLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

// 启动时同步 <html lang> 与 <title>
document.documentElement.lang = i18n.language;
document.title = i18n.t('app.title');

export default i18n;
