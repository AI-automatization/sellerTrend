import { useState, useEffect } from 'react';
import { useLang } from '../lib/LangContext';

const STORAGE_KEY = 'ventra_cookie_consent';

export function CookieBanner() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // Private mode — don't show banner
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch { /* ignore */ }
    setVisible(false);
  }

  function decline() {
    try {
      localStorage.setItem(STORAGE_KEY, 'declined');
    } catch { /* ignore */ }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
    >
      <div className="max-w-3xl mx-auto bg-base-200 border border-base-content/10 rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="flex-1 text-sm text-base-content/80">
          {t('cookie.message')}{' '}
          <a href="/privacy" className="text-primary hover:underline">
            {t('cookie.policy')}
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="btn btn-ghost btn-sm"
          >
            {t('cookie.decline')}
          </button>
          <button
            onClick={accept}
            className="btn btn-primary btn-sm"
          >
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
