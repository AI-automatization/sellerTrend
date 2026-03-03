import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { FeatureCard } from '../components/FeatureCard';
import { fadeUp, staggerContainer, VIEWPORT } from '../lib/animations';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';
import {
  BarChartIcon, SparklesIcon, BellIcon, EyeIcon, GlobeIcon,
  CpuIcon, CalculatorIcon, MessageIcon, MonitorIcon, PuzzleIcon,
} from '../components/icons';

const IC = 'w-6 h-6 text-primary';

const FEATURES: { icon: ReactNode; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: <BarChartIcon className={IC} />, titleKey: 'feat.1.title', descKey: 'feat.1.desc' },
  { icon: <SparklesIcon className={IC} />, titleKey: 'feat.2.title', descKey: 'feat.2.desc' },
  { icon: <BellIcon className={IC} />, titleKey: 'feat.3.title', descKey: 'feat.3.desc' },
  { icon: <EyeIcon className={IC} />, titleKey: 'feat.4.title', descKey: 'feat.4.desc' },
  { icon: <GlobeIcon className={IC} />, titleKey: 'feat.5.title', descKey: 'feat.5.desc' },
  { icon: <CpuIcon className={IC} />, titleKey: 'feat.6.title', descKey: 'feat.6.desc' },
  { icon: <CalculatorIcon className={IC} />, titleKey: 'feat.7.title', descKey: 'feat.7.desc' },
  { icon: <MessageIcon className={IC} />, titleKey: 'feat.8.title', descKey: 'feat.8.desc' },
  { icon: <MonitorIcon className={IC} />, titleKey: 'feat.9.title', descKey: 'feat.9.desc' },
  { icon: <PuzzleIcon className={IC} />, titleKey: 'feat.10.title', descKey: 'feat.10.desc' },
];

export function FeaturesSection() {
  const { t } = useLang();

  return (
    <section id="features" aria-label="Imkoniyatlar" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-5 rounded-full"
             style={{ background: 'radial-gradient(ellipse, #2E5BFF 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-600 text-primary uppercase tracking-widest mb-3">
            {t('features.tag')}
          </span>
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('features.title1')}{' '}
            <span className="gradient-text">{t('features.title2')}</span>
          </h2>
          <p className="text-base-content/60 max-w-xl mx-auto">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        >
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.titleKey} icon={feature.icon} title={t(feature.titleKey)} description={t(feature.descKey)} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
