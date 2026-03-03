import { motion } from 'framer-motion';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  ctaLabel: string;
  ctaHref: string;
  index: number;
}

export function PricingCard({
  name,
  price,
  period,
  features,
  highlighted = false,
  badge,
  ctaLabel,
  ctaHref,
  index,
}: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6 }}
      className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
        highlighted
          ? 'gradient-bg text-white shadow-2xl glow-blue scale-105'
          : 'glass-card hover:border-base-content/20'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-white text-primary text-xs font-700 px-3 py-1 rounded-full shadow">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className={`font-display font-700 text-lg mb-1 ${highlighted ? 'text-white' : 'text-base-content'}`}>
          {name}
        </h3>
        <div className="flex items-end gap-1 mt-3">
          <span className="font-display font-800 text-3xl">{price}</span>
          <span className={`text-sm mb-1 ${highlighted ? 'text-white/70' : 'text-base-content/50'}`}>
            {period}
          </span>
        </div>
      </div>

      <ul className="space-y-3 flex-1 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <span className={highlighted ? 'text-white/80' : 'text-success'}>✓</span>
            <span className={highlighted ? 'text-white/90' : 'text-base-content/70'}>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={ctaHref}
        className={`btn rounded-full w-full font-600 ${
          highlighted
            ? 'bg-white text-primary hover:bg-white/90 border-none'
            : 'btn-primary'
        }`}
      >
        {ctaLabel}
      </a>
    </motion.div>
  );
}
