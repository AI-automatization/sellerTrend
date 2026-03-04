# BEKZOD — Ochiq Vazifalar
# Fayllar: apps/api/, apps/worker/, apps/bot/, packages/*, docker-*, .github/*, prisma
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding

---

# KOD AUDIT — P1 MUHIM (T-353, T-354, T-357)

> 3 task qoldi (T-355, T-356, T-358 → Done.md)

### T-353 | P1 | BACKEND | DTO validation — 15+ endpoint raw @Body() | 3h
**Sabab:** `ads`, `consultation`, `tools`, `reports`, `watchlist`, `community`, `signals`, `notification` controller'lar DTO'siz. `@Body()` raw JSON qabul qiladi — injection xavfi.
**Yechim:** Har modul uchun DTO yaratish (class-validator). 8 ta controller, ~15 endpoint.

### T-354 | P1 | BACKEND | `any` type cleanup — 40+ instance | 2h
**Sabab:** `serpapi.client`, `leaderboard`, `reports`, `community`, `file-logger`, `export.controller` — strict TS buzilgan.
**Yechim:** Har `any` → typed interface yoki `unknown` + type guard.

### T-357 | P1 | BACKEND | Worker stability batch — 7 ta fix | 1.5h
**Sabab va yechim:**
1. **Billing idempotency** (`billing.processor.ts`) — retry da double charge → idempotency key
2. **Worker prisma disconnect** (`worker/main.ts:83-107`) — shutdown'da `$disconnect()` yo'q → qo'shish
3. **Bot prisma disconnect** (`bot/main.ts:6-12`) — crash handler'da yo'q → qo'shish
4. **Redis TLS** (`worker/redis.ts`) — `rediss://` handle emas → URL parse + tls option
5. **Competitor N+1** (`competitor.processor.ts:13`) — unbounded findMany → `take` + `include`
6. **Logger stream error** (`worker/logger.ts:32-41`) — `.on('error')` handler yo'q → qo'shish
7. **Worker health Redis** (`worker/main.ts:54`) — alohida connection → shared instance

---

# KOD AUDIT — P2 O'RTA (T-359..T-360)

### T-359 | P2 | BACKEND | API P2 batch (27 ta) | 4h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-API-01..P2-API-27
Seed hardcoded creds, memory pressure prefix, RotatingFileWriter null, report filters validation, classifyUA, ads status, consultation date, parsePeriod duplicate, niche dead code, leaderboard cache eviction, discovery Prisma direct, findNiches false positive, proxyDispatcher `as any` (5x), shop pagination, AdminMonitoring return type, SearchPricesDto unused, export @Res, CommonModule export, capacity dbPoolSize, fetchWithTimeout cleanup, AliExpress timestamp, competitor duplicate endpoint, listInsights sort, notification architecture, admin tickets bounds, health module registration.

### T-360 | P2 | BACKEND | Worker+Bot P2 batch (14 ta) | 2h
> Batafsil ro'yxat: CODE-AUDIT-2026-03-04.md → P2-WK-01..P2-WK-14
Bot domain placeholder, /top numeric ID, bot rate limiting, escapeHtml duplicate, sourcing hardcoded customs/VAT, weekly scraper BrowserContext per product, import error level, discovery unreachable throw, AI scraper key guard, bot health always ok, discovery dead code, sourcing hardcoded waits, packages/types eskirgan UzumProductDetail, weekly scrape BigInt fragile.

---

# PLATFORMA AUDIT — UX/PIPELINE/ONBOARDING (T-371..T-376)

> Manba: DEEP-PLATFORM-AUDIT-2026-03-04.md + Analysis-Onboarding-Multimarketplace.md

### T-371 | P0 | BACKEND | Alert delivery pipeline — uzilgan, hech kimga yetkazilmaydi | 4h
**Sabab:** `sendDiscoveryAlert()` (`apps/bot/src/alerts.ts`) funksiyasi mavjud, lekin **hech qachon chaqirilmaydi**. Worker AlertEvent yaratadi (DB ga yozadi), lekin alert hech kimga yetkazilmaydi — na Telegram, na in-app notification.
**Ta'sir:** Platformaning eng kuchli feature'lari (signal detection, stock cliff, flash sales) foydasiz — user bilmaydi.
**Yechim:**
1. Alert delivery worker job yaratish (5 min cron) — AlertEvent'larni o'qib, Telegram + in-app notification yuborish
2. `sendDiscoveryAlert()` ni discovery processor'ga wire qilish
3. Own-product price alert trigger qo'shish — narx o'zgarganda alert yaratish
4. T-372 (bot account linking) bilan birga ishlaydi

### T-372 | P0 | BACKEND | Bot account linking — TelegramLink model + commands | 4h
**Sabab:** Telegram chatId → VENTRA accountId bog'lanishi **yo'q**. Bot faqat 6 ta generic command bor (`/start`, `/subscribe`, `/status`, `/top`, `/help`, `/unsubscribe`). `/top` global — har kim bir xil top 10 ko'radi. Shaxsiy ma'lumot yuborib bo'lmaydi.
**Ta'sir:** Bot 2/10 ball — deyarli foydasiz.
**Yechim:**
1. `TelegramLink` model yaratish (chatId ↔ accountId)
2. `/connect [API_KEY]` command — account linking
3. `/myproducts` — tracked products ro'yxati
4. `/balance` — qoldiq + kunlar
5. `/product [URL]` — tez tahlil (URL paste → score qaytarish)

### T-373 | P1 | BACKEND | Onboarding schema + API endpoint | 1.5h
**Sabab:** Account modelida `onboardingCompleted` flag yo'q — user onboarding'dan o'tganmi bilish imkonsiz. Frontend (T-368 #5) Welcome Modal yaratishi kerak, lekin backend tomonida tracking yo'q.
**Yechim:**
1. Schema migration:
   - `Account.onboardingCompleted Boolean @default(false)`
   - `Account.onboardingStep Int @default(0)`
   - `Account.selectedMarketplaces String[] @default(["uzum"])`
2. `GET /api/v1/auth/me` response'ga `onboardingCompleted` qo'shish
3. `PATCH /api/v1/onboarding` endpoint — `{ step, completed, marketplaces }`

### T-374 | P1 | BACKEND | Forgot Password — API endpoint | 3h
**Sabab:** Parol tiklash imkonsiz — "Forgot Password" yo'q. User parol unutsa accountga qayta kira olmaydi.
**Yechim:**
1. `POST /api/v1/auth/forgot-password` — email ga reset token yuborish
2. `POST /api/v1/auth/reset-password` — token + yangi parol
3. Token expiry (15 min), rate limiting (3 req/hour per email)
4. Email template (NestJS Mailer yoki Telegram fallback)

### T-375 | P1 | BACKEND | Worker monitoring jobs — 5 ta yangi cron | 8h
**Sabab:** 14 ta ML algoritmdan 5 tasi (`detectStockCliff`, `detectFlashSales`, `detectEarlySignals`, `predictDeadStock`, `planReplenishment`) faqat API'da on-demand ishlaydi. **Avtomatik worker job yo'q** — alert yaratilmaydi.
**Yechim:**
1. **Morning digest** (07:00 cron) — per-account top products, alerts, balance → Bot (T-372 kerak)
2. **Stock monitoring** — `detectStockCliff()` cron (har 6 soat)
3. **Trend detection** — `detectEarlySignals()` + `detectFlashSales()` cron (har 6 soat)
4. **Currency rate update** — CBU.uz dan avtomatik (hozir `DEFAULT_USD_RATE` hardcoded 12800)
5. **Data cleanup** — eski snapshot'lar (90+ kun), expired session'lar, stale job'lar

### T-376 | P2 | BACKEND | Platform model — multi-marketplace (kelajak) | 2h
**Sabab:** Hozir faqat Uzum.uz. Wildberries, Yandex Market kelajakda qo'shiladi. Platform abstraksiyasi yo'q.
**Yechim:**
1. `Platform` model yaratish (`slug`, `name`, `isActive`, `comingSoon`, `logoUrl`)
2. Seed: `uzum` (isActive: true), `wildberries`, `yandex_market`, `ozon` (comingSoon: true)
3. `GET /api/v1/platforms` — public endpoint
4. `Account.selectedMarketplaces` bilan bog'lash

### T-378 | P1 | FRONTEND | Forgot Password UI | 2h
**Sabab:** Login sahifada "Parolni unutdingiz?" link yo'q. User parol unutsa dead end.
**Yechim:**
1. LoginPage'da "Parolni unutdingiz?" link qo'shish
2. ForgotPasswordPage yaratish — email input → API call
3. ResetPasswordPage yaratish — token + yangi parol
4. T-374 (Forgot Password API) bilan birga ishlaydi

### T-383 | P2 | FRONTEND | Landing multi-marketplace section | 3h
**Sabab:** Hozir landing faqat "Uzum.uz sotuvchilar uchun". Multi-marketplace strategy ko'rsatish kerak.
**Yechim:**
1. **MarketplacesSection** — HeroSection dan keyin: platform logolar `[Uzum ✓] [Wildberries — tez kunda] [Yandex — tez kunda]`
2. **Hero copy update** — "Markaziy Osiyo marketplace'lari uchun yagona analytics platforma"
3. **Pricing tiers** — marketplace tiers bilan yangilash (hozircha "tez kunda" badge)
4. T-376 (Platform model) tayyor bo'lgach dinamik qilish

### T-384 | P3 | IKKALASI | Engagement features — kelajak | 20h+
**Sabab:** User retention va "addictive analytics" uchun zarur feature'lar:
1. **Revenue estimator** — narx × sotuv tezligi = taxminiy daromad (API + Web)
2. **Product comparison** — 2-3 mahsulotni yonma-yon taqqoslash (Web)
3. **Login streak** — "5 kun ketma-ket kirdingiz!" (API + Web)
4. **Achievement badges** — "Birinchi mahsulot", "10 ta analyzed" (API + Web)
5. **"What's new" changelog** — yangi feature'lar haqida (Web)
6. **Weekly email digest** — "Top product -15% tushdi" (Worker + API)

---

# MAVJUD TASKLAR (o'zgarishsiz)

## ENV (qo'lda)

| # | Nima | Holat |
|---|------|-------|
| E-006 | ALIEXPRESS_APP_KEY + SECRET | ❌ Region ro'yxat xato |
| E-008 | REDIS_URL parol bilan (dev) | ⬜ |
| E-010 | PROXY_URL (kerak bo'lganda) | ⬜ |

## DEVOPS

| # | Prioritet | Nima | Holat |
|---|-----------|------|-------|
| T-281 | P0 | Cloudflare CDN — static assets 20ms | ⬜ |
| T-178 | P1 | Custom domain + SSL — web service | ⬜ |
| T-283 | P1 | Landing custom domain — ventra.uz DNS | ⬜ |
| T-243 | P2 | ALIEXPRESS keys Railway'ga | ⬜ |
| T-245 | P2 | PROXY_URL Railway'ga (optional) | ⬜ |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| **Kod Audit P1** (T-353, T-354, T-357) | **3 task** |
| **Kod Audit P2** (T-359..T-360) | **2 task, ~41 bug** |
| **Platforma Audit P0** (T-371..T-372) | **2** |
| **Platforma Audit P1** (T-373..T-375, T-378) | **4** |
| **Platforma Audit P2** (T-376, T-383) | **2** |
| **Platforma Audit P3** (T-384) | **1** |
| ENV manual | 3 |
| DevOps | 5 |
| **JAMI task ochiq** | **22** |

---

# BAJARILDI → Done.md ga ko'chirilgan

**Backend Audit P0 (10 ta):** T-343, T-344, T-345, T-346, T-347, T-348, T-349, T-350, T-351, T-352
**Backend Audit P1 (3 ta):** T-355, T-356, T-358
**Platforma Audit P0 (2 ta):** T-371, T-372
**Design System (1 ta):** T-379
**Backend P1 (6 ta):** T-241, T-269, T-270, T-214, T-235 (→T-284), T-236 (→T-283)
**Backend P2 (2 ta):** T-239, T-150
**Backend P3 (1 ta):** T-240
**Ikkalasi (3 ta):** T-237, T-260, T-261
**Web (Sardordan) (8 ta):** T-202, T-264, T-266, T-257, T-188, T-189, T-190, T-192
**ENV (1 ta):** E-009
**Railway (10 ta):** T-262, T-263, T-177, T-179, T-180, T-181, T-184, T-242, T-244
**Stability Sprint (16 ta):** T-299..T-314

---
*Tasks-Bekzod.md | VENTRA | 2026-03-04*
