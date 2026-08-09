import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/tauri';
import { toast } from 'sonner';
import { Settings, AppState, LanguageInfo, ToolInfo } from '../../types';
import { validate } from '../../hooks/useSettings';
import { checkUpdates } from '../../hooks/useUpdateCheck';
import { formatBytes } from '../../utils/format';
import { openUrl } from '../../utils/tauri';
import GlassCard from '../Cards/GlassCard';
import InfoRow from '../Cards/InfoRow';

export type SettingsTab = 'general' | 'data' | 'about';

interface SettingsPageProps {
  settings: Settings;
  onUpdateSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;
  setSettings: (next: Settings) => void;
  data: AppState;
  activeSubTab: SettingsTab;
  onSubTabChange: (tab: SettingsTab) => void;
  onReload: () => void | Promise<void>;
}

const CACHE_OPTIONS = ['cacheExpiry1h', 'cacheExpiry6h', 'cacheExpiry12h', 'cacheExpiry24h', 'cacheExpiry3d', 'cacheExpiry7d', 'cacheExpiryNever'] as const;
const CACHE_VALUES = [1, 6, 12, 24, 72, 168, 0] as const;

interface UpdateInfo {
  available: boolean;
  version?: string;
  download_url?: string;
  notes?: string;
}

export default function SettingsPage({
  settings,
  onUpdateSetting,
  setSettings,
  data,
  activeSubTab,
  onSubTabChange,
  onReload,
}: SettingsPageProps) {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState('v0.1.0');
  const [dbPath, setDbPath] = useState(t('common.unknown'));
  const [dbSize, setDbSize] = useState(t('common.unknown'));
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ text: string; color: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');

  useEffect(() => {
    loadAppVersion();
    loadDbPath();
    loadDbSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAppVersion = async () => {
    try {
      const version = await invoke('get_app_version');
      setAppVersion(`v${version}`);
    } catch (error) {
      console.error('加载版本失败:', error);
    }
  };

  const loadDbPath = async () => {
    try {
      const path = await invoke('get_db_path');
      setDbPath(path as string);
    } catch (error) {
      setDbPath(t('common.unknown'));
    }
  };

  const loadDbSize = async () => {
    try {
      const bytes = await invoke<number>('get_db_size');
      setDbSize(formatBytes(bytes));
    } catch (error) {
      setDbSize(t('common.unknown'));
      toast.error(t('header.error'));
    }
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatus(null);
    const result = await checkUpdates();
    setIsCheckingUpdate(false);
    if (result.status === 'available') {
      setUpdateInfo({ available: true, version: result.info.version, download_url: result.info.download_url, notes: result.info.notes });
      setUpdateStatus({ text: t('settings.updateAvailable'), color: '#3b82f6' });
    } else if (result.status === 'up-to-date') {
      setUpdateInfo(null);
      setUpdateStatus({ text: t('settings.upToDate'), color: '#22c55e' });
    } else {
      setUpdateStatus({ text: t('settings.updateFailed'), color: '#ef4444' });
    }
  };

  /* ---------- 导出 ---------- */

  function serializeRow(item: LanguageInfo | ToolInfo, includePath: boolean, includeGuide: boolean): Record<string, unknown> {
    const row: Record<string, unknown> = {
      name: item.name,
      installed: item.installed,
      version: item.version ?? '',
    };
    if (includePath) row.path = item.path ?? '';
    if (includeGuide) {
      row.install_guide = item.install_guide;
      row.uninstall_guide = item.uninstall_guide;
    }
    return row;
  }

  function csvEscape(value: unknown): string {
    if (value === undefined || value === null) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function guideCmd(guide?: { windows_cmd?: string; macos_cmd?: string; linux_cmd?: string }): string {
    if (!guide) return '';
    return [guide.windows_cmd, guide.macos_cmd, guide.linux_cmd].filter(Boolean).join(' / ');
  }

  function buildCsv(includePath: boolean, includeGuide: boolean): string {
    const headers = ['type', 'name', 'installed', 'version'];
    if (includePath) headers.push('path');
    if (includeGuide) headers.push('install_guide_url', 'install_guide_cmd', 'uninstall_guide');
    const rows: Array<Record<string, unknown>> = [
      ...data.languageData.map((l) => ({ type: 'language', ...serializeRow(l, includePath, includeGuide) })),
      ...data.toolData.map((tool) => ({ type: 'tool', ...serializeRow(tool, includePath, includeGuide) })),
    ];
    const lines = [headers.map(csvEscape).join(',')];
    for (const row of rows) {
      lines.push(
        headers
          .map((h) => {
            if (h === 'install_guide_url') {
              const guide = (row as Record<string, unknown>).install_guide as { url?: string } | undefined;
              return csvEscape(guide?.url);
            }
            if (h === 'install_guide_cmd') {
              const guide = (row as Record<string, unknown>).install_guide as { windows_cmd?: string; macos_cmd?: string; linux_cmd?: string } | undefined;
              return csvEscape(guideCmd(guide));
            }
            return csvEscape(row[h]);
          })
          .join(',')
      );
    }
    return lines.join('\n');
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const handleExport = () => {
    const includePath = settings.includePath;
    const includeGuide = settings.includeInstallGuide;
    const date = new Date().toISOString();
    const base = `dev-switch-report-${date.slice(0, 10)}`;
    if (settings.exportFormat === 'csv') {
      const blob = new Blob(['﻿' + buildCsv(includePath, includeGuide)], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `${base}.csv`);
    } else {
      const report = {
        timestamp: date,
        version: appVersion,
        app: 'Dev Switch',
        system: data.systemData,
        languages: data.languageData.map((l) => serializeRow(l, includePath, includeGuide)),
        tools: data.toolData.map((tool) => serializeRow(tool, includePath, includeGuide)),
        network: data.networkData,
        settings,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `${base}.json`);
    }
    toast.success(t('settings.exportSuccess'));
  };

  /* ---------- 导入 ---------- */

  const handleImport = () => {
    try {
      const imported = JSON.parse(importData);
      const incoming = imported?.settings ?? imported;
      if (typeof incoming !== 'object' || incoming === null) {
        throw new Error('invalid');
      }
      const next = validate(incoming);
      setSettings(next);
      setImportData('');
      setShowImportModal(false);
      toast.success(t('settings.importSuccess'));
      onReload();
    } catch (error) {
      toast.error(t('settings.importFailed'));
    }
  };

  /* ---------- 清除缓存 ---------- */

  const doClearCache = async () => {
    try {
      await invoke('refresh_detection');
      await onReload();
      toast.success(t('settings.exportSuccess'));
    } catch (error) {
      console.error('清除缓存失败:', error);
      toast.error(t('header.error'));
    }
  };

  const clearCache = () => {
    toast(t('settings.clearCacheConfirm'), {
      action: { label: t('common.confirm'), onClick: doClearCache },
    });
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: t('settings.tabGeneral'), icon: '⚙️' },
    { id: 'data', label: t('settings.tabData'), icon: '💾' },
    { id: 'about', label: t('settings.tabAbout'), icon: 'ℹ️' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex gap-1 p-1 bg-[var(--muted)] rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSubTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === tab.id ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted-fg)] hover:text-[var(--fg)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 通用 */}
      {activeSubTab === 'general' && (
        <div className="space-y-6">
          <GlassCard icon="🎨" title={t('settings.appearance')}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--fg)]">{t('settings.theme')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light', label: t('settings.themeLight'), icon: '☀️' },
                    { value: 'dark', label: t('settings.themeDark'), icon: '🌙' },
                    { value: 'system', label: t('settings.themeSystem'), icon: '💻' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => onUpdateSetting('theme', theme.value as Settings['theme'])}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        settings.theme === theme.value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--muted-fg)]'
                      }`}
                    >
                      <span className="text-xl">{theme.icon}</span>
                      <span className="text-xs font-medium text-[var(--fg)]">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--fg)]">{t('settings.language')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'zh-CN', label: t('settings.langZh'), flag: '🇨🇳' },
                    { value: 'en-US', label: t('settings.langEn'), flag: '🇺🇸' },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => onUpdateSetting('language', lang.value as Settings['language'])}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        settings.language === lang.value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--muted-fg)]'
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="text-sm font-medium text-[var(--fg)]">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <ToggleSetting label={t('settings.compactMode')} description={t('settings.compactModeDesc')} checked={settings.compactMode} onChange={(c) => onUpdateSetting('compactMode', c)} />
            </div>
          </GlassCard>

          <GlassCard icon="⚙️" title={t('settings.startup')}>
            <div className="space-y-4">
              <ToggleSetting label={t('settings.autoCheckUpdate')} description={t('settings.autoCheckUpdateDesc')} checked={settings.autoCheckUpdate} onChange={(c) => onUpdateSetting('autoCheckUpdate', c)} />
              <ToggleSetting label={t('settings.autoRefreshOnStart')} description={t('settings.autoRefreshOnStartDesc')} checked={settings.autoRefreshOnStart} onChange={(c) => onUpdateSetting('autoRefreshOnStart', c)} />
            </div>
          </GlassCard>

          <GlassCard icon="🔍" title={t('settings.detectScope')}>
            <div className="space-y-4">
              <ToggleSetting label={t('settings.detectLanguages')} description={t('settings.detectLanguagesDesc')} checked={settings.detectLanguages} onChange={(c) => onUpdateSetting('detectLanguages', c)} />
              <ToggleSetting label={t('settings.detectTools')} description={t('settings.detectToolsDesc')} checked={settings.detectTools} onChange={(c) => onUpdateSetting('detectTools', c)} />
              <ToggleSetting label={t('settings.detectNetwork')} description={t('settings.detectNetworkDesc')} checked={settings.detectNetwork} onChange={(c) => onUpdateSetting('detectNetwork', c)} />
            </div>
          </GlassCard>
        </div>
      )}

      {/* 数据 */}
      {activeSubTab === 'data' && (
        <div className="space-y-6">
          <GlassCard icon="💾" title={t('settings.cacheMgmt')}>
            <div className="space-y-4">
              <InfoRow label={t('settings.dbPath')} value={dbPath} mono />
              <InfoRow label={t('settings.dbSize')} value={dbSize} />
              <div className="flex items-center gap-4">
                <label className="text-sm text-[var(--muted-fg)]">{t('settings.cacheExpiry')}</label>
                <select
                  value={settings.cacheExpiry}
                  onChange={(e) => onUpdateSetting('cacheExpiry', Number(e.target.value))}
                  className="px-3 py-1.5 text-sm bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {CACHE_VALUES.map((value, i) => (
                    <option key={value} value={value}>
                      {t(`settings.${CACHE_OPTIONS[i]}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={clearCache} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--danger)] hover:bg-[var(--danger-dark)] rounded-lg transition-colors">
                {t('settings.clearCache')}
              </button>
            </div>
          </GlassCard>

          <GlassCard icon="📤" title={t('settings.export')}>
            <div className="space-y-4">
              <div className="flex gap-2">
                {[
                  { value: 'json', label: t('settings.exportJson') },
                  { value: 'csv', label: t('settings.exportCsv') },
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => onUpdateSetting('exportFormat', format.value as Settings['exportFormat'])}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      settings.exportFormat === format.value ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted-fg)]'
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
              <ToggleSetting label={t('settings.includePath')} description={t('settings.includePathDesc')} checked={settings.includePath} onChange={(c) => onUpdateSetting('includePath', c)} />
              <ToggleSetting label={t('settings.includeInstallGuide')} description={t('settings.includeInstallGuideDesc')} checked={settings.includeInstallGuide} onChange={(c) => onUpdateSetting('includeInstallGuide', c)} />
              <button onClick={handleExport} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors">
                {t('settings.exportConfig')}
              </button>
            </div>
          </GlassCard>

          <GlassCard icon="📥" title={t('settings.import')}>
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-fg)]">{t('settings.importDesc')}</p>
              <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--fg)] bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg transition-colors">
                {t('settings.importBtn')}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 关于 - Hero 卡片（应用信息 + 快捷链接 + 更新检查）+ 技术栈 */}
      {activeSubTab === 'about' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/60 p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              {/* 左：logo + 名称 + 版本徽标 */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🔍</span>
                </div>
                <div>
                  <div className="text-xl font-bold text-[var(--fg)]">{t('app.name')}</div>
                  <div className="text-xs text-[var(--muted-fg)] mt-0.5">{t('app.subtitle')}</div>
                  <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border border-[var(--border)] bg-[var(--muted)]">
                    <span className="text-[var(--muted-fg)]">{t('settings.version')}</span>
                    <span className="font-semibold text-[var(--fg)]">{appVersion}</span>
                  </span>
                </div>
              </div>

              {/* 右：快捷链接 + 检查更新 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openUrl('https://github.com/farion1231/dev-switch')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--fg)] bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg transition-colors"
                >
                  <span className="text-sm">🐙</span>
                  {t('links.githubRepo')}
                </button>
                <button
                  onClick={() => openUrl('https://github.com/farion1231/dev-switch/releases')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--fg)] bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg transition-colors"
                >
                  <span className="text-sm">📦</span>
                  {t('links.downloadPage')}
                </button>
                <button
                  onClick={() => openUrl('https://github.com/farion1231/dev-switch/issues')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[var(--fg)] bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg transition-colors"
                >
                  <span className="text-sm">🐛</span>
                  {t('links.reportIssue')}
                </button>
                <button
                  onClick={checkForUpdates}
                  disabled={isCheckingUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCheckingUpdate ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isCheckingUpdate ? t('settings.checking') : t('settings.checkUpdate')}
                </button>
              </div>
            </div>

            {/* 更新状态横幅 */}
            {updateStatus && (
              <div
                className="mt-5 px-4 py-3 rounded-lg border"
                style={{
                  borderColor: `${updateStatus.color}4D`,
                  backgroundColor: `${updateStatus.color}14`,
                  color: updateStatus.color,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: updateStatus.color }} />
                    <span className="text-sm font-medium">
                      {updateStatus.text}
                      {updateInfo?.available && updateInfo.version ? ` v${updateInfo.version}` : ''}
                    </span>
                  </div>
                  {updateInfo?.available && updateInfo.download_url && (
                    <button
                      onClick={() => openUrl(updateInfo.download_url || '')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: updateStatus.color }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                      {t('settings.installUpdate')}
                    </button>
                  )}
                </div>
                {updateInfo?.notes && (
                  <p className="mt-1.5 text-xs leading-relaxed line-clamp-2" style={{ color: updateStatus.color, opacity: 0.8 }}>
                    {updateInfo.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          <GlassCard icon="🛠️" title={t('tech.techStack')}>
            <div className="flex flex-wrap gap-2">
              {['React 19', 'TypeScript', 'Tailwind CSS', 'Tauri', 'Rust', 'SQLite', 'Vite'].map((tech) => (
                <span key={tech} className="px-2 py-1 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded">{tech}</span>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* 导入模态框 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-[var(--card)] rounded-lg shadow-2xl w-[90%] max-w-[500px]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--fg)]">{t('settings.importModalTitle')}</h3>
              <button onClick={() => setShowImportModal(false)} className="text-2xl text-[var(--muted-fg)] hover:text-[var(--fg)]">&times;</button>
            </div>
            <div className="p-5">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="w-full h-48 p-3 text-sm font-mono bg-[var(--muted)] border border-[var(--border)] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder={t('settings.importPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-[var(--border)]">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm font-medium text-[var(--fg)] bg-[var(--muted)] hover:bg-[var(--accent)] rounded-lg">{t('common.cancel')}</button>
              <button onClick={handleImport} disabled={!importData.trim()} className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg disabled:opacity-50">{t('common.import')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSetting({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
      <div>
        <div className="text-sm font-medium text-[var(--fg)]">{label}</div>
        <div className="text-xs text-[var(--muted-fg)]">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
