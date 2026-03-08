import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '5.6',
    date: '2026-03-08',
    items: ['Billing system', 'Plan tiers', 'Mobile bottom nav', 'Accessibility improvements'],
  },
  {
    version: '5.5',
    date: '2026-03-05',
    items: ['Monitoring system', 'Railway Pro migration', 'Memory pressure middleware'],
  },
  {
    version: '5.4',
    date: '2026-03-03',
    items: ['Weekly bought Playwright scraping', 'Real banner data'],
  },
];

const LATEST_VERSION = CHANGELOG[0]?.version ?? '0';
const STORAGE_KEY = 'whats_new_seen';

function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setSeenVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // localStorage unavailable
  }
}

export function useHasUnseenUpdates(): boolean {
  const seen = getSeenVersion();
  return seen !== LATEST_VERSION;
}

interface WhatsNewProps {
  externalOpen?: boolean;
  onClose?: () => void;
}

export function WhatsNew({ externalOpen, onClose }: WhatsNewProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-show on first visit after update
  useEffect(() => {
    const seen = getSeenVersion();
    if (seen !== LATEST_VERSION) {
      setIsOpen(true);
    }
  }, []);

  // Handle external open trigger
  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
    }
  }, [externalOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleDismiss = useCallback(() => {
    setSeenVersion(LATEST_VERSION);
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  function handleDialogClose() {
    setSeenVersion(LATEST_VERSION);
    setIsOpen(false);
    onClose?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={handleDialogClose}
    >
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg font-heading flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          {t('whatsNew.title')}
        </h3>

        <div className="mt-4 space-y-6">
          {CHANGELOG.map((entry, idx) => (
            <div key={entry.version} className="relative pl-6">
              {/* Timeline connector */}
              {idx < CHANGELOG.length - 1 && (
                <div className="absolute left-[7px] top-7 bottom-0 w-0.5 bg-base-300/50" />
              )}

              {/* Timeline dot */}
              <div className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                idx === 0 ? 'bg-primary border-primary' : 'bg-base-200 border-base-300'
              }`} />

              {/* Content */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge badge-sm font-bold ${idx === 0 ? 'badge-primary' : 'badge-ghost'}`}>
                    v{entry.version}
                  </span>
                  <span className="text-xs text-base-content/40">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.items.map((item) => (
                    <li key={item} className="text-sm text-base-content/70 flex items-start gap-2">
                      <span className="text-primary/60 mt-1 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-action">
          <button className="btn btn-primary btn-sm" onClick={handleDismiss}>
            {t('whatsNew.dismiss')}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={handleDismiss}>close</button>
      </form>
    </dialog>
  );
}
