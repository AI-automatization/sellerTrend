import { motion } from 'framer-motion';
import { FeatureCard } from '../components/FeatureCard';

const FEATURES = [
  {
    icon: '📊',
    title: 'Real-time Analytics',
    description: 'Uzum\'dan jonli ma\'lumotlar — narx, stok, sotuv miqdori har hafta yangilanadi.',
  },
  {
    icon: '✨',
    title: 'Trend Discovery',
    description: 'AI avtomatik trend mahsulotlarni topadi va Score 1-10 bilan baholaydi.',
  },
  {
    icon: '🔔',
    title: 'Signal Detection',
    description: 'Narx tushdi, stok tugayapti, yangi raqib — muhim o\'zgarishlar darhol xabar.',
  },
  {
    icon: '👁️',
    title: 'Raqib Kuzatuvi',
    description: 'Raqiblar narxini 24/7 monitoring. Har o\'zgarishda Telegram notification.',
  },
  {
    icon: '🌐',
    title: 'Sourcing Engine',
    description: '1688, Taobao, AliExpress dan eng arzon narxni AI bilan topish.',
  },
  {
    icon: '🤖',
    title: 'AI Tahlili',
    description: 'Claude AI mahsulotni tahlil qiladi, bozor pozitsiyasini va maslahatlarni beradi.',
  },
  {
    icon: '🧮',
    title: 'Profit Kalkulyator',
    description: 'Cargo, bojxona, QQS, FBO/FBS — aniq foyda foizini hisoblash.',
  },
  {
    icon: '💬',
    title: 'Telegram Bot',
    description: 'Muhim signallar va yangiliklar to\'g\'ridan-to\'g\'ri Telegram\'ga yetkaziladi.',
  },
  {
    icon: '🖥️',
    title: 'Desktop Ilova',
    description: 'Windows va macOS da brauzer ochmasdan ishlash. Tezroq, qularoq.',
  },
  {
    icon: '🧩',
    title: 'Browser Extension',
    description: 'Uzum.uz sahifasida 1 klik bilan mahsulot score va tahlilini ko\'rish.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-5 rounded-full"
             style={{ background: 'radial-gradient(ellipse, #2E5BFF 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-600 text-primary uppercase tracking-widest mb-3">
            Imkoniyatlar
          </span>
          <h2 className="font-display font-700 text-3xl sm:text-4xl text-white mb-4">
            Sotuvingizni o'stiradigan{' '}
            <span className="gradient-text">10 ta kuchli vosita</span>
          </h2>
          <p className="text-base-content/60 max-w-xl mx-auto">
            Bitta platformada barcha kerakli analytics — savdo tahlilidan tortib manba qidirishgacha
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
