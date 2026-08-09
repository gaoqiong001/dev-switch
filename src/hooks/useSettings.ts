import { useCallback, useState } from 'react';
import { Settings } from '../types';
import i18n from '../i18n';
import { applyTheme } from '../utils/theme';

export const SETTINGS_KEY = 'dev-switch-settings';

export const defaultSettings: Settings = {
  autoCheckUpdate: true,
  autoRefreshOnStart: false,
  theme: 'system',
  language: 'zh-CN',
  compactMode: false,
  detectLanguages: true,
  detectTools: true,
  detectNetwork: true,
  cacheExpiry: 24,
  exportFormat: 'json',
  includePath: true,
  includeInstallGuide: true,
};

const THEMES: Settings['theme'][] = ['light', 'dark', 'system'];
const LANGS: Settings['language'][] = ['zh-CN', 'en-US'];
const FORMATS: Settings['exportFormat'][] = ['json', 'csv'];
const BOOL_KEYS = [
  'autoCheckUpdate',
  'autoRefreshOnStart',
  'compactMode',
  'detectLanguages',
  'detectTools',
  'detectNetwork',
  'includePath',
  'includeInstallGuide',
] as const;

/** 与默认值深度合并并校验枚举，非法值回退默认。 */
export function validate(raw: unknown): Settings {
  const s: Settings = { ...defaultSettings };
  if (typeof raw !== 'object' || raw === null) return s;
  const r = raw as Record<string, unknown>;
  for (const k of BOOL_KEYS) {
    if (typeof r[k] === 'boolean') s[k] = r[k];
  }
  if (THEMES.includes(r.theme as Settings['theme'])) s.theme = r.theme as Settings['theme'];
  if (LANGS.includes(r.language as Settings['language'])) s.language = r.language as Settings['language'];
  if (typeof r.cacheExpiry === 'number' && r.cacheExpiry >= 0) s.cacheExpiry = r.cacheExpiry;
  if (FORMATS.includes(r.exportFormat as Settings['exportFormat'])) s.exportFormat = r.exportFormat as Settings['exportFormat'];
  return s;
}

/** 立即生效的副作用：主题、语言、<html lang>、<title> */
function applySideEffects(next: Settings): void {
  applyTheme(next.theme);
  i18n.changeLanguage(next.language);
  document.documentElement.lang = next.language;
  document.title = i18n.t('app.title');
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? validate(JSON.parse(raw)) : { ...defaultSettings };
    } catch (e) {
      return { ...defaultSettings };
    }
  });

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
    // 需要立即生效的副作用（在 setState 更新器之外执行，保持更新器纯函数）
    if (key === 'theme') {
      applyTheme(value as Settings['theme']);
    } else if (key === 'language') {
      i18n.changeLanguage(value as Settings['language']);
      document.documentElement.lang = value as string;
      document.title = i18n.t('app.title');
    }
  }, []);

  /** 整体替换设置（导入用），持久化并立即应用副作用 */
  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    applySideEffects(next);
  }, []);

  return { settings, updateSetting, setSettings };
}
