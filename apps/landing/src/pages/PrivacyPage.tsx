import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';

export function PrivacyPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const sections = isRu ? ruSections : uzSections;
  const title = isRu ? 'Политика конфиденциальности' : 'Maxfiylik siyosati';
  const updated = isRu ? 'Последнее обновление: март 2026' : 'Oxirgi yangilanish: mart 2026';
  const backLabel = isRu ? '← На главную' : '← Bosh sahifaga';

  return (
    <div className="min-h-screen bg-base-100 text-base-content relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="mesh-blob absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #2E5BFF 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.02] grid-pattern" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-16">
        {/* Back link */}
        <motion.a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-base-content/40 hover:text-primary transition-colors mb-12"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {backLabel}
        </motion.a>

        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs text-base-content/50">VENTRA Legal</span>
          </div>
          <h1 className="font-display font-800 text-3xl sm:text-4xl text-base-content mb-3">
            {title}
          </h1>
          <p className="text-base-content/40 text-sm">{updated}</p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              className="glass-card rounded-2xl p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <h2 className="font-600 text-base text-base-content mb-3 flex items-center gap-2">
                <span className="text-xs font-mono text-primary/60">{String(i + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              <div className="text-sm text-base-content/60 leading-relaxed space-y-2">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          className="mt-8 glass-card rounded-2xl p-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <p className="text-sm text-base-content/50">
            {isRu ? 'Вопросы?' : 'Savollar?'}{' '}
            <a href="mailto:support@ventra.uz" className="text-primary hover:text-primary/80 transition-colors">
              support@ventra.uz
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const uzSections = [
  {
    title: "Umumiy ma'lumot",
    content: <p>VENTRA Analytics platformasi foydalanuvchilarning shaxsiy ma'lumotlarini O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida"gi Qonuni (2019) talablariga muvofiq himoya qiladi.</p>,
  },
  {
    title: "Qanday ma'lumotlar to'planadi",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Ro'yxatdan o'tishda: email va parol (bcrypt bilan shifrlangan)</li>
      <li>Foydalanish jarayonida: kuzatilayotgan mahsulotlar, qidiruv so'rovlari</li>
      <li>Texnik ma'lumotlar: IP manzil, brauzer turi, sessiya tokenlari</li>
      <li>To'lov ma'lumotlari: faqat to'lov operatori (Click, Payme) tomonidan qayta ishlanadi</li>
    </ul>,
  },
  {
    title: "Ma'lumotlar qanday ishlatiladi",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Xizmat ko'rsatish va tahlil natijalarini taqdim etish</li>
      <li>Hisobingiz xavfsizligini ta'minlash</li>
      <li>Yangi funksiyalar haqida xabardor qilish (faqat rozilik bergan foydalanuvchilarga)</li>
      <li>Platforma sifatini oshirish</li>
    </ul>,
  },
  {
    title: "Ma'lumotlar uchinchi shaxslarga berilishimi",
    content: <>
      <p className="mb-2">Biz shaxsiy ma'lumotlaringizni sotmaymiz. Ulashilishi mumkin:</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>Qonun talablari bo'yicha huquq-tartibot organlari talabiga ko'ra</li>
        <li>To'lov operatorlari — faqat to'lov tasdiqlash uchun</li>
        <li>Plausible Analytics — anonymlashtirilgan statistika (IP saqlanmaydi)</li>
      </ul>
    </>,
  },
  {
    title: "Cookie fayllar",
    content: <p>Saytimiz sessiya boshqaruvi, til sozlamalari va statistika uchun cookie'lardan foydalanadi. Brauzeringiz orqali o'chirib qo'yishingiz mumkin.</p>,
  },
  {
    title: "Ma'lumotlarni saqlash muddati",
    content: <p>Hisobingiz o'chirilganidan so'ng ma'lumotlar 30 kun ichida o'chiriladi. Moliyaviy yozuvlar qonun talabiga ko'ra 3 yil saqlanadi.</p>,
  },
  {
    title: "Huquqlaringiz",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Ma'lumotlaringizni ko'rish, tuzatish yoki o'chirish talabi</li>
      <li>Ma'lumotlarni qayta ishlashga rozilikni bekor qilish</li>
      <li>Ma'lumotlarni boshqa formatda olish (portabillik)</li>
    </ul>,
  },
];

const ruSections = [
  {
    title: 'Общие положения',
    content: <p>Платформа VENTRA Analytics защищает персональные данные пользователей в соответствии с Законом Республики Узбекистан "О персональных данных" (2019).</p>,
  },
  {
    title: 'Какие данные собираются',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>При регистрации: email и пароль (зашифрован bcrypt)</li>
      <li>В процессе использования: отслеживаемые товары, поисковые запросы</li>
      <li>Технические данные: IP-адрес, тип браузера, токены сессий</li>
      <li>Платёжные данные: обрабатываются только платёжным оператором (Click, Payme)</li>
    </ul>,
  },
  {
    title: 'Как используются данные',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Предоставление сервиса и результатов аналитики</li>
      <li>Обеспечение безопасности аккаунта</li>
      <li>Уведомления о новых функциях (только с согласия)</li>
      <li>Улучшение качества платформы</li>
    </ul>,
  },
  {
    title: 'Передача данных третьим лицам',
    content: <>
      <p className="mb-2">Мы не продаём персональные данные. Передача возможна:</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>По требованию правоохранительных органов</li>
        <li>Платёжные операторы — только для подтверждения оплаты</li>
        <li>Plausible Analytics — анонимизированная статистика (IP не сохраняется)</li>
      </ul>
    </>,
  },
  {
    title: 'Cookie-файлы',
    content: <p>Сайт использует cookie для управления сессиями, настроек языка и статистики. Вы можете отключить их в браузере.</p>,
  },
  {
    title: 'Срок хранения данных',
    content: <p>После удаления аккаунта данные удаляются в течение 30 дней. Финансовые записи хранятся 3 года согласно законодательству.</p>,
  },
  {
    title: 'Ваши права',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Просмотр, исправление или удаление своих данных</li>
      <li>Отзыв согласия на обработку данных</li>
      <li>Получение данных в переносимом формате</li>
    </ul>,
  },
];
