import { useState } from 'react';
import { motion } from 'framer-motion';
import { PricingCard } from '../components/PricingCard';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';

interface PricingSectionProps {
  appUrl: string;
}

interface PlanDef {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  periodKey: TranslationKey;
  featureKeys: TranslationKey[];
  ctaKey: TranslationKey;
  highlighted: boolean;
  badgeKey?: TranslationKey;
}

const PLANS: PlanDef[] = [
  {
    name: 'Starter',
    monthlyPrice: '',
    yearlyPrice: '',
    periodKey: 'pricing.period',
    featureKeys: ['pricing.starter.f1', 'pricing.starter.f2', 'pricing.starter.f3', 'pricing.starter.f4', 'pricing.starter.f5'],
    ctaKey: 'pricing.starter.cta',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthlyPrice: '99,000',
    yearlyPrice: '79,000',
    periodKey: 'pricing.periodSom',
    featureKeys: ['pricing.pro.f1', 'pricing.pro.f2', 'pricing.pro.f3', 'pricing.pro.f4', 'pricing.pro.f5', 'pricing.pro.f6', 'pricing.pro.f7'],
    ctaKey: 'pricing.pro.cta',
    highlighted: true,
    badgeKey: 'pricing.badge.popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: '299,000',
    yearlyPrice: '239,000',
    periodKey: 'pricing.periodSom',
    featureKeys: ['pricing.enterprise.f1', 'pricing.enterprise.f2', 'pricing.enterprise.f3', 'pricing.enterprise.f4', 'pricing.enterprise.f5', 'pricing.enterprise.f6', 'pricing.enterprise.f7'],
    ctaKey: 'pricing.enterprise.cta',
    highlighted: false,
  },
];

export function PricingSection({ appUrl }: PricingSectionProps) {
  const [yearly, setYearly] = useState(false);
  const { t } = useLang();

  return (
    <section id="pricing" aria-label="Narxlar" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('pricing.title1')} <span className="gradient-text">{t('pricing.title2')}</span>
          </h2>
          <p className="text-base-content/60 mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 glass-card rounded-full px-4 py-2">
            <span className={`text-sm ${!yearly ? 'text-base-content' : 'text-base-content/50'}`}>{t('pricing.monthly')}</span>
            <button
              role="switch"
              aria-checked={yearly}
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-base-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${yearly ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${yearly ? 'text-base-content' : 'text-base-content/50'}`}>
              {t('pricing.yearly')} <span className="text-success text-xs">-20%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => {
            const isFree = plan.name === 'Starter';
            const price = isFree ? t('pricing.free') : (yearly ? plan.yearlyPrice : plan.monthlyPrice);
            const period = isFree ? '' : ` ${t(plan.periodKey)}`;

            return (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={price}
                period={period}
                features={plan.featureKeys.map(k => t(k))}
                highlighted={plan.highlighted}
                badge={plan.badgeKey ? t(plan.badgeKey) : undefined}
                ctaLabel={t(plan.ctaKey)}
                ctaHref={plan.name === 'Enterprise' ? 'mailto:support@ventra.uz' : `${appUrl}/register`}
                index={i}
              />
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-base-content/40 mt-8"
        >
          {t('pricing.footer')}
        </motion.p>
      </div>
    </section>
  );
}
