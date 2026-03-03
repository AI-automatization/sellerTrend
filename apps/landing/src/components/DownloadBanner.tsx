import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import { MonitorIcon } from './icons';

const COOKIE_KEY = 'ventra-download-banner-dismissed';

export function DownloadBanner() {
  const [visible, setVisible] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const dismissed = localStorage.getItem(COOKIE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(COOKIE_KEY, '1');
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
                  <button
                    className="btn btn-primary btn-xs rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Tez kunda"
                  >
                    {t('download.win')}
                  </button>
                  <button
                    className="btn btn-outline btn-xs rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Tez kunda"
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
