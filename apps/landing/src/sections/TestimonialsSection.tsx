import { motion } from 'framer-motion';
import { TestimonialCard } from '../components/TestimonialCard';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';

const TESTIMONIALS: { name: string; shop: string; avatar: string; textKey: TranslationKey; rating: number }[] = [
  { name: 'Jasur Karimov', shop: 'TechZone Shop', avatar: 'JK', textKey: 'test.1.text', rating: 5 },
  { name: 'Nilufar Rashidova', shop: 'Beauty & Style', avatar: 'NR', textKey: 'test.2.text', rating: 5 },
  { name: 'Bobur Yusupov', shop: 'Elektronika Market', avatar: 'BY', textKey: 'test.3.text', rating: 5 },
  { name: 'Zulfiya Mirzaeva', shop: 'Fashion Hub UZ', avatar: 'ZM', textKey: 'test.4.text', rating: 4 },
];

export function TestimonialsSection() {
  const { t } = useLang();

  return (
    <section id="testimonials" aria-label="Foydalanuvchi izohlari" className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('test.title1')} <span className="gradient-text">{t('test.title2')}</span>
          </h2>
          <p className="text-base-content/60">{t('test.subtitle')}</p>
        </motion.div>
      </div>

      {/* Scrollable testimonials */}
      <div
        className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-8 lg:px-16 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {TESTIMONIALS.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="snap-start flex-shrink-0"
          >
            <TestimonialCard name={item.name} shop={item.shop} avatar={item.avatar} text={t(item.textKey)} rating={item.rating} />
          </motion.div>
        ))}
      </div>

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}
