import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface PageHintProps {
  page: string;
  children: string;
}

export function PageHint({ page, children }: PageHintProps) {
  const storageKey = `tooltip_seen_${page}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { t } = useI18n();

  useEffect(() => {
    if (!visible) return;
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 10_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(storageKey, '1');
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  if (!visible) return null;

  return (
    <div className="alert alert-info shadow-sm mb-4" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm">{children}</span>
      <button className="btn btn-ghost btn-xs" onClick={dismiss}>
        {t('hints.dismiss')}
      </button>
    </div>
  );
}
