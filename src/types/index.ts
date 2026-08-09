export interface SystemInfo {
  os_name: string;
  os_version: string;
  hostname: string;
  kernel_version: string;
  cpu_cores: number;
  total_memory: number;
}

export interface InstallGuide {
  url?: string;
  windows_cmd?: string;
  macos_cmd?: string;
  linux_cmd?: string;
  notes?: string;
}

export interface LanguageInfo {
  name: string;
  version?: string;
  path?: string;
  installed: boolean;
  install_guide?: InstallGuide;
  uninstall_guide?: string;
}

export interface ToolInfo {
  name: string;
  version?: string;
  path?: string;
  installed: boolean;
  install_guide?: InstallGuide;
  uninstall_guide?: string;
}

export interface NetworkInfo {
  interfaces: string[];
  local_ip?: string;
}

export type TabType = 'system' | 'languages' | 'tools' | 'settings';

export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
  autoCheckUpdate: boolean;
  /** 发现新版本时静默下载并自动安装（默认 true）；false 时回退到「打开下载页手动下载」 */
  autoInstallUpdate: boolean;
  autoRefreshOnStart: boolean;
  theme: Theme;
  language: 'zh-CN' | 'en-US';
  compactMode: boolean;
  detectLanguages: boolean;
  detectTools: boolean;
  detectNetwork: boolean;
  /** 缓存有效期（小时）；0 表示永不过期 */
  cacheExpiry: number;
  exportFormat: 'json' | 'csv';
  includePath: boolean;
  includeInstallGuide: boolean;
}

export interface AppState {
  activeTab: TabType;
  systemData: SystemInfo | null;
  languageData: LanguageInfo[];
  toolData: ToolInfo[];
  networkData: NetworkInfo | null;
  isLoading: boolean;
  error: string | null;
}
