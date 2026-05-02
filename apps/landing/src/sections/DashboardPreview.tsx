import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';

interface DashboardPreviewProps {
  appUrl: string;
}

interface ScreenshotTab {
  labelKey: TranslationKey;
  captionKey: TranslationKey;
  bg: string;
  preview: string;
}

const SCREENSHOTS: ScreenshotTab[] = [
  { labelKey: 'preview.tab1', captionKey: 'preview.tab1.desc', bg: 'from-blue-900/40 to-violet-900/40', preview: 'dashboard' },
  { labelKey: 'preview.tab2', captionKey: 'preview.tab2.desc', bg: 'from-emerald-900/40 to-blue-900/40', preview: 'product' },
  { labelKey: 'preview.tab3', captionKey: 'preview.tab3.desc', bg: 'from-violet-900/40 to-pink-900/40', preview: 'discovery' },
];

function MockScreen({ type, bg, t }: { type: string; bg: string; t: (key: TranslationKey) => string }) {
  const items: Record<string, React.ReactNode> = {
    dashboard: (
      <div className="h-full flex flex-col gap-2 p-3">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { value: '247', label: t('mock.products') },
            { value: '8.4', label: 'score' },
            { value: '+32%', label: t('mock.trend') },
            { value: '14', label: t('mock.signal') },
          ].map((kpi, i) => (
            <div key={i} className="bg-white/10 rounded p-1.5 text-center">
              <div className="text-white text-xs font-600">{kpi.value}</div>
              <div className="text-white/40 text-xs">{kpi.label}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 bg-white/5 rounded flex items-end gap-0.5 px-2 pb-1">
          {[30, 50, 40, 70, 55, 80, 65, 90, 75, 85, 95, 88].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm opacity-80"
                 style={{ height: `${h}%`, background: 'linear-gradient(to top, #2E5BFF, #7C3AED)' }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded h-8 flex items-center px-2 gap-1.5">
              <div className="w-4 h-4 rounded-sm bg-primary/50" />
              <div className="flex-1 h-1.5 bg-white/20 rounded" />
            </div>
          ))}
        </div>
      </div>
    ),
    product: (
      <div className="h-full flex gap-2 p-3">
        <div className="flex-1 flex flex-col gap-2">
          <div className="bg-white/10 rounded p-2">
            <div className="text-white/40 text-xs mb-1">{t('mock.score')}</div>
            <div className="text-primary font-700 text-xl">9.2</div>
          </div>
          <div className="flex-1 bg-white/5 rounded flex items-end gap-0.5 px-1 pb-1">
            {[60, 70, 80, 75, 90, 85, 92].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm"
                   style={{ height: `${h}%`, background: '#2E5BFF', opacity: 0.6 + i * 0.05 }} />
            ))}
          </div>
        </div>
        <div className="w-2/5 flex flex-col gap-2">
          <div className="bg-white/10 rounded p-2">
            <div className="text-white/40 text-xs">{t('mock.ai')}</div>
            <div className="text-white/70 text-xs mt-1 leading-relaxed">{t('mock.aiText')}</div>
          </div>
          <div className="bg-success/20 rounded p-2 flex-1">
            <div className="text-success text-xs">+24% {t('mock.weekly')}</div>
          </div>
        </div>
      </div>
    ),
    discovery: (
      <div className="h-full flex flex-col gap-2 p-3">
        <div className="bg-white/5 rounded p-2 flex items-center gap-2">
          <div className="flex-1 h-4 bg-white/10 rounded" />
          <div className="bg-primary rounded px-2 py-1 text-white text-xs">{t('mock.search')}</div>
        </div>
        {[9.4, 8.9, 8.7, 8.5, 8.2].map((score, i) => (
          <div key={i} className="bg-white/5 rounded p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white/10 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-2 bg-white/20 rounded w-3/4 mb-1" />
              <div className="h-1.5 bg-white/10 rounded w-1/2" />
            </div>
            <div className="text-primary text-xs font-700">{score}</div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <div className={`w-full h-full bg-gradient-to-br ${bg}`}>
      {items[type] ?? null}
    </div>
  );
}

export function DashboardPreview({ appUrl }: DashboardPreviewProps) {
  const [active, setActive] = useState(0);
  const { t } = useLang();

  return (
    <section id="preview" aria-label="Dashboard ko'rinishi" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('preview.title1')} <span className="gradient-text">{t('preview.title2')}</span>
          </h2>
          <p className="text-base-content/60">{t('preview.subtitle')}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Tab buttons */}
          <div className="flex flex-col gap-3">
            {SCREENSHOTS.map((item, i) => (
              <motion.button
                key={item.labelKey}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setActive(i)}
                className={`text-left p-4 rounded-xl transition-all duration-300 border ${
                  active === i
                    ? 'glass-card border-primary/40 shadow-lg shadow-primary/10'
                    : 'border-transparent hover:bg-base-content/5'
                }`}
              >
                <p className={`font-600 text-sm ${active === i ? 'text-base-content' : 'text-base-content/50'}`}>
                  {t(item.labelKey)}
                </p>
                {active === i && (
                  <p className="text-xs text-base-content/50 mt-1">{t(item.captionKey)}</p>
                )}
              </motion.button>
            ))}
            <a
              href={`${appUrl}/register`}
              className="btn btn-primary rounded-full w-fit px-6 mt-2"
            >
              {t('preview.cta')}
            </a>
          </div>

          {/* Screen preview */}
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="glass-card rounded-2xl overflow-hidden shadow-2xl glow-blue"
          >
            {/* Browser bar */}
            <div className="bg-base-300 flex items-center gap-1.5 px-3 py-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
              <div className="flex-1 mx-2 bg-base-100 rounded h-4 flex items-center px-2">
                <span className="text-xs text-base-content/30">app.ventra.uz</span>
              </div>
            </div>
            {/* Content */}
            <div className="aspect-video">
              <MockScreen type={SCREENSHOTS[active].preview} bg={SCREENSHOTS[active].bg} t={t} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
