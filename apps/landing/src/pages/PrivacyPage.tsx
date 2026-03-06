import { useLang } from '../lib/LangContext';

export function PrivacyPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <a href="/" className="text-sm text-primary hover:underline mb-8 inline-block">
          ← {isRu ? 'На главную' : 'Bosh sahifaga'}
        </a>

        <h1 className="text-3xl font-bold mb-2">
          {isRu ? 'Политика конфиденциальности' : 'Maxfiylik siyosati'}
        </h1>
        <p className="text-base-content/50 text-sm mb-10">
          {isRu ? 'Последнее обновление: март 2026' : 'Oxirgi yangilanish: mart 2026'}
        </p>

        {isRu ? <RuContent /> : <UzContent />}
      </div>
    </div>
  );
}

function UzContent() {
  return (
    <div className="prose prose-sm max-w-none text-base-content/80 space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">1. Umumiy ma'lumot</h2>
        <p>VENTRA Analytics platformasi ("Biz") foydalanuvchilarning shaxsiy ma'lumotlarini O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida" gi Qonuni (2019) talablariga muvofiq himoya qiladi.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">2. Qanday ma'lumotlar to'planadi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ro'yxatdan o'tishda: email manzil va parol (bcrypt bilan shifrlangan)</li>
          <li>Foydalanish jarayonida: kuzatilayotgan mahsulotlar, qidiruv so'rovlari</li>
          <li>Texnik ma'lumotlar: IP manzil, brauzer turi, sessiya tokenlari</li>
          <li>To'lov ma'lumotlari: faqat to'lov operatori (Click, Payme) tomonidan qayta ishlanadi — biz karta ma'lumotlarini saqlamaymiz</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">3. Ma'lumotlar qanday ishlatiladi</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Xizmat ko'rsatish va tahlil natijalarini taqdim etish</li>
          <li>Hisobingiz xavfsizligini ta'minlash</li>
          <li>Yangi funksiyalar haqida xabardor qilish (faqat rozilik bergan foydalanuvchilarga)</li>
          <li>Platforma sifatini oshirish</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">4. Ma'lumotlar uchinchi shaxslarga berilishimi</h2>
        <p>Biz shaxsiy ma'lumotlaringizni uchinchi shaxslarga sotmaymiz. Quyidagi holatlarda ulashilishi mumkin:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Qonun talablari bo'yicha huquq-tartibot organlari talabiga ko'ra</li>
          <li>To'lov operatorlari (Click, Payme) — faqat to'lov tasdiqlash uchun</li>
          <li>Plausible Analytics — anonymlashtirilgan statistika (IP saqlanmaydi)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">5. Cookie fayllar</h2>
        <p>Saytimiz sessiya boshqaruvi, til sozlamalari va statistika uchun cookie'lardan foydalanadi. Brauzeringiz orqali cookie'larni o'chirib qo'yishingiz mumkin.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">6. Ma'lumotlarni saqlash muddati</h2>
        <p>Hisobingiz o'chirilganidan so'ng ma'lumotlar 30 kun ichida o'chiriladi. Moliyaviy yozuvlar qonun talabiga ko'ra 3 yil saqlanadi.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">7. Huquqlaringiz</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ma'lumotlaringizni ko'rish, tuzatish yoki o'chirish talabi</li>
          <li>Ma'lumotlarni qayta ishlashga rozilikni bekor qilish</li>
          <li>Ma'lumotlarni boshqa formatda olish (portabillik)</li>
        </ul>
        <p className="mt-2">So'rovlar uchun: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">8. Bog'lanish</h2>
        <p>Savollar uchun: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>
    </div>
  );
}

function RuContent() {
  return (
    <div className="prose prose-sm max-w-none text-base-content/80 space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">1. Общие положения</h2>
        <p>Платформа VENTRA Analytics ("Мы") защищает персональные данные пользователей в соответствии с Законом Республики Узбекистан "О персональных данных" (2019).</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">2. Какие данные собираются</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>При регистрации: email и пароль (зашифрован bcrypt)</li>
          <li>В процессе использования: отслеживаемые товары, поисковые запросы</li>
          <li>Технические данные: IP-адрес, тип браузера, токены сессий</li>
          <li>Платёжные данные: обрабатываются только платёжным оператором (Click, Payme) — мы не храним данные карт</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">3. Как используются данные</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Предоставление сервиса и результатов аналитики</li>
          <li>Обеспечение безопасности вашего аккаунта</li>
          <li>Уведомления о новых функциях (только с согласия)</li>
          <li>Улучшение качества платформы</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">4. Передача данных третьим лицам</h2>
        <p>Мы не продаём персональные данные. Передача возможна в следующих случаях:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>По требованию правоохранительных органов</li>
          <li>Платёжные операторы (Click, Payme) — только для подтверждения оплаты</li>
          <li>Plausible Analytics — анонимизированная статистика (IP не сохраняется)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">5. Cookie-файлы</h2>
        <p>Сайт использует cookie для управления сессиями, настроек языка и статистики. Вы можете отключить cookie в настройках браузера.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">6. Срок хранения данных</h2>
        <p>После удаления аккаунта данные удаляются в течение 30 дней. Финансовые записи хранятся 3 года согласно законодательству.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">7. Ваши права</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Просмотр, исправление или удаление своих данных</li>
          <li>Отзыв согласия на обработку данных</li>
          <li>Получение данных в переносимом формате</li>
        </ul>
        <p className="mt-2">По запросам: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">8. Контакты</h2>
        <p>По вопросам: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>
    </div>
  );
}
