import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, VIEWPORT } from '../lib/animations';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';
import { HelpCircleIcon, ShieldAlertIcon, SearchXIcon } from '../components/icons';

const IC = 'w-6 h-6 text-error';

const PAIN_POINTS: { icon: ReactNode; problemKey: TranslationKey; problemDescKey: TranslationKey; solutionKey: TranslationKey; solutionDescKey: TranslationKey }[] = [
  {
    icon: <HelpCircleIcon className={IC} />,
    problemKey: 'pain.1.problem',
    problemDescKey: 'pain.1.problemDesc',
    solutionKey: 'pain.1.solution',
    solutionDescKey: 'pain.1.solutionDesc',
  },
  {
    icon: <ShieldAlertIcon className={IC} />,
    problemKey: 'pain.2.problem',
    problemDescKey: 'pain.2.problemDesc',
    solutionKey: 'pain.2.solution',
    solutionDescKey: 'pain.2.solutionDesc',
  },
  {
    icon: <SearchXIcon className={IC} />,
    problemKey: 'pain.3.problem',
    problemDescKey: 'pain.3.problemDesc',
    solutionKey: 'pain.3.solution',
    solutionDescKey: 'pain.3.solutionDesc',
  },
];

export function PainPointsSection() {
  const { t } = useLang();

  return (
    <section id="pain-points" aria-label="Muammolar va yechimlar" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="text-center mb-16"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('pain.title')}
          </h2>
          <p className="text-base-content/60 max-w-xl mx-auto">
            {t('pain.subtitle')}
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid md:grid-cols-3 gap-6"
        >
          {PAIN_POINTS.map((item) => (
            <motion.div
              key={item.problemKey}
              variants={staggerItem}
              className="glass-card rounded-2xl overflow-hidden"
            >
              {/* Problem (red) */}
              <div className="p-5 border-b border-base-content/5">
                <div className="flex items-center gap-2 mb-3">
                  {item.icon}
                  <span className="text-xs text-error font-600 uppercase tracking-wide">{t('pain.label')}</span>
                </div>
                <h3 className="font-display font-600 text-base text-base-content mb-2">
                  {t(item.problemKey)}
                </h3>
                <p className="text-sm text-base-content/50">{t(item.problemDescKey)}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center py-3 text-primary text-xl">↓</div>

              {/* Solution (green) */}
              <div className="p-5 bg-success/5 border-t border-success/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-success font-600 uppercase tracking-wide">{t('pain.solution')}</span>
                  <span className="badge badge-success badge-outline badge-xs text-success">{t(item.solutionKey)}</span>
                </div>
                <p className="text-sm text-base-content/70 leading-relaxed">{t(item.solutionDescKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
