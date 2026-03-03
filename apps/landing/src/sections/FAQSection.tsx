import { motion } from 'framer-motion';
import { FAQItem } from '../components/FAQItem';
import { useLang } from '../lib/LangContext';
import type { TranslationKey } from '../lib/i18n';

const FAQ_KEYS: { qKey: TranslationKey; aKey: TranslationKey }[] = [
  { qKey: 'faq.1.q', aKey: 'faq.1.a' },
  { qKey: 'faq.2.q', aKey: 'faq.2.a' },
  { qKey: 'faq.3.q', aKey: 'faq.3.a' },
  { qKey: 'faq.4.q', aKey: 'faq.4.a' },
  { qKey: 'faq.5.q', aKey: 'faq.5.a' },
  { qKey: 'faq.6.q', aKey: 'faq.6.a' },
  { qKey: 'faq.7.q', aKey: 'faq.7.a' },
];

export function FAQSection() {
  const { t } = useLang();

  return (
    <section id="faq" aria-label="Tez-tez so'raladigan savollar" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-base-content mb-4">
            {t('faq.title1')}{' '}
            <span className="gradient-text">{t('faq.title2')}</span>
          </h2>
          <p className="text-base-content/60">{t('faq.subtitle')}</p>
        </motion.div>

        <div className="space-y-3">
          {FAQ_KEYS.map((faq, i) => (
            <motion.div
              key={faq.qKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <FAQItem question={t(faq.qKey)} answer={t(faq.aKey)} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
