import { motion } from 'framer-motion';
import { FAQItem } from '../components/FAQItem';
import { useLang } from '../lib/LangContext';

const FAQS = [
  { question: 'VENTRA nima?', answer: 'VENTRA — Uzum.uz marketplace sotuvchilari uchun premium AI analytics platforma. Qaysi mahsulot trend, raqiblar narxi, Xitoydan arzon narx topish va boshqa imkoniyatlarni taqdim etadi.' },
  { question: 'Bepul foydalansa bo\'ladimi?', answer: 'Ha! Starter tarif mutlaqo bepul — 5 ta mahsulot tracking, asosiy analytics va kunlik discovery bilan. Bank kartasi kiritish shart emas.' },
  { question: 'Ma\'lumotlar qayerdan olinadi?', answer: 'Ma\'lumotlar Uzum.uz dan real-time olinadi. Hafta sayin mahsulot snapshot\'lari yangilanadi, stok va narx o\'zgarishlari kuzatiladi.' },
  { question: 'Desktop ilova qaysi OS da ishlaydi?', answer: 'Windows 10 va undan yuqori versiyalar, hamda macOS 12 (Monterey) va undan yuqori versiyalarda ishlaydi.' },
  { question: 'Telegram bot nima qiladi?', answer: 'Telegram bot muhim o\'zgarishlarni darhol xabar qiladi: narx tushishi, stok tugayotganligi, yangi trend signal, raqib narx o\'zgarishi va boshqalar.' },
  { question: 'Ma\'lumotlarim xavfsizmi?', answer: 'Ha. JWT autentifikatsiya, bcrypt parol xeshlash, va har so\'rovda account_id filtrlash ishlatiladi. Ma\'lumotlar faqat sizniki.' },
  { question: 'Qanday to\'lash mumkin?', answer: 'Click, Payme va Uzum nasiya orqali to\'lash mumkin. Yillik obuna uchun 20% chegirma mavjud.' },
];

export function FAQSection() {
  const { t } = useLang();

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            {t('faq.title1')}{' '}
            <span className="gradient-text">{t('faq.title2')}</span>
          </h2>
          <p className="text-base-content/60">{t('faq.subtitle')}</p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <FAQItem {...faq} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
