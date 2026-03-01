import { useRef } from 'react';
import { motion } from 'framer-motion';
import { TestimonialCard } from '../components/TestimonialCard';
import { useLang } from '../lib/LangContext';

const TESTIMONIALS = [
  {
    name: 'Jasur Karimov',
    shop: 'TechZone Shop',
    avatar: 'JK',
    text: 'VENTRA dan keyin trend mahsulotlarni 5 daqiqada topyapman. Oylik sotuvim 3 barobarga oshdi. Raqiblarni kuzatish funksiyasi ayniqsa foydali!',
    rating: 5,
  },
  {
    name: 'Nilufar Rashidova',
    shop: 'Beauty & Style',
    avatar: 'NR',
    text: 'Sourcing engine ajoyib — 1688 dan narxlarni to\'g\'ridan VENTRA orqali ko\'ryapman. Cargo bilan hisoblash ham bor. Vaqtimni juda tejayapman.',
    rating: 5,
  },
  {
    name: 'Bobur Yusupov',
    shop: 'Elektronika Market',
    avatar: 'BY',
    text: 'Score tizimi juda to\'g\'ri ishlaydi. 9+ score mahsulotlarga sarmoya qildim — hammasi yaxshi ketdi. Telegram bot ham kechiktirmaydi.',
    rating: 5,
  },
  {
    name: 'Zulfiya Mirzaeva',
    shop: 'Fashion Hub UZ',
    avatar: 'ZM',
    text: 'Avval Excel da qo\'lda hisoblardim. Endi VENTRA avtomatik bajaradi. Desktop ilova ham juda qulay — brauzer ochmasdan ishlayapman.',
    rating: 4,
  },
];

export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
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
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            {t('test.title1')} <span className="gradient-text">{t('test.title2')}</span>
          </h2>
          <p className="text-base-content/60">{t('test.subtitle')}</p>
        </motion.div>
      </div>

      {/* Scrollable testimonials */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 px-4 sm:px-8 lg:px-16 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Duplicate for infinite feel */}
        {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % TESTIMONIALS.length) * 0.1 }}
            className="snap-start flex-shrink-0"
          >
            <TestimonialCard {...t} />
          </motion.div>
        ))}
      </div>

      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </section>
  );
}
