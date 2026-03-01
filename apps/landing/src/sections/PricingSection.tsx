import { useState } from 'react';
import { motion } from 'framer-motion';
import { PricingCard } from '../components/PricingCard';
import { useLang } from '../lib/LangContext';

interface PricingSectionProps {
  appUrl: string;
}

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 'Bepul',
    yearlyPrice: 'Bepul',
    period: '/oy',
    features: ['5 ta mahsulot tracking', 'Asosiy analytics', '1 ta discovery/kun', 'Score ko\'rish', 'Email support'],
    ctaLabel: 'Bepul boshlash',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthlyPrice: '99,000',
    yearlyPrice: '79,000',
    period: ' so\'m/oy',
    badge: 'Eng mashhur ⭐',
    features: ['50 ta mahsulot tracking', 'AI tahlili (Claude)', 'Cheksiz discovery', 'Sourcing engine', 'Raqib kuzatuvi', 'Telegram bot', 'Priority support'],
    ctaLabel: '14 kun bepul sinash',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: '299,000',
    yearlyPrice: '239,000',
    period: ' so\'m/oy',
    features: ['Cheksiz mahsulotlar', 'API access', 'Team accounts (5 ta)', 'Custom reports', 'Dedicated support', 'SLA 99.9%', 'Branding (white-label)'],
    ctaLabel: 'Bog\'lanish',
    highlighted: false,
  },
];

export function PricingSection({ appUrl }: PricingSectionProps) {
  const [yearly, setYearly] = useState(false);
  const { t } = useLang();

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            {t('pricing.title1')} <span className="gradient-text">{t('pricing.title2')}</span>
          </h2>
          <p className="text-base-content/60 mb-8">
            {t('pricing.subtitle')}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 glass-card rounded-full px-4 py-2">
            <span className={`text-sm ${!yearly ? 'text-white' : 'text-base-content/50'}`}>{t('pricing.monthly')}</span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-primary' : 'bg-base-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${yearly ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${yearly ? 'text-white' : 'text-base-content/50'}`}>
              {t('pricing.yearly')} <span className="text-success text-xs">-20%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              price={yearly ? plan.yearlyPrice : plan.monthlyPrice}
              period={plan.period}
              features={plan.features}
              highlighted={plan.highlighted}
              badge={plan.badge}
              ctaLabel={plan.ctaLabel}
              ctaHref={plan.name === 'Enterprise' ? 'mailto:support@ventra.uz' : `${appUrl}/register`}
              index={i}
            />
          ))}
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
