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

# Ventra - Mijozlari uchun maqsad:

- Ventra da Sotuvchi Ventra dasturchilari Tomonidan yaratilgan Funksiyalarni unumdor ishlata olishi.
- Ventra sotuvchisi Aniq tahlilni ko'ra olishi.
- Ventra sotuvchisi product ni tanlashi va productni boshqa marketplacelardagi narxini ko'ra olishi. - Bu sotuvchiga ustunlik va katta foyda bera oladi.
- Ventra sotuvchisi qaysi product qancha sotilgani (Umumiy). va haftalik sotuvni ko'ra oladi. - Bu sotuvchiga ushbu productni arzon marketplacedan olib Uzum yandex va boshqa Uzbekiston marketplacelarida foyda bilan sotishga yordam beradi.
- Ventra sotuvchisi qaysi maxsulot kam sotilishi mumkinligini oldindan ko'ra oladi. - Bu sotuvchiga zarar keltirishi mumkin bo'lgan productlarni oldindan ko'rib bozorga olib kirmay zarar moliyaga zarar keltirishini oldini oladi.
- Ventra sotuvchisi qaysi maxsulotda raqobat kuchliligini detect qiladi. - Bu sotuvchiga risk ni o'lchashga yordam beradi.
- Ventra sotuvchisi qaysi maxsulotda narx tushushi mumkinligini prognoz qila olishi kerak

# Ventra Dasturidan Natijalar:

- Sotuvchi noto'g'ri maxsulotga pul tikib qo'ymaydi.
- Omborda sotilmay qolgan tovarlar kamayadi.
- Foydali mahsulotni oldindan tezroq topadi.

Natijada:

- omborda sotilmay qolgan mahsulotlar kamayadi
- savdo samaradorligi oshadi

# Ventra asoschisi (Bekzod Mirzaaliyev) maqsad:

- har bitta sotuvchi har bir productni individual tahlil qilish jarayonida asoschi databasesiga saqlanadi. asoschi database malumotlari orqali qaysi categoriya yoki qaysi product ko'proq sotilayotganini aniq tahlil qila olamiz.

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

- (!) BULARDAN LLM bilan umumiy AI tahlilini olamiz! 6 ta punkt bo'yicha -->
- (!) LLM AI 6 punkt ni bir biriga bog'langan holda chiqishi kerak
- (!) LLM bo'yicha tahlil "LLM-Tizimi-ChatGPT-Hulosasi.md" chatGPT tomonida berildi tekshirib tuzatilishlar kiritilishi va aniq prognozlar berishi uchun tahlil qilish kerak.

# Maqsadga erishish uchun ui steplar.

1️⃣ Қадам — Регистрация
Сотувчи:
Исм
Фамилия
Телефон (Tasdiqlash shart emas)
Email (tasdiqlash)
Пароль
Қисқа профил маълумот

👉 Gmail код орқали тасдиқланади.
👉 User Registratsiya Tasdiqlash bo'limidan o'ta olmasa (Admin dashboardga not verified user bo'lib tushadi, keyinchalik operator bog'lanib registratsiyada yordam bera olishi uchun)

2️⃣ Қадам - Sotuvchi Tipi:

Online Sotuvchiman -> Checkbox bilan Qaysi Platformada sotuv qilasiz? Uzum Wildberries Ozon Yandex Market
Offline Sotuvchiman - Agar kiyim kechak yoki boshqacha turdagi uzbekiston da dokoni mavjud bo'lsa demak shuni tanlashi kerak.

3️⃣ қадам: Нима сотасиз? (категория/нишалар)

Косметика / кийим / электроника / озиқ-овқат …
checkbox orqali 3–5 та категория танлайди
кейин: “Seasonal trend” ва “Top products” чиқади (AI/analytics)

registratsiya ma'lumotlari va qadamlar user data si bo'lib database ga saqlanadi va Dashboard ochiladi.

=================================================================================================================================

(!) Tizim bo'yicha o'zgartirish: Endi har kunlik balance va -50.000 sum dan yechish yo'q. Oylik abonement va limitlar bo'ladi! Free/Pro/Max/Company

Hozirgi holat: Onboarding 40% infra bor, 0% UX  
 DB da tayyor: - onboarding_completed: Boolean @default(false) - onboarding_step: Int @default(0) - PATCH /auth/onboarding endpoint mavjud

Lekin frontend hech qayerda ishlatmaydi. Yangi user registratsiya qilganda:

Register → Dashboard (bo'sh) → "Portfolio is empty" → ???

Eng yomoni: balance = 0, daily_fee = 50,000 so'm → birinchi login'dayoq PAYMENT_DUE banner chiqadi. User hali hech narsa ko'rmay, "pul to'lang" degan xabar oladi.
==================================================================================================================================
# User Dashboard ga birinchi marta kirganida:
Dashboard Empty State — "Aqlli bo'sh sahifa"

Agar tracked_products.length === 0, hozirgi DashboardPage faqat "Portfolio bo'sh" deydi.

Taklif: Bo'sh holatda to'liq boshqa layout ko'rsatish:

┌─────────────────────────────────────────┐
│ 👋 Xush kelibsiz, [Company Name]! │
│ │
│ VENTRA bilan boshlash oson: │
│ │
│ ✅ 1. Registratsiya — bajarildi │
│ ⬜ 2. Birinchi tahlil — [Boshlash] │
│ ⬜ 3. Kuzatishga qo'shish │
│ ⬜ 4. Telegram bot — [Ulash] │
│ │
│ ── yoki ── │
│ │
│ 🔥 Bugungi TOP mahsulotlar: │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 4700 │ │35767 │ │89318 │ │
│ │ ⭐8.2 │ │ ⭐7.1 │ │ ⭐6.9 │ │
│ │[Track]│ │[Track]│ │[Track]│ │
│ └──────┘ └──────┘ └──────┘ │
└─────────────────────────────────────────┘

"TOP mahsulotlar" — oxirgi discovery run natijasidan yoki hardcoded popular products.


# 1 Onboarding Wizard — 3 qadamli (Dashboard da modal window ochiladi 3 steplik:)

Registratsiyadan keyin /onboarding sahifaga yo'naltirish (Dashboard emas). 3 qadam:

Step 1: "Birinchi mahsulotingizni tahlil qiling"

- Katta input field + "Uzum dan URL nusxalang" placeholder
- Yonida: "Sinab ko'ring" tugmasi — popular product URL avtomatik qo'yiladi
- Natijani ko'rsatish: score, haftalik sotuvlar, trend grafik

Step 2: "Kuzatishga qo'shing"

- Step 1 da tahlil qilingan mahsulot natijasi ko'rsatiladi (score, trend, haftalik sotuvlar)
- Bitta "Kuzatishga qo'shish" tugmasi — faqat o'sha mahsulot uchun
- Tugma bosilgach: "✅ Mahsulot kuzatuvga qo'shildi! Har kuni avtomatik yangilanadi" xabari
- Boshqa mahsulotlar taklif QILINMAYDI — step 1 natijasiga fokus saqlanadi

Step 3: "Telegram botga ulaning" (ixtiyoriy)

- QR kod / link bilan @VentraBot ga o'tish
- "Signal va ogohlantirishlarni Telegram'da olasiz"
- "Keyinroq" tugmasi bilan o'tkazib yuborish mumkin

Step 4: (!) O'nline Dokon Bosilgan Bo'lsa: API key field: Uzum / Ozon / Yandex Market / Wildberries va har bir platform uchun api key qayerdan olinishi instruction ko'rsatilgan bo'ladi.

2. Kontekstual tooltiplar — sahifa bo'ylab hint

Onboarding tugagandan keyin ham, har sahifada birinchi marta kirganda qisqa tooltip:

┌───────────┬───────────────────────────────────────────────────────────────┐
│ Sahifa │ Tooltip │
├───────────┼───────────────────────────────────────────────────────────────┤
│ Dashboard │ "Bu yerda barcha kuzatilayotgan mahsulotlaringiz ko'rinadi" │
├───────────┼───────────────────────────────────────────────────────────────┤
│ Analyze │ "Uzum URL kiriting — score, trend va raqobat tahlili oling" │
├───────────┼───────────────────────────────────────────────────────────────┤
│ Discovery │ "Kategoriya ID kiriting — eng yaxshi mahsulotlarni toping" │
├───────────┼───────────────────────────────────────────────────────────────┤
│ Signals │ "Narx o'zgarishi, stok tugashi va trend signallari avtomatik" │
├───────────┼───────────────────────────────────────────────────────────────┤
│ Sourcing │ "Xitoy/Evropa narxlarini solishtiring va ROI hisoblang" │
└───────────┴───────────────────────────────────────────────────────────────┘

Har biri faqat 1 marta ko'rinadi → localStorage da tooltip*seen*[page] flag. yoki database ga saqlanadi (Buni claude CLI hal qiladi)!

3. Email va Telegram notification

Registratsiyadan keyin:

- Welcome email (agar email service ulangan bo'lsa)
- "7 kunlik bepul sinov boshlandi" xabari

3 kun ichida product track qilmasa:

- Telegram bot (agar ulangan bo'lsa): "Hali birinchi mahsulotingizni tahlil qilmadingiz..."
- Yoki email reminder

Trial tugashidan 2 kun oldin:

- "Sinov muddatingiz 2 kunda tugaydi. Hisobingizni to'ldiring."


Bajarish tartibi

┌─────┬────────────────────────────┬─────────────┬────────────────────────────────────────────┐
│ #   │ Nima                       │ Murakkablik │ Ta'sir                                     │
├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
│ 1   │ Welcome plan (FREE)        │ 10 min      │ Eng yuqori                                 | plan bo'yicha dostup ochiladi (limit bilan)
├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
│ 2   │ Dashboard empty state      │ 2-3 soat    │ Yuqori — yangi user yo'qolmaydi            │
├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
│ 3   │ Onboarding wizard (3 step) │ 4-5 soat    │ O'rta — guided experience                  │
├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
│ 4   │ Kontekstual tooltiplar     │ 1-2 soat    │ Past — polish                              │
├─────┼────────────────────────────┼─────────────┼────────────────────────────────────────────┤
│ 5   │ Email/Telegram reminders   │ 3-4 soat    │ Past — retention                           │
└─────────────────────────────────────────────────────────────────────────────────────────────

---

# Billing Model Qayta Tuzilishi — Tahlil va Ta'sir

## Hozirgi holat (Daily Fee tizimi)

```
Account.balance       → BigInt, prepaid balans
Account.daily_fee     → BigInt?, kunlik yechish miqdori (default 50,000 UZS)
Account.status        → ACTIVE | PAYMENT_DUE | SUSPENDED
Transaction.type      → CHARGE (kunlik) | DEPOSIT (admin to'ldiradi) | REFUND
billing.processor.ts  → cron: 0 2 * * * (har kuni soat 02:00 da)
BillingGuard          → status === 'PAYMENT_DUE' → HTTP 402
```

**Muammo:** User ro'yxatdan o'tganida balance=0 va daily_fee=50,000. Birinchi kuni `PAYMENT_DUE` — hech narsa ko'rmasdan "pul to'lang" xabari.

---

## Yangi model — Oylik Abonement (FREE/PRO/MAX/COMPANY)

### Plan jadvali

| Plan | Narx | Tahlil/oy | Discovery | Sourcing | AI | Team |
|------|------|-----------|-----------|----------|----|------|
| FREE | 0 UZS | 10 | ❌ | ❌ | ❌ | ❌ |
| PRO | 149,000 UZS/oy | Cheksiz | ✅ | ✅ | ❌ | ❌ |
| MAX | 349,000 UZS/oy | Cheksiz | ✅ | ✅ | ✅ | ✅ (5 user) |
| COMPANY | 890,000 UZS/oy | Cheksiz | ✅ | ✅ | ✅ | ✅ (20 user) |

**FREE plan qoidalari:**
- Registratsiyadan keyin avtomatik FREE plan beriladi — balance tekshirilmaydi
- 10 ta tahlildan keyin `analyses_used >= 10` → 402 + "PRO ga o'ting" xabari
- Discovery, Sourcing, Signals, AI — plan guard bloki

---

## Schema o'zgarishlari (Prisma)

```prisma
// Account modeliga qo'shiladigan yangi fieldlar:
plan              String   @default("FREE")   // FREE | PRO | MAX | COMPANY
plan_expires_at   DateTime?                   // null = FREE (cheksiz)
analyses_used     Int      @default(0)        // oylik counter, reset 1-da
plan_renewed_at   DateTime?                   // oxirgi to'lov sanasi

// Eski fieldlar qoladi (migration uchun):
// balance, daily_fee — hali ham mavjud, lekin yangi userlar uchun ishlatilmaydi
```

```prisma
// TransactionType enumga qo'shiladi:
SUBSCRIPTION     // oylik abonement to'lovi
PLAN_CHANGE      // upgrade/downgrade
```

---

## Kod o'zgarishlari — Qaysi fayllar ta'sirlanadi

### Backend (apps/api/)

| Fayl | O'zgarish | Sabab |
|------|-----------|-------|
| `billing/billing.service.ts` | `chargeAllActiveAccounts()` o'chiriladi, `renewSubscriptions()` qo'shiladi | Daily→Monthly |
| `billing/billing.guard.ts` | Plan feature check qo'shiladi | FREE plan limits |
| `auth/auth.service.ts` | Register'da `plan: 'FREE'` set qilinadi | Yangi user onboarding |
| `prisma/schema.prisma` | `plan`, `plan_expires_at`, `analyses_used`, `plan_renewed_at` | Yangi fieldlar |
| `uzum/uzum.controller.ts` | `analyses_used` increment + limit check | FREE: 10/oy |
| `admin/admin-account.service.ts` | `daily_fee` → `plan` + `analyses_used` response | Admin UI |
| `products/products.service.ts` | Plan-based tracked product limiti (FREE: max 20?) | Feature gate |
| `signals/signals.service.ts` | Signals faqat PRO+ | Plan guard |
| `discovery/discovery.service.ts` | Discovery faqat PRO+ | Plan guard |
| `sourcing/sourcing.service.ts` | Sourcing faqat PRO+ | Plan guard |
| `ai/ai.service.ts` | AI faqat MAX+ | Plan guard |
| `team/team.service.ts` | Team faqat MAX+ (5) yoki COMPANY (20) | Plan guard |

### Worker (apps/worker/)

| Fayl | O'zgarish |
|------|-----------|
| `billing.processor.ts` | Cron: `0 2 * * *` → `0 3 1 * *` (oyning 1-da) |
| | `chargeAllActiveAccounts()` → `renewSubscriptions()` |
| | FREE userlar uchun: faqat `analyses_used = 0` reset |
| | PRO+ uchun: to'lov → muvaffaqiyatli → `plan_expires_at` yangilash |
| | To'lov muvaffaqiyatsiz → `status = PAYMENT_DUE` |

### Frontend (apps/web/)

| Fayl | O'zgarish |
|------|-----------|
| `components/PaymentDueBanner.tsx` | "Balans tugadi" → "Oylik to'lov muddati o'tdi" |
| `pages/BillingPage.tsx` yoki yangi | Plan selection UI, upgrade tugmasi |
| `components/PlanGuard.tsx` (yangi) | Feature locked overlay |
| `hooks/useAccount.ts` | `balance` → `plan`, `analyses_used`, `analyses_limit` |
| `pages/SettingsPage.tsx` | Plan info + upgrade |
| Barcha feature sahifalar | PlanGuard wrapper |

---

## Yangi `PlanGuard` dekorator patterni

```typescript
// Hozirgi BillingGuard (billing.guard.ts) yoniga:
@Injectable()
export class PlanGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const account = request.account;
    const requiredPlan = reflector.get<string>('requiredPlan', handler);
    const PLAN_ORDER = { FREE: 0, PRO: 1, MAX: 2, COMPANY: 3 };
    if (PLAN_ORDER[account.plan] < PLAN_ORDER[requiredPlan]) {
      throw new ForbiddenException({ upgrade_to: requiredPlan });
    }
    return true;
  }
}

// Ishlatish:
@RequiresPlan('PRO')
@Post('discovery/run')
async runDiscovery() { ... }
```

---

# Admin Sahifalariga Ta'sir — Billing Model O'zgarishi

## 1. Churn Rate (admin-stats.service.ts:180-191)

**Hozirgi kod:**
```typescript
const churnRatePct = activeAccounts > 0
  ? Number(((paymentDueAccounts / activeAccounts) * 100).toFixed(2))
  : 0;
// churn_rate_pct: ACTIVE bo'lgan accountlar ichida PAYMENT_DUE bo'lganlar foizi
```

**Muammo:** Bu HAQIQIY churn emas! Bu "balans tugagan userlar" metrikasi. Haqiqiy churn = to'liq ketib qolgan userlar.

**Yangi churn o'lchash tizimi kerak:**
```sql
-- Haqiqiy churn: o'tgan 30 kunda plan_expires_at o'tib, yangilamaganlar
SELECT COUNT(*) as churned
FROM accounts
WHERE plan != 'FREE'
  AND plan_expires_at < NOW()
  AND plan_expires_at >= NOW() - INTERVAL '30 days'
  AND status = 'PAYMENT_DUE';

-- Churn rate = churned / (paid_plan_accounts 30 kun oldin)
```

**Yangi metrikalar kerak:**
- `churn_rate_pct`: Plan to'lamay ketganlar / umumiy paid users
- `free_to_pro_rate`: Bu oy FREE → PRO o'tganlar (conversion)
- `mrr_growth_pct`: O'tgan oyga nisbatan MRR o'sishi
- `plan_distribution`: { FREE: N, PRO: N, MAX: N, COMPANY: N }

**O'zgartiriladigan fayl:** `admin-stats.service.ts` → `getStatsGrowth()`

---

## 2. Revenue Dashboard (getStatsRevenue)

**Hozirgi:**
```typescript
mrr: (mrrResult._sum.amount ?? BigInt(0)).toString(),
// Bu oy CHARGE transaction summasi = har kunlik 50,000 * N kun * M user
// BU HAQIQIY MRR EMAS! Bu jami kunlik yechilgan pul.

avg_balance: (avgBalance._avg.balance ?? 0).toString(),
// Balanslar o'rtachasi — subscriptionda ma'nosiz

today_revenue: todayRevResult[0]?.total ?? '0',
// Bugun nechta user'dan yechildi
```

**Yangi MRR hisoblash:**
```typescript
// Haqiqiy MRR = bu oy SUBSCRIPTION type transactionlar summasi
mrr: sum(transactions WHERE type='SUBSCRIPTION' AND created_at >= month_start)

// Plan bo'yicha taqsimot
mrr_breakdown: {
  PRO: count * 149000,
  MAX: count * 349000,
  COMPANY: count * 890000,
}

// avg_balance o'rniga:
avg_days_to_renewal: average(plan_expires_at - NOW())
```

**O'zgartiriladigan fayl:** `admin-stats.service.ts` → `getStatsRevenue()`

---

## 3. Accounts Overview (getStatsOverview)

**Hozirgi:**
```typescript
accounts: {
  active: statusMap.ACTIVE,
  payment_due: statusMap.PAYMENT_DUE,  // "balans tugagan"
  suspended: statusMap.SUSPENDED,
}
```

**Yangi:**
```typescript
accounts: {
  active: statusMap.ACTIVE,
  payment_due: statusMap.PAYMENT_DUE,  // "oylik to'lov o'tkazib yuborilgan"
  suspended: statusMap.SUSPENDED,
  // Yangi:
  plan_breakdown: { FREE: N, PRO: N, MAX: N, COMPANY: N },
  paid_accounts: N,  // PRO + MAX + COMPANY
  free_accounts: N,
}
```

**O'zgartiriladigan fayl:** `admin-stats.service.ts` → `getStatsOverview()`

---

## 4. Admin Account Detail (admin-account.service.ts)

**Hozirgi response:**
```json
{
  "balance": "150000",
  "daily_fee": "50000"
}
```

**Yangi response kerak:**
```json
{
  "plan": "PRO",
  "plan_expires_at": "2026-04-01T00:00:00Z",
  "analyses_used": 47,
  "analyses_limit": null,
  "balance": "0",
  "daily_fee": null
}
```

**Admin deposit endpoint o'zgarishi:**
```
Hozir:  POST /admin/accounts/:id/deposit { amount: 500000 }
Yangi:  POST /admin/accounts/:id/set-plan { plan: 'PRO', months: 3 }
        → plan_expires_at = NOW() + 3 months
        → Transaction type = PLAN_CHANGE
        → AuditEvent yoziladi
```

**O'zgartiriladigan fayl:** `admin-account.service.ts` → `getAccount()`, `listAccounts()`, `depositBalance()` → `setPlan()`

---

## 5. Admin Analytics Tab (Frontend)

`AdminAnalyticsTab.tsx` va `AnalyticsTab.tsx` da hozirgi chartlar:
- **Revenue chart**: CHARGE transactionlar → SUBSCRIPTION transactionlar
- **MRR card**: yangi formula
- **Payment Due card** → "Plan Expired" + PRO/MAX/COMPANY breakdown donut chart

Yangi kartalar kerak:
- **Conversion Funnel**: FREE → PRO conversion rate (%)
- **Plan Distribution**: Donut chart (FREE/PRO/MAX/COMPANY)
- **MRR Trend**: Oylik o'sish grafigi
- **Churn Chart**: Haqiqiy churn (plan expiry missed)

---

## 6. Top Users / Activity Score

`getTopUsers()` da hozirgi `activity_score` formula:
```typescript
activity_score = activity_count * 1 + discovery_runs * 5 + tracked_count * 3
```

Yangi: `plan` field qo'shiladi — admin qaysi plan qaysi activity bilan kelganini ko'radi:
```typescript
// response ga:
plan: user.account_plan,  // 'FREE' | 'PRO' | 'MAX' | 'COMPANY'
```

---

## 7. Billing Processor (Worker)

**Hozirgi:** `0 2 * * *` cron → har kuni hammadan 50,000 yechadi

**Yangi:**
```typescript
// Cron 1: oyning 1-iga subscriptions renew
// 0 3 1 * * → 01:00 UTC har oyning 1-ida
async renewSubscriptions() {
  const expiring = await prisma.account.findMany({
    where: { plan: { not: 'FREE' }, plan_expires_at: { lte: addDays(new Date(), 3) } }
  });
  for (const acc of expiring) {
    // To'lov API (hozir yo'q, manual) yoki PAYMENT_DUE set
    await prisma.account.update({ where: { id: acc.id }, data: { status: 'PAYMENT_DUE' } });
    // Admin notifikatsiya
  }
}

// Cron 2: har oyning 1-ida FREE userlar analyses_used reset
// 0 4 1 * *
async resetAnalysesCounters() {
  await prisma.account.updateMany({
    where: { plan: 'FREE' },
    data: { analyses_used: 0 }
  });
}
```

---

## 8. Migration Strategiyasi

Mavjud userlar uchun:
```sql
-- Barcha hozirgi ACTIVE userlarni PRO ga ko'taring (1 oy tekin)
UPDATE accounts
SET plan = 'PRO',
    plan_expires_at = NOW() + INTERVAL '30 days',
    plan_renewed_at = NOW()
WHERE status = 'ACTIVE' AND id != 'SUPER_ADMIN_ID';

-- PAYMENT_DUE bo'lganlarni FREE ga tushiring
UPDATE accounts
SET plan = 'FREE',
    status = 'ACTIVE',
    balance = 0
WHERE status = 'PAYMENT_DUE';

-- daily_fee'ni null qilib qo'ying
UPDATE accounts SET daily_fee = NULL;
```

**Migration xavflari:**
- `balance` field hali DB da bor → eski transaction history saqlanadi ✅
- `daily_fee` null → worker'da `account.daily_fee ?? defaultFee` ishlaydi → SHART worker yangilansin
- `CHARGE` type transactionlar DB da qoladi → admin statistika eski + yangi ko'rsatadi

---

## Bajarish tartibi (Task ketti)

```
P0 (3-4 soat, Backend):
  1. schema.prisma: plan, plan_expires_at, analyses_used, plan_renewed_at → migrate
  2. auth.service.ts: register'da plan='FREE' set
  3. BillingGuard: status check + NEW PlanGuard (plan features)
  4. uzum.controller.ts: analyses_used++ + limit 10 check

P1 (2-3 soat, Worker):
  5. billing.processor.ts: daily cron → monthly + analyses reset cron

P1 (4-5 soat, Backend):
  6. admin-stats.service.ts: churn, MRR, plan_distribution yangi metodlar
  7. admin-account.service.ts: getAccount, listAccounts response + setPlan()

P2 (5-6 soat, Frontend):
  8. PaymentDueBanner → PlanExpiredBanner
  9. PlanGuard component (locked feature overlay)
  10. BillingPage: plan selection + upgrade flow
  11. AdminAnalyticsTab: yangi chart kartalar (conversion, plan distribution)
  12. Admin account detail: plan + analyses_used ko'rsatish
```

---

# Har bir funksiya ishlash algoritimi

<!-- Masalan: qanday scrape qilinadi. har scrape dan keyin qachon malumot yangilanadi va qanday yangilanadi. va scrapedan qanday malumotlar olinadi  -->
                                                                                                                                                                                 
                                                                                                                                                                                                                                                                      

