# UZUM TREND FINDER — MASTER BRIEFING
# Claude CLI uchun: BARCHA VERSIYALAR INDEKSI + TO'LIQ LOYIHA XARITASI
# Versiya: MASTER | Sana: 2026-02-22

---

## 🚀 LOYIHA HAQIDA (1 daqiqa o'qing)

**Uzum Trend Finder** — O'zbekistonning [uzum.uz](https://uzum.uz) marketplace'i uchun
analitika SaaS platformasi. Sotuvchilar qaysi mahsulot "hot" ekanligini, raqiblari nima
qilayotganini, Xitoydan qancha arzonroq olib kelishini real vaqtda bilishi kerak.

**Stack:** NestJS + Prisma + PostgreSQL + BullMQ + Redis + React + Telegram

**Biznes model:** Kunlik obuna (daily_fee) — admin dinamik o'rnatadi.

---

## 📁 VERSIYALAR (har biri alohida o'qilishi kerak)

| Fayl | Versiya | Features | Faza |
|------|---------|----------|------|
| `v1.0_features_01-10.md` | v1.0 | 01-10 | MVP (Faza 1-2) |
| `v2.0_features_11-20.md` | v2.0 | 11-20 | AI + Tech (Faza 2-3) |
| `v3.0_features_21-30.md` | v3.0 | 21-30 | Signals + Tools (Faza 3) |
| `v4.0_features_31-43.md` | v4.0 | 31-43+ | Enterprise + Moat (Faza 4+) |

**Claude CLI da ishlatish:**
```bash
cat MASTER_BRIEFING.md | claude "Shu loyihani boshlashimga yordam ber"
cat v1.0_features_01-10.md | claude "Faza 1 ni kodlashni boshlaylik"
cat v4.0_features_31-43.md | claude "Feature 43 cargo kalkulyatorni implement qil"
```

---

## 🗺️ 43 FEATURE TO'LIQ RO'YXATI

### ✅ v1.0 — CORE MVP (Features 01-10)
```
01. Competitor Price Tracker     → Raqiblar narxini real vaqtda kuzatish
02. Seasonal Trend Calendar      → Ramazon, 8-mart, Navro'z trend heatmap
03. Shop Intelligence Dashboard → Shop profili, trust score, o'sish dinamikasi
04. Niche Finder                 → Yuqori sotuv + past raqobat = kirish imkoniyati
05. CSV/Excel Import & Export    → Batch analyze, Excel natija
06. Referral Tizimi             → 7 kunlik bepul obuna (viral growth)
07. API Access (Dev Plan)        → Sotuvchilar o'z tizimlariga ulash
08. Public Leaderboard           → Bepul top-5 (lead generation + SEO)
09. Profit Calculator 2.0        → Uzum komissiya + FBO + reklama → sof foyda
10. Browser Extension            → Uzum sahifasida score ko'rish (Chrome/Firefox)
```

### ✅ v2.0 — AI + IMPROVEMENTS (Features 11-20)
```
11. Trend Prediction (ML)        → 7 kunlik linear regression bashorat
12. Auto Description Generator   → Claude API → Ruscha + O'zbekcha tavsif
13. Review Sentiment Analysis    → Raqib reviewlaridan zaif tomonlarni topish
14. White-label                  → Agentliklar uchun o'z brendida sotish
15. Konsultatsiya Marketplace    → Ekspertlar bilan bog'lanish (20% komissiya)
16. PWA                          → Mobil o'rnatish + offline + push notification
17. WebSocket Real-time          → Dashboard live updates (Socket.io)
18. Multi-language (i18n)        → O'zbek / Rus / Ingliz (react-i18next)
19. Demand-Supply Gap Detector   → Bozorga kirish imkoniyatlarini aniqlash
20. Price Elasticity Calculator  → Narx o'zgarishi → sotuv ta'siri (snapshot tarix)
```

### ✅ v3.0 — SIGNALS + TOOLS (Features 21-30)
```
21. Cannibalization Alert        → O'z mahsulotlari o'rtasidagi raqobatni aniqlash
22. Dead Stock Predictor         → Stokda qolib ketish xavfini erta aniqlash
23. Category Saturation Index    → Bozor to'yinganligini o'lchash (HHI formula)
24. Flash Sale Detector          → 24 soat ichida -20%+ narx tushishi
25. New Product Early Signal     → feedbackQuantity<50 + tez o'sish = trending
26. Stock Cliff Alert            → Raqib stoksiz qolmoqda → sizga imkoniyat
27. Ranking Position Tracker     → Kategoriyada nechi o'rinda, o'zgarish kuzatish
28. Product Launch Checklist     → Mahsulot qo'yishdan oldin to'liq tayyorgarlik
29. A/B Price Testing            → 2 narx variant → statistik tahlil (t-test)
30. Replenishment Planner        → "Sizda 14 kun stok qoldi" → buyurtma eslatmasi
```

### ✅ v4.0 — ENTERPRISE + MOAT (Features 31-43)
```
31. Uzum Ads ROI Tracker         → Reklama xarajati → qaytim hisoblash
32. Telegram Mini App            → Telegram ichida to'liq dashboard (grammY)
36. Team Collaboration           → OWNER/ADMIN/ANALYST/VIEWER rollari
37. Custom Report Builder        → Drag-and-drop → PDF export (Puppeteer)
38. Market Share PDF             → Oylik avtomatik bozor tahlili PDF
39. Watchlist Sharing            → Public link, blur CTA (freemium)
40. Historical Data Archive ⭐   → 2+ yillik data → SOTIB BO'LMAYDIGAN ASSET
41. Collective Intelligence      → "127 sotuvchi kuzatyapti" (social proof)
42. Algorithm Reverse Eng. ⭐    → Uzum ranking algoritmini aniqlash
43. Xitoy/Evropa Taqqoslash ⭐  → 1688/Alibaba/Amazon narxi + Cargo kalkulyator
```

**⭐ = Eng kuchli differensiatsiya** (raqobat kopiya qila olmaydi)

---

## 🏗️ ARXITEKTURA (barcha versiyalar uchun umumiy)

### Monorepo tuzilmasi
```
uzum-trend-finder/
├── apps/
│   ├── api/              → NestJS (port 3000)
│   │   ├── src/
│   │   │   ├── auth/         JWT + RBAC
│   │   │   ├── billing/      daily_fee + 402 middleware
│   │   │   ├── uzum/         GraphQL client + scraper
│   │   │   ├── products/     CRUD + snapshots
│   │   │   ├── discovery/    category runs + winners
│   │   │   ├── sourcing/     Xitoy/Evropa narx + cargo ← YANGI
│   │   │   ├── alerts/       rules + events
│   │   │   ├── ai/           Claude API integration
│   │   │   └── admin/        superadmin endpoints
│   │   └── prisma/
│   ├── worker/           → BullMQ (port 3001)
│   │   └── src/jobs/
│   │       ├── billing.job.ts
│   │       ├── snapshot.job.ts
│   │       ├── discovery.job.ts
│   │       ├── sourcing.job.ts  ← YANGI
│   │       └── alert.job.ts
│   ├── web/              → React + Vite (port 5173)
│   │   └── src/pages/
│   │       ├── Dashboard/
│   │       ├── Products/
│   │       ├── Discovery/
│   │       ├── Sourcing/     ← YANGI (Xitoy/Evropa)
│   │       ├── Alerts/
│   │       ├── Billing/
│   │       └── Admin/
│   └── telegram-bot/     → grammY + Mini App
├── packages/
│   ├── types/            → Shared TypeScript types
│   └── utils/            → scoring, cargo calculator, parsers
└── docker-compose.yml    → postgres + redis
```

### Environment variables
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/uzum_trend_finder"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."
ANTHROPIC_API_KEY="sk-ant-..."
TELEGRAM_BOT_TOKEN="..."
PROXY_URL="http://user:pass@proxy:port"
SERPAPI_KEY="..."          # Google Shopping search
EXCHANGERATE_API_KEY="..." # Valyuta kurslari
PORT=3000
NODE_ENV="development"
```

---

## 📊 DATABASE JADVALLAR (to'liq ro'yxat)

```
AUTH/BILLING:
  accounts, users, transactions, audit_events, system_settings,
  team_members, team_invitations, api_keys, referrals

UZUM DATA:
  shops, products, skus,
  product_snapshots, sku_snapshots, shop_snapshots,
  ranking_snapshots, flash_sale_events

DISCOVERY:
  category_runs, category_winners, tracked_products,
  demand_supply_gaps, cannibalization_alerts

COMPETITOR:
  competitor_price_snapshots, seasonal_trends, niche_scores,
  dead_stock_scores, early_signal_scores

SOURCING (YANGI):
  external_price_searches, cargo_calculations,
  cargo_providers, currency_rates

ALERTS:
  alert_rules, alert_events

AI:
  product_ai_attributes, product_ai_explanations, sentiment_analysis,
  product_reviews_cache, product_predictions

MARKETING/BUSSINESS:
  import_jobs, ads_campaigns, ads_daily_spend,
  consultants, consultation_sessions,
  shared_watchlists, white_label_configs,
  report_templates, public_leaderboard, product_watch_aggregate
```

---

## 💡 SCORING FORMULA (o'zgarmaydi)

```typescript
function calculateScore(p: {
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  supply_pressure: number; // FBO=1.0, FBS=0.5
}): number {
  return (
    0.55 * Math.log(1 + (p.weekly_bought ?? 0)) +
    0.25 * Math.log(1 + p.orders_quantity) +
    0.10 * p.rating +
    0.10 * p.supply_pressure
  );
}
// weekly_bought: productPage query dan (parse) yoki snapshot delta (fallback)
```

---

## 🔑 UZUM API (muhim texnik ma'lumot)

```
Endpoint: POST https://graphql.uzum.uz/
Operatsiyalar:
  makeSearch  → kategoriya listing (ordersQuantity, narx, stok)
  productPage → mahsulot detail (weekly_bought "actions.text" ichida)
  productReviews → reviewlar

weekly_bought parser:
  /(\d[\d\s]*)\s*(человек|kishi|нафар)/i
  Fallback: snapshot delta (current - previous_7days)

Rate limit: 1-2 req/sec
Proxy: RESIDENTIAL (MVP dan boshlab — majburiy!)
```

---

## 🏪 XITOY/EVROPA SOURCING (Feature 43 qisqacha)

```
Manbalar:
  🇨🇳 Xitoy: 1688.com | Alibaba | AliExpress | DHgate | Made-in-China
  🌍 Evropa: Amazon.de | Amazon.co.uk | Wildberries.ru | Ozon.ru

Cargo yo'nalishlari:
  Xitoy → Toshkent: Kargo Ekspres (18 kun, $5.5/kg)
                    Temir yo'l (15 kun, $3.8/kg) — katta hajm
                    Avia (5 kun, $6.5/kg) — kichik va tez

  Evropa → Toshkent: Avto (14 kun, $3.5/kg)
                     Avia (3 kun, $8/kg)
                     Turkiya orqali (10 kun, $4/kg)

Hisoblash: tannarx + cargo + bojxona(10-20%) + QQS(12%) = landed cost
Output: Gross margin, ROI, breakeven, tavsiya
```

---

## ⚠️ MUHIM RISKLAR

| Risk | Muammo | Yechim |
|------|--------|--------|
| Uzum blocking | 403/429 ban | Residential proxy (MVP dan) |
| weekly_bought parsing | Matn o'zgarishi | Test suite + monitoring |
| Claude cost | Ko'p API call | Aggressive caching |
| Xitoy scraping | Captcha, ban | SerpAPI (pullik lekin ishonchli) |
| Valyuta kursi | Noto'g'ri hisob | CBU rasmiy kursi |
| Multi-tenant leak | Data mix | Prisma middleware + RLS |

---

## 🚦 QAYERDAN BOSHLASH (KETMA-KETLIK)

```
1. docker-compose up (postgres + redis)
2. pnpm init + turborepo setup
3. prisma schema (asosiy jadvallar)
4. NestJS: auth + billing skeleton
5. Uzum GraphQL client
6. Scoring engine + parser
7. URL Analyze end-to-end
8. React dashboard (basic)
9. Feature 04 (Niche Finder) ← eng tez ROI
10. Feature 43 (Cargo Calc) ← eng differentsiyali
```

---
*MASTER BRIEFING | 43 Features | v1.0-v4.0 | 2026-02-22*
