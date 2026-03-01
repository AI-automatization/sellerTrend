export type Lang = 'uz' | 'ru';

const translations = {
  uz: {
    // Nav
    'nav.features': 'Imkoniyatlar',
    'nav.pricing': 'Narxlar',
    'nav.faq': 'FAQ',
    'nav.desktop': 'Desktop',
    'nav.login': 'Kirish',
    'nav.dashboard': 'Dashboard →',

    // Hero
    'hero.badge': '1000+ Uzum sotuvchi ishonadi',
    'hero.title1': 'Uzum sotuvingizni',
    'hero.title2': '3x oshiring',
    'hero.title3': '— AI bilan',
    'hero.desc': 'Qaysi mahsulot trend? Raqibingiz qancha sotayapti? Qayerdan arzon olib kelish mumkin? VENTRA barchasini ko\'rsatadi.',
    'hero.cta1': 'Bepul boshlash →',
    'hero.cta2': 'Desktop yuklab olish',
    'hero.trust1': 'Birinchi 14 kun BEPUL',
    'hero.trust2': 'Bank kartasi kerak emas',
    'hero.trust3': '5 daqiqada trend topish',

    // Pain points
    'pain.label': 'Muammo',
    'pain.solution': 'Yechim',
    'pain.title': 'Har kuni duch kelayotgan muammolar',
    'pain.subtitle': 'Uzum sotuvchilari uchun eng katta to\'siqlar — va VENTRA ularning yechimi',

    // Features
    'features.tag': 'Imkoniyatlar',
    'features.title1': 'Sotuvingizni o\'stiradigan',
    'features.title2': '10 ta kuchli vosita',
    'features.subtitle': 'Bitta platformada barcha kerakli analytics — savdo tahlilidan tortib manba qidirishgacha',

    // Stats
    'stats.title1': 'Raqamlarda',
    'stats.label1': 'Aktiv sotuvchilar',
    'stats.label2': 'Tahlil qilingan mahsulotlar',
    'stats.label3': 'Real-time monitoring',
    'stats.label4': 'O\'rtacha ROI o\'sishi',

    // Pricing
    'pricing.title1': 'Sodda va',
    'pricing.title2': 'shaffof narxlar',
    'pricing.subtitle': 'Yashirin to\'lovlar yo\'q. Istalgan vaqt bekor qilish mumkin.',
    'pricing.monthly': 'Oylik',
    'pricing.yearly': 'Yillik',
    'pricing.footer': 'To\'lov: Click, Payme, Uzum nasiya · Bank kartasi kerak emas Starter uchun',

    // Testimonials
    'test.title1': 'Sotuvchilar',
    'test.title2': 'nima deydi',
    'test.subtitle': 'Haqiqiy foydalanuvchilar, haqiqiy natijalar',

    // FAQ
    'faq.title1': 'Tez-tez so\'raladigan',
    'faq.title2': 'savollar',
    'faq.subtitle': 'Javob topa olmadingizmi? support@ventra.uz ga yozing',

    // CTA
    'cta.title1': 'Raqiblaringiz allaqachon',
    'cta.title2': 'VENTRA',
    'cta.title3': 'ishlatayapti. Siz-chi?',
    'cta.desc': 'Har kuni kechikish — yo\'qotilgan sotuv. Hoziroq boshlang, 14 kun bepul sinab ko\'ring.',
    'cta.btn': 'Hoziroq boshlash — 14 kun bepul →',
    'cta.note': 'Bank kartasi talab qilinmaydi · Istalgan vaqt bekor qilish mumkin',

    // Email capture
    'email.title': 'Yangiliklardan xabardor bo\'ling',
    'email.subtitle': 'Yangi funksiyalar, maslahatlar va maxsus takliflar — birinchi bo\'lib bilib oling',
    'email.placeholder': 'email@example.com',
    'email.btn': 'Obuna bo\'lish',
    'email.success': 'Rahmat! Siz obuna bo\'ldingiz.',
    'email.error': 'Xato yuz berdi. Qayta urinib ko\'ring.',
    'email.privacy': 'Spam yo\'q. Istalgan vaqt bekor qilish mumkin.',

    // Dashboard preview
    'preview.title1': 'Platformani',
    'preview.title2': 'ko\'ring',
    'preview.subtitle': 'Haqiqiy dashboard — real ma\'lumotlar bilan',
    'preview.cta': 'Ko\'proq ko\'rish →',

    // Download banner
    'download.title': 'VENTRA Desktop — Brauzer ochmasdan ishlang',
    'download.version': 'v1.0.0 · 85 MB · Windows 10+ / macOS 12+',
    'download.win': 'Windows yuklab olish',
    'download.mac': 'macOS',
  },

  ru: {
    // Nav
    'nav.features': 'Возможности',
    'nav.pricing': 'Цены',
    'nav.faq': 'FAQ',
    'nav.desktop': 'Desktop',
    'nav.login': 'Войти',
    'nav.dashboard': 'Dashboard →',

    // Hero
    'hero.badge': '1000+ продавцов Uzum доверяют',
    'hero.title1': 'Увеличьте продажи на Uzum',
    'hero.title2': 'в 3 раза',
    'hero.title3': '— с AI',
    'hero.desc': 'Какой товар в тренде? Сколько продаёт конкурент? Где найти дешевле из Китая? VENTRA покажет всё.',
    'hero.cta1': 'Начать бесплатно →',
    'hero.cta2': 'Скачать Desktop',
    'hero.trust1': 'Первые 14 дней БЕСПЛАТНО',
    'hero.trust2': 'Банковская карта не нужна',
    'hero.trust3': 'Найти тренд за 5 минут',

    // Pain points
    'pain.label': 'Проблема',
    'pain.solution': 'Решение',
    'pain.title': 'Проблемы, с которыми вы сталкиваетесь каждый день',
    'pain.subtitle': 'Главные барьеры для продавцов Uzum — и решения VENTRA',

    // Features
    'features.tag': 'Возможности',
    'features.title1': '10 мощных инструментов',
    'features.title2': 'для роста продаж',
    'features.subtitle': 'Вся необходимая аналитика в одной платформе — от анализа продаж до поиска поставщиков',

    // Stats
    'stats.title1': 'VENTRA в',
    'stats.label1': 'Активных продавцов',
    'stats.label2': 'Проанализированных товаров',
    'stats.label3': 'Мониторинг в реальном времени',
    'stats.label4': 'Средний рост ROI',

    // Pricing
    'pricing.title1': 'Простые и',
    'pricing.title2': 'прозрачные цены',
    'pricing.subtitle': 'Никаких скрытых платежей. Отмена в любое время.',
    'pricing.monthly': 'Ежемесячно',
    'pricing.yearly': 'Ежегодно',
    'pricing.footer': 'Оплата: Click, Payme, Uzum рассрочка · Для Starter карта не нужна',

    // Testimonials
    'test.title1': 'Что говорят',
    'test.title2': 'продавцы',
    'test.subtitle': 'Реальные пользователи, реальные результаты',

    // FAQ
    'faq.title1': 'Часто задаваемые',
    'faq.title2': 'вопросы',
    'faq.subtitle': 'Не нашли ответ? Напишите на support@ventra.uz',

    // CTA
    'cta.title1': 'Ваши конкуренты уже используют',
    'cta.title2': 'VENTRA',
    'cta.title3': '. А вы?',
    'cta.desc': 'Каждый день промедления — потерянные продажи. Начните сейчас, 14 дней бесплатно.',
    'cta.btn': 'Начать сейчас — 14 дней бесплатно →',
    'cta.note': 'Банковская карта не требуется · Отмена в любое время',

    // Email capture
    'email.title': 'Будьте в курсе новостей',
    'email.subtitle': 'Новые функции, советы и специальные предложения — узнавайте первыми',
    'email.placeholder': 'email@example.com',
    'email.btn': 'Подписаться',
    'email.success': 'Спасибо! Вы подписаны.',
    'email.error': 'Произошла ошибка. Попробуйте ещё раз.',
    'email.privacy': 'Никакого спама. Отписка в любое время.',

    // Dashboard preview
    'preview.title1': 'Посмотрите на',
    'preview.title2': 'платформу',
    'preview.subtitle': 'Реальный dashboard — с реальными данными',
    'preview.cta': 'Узнать больше →',

    // Download banner
    'download.title': 'VENTRA Desktop — Работайте без браузера',
    'download.version': 'v1.0.0 · 85 MB · Windows 10+ / macOS 12+',
    'download.win': 'Скачать для Windows',
    'download.mac': 'macOS',
  },
} as const;

export type TranslationKey = keyof typeof translations.uz;

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key] ?? translations.uz[key] ?? key;
}
