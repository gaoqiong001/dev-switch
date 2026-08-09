import { useTranslation } from 'react-i18next';
import { InstallGuide } from '../../types';
import Modal from './Modal';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'install' | 'uninstall';
  name: string;
  guide?: InstallGuide | string;
}

export default function InstallGuideModal({ isOpen, onClose, type, name, guide }: InstallGuideModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'install' ? t('modal.installTitle', { name }) : t('modal.uninstallTitle', { name })}
    >
      {type === 'install' ? <InstallContent guide={guide as InstallGuide} /> : <UninstallContent guide={guide as string} />}
    </Modal>
  );
}

function InstallContent({ guide }: { guide?: InstallGuide }) {
  const { t } = useTranslation();
  if (!guide) {
    return <div className="text-[var(--muted-fg)]">{t('modal.noGuide')}</div>;
  }

  return (
    <div className="space-y-5">
      {guide.url && (
        <div>
          <div className="text-sm font-semibold text-[var(--fg)] mb-2">{t('modal.officialPage')}</div>
          <a href={guide.url} target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-2 bg-[var(--primary)]/10 text-[var(--primary)] no-underline rounded-md text-[13px] hover:bg-[var(--primary)]/20 transition-colors">
            {guide.url}
          </a>
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-[var(--fg)] mb-2">{t('modal.installCmd')}</div>
        <div className="space-y-3">
          {guide.windows_cmd && (
            <div>
              <div className="text-xs text-[var(--muted-fg)] mb-1">{t('modal.windows')}</div>
              <div className="bg-[var(--muted)] px-4 py-3 rounded-lg font-mono text-[13px] text-[var(--fg)] whitespace-pre-wrap break-all">{guide.windows_cmd}</div>
            </div>
          )}
          {guide.macos_cmd && (
            <div>
              <div className="text-xs text-[var(--muted-fg)] mb-1">{t('modal.macos')}</div>
              <div className="bg-[var(--muted)] px-4 py-3 rounded-lg font-mono text-[13px] text-[var(--fg)] whitespace-pre-wrap break-all">{guide.macos_cmd}</div>
            </div>
          )}
          {guide.linux_cmd && (
            <div>
              <div className="text-xs text-[var(--muted-fg)] mb-1">{t('modal.linux')}</div>
              <div className="bg-[var(--muted)] px-4 py-3 rounded-lg font-mono text-[13px] text-[var(--fg)] whitespace-pre-wrap break-all">{guide.linux_cmd}</div>
            </div>
          )}
        </div>
      </div>

      {guide.notes && (
        <div>
          <div className="text-sm font-semibold text-[var(--fg)] mb-2">{t('modal.notes')}</div>
          <div className="bg-amber-500/10 border-l-[3px] border-amber-500 px-4 py-3 rounded-r-lg text-[13px] text-[var(--fg)]">{guide.notes}</div>
        </div>
      )}
    </div>
  );
}

function UninstallContent({ guide }: { guide?: string }) {
  const { t } = useTranslation();
  if (!guide) {
    return (
      <div className="bg-amber-500/10 border-l-[3px] border-amber-500 px-4 py-3 rounded-r-lg text-[13px] text-[var(--fg)]">
        {t('modal.noUninstallGuide')}
      </div>
    );
  }

  return (
    <div className="bg-[var(--muted)] px-4 py-4 rounded-lg text-[13px] text-[var(--fg)] whitespace-pre-wrap leading-relaxed">{guide}</div>
  );
}
