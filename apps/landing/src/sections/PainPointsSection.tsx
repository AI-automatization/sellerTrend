import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, staggerItem, VIEWPORT } from '../lib/animations';
import { useLang } from '../lib/LangContext';

const PAIN_POINTS = [
  {
    emoji: '😕',
    problem: 'Qaysi mahsulot sotiladi — bilmaysiz',
    problemDesc: 'Yangi mahsulot qo\'shsam sotilarmikan? Trend nima? Raqiblar nima sotayapti?',
    solution: 'VENTRA Trend Discovery',
    solutionDesc: 'AI har kuni trend mahsulotlarni topadi. Score 1-10 bilan baholaydi. Siz faqat tanlaysiz.',
  },
  {
    emoji: '😤',
    problem: 'Raqiblar arzonroq sotayapti — ko\'rmaysiz',
    problemDesc: 'Raqibim narxini tushirdimi? Qachon tushurdi? Meniki yuqorimi?',
    solution: 'VENTRA Raqib Kuzatuvi',
    solutionDesc: '24/7 raqiblar narxini monitoring. Narx o\'zgarganda darhol Telegram da xabar.',
  },
  {
    emoji: '🤔',
    problem: 'Xitoydan narxni bilmaysiz — qidirib ko\'rmaysiz',
    problemDesc: '1688, Taobao, AliExpress — hammasi turli tilda, turli narxda.',
    solution: 'VENTRA Sourcing Engine',
    solutionDesc: 'AI barcha platformalarni qidiradi, cargo va QQS bilan aniq foyda hisoblaydi.',
  },
];

export function PainPointsSection() {
  const { t } = useLang();

  return (
    <section id="pain-points" aria-label="Muammolar va yechimlar" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="text-center mb-16"
        >
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            {t('pain.title')}
          </h2>
          <p className="text-base-content/60 max-w-xl mx-auto">
            {t('pain.subtitle')}
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
          className="grid md:grid-cols-3 gap-6"
        >
          {PAIN_POINTS.map((item) => (
            <motion.div
              key={item.problem}
              variants={staggerItem}
              className="glass-card rounded-2xl overflow-hidden"
            >
              {/* Problem (red) */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs text-error font-600 uppercase tracking-wide">{t('pain.label')}</span>
                </div>
                <h3 className="font-display font-600 text-base text-white mb-2">
                  {item.problem}
                </h3>
                <p className="text-sm text-base-content/50">{item.problemDesc}</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center py-3 text-primary text-xl">↓</div>

              {/* Solution (green) */}
              <div className="p-5 bg-success/5 border-t border-success/10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-success font-600 uppercase tracking-wide">{t('pain.solution')}</span>
                  <span className="badge badge-success badge-xs">{item.solution}</span>
                </div>
                <p className="text-sm text-base-content/70 leading-relaxed">{item.solutionDesc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
