import { useTranslation } from 'react-i18next';

export default function StatusBadge({ installed }: { installed: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      installed
        ? 'bg-[rgba(34,197,94,0.1)] text-[var(--success-dark)]'
        : 'bg-[rgba(239,68,68,0.1)] text-[var(--danger-dark)]'
    }`}>
      {installed ? `✓ ${t('status.installed')}` : `✗ ${t('status.notInstalled')}`}
    </span>
  );
}
