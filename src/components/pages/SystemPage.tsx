import { useTranslation } from 'react-i18next';
import { SystemInfo, LanguageInfo, ToolInfo, NetworkInfo } from '../../types';
import GlassCard from '../Cards/GlassCard';
import InfoRow from '../Cards/InfoRow';
import ErrorBanner from '../ui/ErrorBanner';
import { SkeletonGrid } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatMemory } from '../../utils/format';

interface SystemPageProps {
  data: SystemInfo | null;
  languageData?: LanguageInfo[];
  toolData?: ToolInfo[];
  networkData?: NetworkInfo | null;
  networkDetectionEnabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function SystemPage({
  data,
  languageData = [],
  toolData = [],
  networkData,
  networkDetectionEnabled = true,
  isLoading,
  error,
  onRetry,
}: SystemPageProps) {
  const { t } = useTranslation();

  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;

  if (!data) {
    if (isLoading) return <SkeletonGrid count={4} />;
    return <EmptyState icon="🖥️" title={t('empty.nothingDetected')} />;
  }

  const installedLanguages = languageData.filter((l) => l.installed).length;
  const installedTools = toolData.filter((t) => t.installed).length;

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-[var(--primary)]">{data.cpu_cores}</div>
          <div className="text-sm text-[var(--muted-fg)]">{t('system.statCpuCores')}</div>
        </div>
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-[var(--success)]">{formatMemory(data.total_memory)}</div>
          <div className="text-sm text-[var(--muted-fg)]">{t('system.statTotalMemory')}</div>
        </div>
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-[var(--primary)]">
            {installedLanguages}/{languageData.length}
          </div>
          <div className="text-sm text-[var(--muted-fg)]">{t('system.statInstalledLanguages')}</div>
        </div>
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg">
          <div className="text-2xl font-bold text-[var(--success)]">
            {installedTools}/{toolData.length}
          </div>
          <div className="text-sm text-[var(--muted-fg)]">{t('system.statInstalledTools')}</div>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        <GlassCard icon="🖥️" title={t('system.cardOs')}>
          <InfoRow label={t('system.rowName')} value={data.os_name} />
          <InfoRow label={t('system.rowVersion')} value={data.os_version} />
          <InfoRow label={t('system.rowKernel')} value={data.kernel_version} />
        </GlassCard>

        <GlassCard icon="⚡" title={t('system.cardCpu')}>
          <InfoRow label={t('system.rowCores')} value={t('system.cores', { count: data.cpu_cores })} />
          <InfoRow label={t('system.rowHostname')} value={data.hostname} />
        </GlassCard>

        <GlassCard icon="💾" title={t('system.cardMemory')}>
          <InfoRow label={t('system.rowTotalMemory')} value={formatMemory(data.total_memory)} />
        </GlassCard>

        <GlassCard icon="🏷️" title={t('system.cardHostname')}>
          <InfoRow label={t('system.rowHostname')} value={data.hostname} />
        </GlassCard>

        {/* 网络信息 */}
        <GlassCard icon="📡" title={t('system.cardNetwork')} unavailable={!networkDetectionEnabled}>
          {networkDetectionEnabled ? (
            <>
              <InfoRow label={t('system.rowLocalIp')} value={networkData?.local_ip || t('system.notObtained')} />
              <InfoRow
                label={t('system.rowInterfaces')}
                value={
                  networkData?.interfaces?.length
                    ? networkData.interfaces.join(', ')
                    : t('system.notDetected')
                }
                mono
              />
            </>
          ) : (
            <div className="py-6 text-center">
              <div className="text-sm font-medium text-[var(--muted-fg)]">{t('empty.detectionDisabled')}</div>
              <div className="text-xs text-[var(--muted-fg)] mt-1">{t('empty.detectionDisabledHint')}</div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
