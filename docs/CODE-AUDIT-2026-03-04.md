# VENTRA — TO'LIQ KOD TAHLILI

**Sana:** 2026-03-04
**Tahlilchi:** Claude Code (3 parallel agent)
**Qamrov:** apps/api, apps/web, apps/worker, apps/bot, packages/*
**O'qilgan fayllar:** 90+

---

## Umumiy Natija

| Kategoriya | P0 (Kritik) | P1 (Muhim) | P2 (O'rta) | Jami |
|-----------|-------------|------------|------------|------|
| Backend API | 12 | 28 | 27 | 67 |
| Frontend | 6 | 14 | 15 | 35 |
| Worker + Bot | 5 | 10 | 14 | 29 |
| **JAMI** | **23** | **52** | **56** | **131** |

---

# P0 — KRITIK BUGLAR (23 ta)

## XAVFSIZLIK

### P0-API-01. IDOR — Boshqa userlarning mahsulot ma'lumotlari ochiq

**Fayl:** `apps/api/src/products/products.controller.ts`

Product snapshot, forecast, ml-forecast, weekly-trend endpointlari faqat `JwtAuthGuard` talab qiladi, lekin `account_id` bo'yicha filtrlamaydi. Har qanday autentifikatsiya qilingan user boshqa userning tracked productlarini product ID orqali ko'ra oladi.

**Fix:** Barcha endpoint'larda `where` ga `account_id` qo'shish.

---

### P0-API-02. WebSocket autentifikatsiyasiz

**Fayl:** `apps/api/src/common/gateways/product.gateway.ts:28-31`

`handleConnection` query string'dan `account_id` o'qiydi va hech qanday JWT tekshiruvisiz room'ga qo'shadi. Hujumchi ixtiyoriy `account_id` yuborib boshqa accountning real-time signallarini olishi mumkin.

**Fix:** `handleConnection` da JWT token tekshirish, `account_id` ni token'dan olish.

---

### P0-WEB-01. XSS — `dangerouslySetInnerHTML`

**Fayl:** `apps/web/src/components/Layout.tsx:276`

```tsx
dangerouslySetInnerHTML={{ __html: t('payment.overdueDesc').replace('{balance}', `<strong>${Number(balance).toLocaleString()}</strong>`) }}
```

`balance` qiymati API'dan keladi. MITM hujumida XSS vektor. `Number()` coercion himoya qiladi, lekin pattern xavfli.

**Fix:** JSX interpolation ishlatish, `dangerouslySetInnerHTML` olib tashlash.

---

### P0-API-03. Team invite — mavjud user hijack

**Fayl:** `apps/api/src/team/team.service.ts:119-127`

Agar user allaqachon mavjud email bilan `acceptInvite` chaqirilsa, user siljitilib boshqa `account_id` va `role` ga o'zgartiriladi. Hujumchi boshqa accountdan invite yuborib userlarni o'g'irlashi mumkin.

**Fix:** Mavjud userlarni boshqa accountga siljitirishni taqiqlash yoki tasdiqlash so'rash.

---

### P0-API-04. `BigInt()` user input'da validation yo'q

**Fayllar:**
- `apps/api/src/shops/shops.controller.ts:16`
- `apps/api/src/competitor/competitor.controller.ts:34,57,75,104`
- `apps/api/src/signals/signals.controller.ts:62`

`BigInt("abc")` → unhandled `SyntaxError` → 500 Internal Server Error.

**Fix:** `ParseIntPipe` yoki custom `BigIntPipe` ishlatish.

---

### P0-API-05. Broadcast notification `markAsRead` global

**Fayl:** `apps/api/src/notification/notification.service.ts:81-102`

Broadcast notification'lar (`account_id IS NULL`) uchun `is_read` flag notification'ning o'zida. Bitta user `markAsRead` qilsa, BARCHA userlar uchun o'qilgan bo'ladi.

**Fix:** Per-user read tracking table yaratish (`notification_reads`).

---

## RACE CONDITION'LAR (6 ta)

### P0-API-06. Billing — double-charge

**Fayllar:**
- `apps/api/src/billing/billing.service.ts`
- `apps/worker/src/processors/billing.processor.ts:28-56`

Balance o'qish va yechish alohida queryda. Concurrent cron yoki retry da ikki marta to'lov olinishi mumkin. Worker'da `balance_before`/`balance_after` stale in-memory value'dan yoziladi.

**Fix:** Interactive `$transaction` + `SELECT ... FOR UPDATE` yoki `isolationLevel: 'Serializable'`.

---

### P0-API-07. API Key daily limit bypass

**Fayl:** `apps/api/src/api-keys/api-keys.service.ts`

`used_today >= daily_limit` tekshirish va `used_today` increment alohida query. Concurrent so'rovlarda limit oshib ketadi.

**Fix:** Atomic increment: `UPDATE ... SET used_today = used_today + 1 WHERE used_today < daily_limit RETURNING *`.

---

### P0-API-08. Referral code — ikki marta ishlatish

**Fayl:** `apps/api/src/referral/referral.service.ts`

`is_used === false` tekshirish va `is_used = true` ga o'zgartirish alohida query. Concurrent so'rovlar ikkalasi ham `false` o'qiydi.

**Fix:** `$transaction` + unique constraint yoki `updateMany({ where: { is_used: false } })`.

---

### P0-API-09. Consultation double-booking

**Fayl:** `apps/api/src/consultation/consultation.service.ts:115-134`

`status === 'AVAILABLE'` tekshirish va `BOOKED` ga o'zgartirish transaksiyasiz.

**Fix:** `$transaction` + optimistic locking (`updatedAt` check).

---

### P0-API-10. Community vote counter drift

**Fayl:** `apps/api/src/community/community.service.ts:68-153`

Vote check + create transaksiyasiz. Counter update alohida query. Concurrent vote'larda counter noto'g'ri.

**Fix:** Butun vote flow'ni bitta `$transaction` ga o'rash.

---

### P0-API-11. Discovery run duplicate

**Fayl:** `apps/api/src/discovery/discovery.service.ts`

Active run tekshirish va yangi run yaratish TOCTOU. Ikki so'rov bir vaqtda yangi run yaratishi mumkin.

**Fix:** Unique constraint yoki `$transaction` + `SELECT FOR UPDATE`.

---

## STABILITY

### P0-WORKER-01. `unhandledRejection` → `process.exit(1)`

**Fayllar:**
- `apps/worker/src/main.ts:19-22`
- `apps/bot/src/main.ts:11`

Bitta uncaught rejection barcha 6 ta queue worker'ini o'ldiradi. Graceful shutdown chaqirilmaydi, Playwright browser zombie qoladi, in-flight job'lar stalled bo'ladi.

**Fix:** `process.exit(1)` o'rniga graceful `shutdown()` chaqirish yoki faqat log qilib davom ettirish.

---

### P0-WORKER-02. Chromium browser leak — OOM xavfi

**Fayllar:**
- `apps/worker/src/processors/sourcing.processor.ts:348`
- `apps/worker/src/processors/uzum-scraper.ts:77`
- `apps/worker/src/processors/weekly-scraper.ts:20`

3 ta scraper har biri alohida Chromium ishga tushiradi. Stall/kill holatida browser zombie. Discovery + Sourcing parallel = 2 Chromium = 600-1200MB = OOM (2GB Railway).

**Fix:** Shared browser pool + mutex. Queue concurrency lock qo'shish.

---

### P0-API-12. `execSync` event loop bloklaydi

**Fayl:** `apps/api/src/admin/admin-monitoring.service.ts:301-306`

`execSync('git rev-parse --short HEAD')` blocking I/O. Container'da git yo'q bo'lsa hang qiladi.

**Fix:** `execFileSync` o'rniga `exec` (async) yoki `process.env.RAILWAY_GIT_COMMIT_SHA` ishlatish.

---

### P0-API-13. 5 ta mustaqil Redis connection

**Fayllar:**
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/common/guards/custom-throttler.guard.ts`
- `apps/api/src/admin/admin-stats.service.ts`
- `apps/api/src/common/metrics/metrics.service.ts`
- `apps/api/src/sourcing/sourcing.queue.ts`

Har biri alohida Redis instance yaratadi, shutdown'da tozalanmaydi. Railway Redis 20 connection limit'ini tezda tugatadi.

**Fix:** `RedisModule` yaratib shared instance export qilish.

---

### P0-WEB-02. Auth Store va API Client token desync

**Fayllar:** `apps/web/src/stores/authStore.ts` + `apps/web/src/api/base.ts`

Token refresh faqat localStorage'ni yangilaydi, Zustand store'ni emas. `payload.role`, `payload.email` stale qoladi. WebSocket eski `account_id` bilan ishlaydi.

**Fix:** Refresh interceptor'da `useAuthStore.getState().setTokens()` chaqirish.

---

### P0-WEB-03. WebSocket logout'da disconnect qilinmaydi

**Fayl:** `apps/web/src/hooks/useSocket.ts:12-23`

Module-level `sharedSocket` logout'dan keyin ham eski `account_id` bilan ishlaydi.

**Fix:** Logout flow'da `sharedSocket.disconnect()` chaqirish va `null` ga reset.

---

### P0-WEB-04. AdminRoute token expiry tekshirmaydi

**Fayl:** `apps/web/src/App.tsx:42-48`

`PrivateRoute` `isTokenValid()` chaqiradi (expiry check), lekin `AdminRoute` faqat `role` tekshiradi. Expired token bilan admin panel UI flash qiladi.

**Fix:** `AdminRoute` da ham `isTokenValid()` tekshirish.

---

### P0-WEB-05. ProductPage useEffect race condition

**Fayl:** `apps/web/src/pages/ProductPage.tsx:120,131,146,162`

`id` o'zgarganda 4 ta `useEffect` ishlaydi. Reset effect (line 162) `[id]` ga bog'liq, external search (line 146) `[result?.title]` ga. Eski product result'i bilan yangi product uchun external search ishga tushishi mumkin.

**Fix:** Effect'larni birlashtirib, sequential flow yaratish.

---

### P0-WEB-06. Duplicate Token Payload Types

**Fayllar:**
- `apps/web/src/stores/authStore.ts:3-9` — `TokenPayload`
- `apps/web/src/api/base.ts:121-128` — `JwtTokenPayload`

Ikki xil interface, ikki xil `decodePayload` funksiya. Birini o'zgartirsangiz ikkinchisi stale qoladi.

**Fix:** Bitta `TokenPayload` + bitta `decodePayload` helper yaratish.

---

# P1 — MUHIM MUAMMOLAR (52 ta)

## Backend API (28 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P1-API-01 | **15+ endpoint DTO validation yo'q** — raw `@Body()` qabul qiladi | ads, consultation, tools, reports, watchlist, community, signals, notification controllers |
| P1-API-02 | **40+ `any` type** — strict TS policy buzilgan | serpapi.client, leaderboard, reports, community, file-logger, export.controller |
| P1-API-03 | **4 ta BullMQ Queue shutdown'da close() chaqirilmaydi** | weekly-scrape.queue, import.queue, sourcing.queue, discovery.queue |
| P1-API-04 | **Sourcing 90s HTTP blocking** — `waitUntilFinished(90_000)` | sourcing.queue.ts:66 |
| P1-API-05 | **Admin controller — 727 qator, 40+ endpoint** — God Object | admin.controller.ts |
| P1-API-06 | **CSV import fayl hajmi limitsiz** | export.controller.ts:66-89 |
| P1-API-07 | **Leaderboard public endpoint — product data ochiq** | leaderboard.controller.ts — no auth guard |
| P1-API-08 | **Shared watchlist — rate limit yo'q** | watchlist.controller.ts:50-53 |
| P1-API-09 | **File logger WriteStream close() yo'q** | request-logger.service.ts — OnModuleDestroy yo'q |
| P1-API-10 | **Performance log — butun fayl memory'ga yuklanadi** | file-logger.ts:210-302 |
| P1-API-11 | **Sentry `Function()` constructor = eval()** | sentry.ts:10 |
| P1-API-12 | **`parseInt(categoryId)` NaN check yo'q** | discovery.controller.ts:91,106 |
| P1-API-13 | **Discovery controller Prisma'ni to'g'ridan ishlatadi** | discovery.controller.ts:126,149 |
| P1-API-14 | **`NicheService` `BigInt(NaN)` crash** | niche.service.ts:17,98 |
| P1-API-15 | **ConcurrencyTracker static setInterval tozalanmaydi** | concurrency-tracker.interceptor.ts |
| P1-API-16 | **Throttler guard xatoda silent `true` qaytaradi** | custom-throttler.guard.ts |
| P1-API-17 | **Global logger katta body'ni stringify qiladi** | global-logger.interceptor.ts:52 |
| P1-API-18 | **API key guard `req.user.id` set etmaydi** | api-key.guard.ts |
| P1-API-19 | **Team invite token API response'da ochiq** | team.service.ts:48 |
| P1-API-20 | **CSV export butun faylni memory'da qurishadi** | export.service.ts |
| P1-API-21 | **`getSeasonalCalendar` unbounded query** | discovery.controller.ts:125-179 |
| P1-API-22 | **Market report ALL active products yuklaydi** | reports.service.ts:187-211 |
| P1-API-23 | **Market share ALL products+snapshots** | reports.service.ts:214-271 |
| P1-API-24 | **Shop profile ALL products yuklaydi** | shops.service.ts:9-26 |
| P1-API-25 | **Shop growth ALL snapshots yuklaydi** | shops.service.ts:114-155 |
| P1-API-26 | **`listInsights` — 100 fetch, memory sort** | community.service.ts:42-64 |
| P1-API-27 | **`capacityEstimator` — dbPoolSize 50 default, real 30** | capacity-estimator.ts:27 |
| P1-API-28 | **Admin `getAdminTickets` — limit unbounded** | feedback.controller.ts:107-109 |

## Frontend (14 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P1-WEB-01 | **AdminPage — 30+ useState** — God Component | AdminPage.tsx:24-88 |
| P1-WEB-02 | **`Record<string, unknown>` — de facto `any`** | AdminPage.tsx:40-88 |
| P1-WEB-03 | **404 route yo'q** — noma'lum URL blank page | App.tsx |
| P1-WEB-04 | **PublicLeaderboardPage — routed emas, dead code** | PublicLeaderboardPage.tsx |
| P1-WEB-05 | **Notification count faqat mount'da yuklanadi** | Layout.tsx:130-135 |
| P1-WEB-06 | **ErrorBoundary — i18n yo'q, hardcoded Uzbek** | ErrorBoundary.tsx:44-78 |
| P1-WEB-07 | **Versiya "v5.1" — eskirgan (hozir v5.5+)** | LoginPage.tsx:77, RegisterPage.tsx:78 |
| P1-WEB-08 | **`branding.ts` — dead code, hech qayerda import emas** | config/branding.ts |
| P1-WEB-09 | **Payment "To'ldirish" tugmasi — `onClick` yo'q** | DashboardPage.tsx:143 |
| P1-WEB-10 | **`useDashboardData` xatoni silent yutadi** | useDashboardData.ts:17 |
| P1-WEB-11 | **`isSuperAdmin` useEffect deps'da yo'q** | Layout.tsx:118 |
| P1-WEB-12 | **Parol confirmation/strength indicator yo'q** | RegisterPage.tsx:148-157 |
| P1-WEB-13 | **Bo'sh Dashboard — onboarding yo'q** | DashboardPage.tsx:80-90 |
| P1-WEB-14 | **Date format inconsistent — 4 xil approach** | ProductPage, CompetitorSection, FeedbackPage, DashboardPage |

## Worker + Bot (10 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P1-WK-01 | **Discovery/Import queue — `removeOnComplete` yo'q** | discovery.job.ts, import.job.ts |
| P1-WK-02 | **Billing retry idempotency yo'q** — double charge | billing.processor.ts |
| P1-WK-03 | **Playwright — `lockDuration` 30s default** — stall risk | Barcha processor'lar |
| P1-WK-04 | **Bot alert system — hech qachon chaqirilmaydi** | bot/alerts.ts — dead code |
| P1-WK-05 | **Worker shutdown — `prisma.$disconnect()` yo'q** | worker/main.ts:83-107 |
| P1-WK-06 | **Bot shutdown — Prisma disconnect yo'q (crash handler)** | bot/main.ts:6-12 |
| P1-WK-07 | **Redis TLS yo'q** — `rediss://` handle emas | worker/redis.ts |
| P1-WK-08 | **Competitor processor — unbounded findMany + N+1** | competitor.processor.ts:13 |
| P1-WK-09 | **Logger — stream error handler yo'q** | worker/logger.ts:32-41 |
| P1-WK-10 | **Worker health Redis — alohida connection** | worker/main.ts:54 |

---

# P2 — O'RTA MUAMMOLAR (56 ta)

## Backend API (27 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P2-API-01 | Seed — hardcoded admin credentials | seed.service.ts |
| P2-API-02 | Memory pressure whitelist `startsWith` — prefix match xavfi | memory-pressure.middleware.ts |
| P2-API-03 | RotatingFileWriter — null stream'ga silent write | file-logger.ts:103 |
| P2-API-04 | Report filters/columns — arbitrary JSON, validation yo'q | reports.service.ts:17-19 |
| P2-API-05 | `classifyUA` — "bearer" so'zi UA'da noto'g'ri classifikatsiya | file-logger.ts:76 |
| P2-API-06 | Ads campaign — arbitrary status values | ads.service.ts:100 |
| P2-API-07 | Consultation — arbitrary date strings | consultation.service.ts:130 |
| P2-API-08 | `parsePeriodHours`/`parsePeriodMs` — 2 joyda duplicate | admin-monitoring + metrics.service |
| P2-API-09 | `getNicheGaps` — `avgSellerProducts` dead code | niche.service.ts:127-129 |
| P2-API-10 | Leaderboard — in-memory cache, eviction yo'q | leaderboard.service.ts |
| P2-API-11 | Discovery controller — Prisma direct inject | discovery.controller.ts:33 |
| P2-API-12 | `findNiches` — 6-char prefix match, false positive | uzum.client.ts:149 |
| P2-API-13 | `proxyDispatcher` — 5 joyda `as any` | uzum.client.ts:101,115,170,199,233 |
| P2-API-14 | `getShopProducts` — pagination yo'q | shops.service.ts:87-98 |
| P2-API-15 | AdminMonitoring — `Promise<unknown[]>` return type | admin-monitoring.service.ts |
| P2-API-16 | SearchPricesDto — `source` field unused | search-prices.dto.ts |
| P2-API-17 | Export controller — `@Res()` passthrough yo'q | export.controller.ts:29-63 |
| P2-API-18 | CommonModule — SeedService export emas | common.module.ts:8 |
| P2-API-19 | Capacity estimator — dbPoolSize=50, real=30 | capacity-estimator.ts:27 |
| P2-API-20 | `fetchWithTimeout` — AbortController cleanup yo'q | uzum.client.ts:27-39 |
| P2-API-21 | AliExpress timestamp format noto'g'ri bo'lishi mumkin | aliexpress.client.ts:57 |
| P2-API-22 | Competitor history — 2 ta duplicate endpoint | competitor.controller.ts |
| P2-API-23 | `listInsights` — 100 fetch keyin memory sort | community.service.ts:42-64 |
| P2-API-24 | Notification — per-user read tracking yo'q (arxitektura) | notification.service.ts |
| P2-API-25 | SearchPricesDto — `source` required but unused | sourcing controller vs dto |
| P2-API-26 | `getAdminTickets` — limit bounds check yo'q | feedback.controller.ts:107-109 |
| P2-API-27 | HealthController — module registration noaniq | health.controller.ts |

## Frontend (15 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P2-WEB-01 | Recharts — eager import (~200KB) | ProductPage.tsx:10-19 |
| P2-WEB-02 | Consultation tab switch — stale data | ConsultationPage.tsx:21-24 |
| P2-WEB-03 | Object URL memory leak (minor) | useDashboardData.ts:32-36 |
| P2-WEB-04 | Booking modal — Escape key ishlamaydi, focus trap yo'q | ConsultationPage.tsx:255-290 |
| P2-WEB-05 | Accessibility — aria-label/roles yo'q ko'p joyda | Layout, DiscoveryPage, SourcingPage |
| P2-WEB-06 | API key delete — confirmation yo'q | ApiKeysPage.tsx:49-53 |
| P2-WEB-07 | `useScoreRefresh` — stale closure risk | useSocket.ts:49-57 |
| P2-WEB-08 | Date format — 4 xil approach, centralized utility yo'q | Ko'p joyda |
| P2-WEB-09 | Payment overlay — dead end | DashboardPage.tsx:143, Layout.tsx:270-284 |
| P2-WEB-10 | SourcingPage tab ternary — redundant branch | SourcingPage.tsx:25 |
| P2-WEB-11 | `DEFAULT_USD_RATE = 12_900` — hardcoded, eskirishi mumkin | ProductPage.tsx:66 |
| P2-WEB-12 | Duplicate CompetitorSection files | components/ vs components/competitor/ |
| P2-WEB-13 | `(window as any).Telegram` | TelegramMiniAppPage.tsx:26 |
| P2-WEB-14 | `as any` in AnalyzePage | AnalyzePage.tsx:19 |
| P2-WEB-15 | SharedWatchlistPage/TelegramMiniApp — hardcoded strings, i18n yo'q | Multiple files |

## Worker + Bot (14 ta)

| # | Muammo | Fayl |
|---|--------|------|
| P2-WK-01 | Bot — `https://your-domain.uz` placeholder | bot/main.ts:137 |
| P2-WK-02 | Bot — `/top` numeric category_id, name emas | bot/main.ts:123 |
| P2-WK-03 | Bot — rate limiting yo'q | bot/main.ts |
| P2-WK-04 | Bot — `escapeHtml` 2 joyda duplicate | main.ts + alerts.ts |
| P2-WK-05 | Sourcing — hardcoded customs/VAT (10%/12%) | sourcing.processor.ts:514-515 |
| P2-WK-06 | Weekly scraper — BrowserContext per product (expensive) | weekly-scraper.ts:67-72 |
| P2-WK-07 | Import processor — error `info` level, `error` emas | import.processor.ts:167-170 |
| P2-WK-08 | Discovery processor — unreachable error throw | discovery.processor.ts:96 |
| P2-WK-09 | AI scraper — undefined API key guard fragile | uzum-ai-scraper.ts:24-29 |
| P2-WK-10 | Bot health — always "ok" even if polling stopped | bot/main.ts:171-178 |
| P2-WK-11 | Discovery queue — `enqueueDiscovery` dead code | discovery.job.ts:10-15 |
| P2-WK-12 | Sourcing — hardcoded 6-8s waits | sourcing.processor.ts:173,194,251 |
| P2-WK-13 | `packages/types` — `UzumProductDetail` eskirgan | packages/types/src/index.ts:10-17 |
| P2-WK-14 | Weekly scrape — BigInt indexOf fragile | weekly-scrape.processor.ts:234 |

---

# ARXITEKTURA MUAMMOLARI

## 1. Race Condition Epidemiyasi

Loyihada **6 ta TOCTOU (Time-of-check to Time-of-use) bug** bor:
- Billing, API Key, Referral, Consultation, Community Vote, Discovery Run

**Ildiz sabab:** Prisma interactive `$transaction` kam ishlatilgan. Ko'p joyda "o'qi → tekshir → yoz" pattern transaksiyasiz.

**Yechim:** Barcha TOCTOU joylarida `$transaction` + `Serializable` isolation yoki atomic DB operatsiyalar.

## 2. Redis Connection Explosion

| Komponent | Connection'lar |
|-----------|---------------|
| API auth.service | 1 |
| API throttler.guard | 1 |
| API admin-stats | 1 |
| API metrics.service | 1 |
| API sourcing QueueEvents | 1 |
| API BullMQ Queue x4 | 4 |
| Worker BullMQ x6 | 6 |
| Worker health check | 1 |
| Bot (agar ishlatsa) | 1 |
| **JAMI** | **~17** |

Railway bepul Redis = max 20 connection. Production da limit'ga yaqin.

**Yechim:** `RedisModule` yaratib shared `IORedis` instance export qilish. BullMQ `sharedConnection: true`.

## 3. Playwright Memory Bomb

Worker'da 3 ta scraper har biri alohida Chromium browser ishga tushiradi:
- Discovery: `uzum-scraper.ts` — `chromium.launch()`
- Sourcing: `sourcing.processor.ts` — `chromium.launch()`
- Weekly Scrape: `weekly-scraper.ts` — shared browser, lekin `getBrowser()` yangi yaratishi mumkin

**Xavf:** 2 ta concurrent Chromium = 600-1200MB. Railway Worker 2GB limit. OOM → worker crash → zombie browser.

**Yechim:**
- Shared browser pool (singleton Chromium)
- Queue priority: scraping job'lar sequential
- `lockDuration: 600_000` (10 min) Playwright queue'larga

## 4. God Objects

| Fayl | Qator | Muammo |
|------|-------|--------|
| `admin.controller.ts` | 727 | 40+ endpoint bitta controller'da |
| `AdminPage.tsx` | 900+ | 30+ useState, barcha tab'lar bitta component |
| `ProductPage.tsx` | 500+ | 8 API call, 4 useEffect, complex state |
| `reports.service.ts` | 300+ | 5 xil report type bitta service'da |

**Yechim:** Admin → AdminAccountsController, AdminMonitoringController, etc. AdminPage → tab component'lar + context/store.

## 5. Validation Gap

Dastlabki modullar (auth, billing, uzum) yaxshi validated. Keyingi modullar validation'siz:

| Module | DTO bor? | Endpoint'lar |
|--------|----------|-------------|
| Auth | Ha | login, register |
| Billing | Ha | charge, deposit |
| Uzum | Ha | analyze |
| Ads | **Yo'q** | create, update campaign |
| Consultation | **Yo'q** | create, book |
| Tools | **Yo'q** | elasticity, description |
| Reports | **Yo'q** | create report |
| Watchlist | **Yo'q** | create, share |
| Community | **Yo'q** | create insight, vote |
| Signals | **Yo'q** | save checklist |
| Notification | **Yo'q** | send notification |

---

# USER ONBOARDING KAMCHILIKLARI

## Hozirgi Flow: Register → Login → ???

```
1. Ro'yxatdan o'tish
   ❌ Parol confirmation yo'q
   ❌ Parol strength indicator yo'q
   ❌ Email verification yo'q
   ⚠️ Referral code maydoni — yo'q bo'lsa confusing

2. Login
   ✅ Ishlaydi
   ❌ "VENTRA v5.1" — eskirgan versiya

3. Dashboard (birinchi marta)
   ❌ BO'SH SAHIFA — "0 mahsulot"
   ❌ Welcome modal yo'q
   ❌ Tutorial/checklist yo'q
   ❌ "Nima qilish kerak?" ko'rsatma yo'q
   ⚠️ 3 ta tugma bor lekin tushuntirma yo'q

4. Sidebar
   ❌ 20+ menu item — overwhelming
   ❌ Tooltip/description yo'q
   ❌ "Yangi" yoki "Boshlash" badge yo'q

5. Payment Due holat
   ❌ Barcha sahifalar bloklanadi
   ❌ "To'ldirish" tugmasi ISHLAMAYDI (onClick yo'q)
   ❌ To'lov qilish yo'li ko'rsatilmaydi
   ❌ DEAD END — user chiqib ketadi

6. Yordam
   ❌ Help center link yo'q
   ❌ Documentation link yo'q
   ❌ In-app tooltip yo'q
   ❌ Telegram support link yo'q (bot URL placeholder)
```

## Taklif: Onboarding Checklist

```
Yangi user uchun:
  □ Birinchi mahsulot tahlil qilish (URL Tahlil)
  □ Birinchi mahsulotni track qilish
  □ Dashboard'ni ko'rish
  □ Telegram bot'ga ulash
  □ Kashfiyot ishlatib ko'rish
```

---

# TOP 10 — TUZATISH PRIORITETI

| # | Bug | Risk | Effort | Sprint |
|---|-----|------|--------|--------|
| 1 | IDOR — product endpoints | Data leak | 30 min | Keyingi |
| 2 | WebSocket auth yo'q | Data leak | 1h | Keyingi |
| 3 | Billing race condition | Pul yo'qolishi | 1h | Keyingi |
| 4 | `unhandledRejection` → exit | Worker crash | 15 min | Keyingi |
| 5 | Playwright OOM | Worker OOM | 2h | Keyingi |
| 6 | 15 endpoint validation yo'q | Injection | 3h | Keyingi |
| 7 | Payment "To'ldirish" dead end | User churn | 1h | Keyingi |
| 8 | Bo'sh dashboard — onboarding | User confusion | 2h | Keyingi |
| 9 | Token desync (auth store) | Stale permissions | 1h | Keyingi |
| 10 | Redis connection explosion | Connection limit | 2h | Keyingi |

**Jami effort:** ~14h (1.5-2 kun, 1 backend + 1 frontend)

---

*CODE-AUDIT-2026-03-04.md | VENTRA Analytics Platform | Avtomatik tahlil*
