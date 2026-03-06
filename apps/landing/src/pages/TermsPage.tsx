import { motion } from 'framer-motion';
import { useLang } from '../lib/LangContext';

export function TermsPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  const sections = isRu ? ruSections : uzSections;
  const title = isRu ? 'Условия использования' : 'Foydalanish shartlari';
  const updated = isRu ? 'Последнее обновление: март 2026' : 'Oxirgi yangilanish: mart 2026';
  const backLabel = isRu ? '← На главную' : '← Bosh sahifaga';

  return (
    <div className="min-h-screen bg-base-100 text-base-content relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="mesh-blob absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
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
    title: "Shartlarni qabul qilish",
    content: <p>VENTRA platformasidan foydalanish orqali siz ushbu Foydalanish shartlarini qabul qilasiz. Agar rozi bo'lmasangiz, platformadan foydalanmang.</p>,
  },
  {
    title: "Xizmat tavsifi",
    content: <p>VENTRA — Uzum.uz marketplace sotuvchilari uchun analytics xizmati. Ma'lumotlarni tahlil qilish, trend qidirish va narx kuzatish imkoniyatlarini taqdim etamiz.</p>,
  },
  {
    title: "Hisob va xavfsizlik",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Hisob yaratishda to'g'ri ma'lumot kiritish majburiy</li>
      <li>Parolingiz maxfiyligini siz ta'minlaysiz</li>
      <li>Ruxsatsiz foydalanish haqida darhol xabar bering</li>
      <li>Bir kishi — bir hisob</li>
    </ul>,
  },
  {
    title: "Taqiqlangan harakatlar",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Bot yoki skriptlar orqali foydalanish</li>
      <li>Serverlarga ortiqcha yuklanish yaratish</li>
      <li>Boshqa foydalanuvchilarning ma'lumotlariga ruxsatsiz kirish</li>
      <li>Noqonuniy maqsadlarda foydalanish</li>
      <li>Ma'lumotlarni raqobatchilar bilan ulashish</li>
    </ul>,
  },
  {
    title: "To'lov va obuna",
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Starter tarif bepul — kredit kartasi talab qilinmaydi</li>
      <li>Pro va Enterprise tariflar oylik yoki yillik to'lov asosida</li>
      <li>Obunani istalgan vaqt bekor qilish mumkin</li>
      <li>To'lovlar Click, Payme yoki Uzum nasiya orqali</li>
    </ul>,
  },
  {
    title: "Intellektual mulk",
    content: <p>VENTRA platformasi, logotipi, algoritmlari va kontenti bizning mulkimiz. Ruxsatsiz nusxa ko'chirish yoki tarqatish taqiqlangan.</p>,
  },
  {
    title: "Ma'lumotlar aniqligi",
    content: <p>Biz ma'lumotlar aniqligini ta'minlashga harakat qilamiz, lekin Uzum.uz ma'lumotlaridagi o'zgarishlar uchun javobgar emasmiz. Tahlil natijalari investitsiya tavsiyasi emas.</p>,
  },
  {
    title: "Qo'llaniladigan qonunlar",
    content: <p>Ushbu shartlar O'zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.</p>,
  },
];

const ruSections = [
  {
    title: 'Принятие условий',
    content: <p>Используя платформу VENTRA, вы принимаете настоящие Условия использования. Если вы не согласны, не используйте платформу.</p>,
  },
  {
    title: 'Описание сервиса',
    content: <p>VENTRA — аналитический сервис для продавцов маркетплейса Uzum.uz. Предоставляем инструменты анализа данных, поиска трендов и мониторинга цен.</p>,
  },
  {
    title: 'Аккаунт и безопасность',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>При регистрации необходимо указывать достоверные данные</li>
      <li>Вы несёте ответственность за конфиденциальность пароля</li>
      <li>О несанкционированном доступе сообщайте немедленно</li>
      <li>Один человек — один аккаунт</li>
    </ul>,
  },
  {
    title: 'Запрещённые действия',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Использование через автоматические боты или скрипты</li>
      <li>Создание избыточной нагрузки на серверы</li>
      <li>Несанкционированный доступ к данным других пользователей</li>
      <li>Использование в незаконных целях</li>
      <li>Передача данных конкурентам</li>
    </ul>,
  },
  {
    title: 'Оплата и подписка',
    content: <ul className="list-disc pl-4 space-y-1">
      <li>Тариф Starter — бесплатно, без карты</li>
      <li>Pro и Enterprise — ежемесячная или годовая оплата</li>
      <li>Отмена подписки в любое время</li>
      <li>Оплата через Click, Payme или Uzum nasiya</li>
    </ul>,
  },
  {
    title: 'Интеллектуальная собственность',
    content: <p>Платформа VENTRA, логотип, алгоритмы и контент являются нашей собственностью. Копирование или распространение без разрешения запрещено.</p>,
  },
  {
    title: 'Точность данных',
    content: <p>Мы стремимся к точности, но не несём ответственности за изменения в данных Uzum.uz. Результаты анализа — не инвестиционные рекомендации.</p>,
  },
  {
    title: 'Применимое право',
    content: <p>Настоящие условия регулируются законодательством Республики Узбекистан.</p>,
  },
];
