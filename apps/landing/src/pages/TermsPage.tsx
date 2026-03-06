import { useLang } from '../lib/LangContext';

export function TermsPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <a href="/" className="text-sm text-primary hover:underline mb-8 inline-block">
          ← {isRu ? 'На главную' : 'Bosh sahifaga'}
        </a>

        <h1 className="text-3xl font-bold mb-2">
          {isRu ? 'Условия использования' : 'Foydalanish shartlari'}
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
        <h2 className="text-lg font-semibold text-base-content mb-2">1. Shartlarni qabul qilish</h2>
        <p>VENTRA platformasidan foydalanish orqali siz ushbu Foydalanish shartlarini qabul qilasiz. Agar shartlarga rozi bo'lmasangiz, platformadan foydalanmang.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">2. Xizmat tavsifi</h2>
        <p>VENTRA — Uzum.uz marketplace sotuvchilari uchun analytics xizmati. Biz ma'lumotlarni tahlil qilish, trend qidirish va narx kuzatish imkoniyatlarini taqdim etamiz.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">3. Hisob va xavfsizlik</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Hisob yaratishda to'g'ri ma'lumot kiritish majburiy</li>
          <li>Parolingiz maxfiyligini siz ta'minlaysiz</li>
          <li>Hisobingizda sodir bo'lgan har qanday ruxsatsiz foydalanish haqida darhol xabar bering</li>
          <li>Bir kishi bir hisob ochishi mumkin</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">4. Taqiqlangan harakatlar</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Platformadan avtomatik bot yoki skriptlar orqali foydalanish</li>
          <li>Uzum.uz yoki VENTRA serverlariga ortiqcha yuklanish yaratish</li>
          <li>Boshqa foydalanuvchilarning ma'lumotlariga ruxsatsiz kirish</li>
          <li>Noqonuniy maqsadlarda foydalanish</li>
          <li>Ma'lumotlarni raqobatchilar bilan ulashish</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibent text-base-content mb-2">5. To'lov va obuna</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Starter tarif bepul — kredit kartasi talab qilinmaydi</li>
          <li>Pro va Enterprise tariflar oylik yoki yillik to'lov asosida</li>
          <li>Obunani istalgan vaqt bekor qilish mumkin — joriy davr oxirigacha xizmat davom etadi</li>
          <li>To'lovlar Click, Payme yoki Uzum nasiya orqali amalga oshiriladi</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">6. Intellektual mulk</h2>
        <p>VENTRA platformasi, logotipi, algoritmlari va kontenti bizning mulkimiz. Ruxsatsiz nusxa ko'chirish yoki tarqatish taqiqlangan.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">7. Ma'lumotlar aniqligi</h2>
        <p>Biz ma'lumotlar aniqligini ta'minlashga harakat qilamiz, lekin Uzum.uz ma'lumotlaridagi o'zgarishlar uchun javobgar emasmiz. Tahlil natijalari investitsiya tavsiyasi emas.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">8. Xizmatni to'xtatish</h2>
        <p>Shartlarni buzgan hollarda hisobni o'chirib qo'yish huquqini saqlab qolamiz. Texnik ishlar paytida xizmat vaqtincha to'xtatilishi mumkin.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">9. Qo'llaniladigan qonunlar</h2>
        <p>Ushbu shartlar O'zbekiston Respublikasi qonunchiligiga muvofiq tartibga solinadi.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">10. Bog'lanish</h2>
        <p>Savollar uchun: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>
    </div>
  );
}

function RuContent() {
  return (
    <div className="prose prose-sm max-w-none text-base-content/80 space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">1. Принятие условий</h2>
        <p>Используя платформу VENTRA, вы принимаете настоящие Условия использования. Если вы не согласны с условиями, не используйте платформу.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">2. Описание сервиса</h2>
        <p>VENTRA — аналитический сервис для продавцов маркетплейса Uzum.uz. Мы предоставляем инструменты анализа данных, поиска трендов и мониторинга цен.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">3. Аккаунт и безопасность</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>При создании аккаунта необходимо указывать достоверные данные</li>
          <li>Вы несёте ответственность за конфиденциальность своего пароля</li>
          <li>О любом несанкционированном доступе сообщайте немедленно</li>
          <li>Один человек — один аккаунт</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">4. Запрещённые действия</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Использование платформы через автоматические боты или скрипты</li>
          <li>Создание избыточной нагрузки на серверы Uzum.uz или VENTRA</li>
          <li>Несанкционированный доступ к данным других пользователей</li>
          <li>Использование в незаконных целях</li>
          <li>Передача данных конкурентам</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">5. Оплата и подписка</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Тариф Starter — бесплатно, без банковской карты</li>
          <li>Тарифы Pro и Enterprise — ежемесячная или годовая оплата</li>
          <li>Отмена подписки в любое время — сервис доступен до конца оплаченного периода</li>
          <li>Оплата через Click, Payme или Uzum nasiya</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">6. Интеллектуальная собственность</h2>
        <p>Платформа VENTRA, логотип, алгоритмы и контент являются нашей собственностью. Копирование или распространение без разрешения запрещено.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">7. Точность данных</h2>
        <p>Мы стремимся обеспечить точность данных, но не несём ответственности за изменения в данных Uzum.uz. Результаты анализа не являются инвестиционными рекомендациями.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">8. Приостановка сервиса</h2>
        <p>Мы оставляем за собой право заблокировать аккаунт при нарушении условий. Сервис может временно приостанавливаться для технического обслуживания.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">9. Применимое право</h2>
        <p>Настоящие условия регулируются законодательством Республики Узбекистан.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-base-content mb-2">10. Контакты</h2>
        <p>По вопросам: <a href="mailto:support@ventra.uz" className="text-primary hover:underline">support@ventra.uz</a></p>
      </section>
    </div>
  );
}
