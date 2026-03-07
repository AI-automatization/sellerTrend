import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/LangContext';

const STORAGE_KEY = 'ventra_cookie_consent';

interface CookieBannerProps {
  onDone: () => void;
}

export function CookieBanner({ onDone }: CookieBannerProps) {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      } else {
        onDone();
      }
    } catch {
      // Private mode
      onDone();
    }
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted'); } catch { /* ignore */ }
    setVisible(false);
    onDone();
  }

  function decline() {
    try { localStorage.setItem(STORAGE_KEY, 'declined'); } catch { /* ignore */ }
    setVisible(false);
    onDone();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-4 left-4 right-4 sm:right-auto sm:bottom-6 sm:max-w-md z-50"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="glass-card rounded-2xl p-5 shadow-2xl">
            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
                </svg>
              </div>
              <span className="font-600 text-sm text-base-content">Cookie</span>
            </div>

            <p className="text-sm text-base-content/60 mb-4 leading-relaxed">
              {t('cookie.message')}{' '}
              <a href="/privacy" className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2">
                {t('cookie.policy')}
              </a>
            </p>

            <div className="flex gap-2">
              <button
                onClick={decline}
                className="btn btn-ghost btn-sm flex-1 text-base-content/50 hover:text-base-content"
              >
                {t('cookie.decline')}
              </button>
              <button
                onClick={accept}
                className="btn btn-primary btn-sm flex-1 glow-btn"
              >
                {t('cookie.accept')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
