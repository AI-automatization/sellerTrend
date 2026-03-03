import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCountUp } from '../hooks/useCountUp';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';
import { UsersIcon, PackageIcon, ActivityIcon, TrendUpIcon } from '../components/icons';

const IC = 'w-7 h-7 text-primary mx-auto';

const STATS: { value: number; suffix: string; labelKey: TranslationKey; icon: ReactNode }[] = [
  { value: 1000, suffix: '+', labelKey: 'stats.label1', icon: <UsersIcon className={IC} /> },
  { value: 50000, suffix: '+', labelKey: 'stats.label2', icon: <PackageIcon className={IC} /> },
  { value: 24, suffix: '/7', labelKey: 'stats.label3', icon: <ActivityIcon className={IC} /> },
  { value: 10, suffix: 'x', labelKey: 'stats.label4', icon: <TrendUpIcon className={IC} /> },
];

function StatCounter({ value, suffix, label, icon, start }: { value: number; suffix: string; label: string; icon: ReactNode; start: boolean }) {
  const count = useCountUp(value, 2000, start);

  return (
    <div className="text-center">
      <div className="mb-3">{icon}</div>
      <div className="font-display font-800 text-4xl sm:text-5xl text-base-content mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <p className="text-base-content/60 text-sm">{label}</p>
    </div>
  );
}

export function StatsSection() {
  const { ref, isInView } = useScrollAnimation(0.3);
  const { t } = useLang();

  return (
    <section id="stats" aria-label="Statistika" ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg opacity-10" />
      <div className="absolute inset-0 pointer-events-none grid-pattern-sm" />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('stats.title1')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <StatCounter
                value={stat.value}
                suffix={stat.suffix}
                label={t(stat.labelKey)}
                icon={stat.icon}
                start={isInView}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
