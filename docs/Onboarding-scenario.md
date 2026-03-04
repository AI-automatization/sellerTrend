# Onboarding ssenariysi — VENTRA

Ventra dasturida foydalanuvchiga dastlab qaysi sahifalar ko‘rinishi,  
foydalanuvchi mahsulotdan qanday foydalanishi va funksiyalarni qanday ishlatishi
bo‘yicha ssenariy ushbu hujjatda bayon qilinadi.

Ushbu ssenariy asosida Ventra dasturining barcha dizayn ko‘rinishlari
(UI/UX) qayta ishlab chiqiladi va ishlab chiqish jarayoni uchun
aniq yo‘l xaritasi shakllantiriladi.

Bu hujjat:

- dasturchilar uchun yo‘l xarita
- Claude CLI orqali ishlab chiqish uchun asos
- tizim arxitekturasini rejalash hujjati

hisoblanadi.

---

# Ushbu ssenariy asosida ishlab chiqish

Ventra dasturi Claude terminal muhiti orqali bosqichma-bosqich ishlab chiqiladi.

Dasturchilar:

- Sardor — Claude Pro rejasi
- Bekzod — Claude Max rejasi

---

# Tizim ishlab chiqish talablari

Ushbu ssenariy asosida Claude quyidagilarni ta’minlashi kerak:

• Dastur funksiyalari bir-biriga to‘liq bog‘langan holda qurilishi (Example: Product tahlil qilish => Productni boshqa marketplacelarda narx va sotuvni tahlil qilish. => sotuvchi qayerda sotsa(Uzum, Ozon) o'sha yerdagi raqobatchi dokonlar productlarini narxi va sotuvini auto hisoblanishi)
• Foydalanuvchi Ventra imkoniyatlaridan maksimal foydalanishi  
• Tizim ishlab chiqarish muhitida barqaror ishlashi  
• Katta yuklama ostida ham tizim ishlashda davom etishi  

---

# Ishlab chiqish jarayonida nazorat

Dasturchi quyidagi jarayonlarni nazorat qila olishi kerak:

• Har bir funksiyaning ishlash algoritmini tekshirish  
• Tizim funksiyalarining o‘zaro bog‘liqligini nazorat qilish  
• Har bir modulni alohida tekshirish va xatolarni aniqlash  
• Ishlab chiqarish versiyasida tizim barqaror ishlashini audit qilish  

Ventra ishlab chiqilish jarayonida har bir funksiyaning ishlash
algoritmi alohida tekshiriladi va tizimning umumiy barqarorligi
doimiy nazorat ostida bo‘ladi.


# Maqsadlar:
#   Ventra - Mijozlari uchun maqsad: 
* Ventra da Sotuvchi Ventra dasturchilari Tomonidan yaratilgan Funksiyalarni unumdor ishlata olishi.
* Ventra sotuvchisi Aniq tahlilni ko'ra olishi.
* Ventra sotuvchisi product ni tanlashi va productni boshqa marketplacelardagi narxini ko'ra olishi. - Bu sotuvchiga ustunlik va katta foyda bera oladi.
* Ventra sotuvchisi qaysi product qancha sotilgani (Umumiy). va haftalik sotuvni ko'ra oladi. - Bu sotuvchiga ushbu productni arzon marketplacedan olib Uzum yandex va boshqa Uzbekiston marketplacelarida foyda bilan sotishga yordam beradi.
* Ventra sotuvchisi qaysi maxsulot kam sotilishi mumkinligini oldindan ko'ra oladi. -  Bu sotuvchiga zarar keltirishi mumkin bo'lgan productlarni oldindan ko'rib bozorga olib kirmay zarar moliyaga zarar keltirishini oldini oladi.
* Ventra sotuvchisi qaysi maxsulotda raqobat kuchliligini detect qiladi. - Bu sotuvchiga risk ni o'lchashga yordam beradi.
* Ventra sotuvchisi qaysi maxsulotda narx tushushi mumkinligini prognoz qila olishi kerak



#   Ventra Dasturidan Natijalar:
* Sotuvchi noto'g'ri maxsulotga pul tikib qo'ymaydi.
* Omborda sotilmay qolgan tovarlar kamayadi.
* Foydali mahsulotni oldindan tezroq topadi.

Natijada: 
* omborda sotilmay qolgan mahsulotlar kamayadi
* savdo samaradorligi oshadi


#   Ventra asoschisi (Bekzod Mirzaaliyev) maqsad:
* har bitta sotuvchi har bir productni individual tahlil qilish jarayonida asoschi databasesiga saqlanadi. asoschi database malumotlari orqali qaysi categoriya yoki qaysi product ko'proq sotilayotganini aniq tahlil qila olamiz.

Ventra aslida 3 xil ma’lumot yig‘adi:

1️⃣ Bozor ma’lumoti
2️⃣ Mahsulot ma’lumoti
3️⃣ Sotuvchilar harakati

Agar shu uchta database to‘g‘ri yig‘ilsa, Ventra haqiqatan ham:

- “Bozorni ko‘ra oladigan tizim”

## 1️⃣ Bozorni ko‘ra olish
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi kategoriya tez o‘smoqda
- qaysi kategoriya sekinlashmoqda
- qaysi kategoriya o‘layapti
- qaysi kategoriya yangi sotuvchilar bilan to‘lyapti
- qaysi kategoriya hali bo‘sh (raqobat kam)


## 2️⃣ Trend mahsulotlarni aniqlash
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi mahsulot sotuvlari tez o‘smoqda
- qaysi mahsulotga talab tez oshmoqda
- qaysi mahsulotga sharhlar tez ko‘paymoqda
- qaysi mahsulot yangi sotuvchilarni jalb qilmoqda
- qaysi mahsulot tez orada trend bo‘lishi mumkin


## 3️⃣ Raqobat darajasini kuzatish
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi mahsulotga yangi sotuvchilar kiryapti
- qaysi kategoriya tez to‘lyapti
- qaysi kategoriya haddan tashqari raqobatga ega bo‘lib boryapti
- qaysi mahsulotda sotuvchilar soni tez o‘smoqda


## 4️⃣ Narx harakatini kuzatish
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi mahsulotlarda narx tez tushmoqda
- qaysi mahsulotlarda narx tez oshmoqda
- qaysi mahsulotlarda narx stabil turibdi
- qaysi mahsulotlarda narx urushi boshlanmoqda


## 5️⃣ Talab harakatini aniqlash
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi mahsulotga talab tez oshmoqda
- qaysi mahsulotga talab kamaymoqda
- qaysi mahsulot mavsumiy ekanligi
- qaysi mahsulotlarga doimiy talab mavjud


## 6️⃣ Sotuvchilar harakatini tushunish
(!) Databasega yig'ilayotgan ma'lumotlar orqali quyidagilar aniqlanadi:

- qaysi mahsulotlar sotuvchilar tomonidan ko‘proq tahlil qilinmoqda
- qaysi kategoriya ko‘proq qidirilmoqda
- qaysi narx oralig‘idagi mahsulotlar ko‘proq ko‘rilmoqda
- qaysi mahsulotlar tez orada yangi sotuvchilar bilan to‘lishi mumkin
# ==========================================================================================================================================================================
* (!) BULARDAN LLM bilan umumiy AI tahlilini olamiz! 6 ta punkt bo'yicha -->
* (!) LLM AI 6 punkt ni bir biriga bog'langan holda chiqishi kerak
* (!) LLM bo'yicha tahlil "LLM-Tizimi-ChatGPT-Hulosasi.md" chatGPT tomonida berildi tekshirib tuzatilishlar kiritilishi va aniq prognozlar berishi uchun tahlil qilish kerak.


# Maqsadga erishish uchun ui steplar.
1️⃣ Қадам — Регистрация
Сотувчи:
Исм
Фамилия
Телефон
Email
Пароль
Қисқа профил маълумот

👉 Телефон SMS Yoki Gmail код орқали тасдиқланади.

2️⃣ Қадам - Sotuvchi Tipi: 

Online Sotuvchiman - Uzum Wildberries Ozon Yandex Market
Offline Sotuvchiman - Agar kiyim kechak yoki boshqacha turdagi uzbekiston da dokoni mavjud bo'lsa demak shuni tanlashi kerak.

Кейин: ...

# Har bir funksiya ishlash algoritimi

<!-- Masalan: qanday scrape qilinadi. har scrape dan keyin qachon malumot yangilanadi va qanday yangilanadi. va scrapedan qanday malumotlar olinadi  -->






















 Hozirgi holat: Onboarding 40% infra bor, 0% UX                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                                           DB da tayyor:                                                                                                                                                                                                                                                                            - onboarding_completed: Boolean @default(false)                                                                                                                                                                                                                                          - onboarding_step: Int @default(0)                                                                                                                                                                                                                                                       - PATCH /auth/onboarding endpoint mavjud                                                                                                                                                                                                                                               

  Lekin frontend hech qayerda ishlatmaydi. Yangi user registratsiya qilganda:

  Register → Dashboard (bo'sh) → "Portfolio is empty" → ???

  Eng yomoni: balance = 0, daily_fee = 50,000 so'm → birinchi login'dayoq PAYMENT_DUE banner chiqadi. User hali hech narsa ko'rmay, "pul to'lang" degan xabar oladi.

  ---
  Takliflar (5 ta, prioritet bo'yicha)

  1. Welcome Credit — 7 kunlik bepul sinov

  Hozir yangi account balance = 0. Bu eng katta muammo.

  Taklif: Registratsiya paytida auth.service.ts:register() da avtomatik 350,000 so'm (7 kun × 50K) kredit berilsin.

  Register → account.balance = 350_000 → 7 kun bepul

  - Referral bilan kelsa: 14 kun (referrer + referred ikkalasiga)
  - Trial tugashidan 2 kun oldin: Telegram bot orqali ogohlantirish
  - Bu bitta qator o'zgarish: balance: BigInt(350_000) default

  ---
  2. Onboarding Wizard — 3 qadamli

  Registratsiyadan keyin /onboarding sahifaga yo'naltirish (Dashboard emas). 3 qadam:

  Step 1: "Birinchi mahsulotingizni tahlil qiling"
  - Katta input field + "Uzum dan URL nusxalang" placeholder
  - Yonida: "Sinab ko'ring" tugmasi — popular product URL avtomatik qo'yiladi
  - Natijani ko'rsatish: score, haftalik sotuvlar, trend grafik

  Step 2: "Kuzatishga qo'shing"
  - Step 1 dan chiqqan natijani "Track" tugmasini bosib qo'shish
  - Yoki: 3 ta mashhur product kartochkasi — "Bularni kuzating" (bir klik)
  - "Kuzatishga qo'shganingizda, har kuni avtomatik yangilanadi"

  Step 3: "Telegram botga ulaning" (ixtiyoriy)
  - QR kod / link bilan @VentraBot ga o'tish
  - "Signal va ogohlantirishlarni Telegram'da olasiz"
  - "Keyinroq" tugmasi bilan o'tkazib yuborish mumkin

  Oxirida: PATCH /auth/onboarding { step: 3, completed: true } → Dashboard'ga redirect.

  ---
  3. Dashboard Empty State — "Aqlli bo'sh sahifa"

  Agar tracked_products.length === 0, hozirgi DashboardPage faqat "Portfolio bo'sh" deydi.

  Taklif: Bo'sh holatda to'liq boshqa layout ko'rsatish:

  ┌─────────────────────────────────────────┐
  │  👋 Xush kelibsiz, [Company Name]!      │
  │                                         │
  │  VENTRA bilan boshlash oson:            │
  │                                         │
  │  ✅ 1. Registratsiya       — bajarildi  │
  │  ⬜ 2. Birinchi tahlil     — [Boshlash] │
  │  ⬜ 3. Kuzatishga qo'shish              │
  │  ⬜ 4. Telegram bot         — [Ulash]   │
  │                                         │
  │  ── yoki ──                             │
  │                                         │
  │  🔥 Bugungi TOP mahsulotlar:           │
  │  ┌──────┐ ┌──────┐ ┌──────┐            │
  │  │ 4700 │ │35767 │ │89318 │            │
  │  │ ⭐8.2 │ │ ⭐7.1 │ │ ⭐6.9 │            │
  │  │[Track]│ │[Track]│ │[Track]│            │
  │  └──────┘ └──────┘ └──────┘            │
  └─────────────────────────────────────────┘

  "TOP mahsulotlar" — oxirgi discovery run natijasidan yoki hardcoded popular products.

  ---
  4. Kontekstual tooltiplar — sahifa bo'ylab hint

  Onboarding tugagandan keyin ham, har sahifada birinchi marta kirganda qisqa tooltip:

  ┌───────────┬───────────────────────────────────────────────────────────────┐
  │  Sahifa   │                            Tooltip                            │
  ├───────────┼───────────────────────────────────────────────────────────────┤
  │ Dashboard │ "Bu yerda barcha kuzatilayotgan mahsulotlaringiz ko'rinadi"   │
  ├───────────┼───────────────────────────────────────────────────────────────┤
  │ Analyze   │ "Uzum URL kiriting — score, trend va raqobat tahlili oling"   │
  ├───────────┼───────────────────────────────────────────────────────────────┤
  │ Discovery │ "Kategoriya ID kiriting — eng yaxshi mahsulotlarni toping"    │
  ├───────────┼───────────────────────────────────────────────────────────────┤
  │ Signals   │ "Narx o'zgarishi, stok tugashi va trend signallari avtomatik" │
  ├───────────┼───────────────────────────────────────────────────────────────┤
  │ Sourcing  │ "Xitoy/Evropa narxlarini solishtiring va ROI hisoblang"       │
  └───────────┴───────────────────────────────────────────────────────────────┘

  Har biri faqat 1 marta ko'rinadi → localStorage da tooltip_seen_[page] flag.

  ---
  5. Email va Telegram notification

  Registratsiyadan keyin:
  - Welcome email (agar email service ulangan bo'lsa)
  - "7 kunlik bepul sinov boshlandi" xabari

  3 kun ichida product track qilmasa:
  - Telegram bot (agar ulangan bo'lsa): "Hali birinchi mahsulotingizni tahlil qilmadingiz..."
  - Yoki email reminder

  Trial tugashidan 2 kun oldin:
  - "Sinov muddatingiz 2 kunda tugaydi. Hisobingizni to'ldiring."

  ---
  Bajarish tartibi

  ┌─────┬────────────────────────────┬─────────────┬────────────────────────────────────────────┐
  │  #  │            Nima            │ Murakkablik │                   Ta'sir                   │
  ├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
  │ 1   │ Welcome credit (350K)      │ 10 min      │ Eng yuqori — payment_due blocker yo'qoladi │
  ├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
  │ 2   │ Dashboard empty state      │ 2-3 soat    │ Yuqori — yangi user yo'qolmaydi            │
  ├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
  │ 3   │ Onboarding wizard (3 step) │ 4-5 soat    │ O'rta — guided experience                  │
  ├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
  │ 4   │ Kontekstual tooltiplar     │ 1-2 soat    │ Past — polish                              │
  ├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
  │ 5   │ Email/Telegram reminders   │ 3-4 soat    │ Past — retention                           │
  └─────┴────────────────────────────┴─────────────┴────────────────────────────────────────────┘

  1-chi qadam eng muhim — bitta qator o'zgarish bilan yangi userlar "pul to'lang" banner ko'rmaydi.

  Tasks.md ga qo'shishim kerakmi?