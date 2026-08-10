import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark' | 'system';

const SETTINGS_KEY = 'dev-switch-settings';

/** 同步原生窗口主题（标题栏颜色） */
function syncNativeTheme(resolved: 'light' | 'dark'): void {
  invoke('set_window_theme', { theme: resolved }).catch(() => {
    // 非关键错误，静默忽略
  });
}

/** 应用主题：light/dark 直接切换 .dark 类；system 跟随系统偏好。 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    syncNativeTheme('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
    syncNativeTheme('light');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', isDark);
    syncNativeTheme(isDark ? 'dark' : 'light');
  }
}

/** 从 localStorage 读取已保存的主题，非法值回退 'system'。 */
export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.theme === 'light' || parsed?.theme === 'dark' || parsed?.theme === 'system') {
        return parsed.theme;
      }
    }
  } catch (e) {
    // ignore
  }
  return 'system';
}

/** 'system' 模式时监听操作系统主题变化并实时应用。 */
export function useSystemThemeListener(theme: Theme): void {
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);
}
