import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppState } from './hooks/useAppState';
import { useSettings } from './hooks/useSettings';
import { useSystemThemeListener } from './utils/theme';
import { checkUpdates, installUpdate } from './hooks/useUpdateCheck';
import Header from './components/Layout/Header';
import SearchBar from './components/ui/SearchBar';
import Toaster from './components/ui/Toaster';
import SystemPage from './components/pages/SystemPage';
import LanguagesPage from './components/pages/LanguagesPage';
import ToolsPage from './components/pages/ToolsPage';
import SettingsPage, { SettingsTab } from './components/pages/SettingsPage';
import { Settings } from './types';

/** 这些设置变化后需要立即重新检测 */
const DETECT_KEYS = ['detectLanguages', 'detectTools', 'detectNetwork', 'cacheExpiry'] as const;

export default function App() {
  const { t } = useTranslation();
  const { settings, updateSetting, setSettings } = useSettings();
  const { state, loadAllInfo, refreshDetection, switchTab } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTab>('general');
  const bootRef = useRef(false);

  // system 主题跟随系统实时切换
  useSystemThemeListener(settings.theme);

  // 检查更新：启动与「启动时检查更新」开关即时触发共用。
  // autoInstall=true（自动下载并安装更新开关开启）时发现新版直接静默安装。
  const runUpdateCheck = useCallback(
    async (autoInstall: boolean) => {
      const result = await checkUpdates();
      if (result.status === 'available') {
        setHasUpdate(true);
        if (autoInstall) {
          toast.info(t('update.downloading'));
          try {
            await installUpdate();
          } catch (error) {
            toast.error(t('update.installFailed'));
          }
        } else {
          toast.success(t('update.available', { version: result.info.version }));
        }
      } else if (result.status === 'error') {
        toast.error(t('update.checkFailed'));
      }
    },
    [t]
  );

  // 启动加载 + 启动更新检查（bootRef 防 React 19 StrictMode 双跑）
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    if (settings.autoRefreshOnStart) {
      refreshDetection(settings);
    } else {
      loadAllInfo(settings);
    }
    if (settings.autoCheckUpdate) {
      runUpdateCheck(settings.autoInstallUpdate);
    }
    // 仅在挂载时执行一次，使用初始 settings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 包装 updateSetting：检测相关设置变化后立即重载；「启动时」开关开启时即时反馈 */
  const handleUpdateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      updateSetting(key, value);
      if ((DETECT_KEYS as readonly (keyof Settings)[]).includes(key)) {
        loadAllInfo({ ...settings, [key]: value });
      } else if (key === 'autoCheckUpdate' && value === true) {
        runUpdateCheck({ ...settings, [key]: value }.autoInstallUpdate);
      } else if (key === 'autoRefreshOnStart' && value === true) {
        refreshDetection(settings);
      }
    },
    [updateSetting, loadAllInfo, settings, refreshDetection, runUpdateCheck]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDetection(settings);
    } catch (error) {
      toast.error(t('header.error'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (tab: (typeof state)['activeTab']) => {
    switchTab(tab);
    setSearchQuery('');
  };

  const handleOpenUpdate = () => {
    switchTab('settings');
    setSettingsSubTab('about');
  };

  // 搜索框只在对应检测开启的语言/工具页显示（避免悬在"检测已关闭"空态上方）
  const searchEnabled =
    (state.activeTab === 'languages' && settings.detectLanguages) ||
    (state.activeTab === 'tools' && settings.detectTools);

  const filteredLanguageData = state.languageData.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredToolData = state.toolData.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPage = () => {
    switch (state.activeTab) {
      case 'system':
        return (
          <SystemPage
            data={state.systemData}
            languageData={state.languageData}
            toolData={state.toolData}
            networkData={state.networkData}
            networkDetectionEnabled={settings.detectNetwork}
            isLoading={state.isLoading}
            error={state.error}
            onRetry={() => loadAllInfo(settings)}
          />
        );
      case 'languages':
        return (
          <LanguagesPage
            data={filteredLanguageData}
            isLoading={state.isLoading}
            error={state.error}
            onRetry={() => loadAllInfo(settings)}
            detectionEnabled={settings.detectLanguages}
            searchQuery={searchQuery}
            onOpenSettings={() => handleTabChange('settings')}
          />
        );
      case 'tools':
        return (
          <ToolsPage
            data={filteredToolData}
            isLoading={state.isLoading}
            error={state.error}
            onRetry={() => loadAllInfo(settings)}
            detectionEnabled={settings.detectTools}
            searchQuery={searchQuery}
            onOpenSettings={() => handleTabChange('settings')}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            onUpdateSetting={handleUpdateSetting}
            setSettings={setSettings}
            data={state}
            activeSubTab={settingsSubTab}
            onSubTabChange={setSettingsSubTab}
            onReload={() => loadAllInfo(settings)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      <Header
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        hasUpdate={hasUpdate}
        onOpenUpdate={handleOpenUpdate}
        hasError={!!state.error}
      />
      <main className={`flex-1 overflow-y-auto ${settings.compactMode ? 'compact-mode' : ''}`}>
        <div className="max-w-[1200px] mx-auto p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[var(--fg)]">{t(`pageTitle.${state.activeTab}`)}</h1>
            <p className="text-xs text-[var(--muted-fg)] mt-0.5">{t(`pageDesc.${state.activeTab}`)}</p>
          </div>
          {searchEnabled && (
            <div className="mb-6">
              <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={t('search.placeholder')} />
            </div>
          )}
          {renderPage()}
        </div>
      </main>
      <Toaster theme={settings.theme} />
    </div>
  );
}
