# Onboarding va Multi-marketplace Tahlil
# Sana: 2026-03-01
# Maqsad: Qaror qabul qilish uchun — task yaratishdan oldin o'qiladi

---

## 1. HOZIRGI ONBOARDING HOLATI

### Foydalanuvchi yo'li (hozir)
```
Register → navigate('/') → DashboardPage (bo'sh) → CTA → /analyze → birinchi mahsulot
```

### Muammolar
| # | Muammo | Ta'siri |
|---|--------|---------|
| 1 | Yangi user dashboardga kirsa bo'sh sahifa — nima qilish noaniq | Confusion, churn |
| 2 | `/analyze` ga CTA bor lekin "nima uchun?" tushuntirish yo'q | Low activation |
| 3 | Progress tracker yo'q — user qayerdanligini bilmaydi | Disorientation |
| 4 | `onboardingCompleted` flag schema'da yo'q | Tracking imkonsiz |
| 5 | Marketplace tanlash imkoni yo'q — kelajakda kerak bo'ladi | Technical debt |

### Mavjud fayllar (o'qildi)
- `apps/web/src/pages/RegisterPage.tsx` — register → `navigate('/')` to'g'ridan, wizard yo'q
- `apps/web/src/pages/DashboardPage.tsx` — bo'sh holat CTA bor, lekin minimal
- `apps/web/src/pages/AnalyzePage.tsx` — birinchi real harakat: URL paste → analyze
- `apps/web/src/components/Layout.tsx` — sidebar navigation, payment overlay
- `apps/api/prisma/schema.prisma` — Account modelida onboarding field yo'q

---

## 2. TAVSIYA ETILGAN ONBOARDING UX

### Step 1 — Welcome Modal (Register dan keyin avtomatik)
```
┌─────────────────────────────────────────────┐
│  VENTRA ga xush kelibsiz!                   │
│                                             │
│  Biz sizga yordam beramiz:                  │
│  • Mahsulotlar trendini real vaqtda kuzating│
│  • Raqobatchilarni tahlil qiling            │
│  • Foydali mahsulotlarni aniqlang           │
│                                             │
│  [Boshlash — 2 daqiqa →]  [Keyinroq]       │
└─────────────────────────────────────────────┘
```

### Step 2 — Marketplace tanlash
```
┌─────────────────────────────────────────────┐
│  Qaysi marketplace ishlatasiz?              │
│                                             │
│  [✓ Uzum.uz]                               │
│  [ Wildberries]  (tez kunda)               │
│  [ Yandex Market]  (tez kunda)             │
│  [ Boshqa]                                 │
│                                             │
│  [Davom etish →]                           │
└─────────────────────────────────────────────┘
```

### Step 3 — Birinchi mahsulot
```
┌─────────────────────────────────────────────┐
│  Kuzatmoqchi bo'lgan mahsulot URL:          │
│                                             │
│  [https://uzum.uz/...          ]  [➕ Qo'sh]│
│                                             │
│  Masalan: uzum.uz/product/123456            │
│                                             │
│  [O'tkazib yuborish]  [Qo'shish →]         │
└─────────────────────────────────────────────┘
```

### Dashboard — Onboarding Checklist Widget
```
┌─ Boshlash uchun (1/4) ──────────────────────┐
│  ✅ Ro'yxatdan o'tish                       │
│  ☐  Birinchi mahsulot qo'shish  → /analyze  │
│  ☐  Raqobatchi kuzatish         → /comp...  │
│  ☐  Signal sozlash              → /signals  │
│                               [Yopish ×]   │
└─────────────────────────────────────────────┘
```
Ko'rinish: DashboardPage yuqorida, faqat `onboardingCompleted === false` da, dismissable.

---

## 3. BACKEND O'ZGARISHLAR (Bekzod uchun)

### 3a. Schema
```prisma
// apps/api/prisma/schema.prisma — Account model ichiga:
onboardingCompleted  Boolean  @default(false)
selectedMarketplaces String[] @default(["uzum"])
```

### 3b. API
```
GET  /api/v1/auth/me   → response ga onboardingCompleted + selectedMarketplaces qo'shish
PATCH /api/v1/onboarding → { completed: true, marketplaces: ["uzum"] }
```
AccountModule ichida, JWT guard.

### 3c. Platform model (kelajak uchun)
```prisma
model Platform {
  id         String  @id @default(cuid())
  slug       String  @unique   // "uzum", "wildberries", "yandex_market"
  name       String
  isActive   Boolean @default(false)
  comingSoon Boolean @default(true)
  logoUrl    String?
}
```
Seed: uzum (isActive: true), wildberries + yandex_market (comingSoon: true)
`GET /api/v1/platforms` — public endpoint

---

## 4. FRONTEND O'ZGARISHLAR (Sardor uchun)

### 4a. WelcomeModal
```
Fayl: apps/web/src/components/onboarding/WelcomeModal.tsx
Trigger: authStore.user.onboardingCompleted === false → auto-open
Yopganda: PATCH /api/v1/onboarding { completed: true, marketplaces: [...] }
Vaqtinchalik: localStorage.setItem('onboarding_done', '1') — schema tayyor bo'lguncha
```

### 4b. OnboardingChecklist
```
Fayl: apps/web/src/components/onboarding/OnboardingChecklist.tsx
DashboardPage da import qilish — shartli render
```

---

## 5. MULTI-MARKETPLACE — LANDING O'ZGARISHLAR

### 5a. Yangi section: MarketplacesSection
```
O'rni: HeroSection dan keyin, PainPointsSection dan oldin
Kontent:
  - Sarlavha: "Qo'llab-quvvatlanadigan platformalar"
  - Platform logolar: [Uzum ✓] [Wildberries — tez kunda] [Yandex — tez kunda] [Ozon — tez kunda]
  - CTA: "Yangi platforma qo'shilganda birinchilar orasida bo'ling →" → email form
Ma'lumot: GET /api/v1/platforms (yoki statik Platform model tayyor bo'lguncha)
```

### 5b. HeroSection copy yangilash
```
HOZIR:   "Uzum.uz sotuvchilar uchun analytics"
YANGI:   "Markaziy Osiyo marketplace'lari uchun
           yagona analytics platforma"

Subtext: "Hozir: Uzum.uz | Tez kunda: Wildberries, Yandex Market va boshqalar"

Hero ostida platform ikonlar qatori:
[uzum — rang] [wb — kulrang] [ym — kulrang] ...
```

### 5c. Pricing tiers yangilash
```
HOZIR: Starter / Pro / Enterprise

YANGI:
  Starter    — 1 marketplace (uzum)    — mavjud narx
  Growth     — 3 marketplace            — yangi tier (narx kelishiladi)
  Pro        — Barcha marketplace'lar   — premium
  Enterprise — API + white-label        — custom

Growth va Pro da "Tez kunda" badge (hozircha)
```

---

## 6. BAJARISH TARTIBI (TAVSIYA)

```
Bosqich 1 (Bekzod): T-??? Schema + migration
Bosqich 2 (Bekzod): T-??? API endpoint
Bosqich 3 (Sardor): T-??? WelcomeModal (localStorage fallback bilan boshlab)
Bosqich 4 (Sardor): T-??? Dashboard checklist
Bosqich 5 (Bekzod): T-??? Platform model + seed + endpoint
Bosqich 6 (Sardor): T-??? Landing MarketplacesSection
Bosqich 7 (Sardor): T-??? Landing Hero copy
Bosqich 8 (Sardor): T-??? Landing Pricing tiers
```

---

## 7. MUHOKAMA UCHUN SAVOLLAR

1. **WelcomeModal — majburiy yoki ixtiyoriy?**
   Tavsiya: 3-stepni o'tkazib yuborish mumkin bo'lsin, lekin modal yopilmaydi (faqat "Keyinroq" bor).

2. **Marketplace tanlash — hozirmi yoki keyinmi?**
   Tavsiya: Step 2 ni hozir qo'shish (UI faqat uzum ko'rsatadi), kelajakda dinamik qilish.

3. **Landing — qachon yangilanadi?**
   Tavsiya: Platform model tayyor bo'lguncha statik logolar bilan.

4. **Pricing tiers — narxlar qanday?**
   Bu biznes qaror — texnik tayyorlik alohida.

---

*Analysis-Onboarding-Multimarketplace.md | VENTRA | 2026-03-01*
