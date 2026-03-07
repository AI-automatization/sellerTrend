import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import { MonitorIcon } from './icons';

const DISMISS_KEY = 'ventra-download-banner-dismissed';

interface DownloadBannerProps {
  canShow: boolean;
}

export function DownloadBanner({ canShow }: DownloadBannerProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    if (!canShow) return;
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch { /* Safari private mode */ }
  }, [canShow]);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* Safari private mode */ }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="download"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-auto z-40"
        >
          <div className="glass-card rounded-2xl p-4 shadow-2xl max-w-md">
            <div className="flex items-start gap-3">
              <MonitorIcon className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-600 text-sm text-base-content">
                  {t('download.title')}
                </p>
                <p className="text-xs text-base-content/50 mt-0.5">
                  {t('download.version')}
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href="https://github.com/AI-automatization/sellerTrend-desktop/releases/download/v1.0.0/VENTRA.Setup.1.0.0.exe"
                    className="btn btn-primary btn-xs rounded-full"
                    download
                  >
                    {t('download.win')}
                  </a>
                  <button
                    className="btn btn-outline btn-xs rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title={t('download.soon')}
                  >
                    {t('download.mac')}
                  </button>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
                aria-label="Yopish"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
