import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolInfo } from '../../types';
import GlassCard from '../Cards/GlassCard';
import InfoRow from '../Cards/InfoRow';
import StatusBadge from '../Cards/StatusBadge';
import InstallGuideModal from '../Modal/InstallGuideModal';
import ErrorBanner from '../ui/ErrorBanner';
import { SkeletonGrid } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import Highlight from '../ui/Highlight';

interface ToolsPageProps {
  data: ToolInfo[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  detectionEnabled?: boolean;
  searchQuery?: string;
  onOpenSettings?: () => void;
}

export default function ToolsPage({
  data,
  isLoading,
  error,
  onRetry,
  detectionEnabled = true,
  searchQuery = '',
  onOpenSettings,
}: ToolsPageProps) {
  const { t } = useTranslation();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'install' | 'uninstall';
    name: string;
    guide?: ToolInfo['install_guide'] | string;
  }>({ isOpen: false, type: 'install', name: '' });

  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (!detectionEnabled && data.length === 0) {
    return (
      <EmptyState
        icon="🛠️"
        title={t('empty.detectionDisabled')}
        description={t('empty.detectionDisabledHint')}
        actionLabel={t('nav.settings')}
        onAction={onOpenSettings}
      />
    );
  }
  if (isLoading && data.length === 0) return <SkeletonGrid count={6} />;
  if (searchQuery && data.length === 0) {
    return <EmptyState icon="🔍" title={t('empty.searchNoResults', { query: searchQuery })} />;
  }
  if (data.length === 0) return <EmptyState icon="🛠️" title={t('empty.nothingDetectedTools')} />;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {data.map((tool) => (
          <GlassCard
            key={tool.name}
            icon={tool.installed ? '🛠️' : '⚪'}
            title={<Highlight text={tool.name} query={searchQuery} />}
            unavailable={!tool.installed}
            actions={
              tool.installed ? (
                <button
                  onClick={() => setModalState({ isOpen: true, type: 'uninstall', name: tool.name, guide: tool.uninstall_guide })}
                  className="flex-1 px-4 py-2 bg-[var(--danger)] text-white border-none rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[var(--danger-dark)] transition-colors"
                >
                  {t('cards.uninstall')}
                </button>
              ) : (
                <button
                  onClick={() => setModalState({ isOpen: true, type: 'install', name: tool.name, guide: tool.install_guide })}
                  className="flex-1 px-4 py-2 bg-[var(--primary)] text-white border-none rounded-lg text-[13px] font-medium cursor-pointer hover:bg-[var(--primary-dark)] transition-colors"
                >
                  {t('cards.install')}
                </button>
              )
            }
          >
            <InfoRow label={t('cards.version')} value={tool.version || t('cards.notInstalled')} />
            {tool.path && <InfoRow label={t('cards.path')} value={tool.path} mono />}
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[13px] text-[var(--muted-fg)] font-medium">{t('cards.status')}</span>
              <StatusBadge installed={tool.installed} />
            </div>
          </GlassCard>
        ))}
      </div>

      <InstallGuideModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        name={modalState.name}
        guide={modalState.guide}
      />
    </>
  );
}
