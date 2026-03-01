import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useCountUp } from '../hooks/useCountUp';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';

const STATS: { value: number; suffix: string; labelKey: TranslationKey; icon: string }[] = [
  { value: 1000, suffix: '+', labelKey: 'stats.label1', icon: '👥' },
  { value: 50000, suffix: '+', labelKey: 'stats.label2', icon: '📦' },
  { value: 24, suffix: '/7', labelKey: 'stats.label3', icon: '⚡' },
  { value: 10, suffix: 'x', labelKey: 'stats.label4', icon: '📈' },
];

function StatCounter({ value, suffix, label, icon, start }: { value: number; suffix: string; label: string; icon: string; start: boolean }) {
  const count = useCountUp(value, 2000, start);

  return (
    <div className="text-center">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="font-display font-800 text-4xl sm:text-5xl text-white mb-2">
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
      <div className="absolute inset-0 pointer-events-none"
           style={{
             backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
           }} />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            {t('stats.title1')} <span className="gradient-text">VENTRA</span>
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
