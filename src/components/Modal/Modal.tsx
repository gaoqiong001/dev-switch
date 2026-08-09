import { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--card)] rounded-lg shadow-2xl w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--card-fg)]">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 border-none bg-transparent text-2xl text-[var(--muted-fg)] cursor-pointer rounded-md hover:bg-[var(--accent)] hover:text-[var(--fg)] transition-colors"
          >
            &times;
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">{children}</div>
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[var(--muted)] text-[var(--fg)] border border-[var(--border)] rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--accent)] transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
