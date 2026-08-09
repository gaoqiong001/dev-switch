import { useTranslation } from 'react-i18next';

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-[var(--danger)]/10 border-l-[3px] border-[var(--danger)] rounded-r-lg p-4 flex items-center justify-between gap-4">
      <div className="text-[13px] text-[var(--fg)] break-all">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--danger)] hover:bg-[var(--danger-dark)] rounded-lg transition-colors flex-shrink-0"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
