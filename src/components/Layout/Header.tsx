import { useTranslation } from 'react-i18next';
import { TabType } from '../../types';

const tabs: { id: TabType; labelKey: string; icon: string }[] = [
  { id: 'system', labelKey: 'nav.system', icon: '💻' },
  { id: 'languages', labelKey: 'nav.languages', icon: '🌐' },
  { id: 'tools', labelKey: 'nav.tools', icon: '🛠️' },
  { id: 'settings', labelKey: 'nav.settings', icon: '⚙️' },
];

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasUpdate?: boolean;
  onOpenUpdate?: () => void;
  hasError?: boolean;
}

export default function Header({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  hasUpdate,
  onOpenUpdate,
  hasError,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        {/* 左侧 logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 512 512" className="w-full h-full">
              <defs>
                <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary-dark)" />
                </linearGradient>
              </defs>
              <rect width="512" height="512" rx="96" fill="url(#logo-bg)" />
              <rect x="112" y="120" width="288" height="200" rx="16" fill="none" stroke="white" strokeWidth="14" />
              <rect x="216" y="320" width="80" height="20" rx="4" fill="white" opacity="0.8" />
              <rect x="184" y="336" width="144" height="12" rx="6" fill="white" opacity="0.6" />
              <text x="256" y="260" textAnchor="middle" fontFamily="monospace" fontWeight="bold" fontSize="100" fill="white" opacity="0.95">&lt; /&gt;</text>
              <circle cx="370" cy="150" r="18" fill="#22c55e" />
              <circle cx="370" cy="150" r="8" fill="white" />
            </svg>
          </div>
          <div className="hidden md:block">
            <div className="text-base font-bold text-[var(--fg)] leading-tight">{t('app.name')}</div>
            <div className="text-[11px] text-[var(--muted-fg)]">{t('app.subtitle')}</div>
          </div>
        </div>

        {/* 中间导航药丸 */}
        <nav className="flex items-center gap-1 p-1 bg-[var(--muted)] rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm'
                  : 'text-[var(--muted-fg)] hover:text-[var(--fg)] hover:bg-[var(--card)]/50'
              }`}
            >
              <span className="text-base flex-shrink-0">{tab.icon}</span>
              <span className="hidden sm:inline">{t(tab.labelKey)}</span>
            </button>
          ))}
        </nav>

        {/* 右侧上下文操作 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* 更新徽标 */}
          {hasUpdate && onOpenUpdate && (
            <button
              onClick={onOpenUpdate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 rounded-lg hover:bg-[var(--primary)]/20 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              <span className="hidden sm:inline">{t('header.updateAvailable')}</span>
            </button>
          )}

          {/* 状态点 */}
          <span className={`hidden sm:flex items-center gap-2 text-xs bg-[var(--muted)] px-3 py-1.5 rounded-full ${
            hasError ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'text-[var(--muted-fg)]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isRefreshing ? 'bg-amber-500 animate-pulse' : hasError ? 'bg-[var(--danger)]' : 'bg-[var(--success)]'
            }`} />
            <span>{isRefreshing ? t('header.detecting') : hasError ? t('header.error') : t('header.ready')}</span>
          </span>

          {/* 刷新按钮 */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? t('header.detecting') : t('header.refresh')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
