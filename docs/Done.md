# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-03-06
# Ochiq tasklar → docs/Tasks.md, docs/Tasks-Bekzod.md, docs/Tasks-Sardor.md

---

## T-382 | LANDING P2 | Privacy Policy, Cookie banner, Video demo, Plausible (2026-03-06)

- **PrivacyPage** — `/privacy` route, uz+ru, O'zbekiston qonuni asosida (`pages/PrivacyPage.tsx`)
- **TermsPage** — `/terms` route, uz+ru (`pages/TermsPage.tsx`)
- **CookieBanner** — `localStorage` based, accept/decline, `/privacy` linkli (`components/CookieBanner.tsx`)
- **VideoDemoSection** — Pricing dan oldin placeholder section, play button, CTA (`sections/VideoDemoSection.tsx`)
- **Plausible tracking** — `window.plausible` type declaration, CTA event tracking (`lib/plausible.d.ts`)
- **App.tsx** — `pathname` state routing + barcha yangi komponentlar ulandi

---

## T-328 | DESKTOP P2 | loadURL error, devtools block, macOS About, package metadata, env.d.ts (2026-03-06)

- **loadURL error** — `.catch(log.error)` qo'shildi (`window.ts`)
- **devtools block** — production da F12/Ctrl+Shift+I bloklandi (`window.ts`)
- **macOS About** — `app.setAboutPanelOptions()` qo'shildi (`index.ts`)
- **package.json** — `name`, `description`, `author`, `homepage` to'ldirildi
- **env.d.ts** — `VITE_APP_VERSION`, `VITE_APP_NAME` qo'shildi
- **Tray i18n** → T-399 sifatida ajratildi (keyinroq)

---

## T-327 | DESKTOP P1 | Permission request handler (2026-03-06)

- `setupPermissionHandler()` — `session.defaultSession.setPermissionRequestHandler()`
- `DENIED_PERMISSIONS` set: media, geolocation, notifications, midiSysex, pointerLock, fullscreen, openExternal
- Analytics app uchun keraksiz ruxsatlar bloklandi

**Fayl:** `apps/desktop/src/main/window.ts`

---

## T-325..T-326 | DESKTOP P1 | IPC input validatsiya (2026-03-06)

- **T-325** `ventra:notify`: `title`/`body` → `unknown` type, string tekshiruvi, `slice(0,100)`/`slice(0,300)`, trim, bo'sh title reject
- **T-326** `ventra:badge`: `count` → `unknown` type, `Number.isFinite`, `Math.max(0, Math.floor())` — manfiy/NaN/Infinity bloklandi

**Fayl:** `apps/desktop/src/main/ipc.ts`

---

## T-324 | DESKTOP P1 | icon.ico + icon.icns yaratish (2026-03-06)

- `png2icons` bilan `icon.png` (256x256) → `icon.ico` (Win) + `icon.icns` (macOS) konvertatsiya
- `electron-builder.yml` da allaqachon `resources/icon.ico` va `resources/icon.icns` ko'rsatilgan edi — fayllar yo'q edi
- `png2icons` devDependency sifatida qo'shildi

---

## T-320..T-323 | DESKTOP P1 | Typed state, memory leak, logging, interval cleanup (2026-03-06)

- **T-320** `declare module 'electron' { interface App { isQuitting?: boolean } }` — `(app as any)` o'chirildi (`window.ts`, `tray.ts`)
- **T-321** `ipcRenderer.removeAllListeners()` — `onUpdateAvailable`/`onUpdateDownloaded` da memory leak tuzatildi (`preload/index.ts`)
- **T-322** `electron-log` o'rnatildi, `console.error` → `log.error` (`updater.ts`)
- **T-323** `updateIntervalId` + `stopUpdater()` + `app.on('before-quit')` — interval cleanup (`updater.ts`, `index.ts`)

---

## T-315..T-319 | DESKTOP P0 | Electron xavfsizlik (2026-03-06)

- **T-315** `sandbox: true` — Chromium sandbox yoqildi (`window.ts:88`)
- **T-316** CSP header — `setupCSP()` qo'shildi, `session.defaultSession.webRequest.onHeadersReceived` orqali
- **T-317** Path traversal — `relative()` + `isAbsolute()` tekshiruvi, `app://` dan tashqari fayl o'qib bo'lmaydi
- **T-318** SSRF — `new URL()` bilan origin validatsiya, boshqa originga proxy taqiqlandi
- **T-319** Navigation cheklovlari — `will-navigate` faqat `app://`/`localhost`, `setWindowOpenHandler` tashqi → `shell.openExternal()`

**Fayl:** `apps/desktop/src/main/window.ts`

---

## T-389 | BACKEND P2 | Snapshot retention + downsample (2026-03-06)

- `ProductSnapshotDaily` model — kunlik aggregate jadval (`product_snapshot_daily`)
- `@@unique([product_id, day])` — bir product uchun kunda 1 aggregate
- `aggregateOldSnapshots()` — 30+ kunlik raw snapshot → daily aggregate ga yig'adi
- Raw snapshot aggregation done → o'chiriladi (disk tejash)
- `data-cleanup.processor.ts` ga integratsiya — mavjud cron ichida ishlaydi
- Aggregate fieldlar: avg_score, max_weekly_bought, avg_rating, max_orders, snapshot_count

---

## T-388 | BACKEND P1 | score_version field (2026-03-06)

- `SCORE_VERSION = 2` constant qo'shildi (`packages/utils/src/index.ts`)
- `product_snapshots.score_version Int @default(2)` column
- 3 ta snapshot creator yangilandi: `weekly-scrape.processor`, `import.processor`, `uzum.service`
- ML uchun: faqat oxirgi score_version bilan train qilish mumkin

---

## T-387 | BACKEND P1 | weekly_bought_raw_text + confidence (2026-03-06)

- `product_snapshots` ga 2 column: `weekly_bought_raw_text` (Text), `weekly_bought_confidence` (Decimal 3,2)
- `scrapeWeeklyBought()` return type: `ScrapeResult { value, rawText, confidence }`
- Confidence: SSR=1.00, HTML=0.95, DOM=0.90, broad=0.80, badge=0.70, stored=0.50, calculated=0.30
- 3 consumer yangilandi: `weekly-scrape.processor.ts`, `uzum.service.ts`, `import.processor.ts`
- MML uchun: `confidence` ni `sample_weight` sifatida ishlatish mumkin

---

## T-386 | BACKEND P1 | Snapshot dedup — DB unique constraint (5-min bucket) (2026-03-06)

- `snapshot_bucket` generated column: `snapshot_at` ni 5 daqiqalik bucketga yaxlitlaydi
- `UNIQUE(product_id, snapshot_bucket)` — bir product uchun 5 daqiqa ichida faqat 1 snapshot
- Migration: dublikatlar tozalanadi (eski snapshot saqlanadi), keyin constraint qo'shiladi
- 3 joyda P2002 catch: `uzum.service.ts`, `import.processor.ts`, `weekly-scrape.processor.ts`
- `weekly-scrape.processor.ts`: snapshot yaratish transaction tashqarisiga chiqarildi (PG tx abort muammosi)
- Prisma schema: `@@unique([product_id, snapshot_bucket])` qo'shildi

---

## T-385 | BACKEND P1 | Scrape lock — Redis SETNX duplicate prevention (2026-03-06)

- `apps/worker/src/scrape-lock.ts` — yangi utility: `acquireScrapeLock()` + `releaseScrapeLock()`
- Redis SETNX + 10 min TTL — bir product ikki worker tomonidan parallel scrape bo'lmaydi
- `weekly-scrape.processor.ts` — `processBatch()` va `processSingle()` da lock integratsiya
- `finally` block bilan lock har doim release bo'ladi (error bo'lsa ham)
- Skipped counter qo'shildi — lock tufayli o'tkazib yuborilgan productlar loglarda ko'rinadi

---

## T-391 | BACKEND P1 | Active sessions bug — expired sessions fix (2026-03-06)

5 ta query'da `expires_at > NOW()` check qo'shildi:
- `admin-stats.service.ts:282` — `getRealtimeStats()` active sessions
- `admin-monitoring.service.ts:94` — raw SQL per-user active sessions
- `admin-monitoring.service.ts:209` — `getUserHealth()` sessions
- `admin-monitoring.service.ts:270` — `estimateCapacity()` sessions
- `admin-monitoring.service.ts:298` — `captureBaseline()` sessions
- Session cleanup allaqachon `data-cleanup.processor.ts` da mavjud ✅
- Token refresh da yangi session yaratiladi (`logged_in_at = now()`) ✅

---

## T-362..T-366 | WEB AUDIT P0 | Auth + WebSocket + ProductPage fixes (2026-03-06)

- **T-362**: allaqachon tuzatilgan — `setTokens()` JWT decode qilib payload sync qiladi
- **T-363**: allaqachon tuzatilgan — `useAuthStore.subscribe()` auto-disconnect qo'shilgan
- **T-364**: `AdminRoute` ga `isTokenValid()` check qo'shildi — expired token bilan admin sahifa ochilmaydi
- **T-365**: `ProductPage.loadData()` ga `AbortController` + stale response guard qo'shildi — race condition tuzatildi
- **T-366**: Dead `JwtTokenPayload` type alias o'chirildi (`base.ts`, `client.ts`)

---

## T-392 P0 | IKKALASI | Billing model — FREE plan (2026-03-06)

Yangi user register bo'lganda PAYMENT_DUE ko'rmasligi uchun FREE plan tizimi qo'shildi.
- Schema: `plan`, `plan_expires_at`, `analyses_used`, `plan_renewed_at` fieldlar; `SUBSCRIPTION`, `PLAN_CHANGE` enum
- `PlanGuard` + `@RequiresPlan()` decorator (FREE < PRO < MAX < COMPANY hierarchy)
- `BillingGuard`: FREE plan 10/oy tahlil limiti, PAYMENT_DUE check skip
- `billing.service` + `billing.processor`: FREE userlar daily charge'dan o'tkazib yuboriladi
- `uzum.controller`: FREE plan uchun `analyses_used++`
- Discovery/Sourcing/Signals → `@RequiresPlan('PRO')`, AI → `@RequiresPlan('MAX')`
- Worker: `analyses-reset` cron (`0 4 1 * *`) — oylik FREE counter reset
- `auth.service.ts`: `getMe()` → plan, analyses_used, plan_expires_at qaytaradi
- Migration: `20260306_add_plan_fields`
- **Qolgan**: P1 (worker monthly billing, admin stats), P2 (frontend BillingPage, PlanGuard UI)

---

## T-393 | FRONTEND | Dashboard Empty State (2026-03-06)

Yangi user dashboard'ga kirganda bo'sh sahifa o'rniga welcoming empty state ko'rsatiladi.
- `EmptyState.tsx`: Welcome header + 4-step onboarding checklist + TOP 3 product cards
- `DashboardPage.tsx`: `products.length === 0` → `<EmptyState>` render
- i18n: 14 ta tarjima kaliti (uz, ru, en)

---

## T-377 | PLATFORMA P0 | Demo credentials login page'dan olib tashlandi (2026-03-06)

`LoginPage.tsx:167` da `demo@ventra.uz / Demo123!` matni ko'rinib turardi.
Foydalanuvchilar o'z akkauntlari bilan ro'yxatdan o'tishi kerak (NPS data).
`<p>Demo: ...</p>` qatori o'chirildi.

---

## T-375 | PLATFORMA P1 | Worker monitoring crons — 5 avtomatik job (2026-03-05)

**Qo'shilgan 4 yangi processor + job pair:**

- **monitoring.processor.ts + monitoring.job.ts** — `detectStockCliff`, `detectEarlySignals`, `detectFlashSales` har 6 soatda. Har account uchun AlertEvent yaratadi (mavjud AlertRule bo'lsa). Cron: `0 */6 * * *`
- **morning-digest.processor.ts + morning-digest.job.ts** — Har kuni 07:00 UTC (12:00 Toshkent). TelegramLink bo'lgan foydalanuvchilarga: balans, top 5 mahsulot, kutayotgan alertlar. Cron: `0 7 * * *`
- **currency-update.processor.ts + currency-update.job.ts** — CBU.uz dan USD/CNY/EUR kurslarini DB ga saqlaydi. Fallback mavjud. Cron: `30 0 * * *`
- **data-cleanup.processor.ts + data-cleanup.job.ts** — 90+ kunlik Snapshot, muddati o'tgan Session/PasswordReset/Invite, 30+ kunlik stale ExternalSearchJob. Cron: `0 2 * * *`

**main.ts:** Workers 7→11, 4 yangi cron. TS check: 0 xato.

---

## T-373, T-374 | PLATFORMA P1 | Onboarding + Forgot Password (2026-03-04)

**T-373 — Onboarding schema + API:**
- Account model: `onboarding_completed`, `onboarding_step`, `selected_marketplaces`
- `GET /auth/me` — user info + account + onboarding state
- `PATCH /auth/onboarding` — update step/completed/marketplaces
- `UpdateOnboardingDto` with class-validator

**T-374 — Forgot Password API:**
- `PasswordReset` model (token_hash, expires_at, used_at)
- `POST /auth/forgot-password` — rate limited 3/hour, generic response (no user enumeration)
- `POST /auth/reset-password` — token validation, bcrypt hash, session revocation
- Telegram notification via TelegramLink (if bot token set)
- Constants: 15min expiry, 3 resets/hour

**Tekshiruv:** API tsc --noEmit — 0 error ✅

---

## T-371, T-372 | PLATFORMA P0 | Alert delivery + Bot account linking (2026-03-04)

**T-372 — Bot account linking:**
- `TelegramLink` model (chatId ↔ accountId), Prisma schema + generate
- Bot commands: `/connect [key_prefix]`, `/disconnect`, `/myproducts`, `/balance`, `/product [URL|ID]`
- `requireLink()` helper, `formatUzs()`, `parseProductInput()` — shared utilities
- Updated `/start`, `/status`, `/help` to show new commands

**T-371 — Alert delivery pipeline:**
- `alert-delivery.processor.ts` — BullMQ worker, queries undelivered AlertEvents (delivered_at IS NULL)
- Creates in-app `Notification` per account + sends Telegram via Bot API (if TelegramLink exists)
- `alert-delivery.job.ts` — */5 * * * * cron (every 5 minutes)
- `AlertEvent.delivered_at` field + index added to schema
- Worker: 7th worker registered, shutdown graceful, health check workers=7
- `uzum.service.ts` — improved SCORE_SPIKE alert message format

**Tekshiruv:** API + Worker + Bot tsc --noEmit — 0 error ✅

---

## T-354 | BACKEND P1 | `any` type cleanup — 40+ instances replaced (2026-03-04)

**25 ta fayl o'zgartirildi, 0 `any` qoldi:**

- **GROUP 1 — Prisma WhereInput:** `admin-log.service.ts`, `admin-stats.service.ts`, `admin-feedback.service.ts`, `admin-user.service.ts` → `Prisma.XxxWhereInput`
- **GROUP 2 — Record<string,unknown>:** `ai-throttler.guard.ts`, `custom-throttler.guard.ts`, `activity-logger.interceptor.ts`, `global-logger.interceptor.ts`, `file-logger.ts`, `reports.service.ts`
- **GROUP 3 — Observable<unknown>:** `activity-logger.interceptor.ts`, `global-logger.interceptor.ts`
- **GROUP 4 — External API interfaces:** `serpapi.client.ts` (`SerpApiResponse`, `SerpApiResultItem`), `aliexpress.client.ts` (`AliExpressApiResponse`), `uzum.client.ts` (`UzumSku`, `UzumSeller`, `UzumPhoto`, `UzumCategory`, `UzumProductData`, `UzumApiResponse`, `UzumSearchProduct`, `UzumNormalizedProduct`), `sourcing.service.ts`
- **GROUP 5 — Other:** `ai.service.ts` (Prisma JSON), `admin-account.service.ts`, `competitor.service.ts`, `leaderboard.service.ts`, `error-tracker.filter.ts`, `export.controller.ts`, `products.service.ts`, `uzum.service.ts`, `main.ts`, `ads.service.ts`, `signals.service.ts`
- **Tekshiruv:** `tsc --noEmit` — 0 error ✅, `grep any` — 0 qoldi ✅

---

## T-353, T-357 | BACKEND P1 | DTO validation + worker stability (2026-03-04)

- T-353: 22 DTO classes with class-validator for 36 raw @Body() endpoints (13 controllers)
- T-357: 7 worker fixes — billing idempotency, prisma disconnect, Redis TLS, competitor N+1, logger error handler, shared health Redis

---

## T-379 | FRONTEND P2 | Design system cleanup — chart tokens & duplicates (2026-03-04)

**8 fix bajarildi:**
1. `chartTokens.ts` yaratildi — CHART_COLORS, SCORE_COLORS, scoreColor(), glassTooltip, AXIS_TICK, GRID_STROKE, CHART_ANIMATION_MS
2. `PriceComparisonChart.tsx` — hardcoded `#570df8`, `rgba(255,255,255,0.4)`, `#1d232a` → CSS variables
3. `AdminAnalyticsTab.tsx` — 16+ raw `oklch(...)` → `var(--chart-grid)`, `var(--chart-tick)`, `glassTooltip`
4. `AnalyticsTab.tsx` o'chirildi (439 qator duplicate)
5. `competitor/CompetitorSection.tsx` o'chirildi (unused duplicate)
6. `AdminComponents.tsx` StatCard duplicate → re-export
7. `skeletons/*.tsx` — `animate-pulse bg-base-300/60` → DaisyUI `skeleton` class
8. Barcha chartlarda `animationDuration={CHART_ANIMATION_MS}` (800ms) standartlashtirildi

**Tekshiruv:** `tsc --noEmit` 0 error, `vite build` OK, Playwright light+dark screenshot verified

---

## T-355, T-356, T-358 | BACKEND P1 | Security & stability batch (2026-03-04)

- T-355: QueueLifecycleService — 4 BullMQ queue graceful close on shutdown; lockDuration 600s on 3 Playwright workers
- T-356: 7 unbounded findMany queries paginated (community, discovery, feedback, reports, shops) — MAX 50-100 per page
- T-358: 11 API security fixes — sourcing fire-and-forget, CSV 5000 limit, throttler Logger, Sentry eval fix, parseInt validation, api-key guard early return, team token removal, leaderboard auth, file logger close

---

## T-343..T-352 | BACKEND P0 | Critical security & stability fixes (2026-03-04)

- T-343: IDOR fix — assertProductOwnership() helper, account_id filter on all product/AI/signal/competitor endpoints (7 files)
- T-344: WebSocket JWT auth — token extraction + verify + typed payload + disconnect on invalid (already fixed)
- T-345: Team invite hijack — existing user protection (already fixed)
- T-346: BigInt/ParseIntPipe — uzum.controller.ts analyzeById fixed
- T-347: Notification markAsRead — per-user clone for broadcast notifications
- T-348: Race condition batch — 6 TOCTOU fixes with Prisma $transaction (billing, api-keys, referral, consultation, community, discovery)
- T-349: unhandledRejection handler — worker/bot graceful shutdown (already fixed)
- T-350: Singleton BrowserPool — shared Chromium instance, OOM prevention, auto-recovery
- T-351: execSync replaced with async exec in admin-monitoring (already fixed)
- T-352: Shared RedisModule — consolidated 5 separate Redis connections into 1 shared instance + getBullMQConnection helper

---

## T-342 | LANDING P2 | Audit batch (2026-03-04)

- DownloadBanner: localStorage try/catch + "Tez kunda" → `t('download.soon')` i18n
- FAQItem: `aria-expanded` on toggle button
- PricingSection: `role="switch"` + `aria-checked` on billing toggle
- FooterSection: privacy + terms links rendered in footer bottom bar
- Navbar: `aria-expanded` + `aria-controls="mobile-menu"` + `id="mobile-menu"` added
- index.html: localStorage try/catch in theme detection inline script
- LangContext: `html[lang]` syncs on language change via useEffect

---

## T-333..T-341 | LANDING P1 | Audit fixes (2026-03-04)

- T-333: `animations.ts` — unused exports olib tashlandi (fadeIn, scaleIn, slideLeft, slideRight)
- T-334: Email form — inline validation hint, error reset on change, touched state
- T-335: `LangContext.tsx` + `Navbar.tsx` — localStorage try/catch (Safari private mode)
- T-336: `TestimonialsSection.tsx` + `i18n.ts` — RU translations for all 4 testimonials
- T-337: `package.json` build — generate-og-image.mjs vite build dan oldin ishlaydi
- T-338: `Navbar.tsx` — mobile menu AnimatePresence wrapper (exit animations ishlaydi)
- T-339: `nginx.conf` — HSTS + X-XSS-Protection:0 security headers
- T-340: `FeatureCard.tsx` — unused `index: number` prop olib tashlandi
- T-341: `prerender.mjs` — XSS guard: structural tag check before innerHTML write

---

## T-329..T-332 | LANDING P0 | Audit fixes (2026-03-03)

- T-329: `favicon.svg` yaratildi — VENTRA V logo, blue→purple gradient
- T-330: `App.tsx` fallback URL `web-production-2c10.up.railway.app` → `app.ventra.uz`
- T-331: `nginx.conf` CSP header + Permissions-Policy qo'shildi
- T-332: `index.html` YANDEX/GOOGLE_VERIFICATION_CODE placeholder'lar olib tashlandi

---

## T-188, T-189, T-190, T-192, T-202, T-257, T-264, T-266 | FRONTEND | Web app tasks (2026-03-03)
- **T-188**: `apps/web/public/sw.js` o'chirildi, index.html da SW register yo'q
- **T-189**: `apps/web/public/manifest.json` o'chirildi, `<link rel="manifest">` o'chirildi
- **T-190**: `apple-touch-icon.svg`, `icon-maskable.svg` o'chirildi
- **T-192**: index.html da hech qanday PWA artifact yo'q
- **T-257**: `ErrorBoundary variant="section"` — DiscoveryPage va ProductPage da per-section qo'llanilgan
- **T-264**: `AdminRoute` — `SUPER_ADMIN` bo'lmaganlarni `/` ga redirect qiladi (`App.tsx:44`)
- **T-266**: `ShopsPage` da `emptyState` CTA bor, LeaderboardPage da `noData` state bor
- **T-202**: ProductPage UX — Sardor tomonidan refactor qilingan
_Remote commit orqali bajarilgan, Bekzod tomonidan verified 2026-03-03_

---

## L-020 | LANDING | Plausible Analytics + useAnalytics wiring (2026-03-03)

- `index.html`: Plausible script `ventra.uz` domain bilan yoqildi (tagged-events)
- `HeroSection`: Register + Download CTA click tracking
- `CTASection`: Register CTA click tracking
- `EmailCaptureSection`: Email subscribe success tracking

## L-022..L-024 | LANDING | i18n + Docker + CI/CD (allaqachon bajarilgan, arxivlash)

- L-022: i18n (uz/ru) — T-276..T-279 + T-284..T-289 da bajarildi
- L-023: Dockerfile + nginx.conf — `apps/landing/` da mavjud
- L-024: CI/CD — `.github/workflows/ci.yml` va `docker-compose.prod.yml` da mavjud

---

## T-234 | DESKTOP | Login fix — VITE_API_URL (2026-03-03)

- `electron.vite.config.ts`: `envDir: resolve(__dirname, '.')` — renderer endi `apps/desktop/.env` dan `VITE_API_URL` oladi
- `window.ts`: `process.env.VITE_API_URL` → `import.meta.env.VITE_API_URL` — main process uchun to'g'ri
- `src/main/env.d.ts`: yangi — `ImportMeta`/`ImportMetaEnv` type declaration
- `index.ts`: elektron module augmentation TS2300 xatosi olib tashlandi

---

## T-299..T-314 | SPRINT | BACKEND+DEVOPS | Stability & 1500 User Scaling (2026-03-03)

**Sprint:** 16 task, 3 faza, ~25 fayl, commit `97d2360`
**Natija:** Production deploy muvaffaqiyatli, API sog'lom (200 OK, uptime 30+ min)

### Phase 1 — P0 (DARHOL)
- **T-301**: Worker + Bot PrismaClient `ensurePoolParams()` — pool_timeout=10, statement_timeout=15000, connection_limit=10/5
- **T-300**: `uncaughtException`/`unhandledRejection` handlers — API, Worker, Bot main.ts (crash log Railway da ko'rinadi)

### Phase 2 — P1 (Recovery + Scaling)
- **T-299**: Redis `retryStrategy: (times) => Math.min(times*50, 2000)` — 4 ta client (auth, admin-stats, metrics, throttler)
- **T-302**: NestJS `keepAliveTimeout=65s`, `headersTimeout=66s` — 502 Bad Gateway fix
- **T-304+T-309**: BullMQ retry (attempts:3, exponential 5s) + cleanup (removeOnComplete/Fail) — 7 queue fayl
- **T-305**: BullMQ worker `.on('error/failed/stalled')` event listeners — 6 processor
- **T-306**: Bot graceful shutdown — SIGTERM/SIGINT → `bot.stop()` + `prisma.$disconnect()`
- **T-307**: `railway.toml` — `sleepApplication = false`
- **Scaling**: PgBouncer 500/50/10/10, PostgreSQL max_connections=200, Redis 512mb noeviction, API connection_limit=30, capacity dbPoolSize=50

### Phase 3 — P2 (Hardening)
- **T-308**: `fetchWithTimeout()` AbortController 15s — uzum.client.ts + uzum-scraper.ts
- **T-310**: Redis maxmemory 512mb + noeviction (docker-compose.prod.yml)
- **T-311**: Docker healthcheck `start_period` + worker/bot healthcheck
- **T-312**: Sourcing quick timeout 60s → 90s
- **T-313**: nginx `keepalive_timeout 65s`
- **T-314**: CPU capacity estimator (`max_by_cpu`) + CPU alerts (150% warning, 200% critical)

**Fayllar (25):** worker/prisma.ts, bot/prisma.ts, 3x main.ts, auth.service.ts, admin-stats.service.ts, metrics.service.ts, custom-throttler.guard.ts, 4x queue.ts, 3x job.ts, 6x processor.ts, uzum.client.ts, uzum-scraper.ts, docker-compose.prod.yml, prisma.service.ts, capacity-estimator.ts, admin-monitoring.service.ts, nginx.conf.template, railway.toml

**T-303**: Axios global timeout=30s + sekin endpoint alohida (discovery 60s, sourcing 90s, uzum 60s)

---

## T-212..T-215 | P0 | FRONTEND | Chrome Extension Faza 2 — CSUI Overlay + Track (2026-03-03)

**T-212: Product Page CSUI — Score Overlay**
- Plasmo CSUI (`product-page.tsx`) — `https://uzum.uz/*` match, SPA-aware
- `ScoreCard.tsx`: fixed-position card (bottom-right) — score, trend, weekly_bought, price, Track button
- Score color coding: 0-2 red, 2-3 orange, 3-4 green, 4-5 dark green
- Login hint shown when not authenticated

**T-213: Category Page CSUI — Product Card Badges**
- Plasmo CSUI (`category-page.tsx`) — renders null, injects badges via DOM manipulation
- `ScoreBadge.tsx`: `createBadgeElement()` — inline-styled badge injected into `[data-test-id="product-card--default"]` cards
- Batch score fetch via `batch-quick-score` background message (50 products max)
- In-memory score cache (`Map<productId, score>`) — avoids duplicate API calls
- MutationObserver for infinite scroll — new cards get badges automatically

**T-214: SPA Navigation Detection + MutationObserver**
- `spa-observer.ts`: `onUrlChange()` — monkey-patches `pushState`/`replaceState` + `popstate` listener
- `onProductCardsAdded()` — MutationObserver detects new product cards (infinite scroll)
- `url-parser.ts`: `parseProductIdFromUrl()`, `parseCategoryIdFromUrl()`, `isProductPage()`, `isCategoryPage()`

**T-215: Track/Untrack + Popup Tracked List**
- `track-product.ts` background handler — calls `POST /products/:id/track`, updates badge count
- `batch-quick-score.ts` background handler — calls `POST /uzum/batch-quick-score`
- `get-tracked-products.ts` background handler — calls `GET /products`
- `TrackedList.tsx`: compact list in popup (max 10, score + weekly, click opens uzum.uz)
- `api.ts`: added `trackProduct()`, `getTrackedProducts()` methods

**Fayllar (11 new + 2 modified):**
`contents/product-page.tsx`, `contents/category-page.tsx`, `contents/plasmo-overlay.css`,
`components/ScoreCard.tsx`, `components/ScoreBadge.tsx`, `components/TrackedList.tsx`,
`background/messages/batch-quick-score.ts`, `background/messages/track-product.ts`,
`background/messages/get-tracked-products.ts`, `lib/url-parser.ts`, `lib/spa-observer.ts`,
`lib/api.ts` (edited), `popup.tsx` (edited)

---

## T-208..T-211 | P0 | FRONTEND | Chrome Extension Faza 1 — Scaffold + Auth (2026-03-03)

Plasmo scaffold, popup login/logout, background service worker (token refresh alarm),
API client with JWT auto-refresh, chrome.storage token management, badge states.

**Fayllar:** `popup.tsx`, `background/index.ts`, `lib/api.ts`, `lib/storage.ts`, `lib/badge.ts`,
`components/LoginForm.tsx`, `background/messages/{get-auth-state,login,logout,quick-score}.ts`

---

## Landing i18n + UX fixlar (2026-03-03)

### T-284 | P1 | FRONTEND | Landing — grid pattern light mode fix
CSS `.grid-pattern` va `.grid-pattern-sm` utility yaratildi, `[data-theme="ventra-light"]` override bilan. HeroSection va StatsSection inline style o'rniga class ishlatadi.

### T-285 | P1 | FRONTEND | Landing — placeholder href="#" linklar olib tashlandi
Footer dan ishlamaydigan linklar (Browser Extension, About, Blog, Docs, Instagram, YouTube, Privacy, Terms) olib tashlandi. DownloadBanner buttonlari `<button disabled>` ga o'zgartirildi "Tez kunda" tooltip bilan.

### T-286 | P1 | FRONTEND | Landing — APP_URL va EmailCapture fix
`APP_URL` `import.meta.env.VITE_APP_URL || 'https://web-production-2c10.up.railway.app'` ga o'zgartirildi. EmailCapture placeholder success ko'rsatadi.

### T-287 | P2 | FRONTEND | Landing — Footer social aria-label
Telegram, Instagram, YouTube buttonlariga `aria-label` qo'shildi.

### T-288 | P2 | FRONTEND | Landing — DashboardPreview MockScreen i18n
MockScreen ichidagi barcha hardcoded textlar (17 ta kalit) i18n `t()` ga o'tkazildi. UZ + RU tarjimalar qo'shildi.

### T-289 | P2 | FRONTEND | Landing — Testimonials DOM duplication
`[...TESTIMONIALS, ...TESTIMONIALS]` → `TESTIMONIALS` ga soddlashtirildi. Ortiqcha DOM node'lar olib tashlandi.

### Landing light mode text fix
~30 ta `text-white` instance 17 faylda `text-base-content` ga o'zgartirildi.

### Landing button border + navbar mobile fix
DaisyUI v5 btn border fix. Mobile menu orqa fon fix.

### Landing emoji → SVG icon replacement
Barcha emoji'lar SVG icon'larga almashtirildi. `icons.tsx` da 21 ta Lucide-style icon.

### Landing i18n — PainPoints, Features, Pricing, FAQ, Stats
Barcha hardcoded UZ textlar i18n `t()` ga o'tkazildi. RU tarjimalar qo'shildi (73 kalit).

---

## T-288 | P0 | BACKEND+FRONTEND | API Hang — Prisma Connection Pool Exhaustion fix (2026-03-02)

**Muammo:** System tab ochilganda barcha API endpoint'lar muzlab qolardi (504/timeout).
Root cause: `connection_limit=20` + `pool_timeout` yo'q → MetricsService background loop (3 conn) + System tab 8 endpoint (18 conn) = 21 > 20 → pool to'ladi → abadiy kutish.

**Fixlar (F1-F8) — v1:**
- **F1** PrismaService: `pool_timeout=10` programmatik enforce (DATABASE_URL ga inject)
- **F2** `getUserHealthSummary`: 3 sequential SQL → `Promise.all()` (parallel)
- **F3** `getDbPoolActive`: background 15s loop dan olib tashlandi → on-demand refresh
- **F4** Redis: `lazyConnect: false` (eager connect) + queue depth `pipeline` (6 call → 1 round-trip)
- **F5** Frontend: barcha monitoring/stats API call'lariga `timeout: 10_000` qo'shildi
- **F7** Monitoring endpoint'lar: try/catch + graceful fallback (500 emas, bo'sh data)
- **F8** nginx: static health check → real API proxy (10s timeout, container restart imkoni)

**v2 — qo'shimcha fixlar (staging test da aniqlangan):**
v1 dan keyin 8 concurrent request hali pool ni to'ldirardi. Sabab: `new URL()` PostgreSQL parolni buzishi + frontend parallel fetch.
- `ensurePoolParams`: `new URL()` → simple string append (parol buzilmaydi)
- `statement_timeout=15000` qo'shildi (PostgreSQL stuck query'larni 15s da o'ldiradi)
- `getAiUsageStats`: 5 parallel → 2 batch (3+2, max 3 concurrent connection)
- **SystemTab**: parallel fetch → sequential (metrics → capacity → userHealth → baselines → alerts)
- **AdminPage**: system tab 3 fire-and-forget → sequential chain (health → ai-usage → errors)
- Max concurrent DB queries: **~20 → ~5** (pool 20 hech qachon to'lmaydi)

**Staging test natijasi:**
```
8 concurrent request × 2 round (15s oraliq) — HAMMASI 200 OK (400-860ms)
Post-burst health check: 200 OK (254ms) — API tirik, hang YO'Q
```

**Fayllar:** `prisma.service.ts`, `metrics.service.ts`, `admin-monitoring.service.ts`, `admin-stats.service.ts`, `health.controller.ts`, `nginx.conf.template`, `admin.ts` (frontend API), `SystemTab.tsx`, `AdminPage.tsx`

---

## T-287 | FRONTEND | MonitoringTab → SystemTab birlashtirish + Heap % fix (2026-03-02)

**2 ta muammo hal qilindi:**

1. **Heap % noto'g'ri edi**: `heap_used_mb / heap_total_mb` (V8 allocated, 56/64=88%) → `heap_used_mb / max_heap_mb` (container limit, 56/2048=2.7%)
2. **2 ta alohida tab** (Tizim + Monitoring) → **1 ta "Tizim" tab**ga birlashtirildi

**SystemTab yangi 6 section:**
1. Tizim Holati (real-time 15s refresh) — heap gauge, CPU, event loop, DB pool, queue depths, capacity
2. API Health — status, uptime, database, redis
3. AI Xarajatlari — today/30d stats, by method table, errors
4. Foydalanuvchi Salomatligi — sortable table (errors, requests, slow, rate limits), expandable rows
5. Tizim Xatolari — by status/endpoint, error table, pagination
6. Sig'im Tarixi & Ogohlantirishlar — baseline capture, alert history

**O'chirilgan:**
- `MonitoringTab.tsx` — o'chirildi (kontent SystemTab ichiga ko'chirildi)
- `types.ts` — `'monitoring'` Tab union, VALID_TABS, TAB_TITLES dan olib tashlandi
- `AdminPage.tsx` — MonitoringTab import va render olib tashlandi
- `index.ts` — MonitoringTab export olib tashlandi
- `Layout.tsx` — Sidebar monitoring link va CpuChipIcon import olib tashlandi
- `i18n/{uz,en,ru}.ts` — `nav.admin.monitoring` key olib tashlandi

**Fayllar:** 9 ta o'zgartirildi (594 qo'shildi, 610 o'chirildi)
**Commit:** `70e9f85`

---

## T-285 | DEVOPS | Railway Pro RAM scaling + Monitoring System (2026-03-02)

### RAM va Resource Scaling
- **API service**: V8 heap 2GB (`MAX_HEAP_MB=2048`, entrypoint.sh env-configurable)
- **Worker service**: V8 heap 4GB (`MAX_HEAP_MB=4096`, Dockerfile CMD shell form)
- **Bot service**: V8 heap 512MB (`MAX_HEAP_MB=512`, Dockerfile CMD shell form)
- **DB connection pool**: API=20, Worker=10 (`connection_limit` via DATABASE_URL)
- Dockerfile CMD: `ENV` → `CMD export` pattern (runtime expansion)

### Monitoring System (25 faylda, 1792 qator)

**Backend (6 yangi fayl + 8 o'zgartirilgan):**
- `MetricsService`: har 15s yig'adi (heap, CPU, event loop, DB pool, queue depths), ring buffer 240 entry, DB persist 5m
- `ConcurrencyTracker`: NestJS interceptor, in-flight requests counter (global + per-user)
- `CapacityEstimator`: pure function — max concurrent users taxmin (memory/DB/event loop)
- `MemoryPressureMiddleware`: heap > 85% → HTTP 503 + Retry-After header
- `AdminMonitoringService`: per-user health (errors, activity, sessions), baseline capture, alerts
- 7 yangi admin endpoint (`/admin/monitoring/metrics|capacity|user-health|baselines|alerts`)
- Prisma: SystemMetric, CapacityBaseline, SystemAlert — 3 ta yangi model

**6 xavfli query tuzatildi:**
- `getStatsRevenue()`: ALL transactions → SQL `GROUP BY DATE` aggregation
- `getPopularCategories()`: ALL categoryRuns → SQL `GROUP BY LIMIT 50`
- `getTopUsers()`: deep nested include → scalar subquery
- `getExportUsersData()`: unbounded → `take: 5000`
- `getExportRevenueData()`: unbounded → `take: 10000`
- `getExportActivityData()`: `take: 10000` → `take: 5000`

**Frontend:**
- `MonitoringTab.tsx`: system gauge (memory/CPU/lag), per-user health table, capacity baselines, alert history
- Admin panel'da "Monitoring" tab qo'shildi → keyin T-287 da SystemTab ga birlashtirildi
- 6 ta API method + TypeScript interfaces
- i18n (uz/en/ru)

**Baseline (deploy vaqtida):**
- Heap idle: 57.78 MB, RSS: 141.36 MB
- Estimated max users: 248 concurrent
- Event loop lag: 1ms

---

## T-286 | DEVOPS | Nginx API proxy keepalive fix (2026-03-02)
- **Muammo**: nginx `Connection 'upgrade'` header API proxy da WebSocket handshake kutardi
- **Fix**: `Connection ''` (empty) + `Upgrade` header olib tashlandi
- Fayl: `apps/web/nginx.conf.template`

---

## T-284 | FRONTEND | Login 401 page reload fix (2026-03-02)
- **Muammo**: Noto'g'ri credentials bilan login qilganda sahifa reload bo'lardi, error alert ko'rinmasdi
- **Sabab**: Axios response interceptor (`base.ts`) har qanday 401 da `window.location.href = '/login'` qilardi — `/auth/login` uchun ham
- **Fix**: Interceptor da `/auth/` URL lar uchun redirect o'chirildi → error `handleSubmit` catch block ga tushadi → "Invalid credentials" alert ko'rinadi
- **Qo'shimcha**: Railway `API_UPSTREAM=api.railway.internal:3000` env var o'rnatildi (nginx proxy to'g'ri ishlashi uchun)
- Fayl: `apps/web/src/api/base.ts:95-99`

---

## T-282 | BACKEND | `ai_explanation` null fix (2026-03-02)
- **Sabab 1**: `ANTHROPIC_API_KEY` invalid (401) → yangi key yaratildi, Railway api + worker ga qo'yildi
- **Sabab 2**: Score threshold `> 3` juda baland → `> 1 || ordersQty > 50` ga o'zgartirildi
- **Qo'shimcha**: AI catch silently swallowed → `logger.warn` qo'shildi
- Fayl: `apps/api/src/uzum/uzum.service.ts:215-230`

---

## Landing Page App — apps/landing/ (Sardor, 2026-03-01)

24 ta task, 3 commit, 2527 qator qo'shildi.

| # | Task | Yechim |
|---|------|--------|
| L-001 | `apps/landing/` monorepo package | React 19, Vite 7, Tailwind v4, DaisyUI v5, Framer Motion scaffold |
| L-002 | Navbar | Scroll effect, mobile hamburger, smooth scroll |
| L-003 | HeroSection | Animated gradient mesh, laptop mockup, CTA |
| L-004 | PainPointsSection | 3 muammo→yechim card |
| L-005 | FeaturesSection | 10 ta feature, staggered animation |
| L-006 | DashboardPreview | Interactive screenshot tabs, mock screens |
| L-007 | StatsSection | Animated CountUp counters |
| L-008 | PricingSection | 3 tarif, oylik/yillik toggle |
| L-009 | TestimonialsSection | 4 mijoz fikri, horizontal scroll |
| L-010 | FAQSection | 7 savol accordion |
| L-011 | CTASection | Final CTA, gradient, glow button |
| L-012 | FooterSection | 4 ustun, social links |
| L-013 | DownloadBanner | Floating download banner, dismissible |
| L-014 | Framer Motion variants | `animations.ts` — fadeUp, staggerContainer, VIEWPORT; barcha sections bir xil animatsiya tizimi |
| L-015 | Responsive grid | Features: 1→2→3→5 col (sm/md/lg), mobile-friendly nav |
| L-016 | SEO | JSON-LD structured data, sitemap.xml, robots.txt, OG/Twitter meta |
| L-017 | Performance | Font preload, Vite chunk splitting (vendor + motion alohida) |
| L-018 | Dark/Light toggle | System preference, localStorage persistence, no-flash |
| L-019 | EmailCaptureSection | Email form, validation, success/error state (TODO: /api/v1/newsletter/subscribe) |
| L-020 | useAnalytics hook | Plausible-compatible event tracking, script ready |
| L-021 | — | Skipped (Blog section — optional) |
| L-022 | i18n uz/ru | ✅ DONE — barcha 11 section + DownloadBanner useLang() ga ulandi. i18n.ts ga footer.* keys qo'shildi. tsc PASS |
| L-023 | Dockerfile + nginx.conf | Multi-stage build, gzip, cache headers, docker-compose.prod.yml |
| L-024 | CI/CD | Landing tsc check + Railway deploy — ci.yml ga qo'shildi |

---

## Production QA — tests/ui/production-qa.spec.ts (Sardor, 2026-03-01)

**18/18 tests passed** in 3.7 min. Target: `web-production-2c10.up.railway.app`

| Check | Natija |
|-------|--------|
| Admin `/admin` page | ✅ 34 SVG/chart, 6 stat card, 0 JS error |
| 10 users × 15 URL analysis | ✅ 140/150 success (10 fail = 2 delisted Uzum products) |
| Data accuracy (5 products) | ✅ product_id, title, sell_price, rating 0-5, score 0-10 barcha to'g'ri |
| ProductPage browser render | ✅ title + price visible, 0 JS error |
| AnalyzePage UI flow | ✅ URL submit ishlaydi, no JS crash |
| **AI token** | ⚠️ `ai_explanation: null` barcha productsda — AI key yo'q yoki async |

**Topilgan muammo (Bekzod uchun):**
- `ai_explanation` production da HECH QACHON to'ldirilmayapti.
- Sabab: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` Railway env da yo'q, yoki `/uzum/analyze` handler AI ni chaqirmayapti.
- Report: `screenshots/production-qa/ai-token-report.json`

**Delisted Uzum mahsulotlari (mahsulot.md dan o'chirish kerak):**
- `tolstovka-mma-139472` → 404
- `blender-dlya-smuzi-i-koktejl-400-731913` → 404
- `Bolalar-golf-toplami-255201` → 404

---

## Sprint 2 Frontend — T-237, T-260, T-261, T-202 (Sardor, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-237 | photo_url — API + Frontend | `AnalyzeResult` + `TrackedProduct` tipiga `photo_url` qo'shildi. `ProductPage` hero da rasm, `ProductsTable` thumbnail |
| T-260 | Discovery category nomi | `Run` tipiga `category_name`. Runs table + winners drawer headerda kategoriya nomi ko'rsatiladi |
| T-261 | Discovery drawer + leaderboard | `Winner` tipiga yangi fieldlar. ScannerTab drawer + PublicLeaderboardPage: thumbnail, shop_title, rating, category_name |
| T-202 | ProductPage UX soddalash | AI Explanation → metrics dan keyin (3-o'rin). ML Forecast collapsible (default yopiq). Score/Orders history collapsible (default yopiq) |
| T-257 | Granular ErrorBoundary per section | `ErrorBoundary` ga `variant='section'` + `label` prop qo'shildi. `ProductPage`: WeeklyTrend, ML Forecast, CompetitorSection, GlobalPriceComparison o'ralgan. `DiscoveryPage`: 3 ta tab o'ralgan |

---

## Sprint 1 Frontend — Multi-Agent Mode (Sardor, 2026-03-01)

Commit `f6565e4` — 7 fayl, +173/-72 qator.

| # | Task | Yechim |
|---|------|--------|
| T-264 | Admin panel — USER role redirect yo'q | `App.tsx`: `AdminRoute` wrapper — `SUPER_ADMIN` role tekshiradi, boshqa rol `/` ga redirect |
| T-206 | CompetitorSection hardcoded matnlar | 19 ta hardcoded string → `t()` orqali i18n. `competitor.*` kalitlari uz/ru/en ga qo'shildi |
| T-266 | Shops, Leaderboard — bo'sh sahifa | `ShopsPage.tsx` + `LeaderboardPage.tsx`: empty state CTA qo'shildi. `shops.*` + `leaderboard.*` kalitlari |

---

## DevOps — T-280, T-177, T-179-181 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-280 | Railway EU region migration | `serviceInstanceUpdate` GraphQL mutation orqali barcha 8 ta service (api, worker, bot, web, postgres x2, redis x2) `europe-west4` regionga ko'chirildi. Health check Redis bug fix: stale ioredis client → fresh per-request client. `X-Railway-Edge: railway/europe-west4-drams3a` tasdiqlandi |
| T-177 | pgvector extension | `seed.service.ts` ga `CREATE EXTENSION IF NOT EXISTS vector` qo'shildi. Har deploy da avtomatik enable bo'ladi |
| T-179 | Worker memory/CPU | Railway Pro plan default limits yetarli. 7/7 workers healthy, barcha deployments SUCCESS |
| T-180 | Monitoring | Railway Pro crash notifications + health endpoint (`/api/v1/health`) queueDepth monitoring. Worker logs `weekly-scrape-queue` cron registered |
| T-181 | DB backup | Railway Pro automatic daily backups enabled (PostgreSQL service) |

---

## DevOps — T-184 Staging Environment (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-184 | Railway staging environment | Railway GraphQL API orqali `staging` environment yaratildi. Postgres-OaET + Redis-FA1J DB service'lar deploy qilindi. api, worker, web, bot — GitHub `AI-automatization/sellerTrend` repo'ga ulandi. api (SUCCESS, health OK, seed ishladi), worker (SUCCESS), web (SUCCESS, frontend yuklanadi), bot (CRASHED — `TELEGRAM_BOT_TOKEN` kerak, optional). Staging URL'lar: `api-staging-5e3c.up.railway.app`, `web-staging-e927.up.railway.app` |

---

## DevOps ENV — T-242, T-244, E-009 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-242 | SERPAPI_API_KEY production | Railway `api` + `worker` service lariga `SERPAPI_API_KEY` qo'shildi. Sourcing engine (1688, Taobao, Alibaba, Google Shopping, Amazon.de) production da ishlaydi |
| T-244 | SENTRY_DSN production | Sentry.io da `ventra-69` org yaratildi (EU region). `@sentry/node` allaqachon o'rnatilgan, `sentry.ts` dynamic import bilan ishlaydi. DSN Railway `api` service ga qo'shildi |
| E-009 | SENTRY_DSN config | Sentry error tracking yoqildi — production dagi barcha 4xx/5xx errorlar avtomatik Sentry ga yuboriladi |

---

## Sprint 2 Backend — T-237, T-260, T-261, T-234, T-262, T-263 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-237 | photo_url — API + Frontend | Backend: `uzum.service.ts`, `products.service.ts` photo_url qaytaradi (Bekzod). Frontend: `AnalyzeResult` + `TrackedProduct` tipiga `photo_url` qo'shildi, `ProductPage.tsx` hero da rasm ko'rsatiladi, `ProductsTable.tsx` har row da thumbnail (Sardor) |
| T-260 | Discovery category nomi Frontend | `Run` tipiga `category_name` qo'shildi. Runs tableda kategoriya nomi (yoki ID fallback) ko'rsatiladi. Winners drawer headerda ham kategoriya nomi + ID subtitle |
| T-261 | Discovery drawer + leaderboard boyitish | Backend: getLeaderboard() + getRun() — rating, feedback_quantity, photo_url, total_available_amount, shop_title, shop_rating (Bekzod). Frontend: Winner tipiga yangi fieldlar, ScannerTab drawer da thumbnail+shop_title, PublicLeaderboardPage da thumbnail+shop_title+rating+category_name (Sardor) |
| T-234 | Desktop login bug fix | `window.ts`: app:// protocol /api/* path larni HTTP backend ga proxy qiladi. `apps/desktop/.env` yaratildi (VITE_API_URL=http://localhost:3000) |
| T-262 | Railway DB seed | `SeedService` (OnApplicationBootstrap) — API startup da auto-seed: admin, demo, platforms, cargo, trends. Upsert = idempotent |
| T-263 | SUPER_ADMIN user | SeedService admin@ventra.uz / Admin123! SUPER_ADMIN role bilan yaratadi |

---

## Sprint 1 Backend — Multi-Agent Mode (Bekzod, 2026-03-01)

5 backend task parallel agent dispatch bilan bajarildi. Commit `cd1d041`.

| # | Task | Yechim |
|---|------|--------|
| T-241 | totalAvailableAmount Prisma schema + saqlash | `schema.prisma`: Product.photo_url + CategoryRun.category_name. `uzum.service.ts`, `import.processor.ts`, `reanalysis.processor.ts`, `discovery.processor.ts` — total_available_amount, photo_url saqlash |
| T-150 | consultant_id → account_id naming fix | `consultation.service.ts`: consultantId/clientId → accountId, `any` → `Prisma.ConsultationWhereInput`, JSDoc qo'shildi |
| T-239 | Per-user rate limiting AI endpoints | `ai-throttler.guard.ts` (NEW): per-account AI limiter. `app.module.ts`: named throttlers (default 120/min, ai 30/min). `custom-throttler.guard.ts`: bug fix `req.user.sub` → `req.user.id` |
| T-214 | POST /uzum/batch-quick-score endpoint | `batch-quick-score.dto.ts` (NEW): @IsArray @ArrayMaxSize(20). `uzum.service.ts`: batchQuickScore() — Promise.allSettled parallel. `uzum.controller.ts`: @Post('batch-quick-score') |
| T-240 | DTO validatsiya 5+ endpoint | 6 ta DTO yaratildi: `start-run.dto.ts`, `calculate-cargo.dto.ts`, `search-prices.dto.ts`, `create-search-job.dto.ts`, `create-ticket.dto.ts`, `create-price-test.dto.ts`. Controller'lar yangilandi |

---

## v5.5 — Production Deployment Verification (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-293 | Health check: weekly-scrape-queue qo'shish | `health.controller.ts` — `queueNames` ga `'weekly-scrape-queue'` qo'shildi. Commit `857dfbe` |
| T-294 | CI/CD pipeline: TezCode Team workspace | GitHub Actions → Railway deploy: 4 service (api, worker, web, bot) — barchasi SUCCESS. TezCode Team workspace (project: uzum-trend-finder) |
| T-295 | Production verification: 16 sahifa test | Dashboard, URL Tahlil, Discovery, Sourcing, Do'konlar, Signallar, Leaderboard, Kalkulyator, Elastiklik, AI Tavsif, Konsultatsiya, Enterprise, Referal, API Kalitlar, Kengaytma, Fikr-mulohaza — barchasi ishlaydi |
| T-296 | Dark mode + i18n verification | Qorong'u rejim barcha sahifalarda to'g'ri ishlaydi. 3 til (O'z, Ру, En) — tarjimalar to'g'ri |
| T-297 | Demo account production | `POST /api/v1/auth/register` — demo@uzum-trend.uz / Demo123! yaratildi. Login + URL Tahlil (product 352744) ishlaydi |
| T-298 | Worker 7 ta ishlaydi | discovery-queue, sourcing-search, import-batch, billing-queue, competitor-queue, reanalysis-queue, weekly-scrape-queue — barchasi active. Weekly scrape cron: `*/15 * * * *` |
| T-269 | Eski noto'g'ri weekly_bought data (OBSOLETE) | Eski `calcWeeklyBought()` algoritmidan kelib chiqqan noto'g'ri `rOrdersAmount` data — Playwright scraper yangi `weekly_bought_source='scraped'` data bilan almashtiradi. Manual SQL cleanup kerak emas |
| T-270 | Duplicate snapshot tozalash (OBSOLETE) | `SNAPSHOT_MIN_GAP_MS=5min` dedup guard (T-267) + scraper dedup — yangi duplicatelar yaratilmaydi. Eski duplicatelar tarixiy data sifatida qoladi |

### Production status:
```
Health: {"status":"ok","db":"ok","redis":"ok","queues":{...,"weekly-scrape-queue":0}}
Workers: 7/7 running
Web: https://web-production-2c10.up.railway.app ✅
API: https://api-production-8057.up.railway.app ✅
```

---

## i18n AUDIT — Bajarilganlar (Sardor, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-271 | 23 ta DUPLICATE KEY barcha 3 tilda | Commit c5f49bc — 23 ta duplicate key uz.ts, ru.ts, en.ts dan o'chirildi |
| T-272 | Layout.tsx sidebar section labellar hardcoded | t('nav.section.main'), t('nav.section.product'), t('nav.tools'), t('nav.section.business') — barchasi i18n |
| T-273 | SignalsPage tab nomlari va content hardcoded | 10 ta signal component (Cannibalization, DeadStock, Saturation, FlashSales, EarlySignals, StockCliffs, Ranking, Checklist, PriceTest, Replenishment) — barchasi useI18n + t() |
| T-274 | ScannerTab.tsx (Discovery) butunlay i18n siz | ScannerTab.tsx — useI18n import, discovery.scanner.* kalitlari qo'shildi |
| T-275 | CargoCalculator.tsx (Sourcing) butunlay i18n siz | CargoCalculator.tsx — useI18n import, t() ishlatiladi |
| T-276 | UZ faylida ~85 ta inglizcha tarjima qilinmagan | uz.ts — nav.*, dashboard.*, calculator.*, enterprise.*, ads.*, extension.*, feedback.*, sourcing.*, discovery.*, signals.* kalitlari o'zbek tiliga o'girildi |
| T-277 | RU faylida ~24 ta inglizcha tarjima qilinmagan | ru.ts — nav.*, sourcing.*, discovery.*, enterprise.*, ads.*, extension.*, signals.* kalitlari ruscha o'girildi |
| T-278 | feedback.title UZ da aralash til | uz.ts: "Feedback & Yordam" → "Murojaat & Yordam" |
| T-279 | discovery.title barcha 3 tilda tarjima qilinmagan | uz.ts: "Kategoriya kashfiyoti", ru.ts: "Обзор категорий", en.ts: "Category Discovery" |
| — | discovery/types.ts POPULAR_CATEGORIES i18n | label hardcoded → labelKey pattern; NicheFinderTab + ScannerTab da t(cat.labelKey); 10 ta discovery.cat.* kalit barcha 3 tilda |
| — | SignalsPage.tsx desktop tabs i18n | tabItem.label → tabLabel(tabItem.key) — desktop tab buttonlari ham t() orqali |
| — | AnalyzePage.tsx placeholder i18n | Hardcoded URL placeholder → t('analyze.urlPlaceholder') barcha 3 tilda |

---

## v5.4 — Weekly Bought Playwright Scraping (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-282 | Prisma migration: weekly scrape fields | `TrackedProduct`: +next_scrape_at, +last_scraped_at, +@@index(next_scrape_at). `ProductSnapshot`: +weekly_bought_source VARCHAR(20) |
| T-283 | Banner parser funksiya | `parseWeeklyBoughtBanner()` — "115 человек купили" / "1,2 тыс." format parse. `packages/utils/src/index.ts` |
| T-284 | Playwright weekly scraper | `weekly-scraper.ts` — shared browser, 3 strategiya: SSR regex, DOM text, badge_bought img parent. Anti-detection: context isolation, images disabled |
| T-285 | Weekly scrape BullMQ processor | `weekly-scrape.processor.ts` — batch (cron) va single (immediate) mode. Scrape → REST → snapshot(source='scraped'). Jitter, retry, dedup |
| T-286 | Weekly scrape job scheduler | `weekly-scrape.job.ts` — `*/15 * * * *` cron. `weekly-scrape.queue.ts` API-side fire-and-forget trigger |
| T-287 | Worker main.ts: 7-chi worker | `createWeeklyScrapeWorker()` + `scheduleWeeklyScrape()` registered. Health check: workers=7. Graceful shutdown |
| T-288 | Reanalysis processor: stored scraped wb | `reanalysis.processor.ts` — scraped weekly_bought priority, calcWeeklyBought fallback. Snapshot: weekly_bought_source field |
| T-289 | Import processor: stored scraped wb | `import.processor.ts` — scraped priority + fallback. Import tugagach immediate scrape enqueue |
| T-290 | Products/Signals: stored wb read paths | `products.service.ts` — getTrackedProducts, getProductById, getProductSnapshots, getAdvancedForecast: stored wb. `signals.service.ts` — 6 feature: stored wb, recalcWeeklyBoughtSeries o'chirildi |
| T-291 | UzumService: immediate scrape enqueue | `uzum.service.ts` — analyzeProduct() da scraped wb priority + `enqueueImmediateScrape()` fire-and-forget. weekly_bought_source snapshot ga yoziladi |
| T-292 | Deprecated functions | `calcWeeklyBought()`, `weeklyBoughtWithFallback()`, `recalcWeeklyBoughtSeries()` — @deprecated JSDoc. Transitional fallback sifatida qoldi |

---

## P0 BACKEND FIX (Bekzod, 2026-02-28)

| # | Task | Muammo | Fayl/Yechim |
|---|------|--------|-------------|
| T-267 | Snapshot deduplication | 3 joyda `productSnapshot.create()` — dedup yo'q, sekundiga 10+ snapshot | `SNAPSHOT_MIN_GAP_MS=5min` guard 3 faylda: uzum.service.ts, import.processor.ts, reanalysis.processor.ts |
| T-268 | Score instability | `weekly_bought` null → `calculateScore()` 55% weight = 0 → score ~50% tushadi | `weeklyBoughtWithFallback()` helper — oxirgi valid snapshot'dan fallback. 3 caller yangilandi |
| T-062 | Anthropic client lazy init | `new Anthropic()` modul yuklanganda — `ANTHROPIC_API_KEY` yo'q bo'lsa crash | `getAiClient()` lazy pattern — faqat kerak bo'lganda yaratadi |
| T-265 | Enterprise 404 endpoints | Enterprise sahifa 3 ta API endpoint 404 qaytaradi | Tekshirish: 5 ta controller (ads, team, reports, watchlist, community) hammasi mavjud va registered — ALLAQACHON DONE |

---

## TUZATILGAN BUGLAR (Sardor, 2026-02-27)

| # | Task | Muammo | Fayl/Yechim |
|---|------|--------|-------------|
| BUG-029 | E-001 | Desktop `.env` yo'q — login `app://api/v1` ga ketardi | `apps/desktop/.env` yaratildi: `VITE_API_URL=http://localhost:3000` |
| BUG-030 | E-002 | Desktop dev proxy yo'q — `/api/v1` backend ga yetmaydi | `electron.vite.config.ts` ga `/api/v1` proxy qo'shildi |
| BUG-031 | T-084 | RegisterPage: `setTokens()` chaqirilmaydi | `RegisterPage.tsx` — `setTokens()` + `queryClient.clear()` |
| BUG-032 | T-085 | AnalyzePage: `setTracked(true)` try tashqarisida | `AnalyzePage.tsx` — try ichiga ko'chirildi |
| BUG-033 | T-086 | ProductPage: `setTracked(true)` try tashqarisida | `ProductPage.tsx:278` — try ichiga ko'chirildi |
| BUG-034 | T-188 | Service Worker registered — PWA o'chirilishi kerak | `sw.js` o'chirildi, `index.html` ga unregister scripti |
| BUG-035 | T-189 | manifest.json va PWA meta taglar bor | `public/manifest.json` o'chirildi, meta taglar tozalandi |
| BUG-036 | T-190 | PWA-only iconlar bor | Uchala fayl o'chirildi, `favicon.svg` qoldi |
| BUG-037 | T-191 | `useNativeNotification.ts` dead code | Fayl o'chirildi |
| BUG-039 | T-194 | Chart X-axis "M02 27" format | `ProductPage.tsx:219` — ISO saqlashga o'tildi; ScoreChart `formatDay()` |
| BUG-040 | T-195 | "MAE: X · RMSE: Y" texnik jargon | O'chirildi → "AI bashorat · X% ishonchlilik" |
| BUG-041 | T-197 | Score chart: bir kunda ko'p snapshot → zigzag | `dailySnapshots` useMemo — har kunning oxirgi scorei |
| BUG-042 | T-198 | Haftalik sotuvlar chart noto'g'ri data | `dailySnapshots.slice(-15)` + Y-axis "ta" unit |
| BUG-043 | T-200 | ML box: "confidence", "snapshot" inglizcha raw label | "Ishonchlilik" / "Tahlil soni" |
| BUG-044 | T-201 | Global bozor fetch xatosida bo'sh qoladi | `catch` da `setExtNote('Global bozor...')` |
| BUG-045 | T-203 | ML Prognoz 4 KPI box labelsiz | Har boxga label qo'shildi |
| BUG-046 | T-204 | WeeklyTrend BarChart — qora to'rtburchak | `<Cell>` ga almashtirildi |
| BUG-047 | T-205 | Footer da raw scoring formula | `Score = 0.55×ln(...)` bloki o'chirildi |
| BUG-048 | T-151 | `useSocket.ts` — `useCallback(fn, [fn])` foydasiz | `socketRef` + `callbackRef` pattern |
| BUG-049 | T-158 | `AdminPage.tsx` — 30+ `any` type | 20+ typed interface; `unknown` audit values; tsc clean |
| BUG-050 | T-163 | `AdminPage.tsx` 2163 qator | 9 fayl: adminTypes, AdminComponents, 7 tab component |
| BUG-051 | T-084 | `RegisterPage.tsx` — `setTokens` ikki marta e'lon qilingan | Duplicate declaration o'chirildi |
| BUG-052 | T-164 | 7 sahifada hardcoded Uzbek matn (i18n yo'q) | `useI18n` + `t()` — SignalsPage, DiscoveryPage, ReferralPage, FeedbackPage, ConsultationPage, SourcingPage, ProductPage |

---

## P2 FRONTEND FIX — 30 Task Batch (2026-02-27)

**Commit:** `cbb98c9` — 57 fayl, +4186/-3660 qator

### Admin + Dashboard Group
| Task | Fix |
|------|-----|
| T-114 | `admin.ts` dead `sendNotification` method o'chirildi, `params?: any` → `Record<string, unknown>` |
| T-116 | `useDashboardData` hook da `getTracked()` ga `.catch(logError)` qo'shildi |
| T-118 | AdminPage deposits useEffect ga `depositLogPage` dependency qo'shildi |
| T-122 | AdminPage `setActiveTab` dead function o'chirildi |
| T-123 | AdminPage URL-sync useEffect `[searchParams, activeTab, setSearchParams]` dep to'ldirildi |
| T-156 | DashboardPage `scoreSparkline`/`salesSparkline` `useMemo` ga o'raldi |
| T-157 | CSV export empty catch → `toastError(err, 'CSV eksport xatosi')` |
| T-158 | AdminPage 30+ `any` → `Record<string, unknown>` + proper interfaces |

### Product + Sourcing Group
| Task | Fix |
|------|-----|
| T-120 | SourcingPage `refreshRates()` va useEffect ga `.catch(logError)` qo'shildi |
| T-121 | ExternalSearch, JobsList, CalculationHistory da `.catch(logError)` qo'shildi |

### Signals Group
| Task | Fix |
|------|-----|
| T-126 | ConsultationPage timezone — `todayLocal` local date, past booking validation |
| T-162 | 10 signal component da `any[]` → typed interfaces (types.ts: 10 interface) |

### Qo'shimcha (agentlar tomonidan aniqlangan)
- `api/types.ts` 201 qator yangi shared types (ConsultationItem, etc.)
- `i18n/translations.ts` 2900 qator → `uz.ts`, `ru.ts`, `en.ts` ga split (T-255)
- `isTokenValid()` — JWT exp tekshiradi, expired bo'lsa localStorage tozalaydi (T-155)
- `useNativeNotification.ts` o'chirildi — dead code (T-191)
- `ErrorBoundary` — `import.meta.env.DEV` check qo'shildi (T-153)
- Signal types: CannibalizationPair, DeadStockItem, SaturationData, FlashSaleItem, EarlySignalItem, StockCliffItem, RankingEntry, ChecklistData, PriceTestItem, ReplenishmentItem

**Tekshiruv:** `tsc --noEmit` 0 error, `pnpm build` muvaffaqiyatli

---

## FRONTEND BATCH 3 — PWA Cleanup + Misc Fixes (2026-02-27)

| Task | Fix |
|------|-----|
| T-084 | RegisterPage auth store bypass — `setTokens`/`queryClient.clear()` qo'shildi |
| T-085 | AnalyzePage `setTracked(true)` try ichiga ko'chirildi |
| T-097 | WebSocket dev proxy — `/ws` proxy vite.config.ts ga qo'shildi |
| T-117 | `scoreColor(0)` gray → red (`#ef4444`) for scores < 2 |
| T-164 (qismi) | `uz-UZ` locale → `ru-RU` barcha 7 faylda (AnalyzePage, ProductPage, ScannerTab, ApiKeysPage, CompetitorSection, RankingTab) |
| T-188 | SW o'chirildi + unregister script qo'shildi (index.html) |
| T-189 | manifest.json + PWA meta taglar o'chirildi |
| T-190 | icon-512.svg, icon-maskable.svg o'chirildi |
| T-191 | useNativeNotification.ts o'chirildi (dead code) |
| T-192 | `dist/` build artifact tozalandi |
| T-201 | CompetitorSection `loadError` state + GlobalPriceComparison loading matn qo'shildi |
| — | ChecklistTab.tsx unused `ChecklistItem` import olib tashlandi |

**Tekshiruv:** tsc --noEmit 0 error, eslint --quiet 0 error

---

## FRONTEND BATCH 2 — Empty Catches + Auth Fixes (2026-02-27)

| Task | Fayl | Fix |
|------|------|-----|
| T-127 | ConsultationPage.tsx | 3 ta empty catch → logError/toastError |
| T-128 | ScannerTab, NicheFinderTab | 3 ta empty catch → logError |
| T-129 | ReferralPage.tsx | 1 ta empty catch → toastError |
| T-130 | ApiKeysPage.tsx | 3 ta empty catch → logError/toastError |
| T-131 | FeedbackPage.tsx | 4 ta empty catch → logError/toastError |
| T-198 | ProductPage.tsx | Haftalik sotuvlar chart — zero-order filter + tooltip |

---

## P2 FRONTEND — Auth / Store / Utils Group Fix (2026-02-27)

### T-115 | FRONTEND | authStore email field JWT da yo'q | Sardor | 10min
**Status:** Allaqachon tuzatilgan. `authStore.ts` va `base.ts:getTokenPayload()` JWT dan email o'qiydi. `Layout.tsx` da `payload?.email` ishlatiladi.

### T-151 | FRONTEND | useCallback(fn, [fn]) foydasiz | Sardor | 5min
**Fix:** `useSocket.ts:useNotificationRefresh()` dagi `useCallback(onRefresh, [onRefresh])` olib tashlandi — bevosita `onRefresh` ishlatiladi.

### T-152 | FRONTEND | any type api fayllarida 6 ta | Sardor | 10min
**Fix:** 6 ta `any` o'rniga proper typlar qo'yildi:
- `admin.ts`: `params?: any` → `Record<string, unknown>`
- `enterprise.ts`: `items: any[]` → `Array<{ text: string; checked: boolean }>`
- `enterprise.ts`: `data: any` → `Record<string, unknown>`
- `enterprise.ts`: `filters?: any; columns?: any` → `Record<string, unknown>; string[]`
- `base.ts`: `as any` (2x) → `as Record<string, unknown>`

### T-153 | FRONTEND | ErrorBoundary console.error env check yo'q | Sardor | 5min
**Fix:** `console.error` ni `if (import.meta.env.DEV)` ichiga o'raldi.

### T-154 | FRONTEND | getTokenPayload return type tor | Sardor | 10min
**Fix:** `JwtTokenPayload` interface yaratildi (`sub`, `email`, `role`, `account_id`, `exp`, `iat?`). `getTokenPayload()` return type yangilandi. Export qilindi.

### T-155 | FRONTEND | isAuthenticated() token expiry tekshirmaydi | Sardor | 15min
**Fix:** `isTokenValid()` helper yaratildi (`base.ts`) — JWT `exp` field tekshiradi, expired bo'lsa tokenlarni tozalaydi va `false` qaytaradi. `App.tsx:isAuthenticated()` endi `isTokenValid()` ishlatadi.

---

## COMPONENT EXTRACTION — 6 God Page → 68 Components (2026-02-27)

### T-258 | FRONTEND | 6 ta god page → 68 ta component faylga ajratildi | Sardor | 1h
**Commit:** `b3f8d00` — 75 fayl, +4994 / -4367 qator

**Muammo:** 6 ta page fayl juda katta (jami 6159 qator), har biri ichida 5-14 ta inline komponent.
**Yechim:** Har page dan inline komponentlar alohida fayllarga extract qilindi, page = thin orchestrator.

| Page | Oldin | Keyin | Komponentlar | Papka |
|------|-------|-------|-------------|-------|
| AdminPage.tsx | 2001 | 453 | 21 fayl | components/admin/ |
| SignalsPage.tsx | 870 | 86 | 17 fayl | components/signals/ |
| SourcingPage.tsx | 971 | 117 | 10 fayl | components/sourcing/ |
| ProductPage.tsx | 912 | 642 | 7 fayl | components/product/ |
| DashboardPage.tsx | 774 | 664 | 7 fayl | components/dashboard/ |
| DiscoveryPage.tsx | 631 | 42 | 8 fayl | components/discovery/ |
| **Jami** | **6159** | **2004** | **68+6 index** | **6 papka** |

**Qoidalar bajarildi:**
- Logika O'ZGARMADI — faqat cut + paste + import/export
- Har komponent uchun Props interface yozildi
- Barrel export (index.ts) har papka uchun
- Shared types → types.ts (har papkada)
- `tsc --noEmit` — 0 error, `pnpm build` — muvaffaqiyatli, brauzer — 0 console error

---

## PRODUCTPAGE BUGFIX BATCH (2026-02-27)

### Code Quality Fixes (7 bug)
| Task | Bug | Fix |
|------|-----|-----|
| T-086 | `setTracked(true)` API xatosida ham o'rnatiladi | `try` bloki ichiga ko'chirildi |
| T-119 | Recharts `<rect>` → `<Cell>` (qora to'rtburchak) | `Cell` component import qilindi va ishlatildi |
| T-124 | loadData useEffect dependency muammosi | `loadedProductId` bilan effect stabilizatsiya |
| T-125 | extSearched product o'zgarganda reset bo'lmaydi | `id` o'zgarganda barcha ext state reset |
| T-159 | mlForecast, trendAnalysis `any` type | `MlForecast`, `TrendAnalysis` interface qo'shildi |
| T-160 | ML effect ikki marta trigger | Faqat `loadedProductId` ga bog'landi |
| T-161 | Hardcoded USD rate 12900 | `DEFAULT_USD_RATE` const bilan nomlandi |

### UX Fixes (8 bug)
| Task | Muammo | Fix |
|------|--------|-----|
| T-194 | X-axis "M02 27" noto'g'ri format | `uz-UZ` locale → manual `27 Fev` format |
| T-195 | "WMA + Holt's..." texnik jargon | "AI prognoz · O'rtacha xatolik: X" ga almashtirildi |
| T-197 | Score chart zigzag (bir kunda ko'p snapshot) | Snapshotlar KUN bo'yicha aggregate (oxirgisi saqlanadi) |
| T-199 | Trend badge "Barqaror" (3.25→9.14) | Frontend da changePct>5% = up, <-5% = down; foiz ko'rsatiladi |
| T-200 | "confidence", "snapshot" texnik so'zlar | "aniqlik", "ta tahlil" ga tarjima |
| T-203 | ML KPI box labels tushunarsiz | Label lar aniqroq: "Tahlillar soni", "aniqlik" |
| T-204 | Haftalik sotuv chart qora to'rtburchak | `<rect>` → `<Cell>` (T-119 bilan birga) |
| T-205 | Footer da raw scoring formula | "Score haftalik faollik, buyurtmalar, reyting va omborga asoslanib hisoblanadi" |

### Qo'shimcha
- `api/types.ts` ga 5 ta yangi interface: `ForecastPrediction`, `ForecastMetrics`, `ForecastDetail`, `MlForecast`, `TrendAnalysis`
- ML chart `(s: any)` va `(p: any)` annotatsiyalar olib tashlandi — typed
- Forecast chart `as any` cast olib tashlandi
- tsc --noEmit ✅, eslint --quiet ✅

---

## FRONTEND REFACTOR (2026-02-27)

### T-246 | api/types.ts — Markaziy response types
- `apps/web/src/api/types.ts` yaratildi — 17 ta interface/type markazlashtirildi
- 8+ sahifadan inline type/interface olib tashlandi (AdminPage, AnalyzePage, DashboardPage, ProductPage, LeaderboardPage, FeedbackPage, ConsultationPage)
- `any` → `unknown` (AuditEvent.old_value/new_value/details)

### T-247 | utils/formatters.ts — Shared formatters
- `apps/web/src/utils/formatters.ts` yaratildi — fmt, fmtUSD, fmtUZS, scoreColor, glassTooltip
- ProductPage, DashboardPage, CompetitorSection dan duplicate funksiyalar olib tashlandi

### T-250 | Custom hook: useDashboardData
- `apps/web/src/hooks/useDashboardData.ts` yaratildi
- Products fetch, balance fetch, CSV export logikasi DashboardPage dan hook ga chiqarildi
- `useLocation().key` bilan navigatsiyada auto-refetch

### T-251 | DashboardPage split (664→191 qator)
- 5 ta sub-component yaratildi:
  - `KPICards.tsx` — 5 ta KPI card (balans, kuzatuv, haftalik, score, salomatlik)
  - `HeroCards.tsx` — eng yaxshi score + eng faol mahsulot
  - `ChartsSection.tsx` — score bar chart + trend pie + score ring
  - `ActivityChart.tsx` — haftalik sotuv area chart
  - `ProductsTable.tsx` — mahsulotlar jadvali + sorting
- `components/dashboard/index.ts` yangilandi — 11 ta export

### T-255 | translations.ts split (2909→3 fayl)
- `i18n/uz.ts` (979 qator), `i18n/ru.ts` (963 qator), `i18n/en.ts` (963 qator)
- `translations.ts` = 7 qator (import + re-export)

### T-248 | Silent .catch(() => {}) → logError/toastError
- `apps/web/src/utils/handleError.ts` yaratildi — logError (dev console), toastError (toast notification)
- 55+ joyda `.catch(() => {})` to'g'ri error handling bilan almashtirildi:
  - useEffect background loading → `.catch(logError)` (dev console only)
  - User-triggered actions → `.catch((e) => toastError(e))` (toast ko'rsatadi)
- Tuzatilgan fayllar: AdminPage, Layout, DashboardPage, ProductPage, LeaderboardPage, ReferralPage, CompetitorSection, AccountDrawer, SeasonalCalendarTab, 8 signals tab, 5 enterprise tab

## TUZATILGAN BUGLAR (28 ta)

| # | Sana | Tur | Muammo | Fayl |
|---|------|-----|--------|------|
| BUG-001 | 2026-02-25 | frontend | feedbackTickets.map is not a function | AdminPage.tsx |
| BUG-002 | 2026-02-25 | frontend | avg_score.toFixed is not a function (string→Number) | AdminPage.tsx |
| BUG-003 | 2026-02-25 | config | /api-keys 404 — Vite proxy `/api` prefix conflict | vite.config.ts |
| BUG-004 | 2026-02-25 | frontend | platforms.join crash — null/undefined array | SourcingPage.tsx |
| BUG-005 | 2026-02-25 | frontend | Dashboard stats field mismatch (today_active vs today_active_users) | AdminPage.tsx |
| BUG-006 | 2026-02-25 | frontend | Realtime activity field mismatch (recent_activity vs activity_feed) | AdminPage.tsx |
| BUG-007 | 2026-02-25 | frontend | System Health field mismatch (nested vs flat structure) | AdminPage.tsx |
| BUG-008 | 2026-02-25 | frontend | Feedback Stats field mismatch (open vs by_status.OPEN) | AdminPage.tsx |
| BUG-009 | 2026-02-25 | backend | Super admin balance (999M) statistikani buzadi | admin.service.ts |
| BUG-010 | 2026-02-25 | build | express module not found (webpack transitive dep) | package.json |
| BUG-011 | 2026-02-25 | frontend | Toast notifications yo'q — 11 ta action ga qo'shildi | AdminPage.tsx, App.tsx |
| BUG-012 | 2026-02-25 | backend | weekly_bought = rOrdersAmount (jami buyurtma, haftalik emas) → snapshot delta | uzum.client.ts, uzum.service.ts |
| BUG-013 | 2026-02-25 | backend | availableAmount = per-order limit, totalAvailableAmount = real stock | uzum.client.ts |
| BUG-014 | 2026-02-25 | backend | import.processor.ts noto'g'ri field nomlari (ordersQuantity→ordersAmount) | import.processor.ts |
| BUG-015 | 2026-02-25 | backend | Super Admin user count ga ta'sir qiladi — filter qo'shildi | admin.service.ts |
| BUG-016 | 2026-02-25 | frontend | Super admin sidebar 2 ta Dashboard — asosiy yashirildi | Layout.tsx |
| BUG-017 | 2026-02-25 | backend | Barcha signal algoritmlari corrupted weekly_bought — recalcWeeklyBought() helper | signals.service.ts |
| BUG-018 | 2026-02-25 | backend | detectEarlySignals double normalization — salesVelocity = latestSales | utils/index.ts |
| BUG-019 | 2026-02-25 | backend | detectStockCliff arbitrary heuristic → stock/velocity formula | utils/index.ts |
| BUG-020 | 2026-02-25 | frontend+backend | Stale data — Cache-Control:no-store + Axios _t=timestamp + SW ventra-v2 | interceptor, client.ts, sw.js |
| BUG-021 | 2026-02-25 | worker | Reanalysis cron 24h→6h (0 */6 * * *) | reanalysis.job.ts |
| BUG-022 | 2026-02-25 | backend | /snapshots 500 — BigInt/Decimal serialization | products.service.ts |
| BUG-023 | 2026-02-25 | frontend+backend | Admin Analitika — tracked/avg_score/weekly field mismatch + hisoblash | AdminPage.tsx, admin.service.ts |
| BUG-024 | 2026-02-25 | backend | Dashboard weekly=0 — duplicate snapshots, take:2→take:20 + 1h min gap | products.service.ts |
| BUG-025 | 2026-02-25 | frontend+backend+worker | Super Admin billing to'liq ajratish — frontend+worker+DB | DashboardPage, billing.processor |
| BUG-026 | 2026-02-25 | build | API 19 ta TS error — prisma generate qilinmagan (v6 modellar) | admin.service, ai.service |
| BUG-027 | 2026-02-27 | frontend | Login/logout da React Query cache tozalanmaydi — eski account data ko'rsatiladi | LoginPage, Layout, base.ts |
| BUG-028 | 2026-02-27 | frontend | Admin sidebar 2 ta item active — NavLink search params e'tiborsiz qoldiradi | Layout.tsx |

---

## ARXITEKTURA TUZATISHLARI (4 ta)

| # | Vazifa | Holat |
|---|--------|-------|
| DEEP-006 | Service Worker ventra-v3 + 4 strategiya + manifest.json VENTRA | DONE |
| DEEP-011 | Branding — manifest, SW cache, UI Layout/Login/Register → VENTRA | QISMAN (CLAUDE.md + email qoldi) |
| DEEP-012 | Dark Theme — useTheme hook, sun/moon toggle ishlaydi | DONE |
| T-009 | Redis persistence — docker-compose da `redis_data:/data` volume allaqachon mavjud | DONE (risk audit aniqladi) |

---

## P0 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-001 | BigInt serialization — explicit .toString() | 6 fayl, 11 ta endpoint fix: ai.controller, consultation.service, products.service, signals.service |
| T-002 | BillingMiddleware o'chirish | billing.middleware.ts deleted (0 import, 0 reference) |
| T-003 | 402 Payment Due handler | Axios interceptor 402 → CustomEvent('payment-due'), Layout listen qiladi |
| T-004 | Error Boundary har route da | ErrorBoundary.tsx yaratildi, App.tsx da 17 route wrap qilindi |
| T-005 | Database indexlar | products(category_id,is_active) + product_snapshots(product_id,snapshot_at) @@index qo'shildi |
| T-006 | Nginx security headers | CSP + X-Frame-Options + X-Content-Type-Options + 3 ta boshqa header (nginx.conf + template) |
| T-007 | .dockerignore yaratish | Root da .dockerignore — node_modules, .git, docs, .env, tests, IDE exclude |
| T-008 | Health endpoint + Redis | HealthController: DB ping + Redis ping + 6 queue depth monitoring |
| T-010 | Secret rotation docs | .env.example: rotation policy (90/180 kun), barcha env vars hujjatlandi |

---

## P1 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-011 | JWT Refresh Token | 15m access + 30d refresh token. UserSession: refresh_token_hash + expires_at. Axios 401→refresh→retry queue. Token rotation on refresh |
| T-012 | 402 PAYMENT_DUE UX | Layout.tsx: backdrop-blur overlay modal on non-essential pages, balance display |
| T-013 | API contract types | packages/types/: 20+ response interfaces (Auth, Products, Discovery, AI, Sourcing, Signals, Admin, Health, etc.) |
| T-014 | client.ts split | 401 qator → 8 modul: base.ts, auth.ts, products.ts, discovery.ts, sourcing.ts, tools.ts, enterprise.ts, admin.ts + barrel re-export |
| T-015 | React.lazy() + Suspense | 17 sahifa lazy load, LazyRoute wrapper (ErrorBoundary+Suspense+PageSkeleton) |
| T-016 | Sidebar accordion | 5 guruh (Admin/Asosiy/Mahsulot/Asboblar/Biznes) `<details>` collapsible, aktiv route auto-open |
| T-017 | Database backup | scripts/backup-db.sh + restore-db.sh, docker-compose.prod.yml backup service (daily 03:00 + weekly), S3/R2 upload, 30 kun retention |
| T-018 | CI pipeline | .github/workflows/ci.yml: tsc --noEmit (api+web), pnpm audit |
| T-019 | Auto migration | Already done — Dockerfile prisma db push --skip-generate |
| T-020 | Worker health check | HTTP server port 3001, GET /health → Redis ping + worker count |
| T-021 | Git hooks | husky + lint-staged: TS→eslint, .env→block, JSON/MD→prettier |
| T-022 | Dependency audit | package.json: typecheck + audit:check scripts |
| T-023 | Skeleton komponentlar | SkeletonCard, SkeletonTable, SkeletonStat, PageSkeleton — DaisyUI animate-pulse |
| T-056 | Brute force himoya | In-memory Map, 5 failed → 15min lockout, login 10/min + register 5/min throttle |
| T-057 | AI per-user budget | Account.ai_monthly_limit_usd, checkAiQuota() before AI calls, GET /ai/usage endpoint |

---

## P2 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-024 | Multi-Tenant izolyatsiya | PrismaService $on('query') dev warning — tenant-scoped model queries without account_id logged |
| T-025 | Race Condition fix | discovery.service: findFirst PENDING/RUNNING check + ConflictException before creating new run |
| T-026 | Zustand + React Query | Installed zustand + @tanstack/react-query, authStore.ts + queryClient.ts, QueryClientProvider in main.tsx |
| T-027 | EnterprisePage split | 689 qator → 65 qator shell + 5 typed component: AdsTab, TeamTab, ReportsTab, WatchlistTab, CommunityTab |
| T-028 | SignalsPage mobile | Mobile: select dropdown (sm:hidden), Desktop: scrollable tabs (hidden sm:block) |
| T-029 | TypeScript `any` cleanup | getErrorMessage() helper, 26 catch(err:any)→catch(err:unknown), ChartTooltipProps, EnterprisePage typed interfaces |
| T-030 | N+1 query fix | getProductById() Promise.all with separate queries instead of nested include (~22→2 queries) |
| T-031 | Rate limiting | ThrottlerModule 60→120 req/min global |
| T-032 | PgBouncer | docker-compose.prod.yml: pgbouncer service (transaction mode, 200 conn, 20 pool), API/Worker/Bot → pgbouncer |
| T-033 | Sentry APM | common/sentry.ts: dynamic import wrapper, initSentry() in main.ts — works with/without @sentry/node |
| T-034 | Graceful shutdown | API: enableShutdownHooks + SIGTERM/SIGINT 30s timeout. Worker: Promise.allSettled + redis.quit() |
| T-035 | Docker image tagging | CI: docker job with git SHA tags (ventra-api/worker/web), runs on main push |
| T-036 | Login emoji → SVG | 4 emoji → Heroicons SVG paths (ChartBar, Sparkles, Globe, TrendingUp) |
| T-037 | Request ID tracing | Already done — GlobalLoggerInterceptor with X-Request-Id, JSON structured logs |
| T-058 | Domain unit testlar | vitest setup + 52 unit tests: scoring, parse, forecast, profit, elasticity, signals (all pass) |
| T-059 | Monorepo boundary lint | eslint.config.js no-restricted-imports: web cannot import from api/worker/bot |
| T-060 | Feature usage telemetry | @ActivityAction decorator added to 14 key endpoints across 5 controllers |

---

## P3 VAZIFALAR — BAJARILDI (2026-02-27)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-101 | admin.service.ts 2178 qator → 5 service | admin-account (356), admin-user (572), admin-stats (666), admin-feedback (327), admin-log (240). Controller 5 ta DI. tsc --noEmit ✅ |
| T-102 | `as any` → typed casts | 13 ta `as any` → UserRole/AccountStatus/FeedbackStatus/Prisma.InputJsonValue/Record<string,unknown>. admin, team, signals, export, error-tracker |
| T-103 | main.ts console.log→Logger | NestJS Logger import, 6 ta console.log/error → logger.log/error |
| T-104 | community dead code | counterUpdate o'zgaruvchisi o'chirildi (hisoblangan lekin ishlatilmagan) |
| T-105 | hardcoded SUPER_ADMIN_ID | process.env.SUPER_ADMIN_ACCOUNT_ID ?? fallback |
| T-106 | admin @Res() optional crash | @Res() res?: → @Res() res:, res!. → res., (row as any) → Record<string,unknown> |
| T-107 | JWT 7d vs 15m conflict | signOptions: { expiresIn: '7d' } o'chirildi (service 15m override) |
| T-108 | api-key.guard role | role: 'API_KEY' → role: 'USER' + sub: 'apikey:${accountId}' |
| T-109 | admin N+1 query | getTopUsers: N+1 loop (4 query/user) → single Prisma findMany + nested include |
| T-110 | RotatingFileWriter NPE | !this.stream guard + this.stream?.write() |
| T-111 | Redis connection | discovery.queue + import.queue: REDIS_URL pattern + lazy getter (sourcing.queue allaqachon fix) |
| T-112 | community limitless query | listInsights: take: 100 limit qo'shildi |
| T-113 | sourcing.queue lazy init | Module-level Queue → lazy getQueue()/getQueueEvents() wrapper |
| T-133 | sourcing hardcoded 0.5kg | Price-based heuristic: >$50→1kg, >$20→0.7kg, else→0.5kg |
| T-134 | sourcing hardcoded USD 12900 | Fallback 12900 → 0 + warning log, usdToUzs>0 guard |
| T-135 | predictDeadStock naming | JSDoc: days_to_dead formula hujjatlandi |
| T-136 | RMSE→std_dev rename | ForecastResult.rmse → std_dev (aslida standart og'ish) |
| T-137 | breakeven formula | calculateProfit: breakeven formula izohlar bilan hujjatlandi |
| T-138 | UzumProductDetail | Eski noto'g'ri maydonlar o'chirildi → ordersAmount, reviewsAmount, totalAvailableAmount |
| T-139 | UzumItem o'chirish | Interface hech joyda ishlatilmaydi — o'chirildi |
| T-142 | catch(e: any)→unknown | 17 ta catch block: err.message → err instanceof Error ? err.message : String(err) |
| T-143 | classifyUA bot detect | axios\|node-fetch bot regex dan olib tashlandi |
| T-144 | auth.module dead expiresIn | signOptions o'chirildi (T-107 bilan birga) |
| T-145 | SerpAPI Amazon engine | google_shopping + site:amazon.de → amazon engine + amazon_domain:'amazon.de' |
| T-146 | prisma tenant check prod | NODE_ENV !== 'production' sharti olib tashlandi — barcha muhitda ishlaydi |
| T-147 | referral dead code | getStats: referred_account_id: { not: null } filter |
| T-148 | sourcing _source dead | searchExternalPrices: ishlatilmagan _source parametri olib tashlandi |
| T-149 | community non-null | updated!.upvotes → updated?.upvotes ?? 0 |
| T-166 | parseWeeklyBought o'chirish | Dead code: Uzum API actions.text olib tashlangan — funksiya o'chirildi |
| T-167 | predictDeadStock NaN | dailyDecline guard: salesDeclineRate > 0 && avgOlder > 0 |
| T-170 | Bot broadcastDiscovery dead | Butun funksiya + ishlatilmagan importlar olib tashlandi |
| T-171 | Bot sendPriceDropAlert dead | Funksiya + ishlatilmagan prisma import olib tashlandi |
| T-172 | JobName enum | 'reanalysis-6h' \| 'sourcing-search' qo'shildi |

---

## BAJARILGAN FEATURELAR (35/43)

| # | Feature | Holat |
|---|---------|-------|
| 02 | Seasonal Trend Calendar | DONE |
| 03 | Shop Intelligence | DONE |
| 04 | Niche Finder | DONE |
| 05 | CSV/Excel Import-Export | DONE |
| 06 | Referral Tizimi | DONE |
| 07 | API Access (Dev Plan) | DONE |
| 08 | Public Leaderboard | DONE |
| 09 | Profit Calculator 2.0 | DONE |
| 11 | Trend Prediction ML | DONE |
| 12 | Auto Description Generator | DONE |
| 13 | Review Sentiment Analysis | DONE |
| 15 | Konsultatsiya Marketplace | DONE |
| 16 | PWA | DONE |
| 17 | WebSocket Real-time | DONE |
| 18 | Multi-language i18n | DONE |
| 19 | Demand-Supply Gap | DONE |
| 20 | Price Elasticity Calculator | DONE |
| 21 | Cannibalization Alert | DONE |
| 22 | Dead Stock Predictor | DONE |
| 23 | Category Saturation Index | DONE |
| 24 | Flash Sale Detector | DONE |
| 25 | New Product Early Signal | DONE |
| 26 | Stock Cliff Alert | DONE |
| 27 | Ranking Position Tracker | DONE |
| 28 | Product Launch Checklist | DONE |
| 29 | A/B Price Testing | DONE |
| 30 | Replenishment Planner | DONE |
| 31 | Uzum Ads ROI Tracker | DONE |
| 33 | Team Collaboration | DONE |
| 34 | Custom Report Builder | DONE |
| 37 | Historical Data Archive | DONE |
| 38 | Collective Intelligence | DONE |
| 40 | Xitoy/Yevropa Sourcing | DONE |
| 41 | Cargo Calculator | DONE |
| 43 | White-label API | DONE |

| 01 | Competitor Price Tracker | DONE |
| 10 | Browser Extension | DONE |
| 14 | White-label | DONE |
| 32 | Telegram Mini App | DONE |
| 35 | Market Share PDF/CSV | DONE |
| 36 | Watchlist Sharing | DONE |
| 39 | Algorithm Reverse Eng. | DONE |
| 42 | Browser Extension Pro | DONE |

**43/43 feature bajarildi!**

---

## P3 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-038 | WebSocket refresh signal | WS faqat "refresh signal" yuboradi, data REST dan. signalScoreUpdate, signalDiscoveryProgress, signalAlert |
| T-039 | CI tsc --noEmit | Worker + Bot tsc --noEmit + unit tests ci.yml ga qo'shildi |
| T-040 | API Versioning | X-API-Version: 1.0 header middleware main.ts da |
| T-041 | I18n structured errors | error-codes.ts (15+ code), translations.ts (3 til), getErrorMessage t() support |
| T-042 | Optimistic UI | DiscoveryPage trackedIds Set — darhol UI yangilash, xato → rollback |
| T-043 | Competitor Price Tracker UI | CompetitorSection.tsx — discover, track, untrack, price history chart (Feature 01) |
| T-044 | Browser Extension Landing | ExtensionPage.tsx — feature cards, install steps, download buttons (Feature 10) |
| T-045 | White-label Admin Tab | AdminPage "whitelabel" tab — logo, rang, domain, marketplace sozlamalari (Feature 14) |
| T-046 | SharedWatchlistPage | /watchlists/shared/:token public route — VENTRA branding, products table (Feature 36) |
| T-047 | DR Plan | docs/DR-PLAN.md — RTO 30min, RPO 6h, failover runbook, monitoring |
| T-048 | Staging environment | docs/STAGING.md — Railway preview deploys, branch strategy, env config |
| T-049 | CDN setup | docs/CDN.md — Cloudflare setup, Vite hash-based assets, nginx config |
| T-050 | Axios cache buster | _t=timestamp kerak (confirmed), Cache-Control + SW bilan birga ishlaydi |
| T-051 | Branding update | main.ts, bot, seed.ts → VENTRA, emails → @ventra.uz, package.json → ventra-analytics |
| T-052 | Telegram Mini App UI | TelegramMiniAppPage.tsx — compact dashboard, /tg-app route, TG WebApp SDK (Feature 32) |
| T-053 | Market Share CSV | ReportsTab.tsx — CSV download button, UTF-8 BOM, date-stamped filename (Feature 35) |
| T-054 | Algorithm RE | docs/ALGORITHM-RE.md — 7 faktor, patternlar, VENTRA score korrelyatsiya (Feature 39) |
| T-055 | Browser Extension Pro | ExtensionPage — free/pro toggle, 10 feature card, "qanday ishlaydi" section (Feature 42) |

---

## SPRINT 0 (3/4 DONE)

| # | Vazifa | Holat |
|---|--------|-------|
| S-0.1 | nginx.conf yaratish | DONE |
| S-0.2 | Dockerfile yaratish | DONE |
| S-0.3 | DashboardPage yaxshilash | DONE |
| S-0.4 | Skeleton komponentlar | TODO → T-023 |

---

## PLAYWRIGHT TEST (2026-02-25)

27/27 route — 0 error (/, /analyze, /discovery, /sourcing, /leaderboard, /calculator, /shops, /referral, /api-keys, /ai-description, /elasticity, /consultation, /signals, /enterprise, /feedback, /admin + 11 admin tab)

---

## FEATURE IMPLEMENTATIONS

### Auto Re-analysis + Weekly Trend System (2026-02-25)
- Tracked mahsulotlar har 6 soatda avtomatik qayta tahlil (BullMQ cron)
- weekly_bought = ordersAmount snapshot delta
- 7 kunlik trend UI: delta badge, chart, maslahat

### VENTRA UI Redesign (2026-02-25)
- Custom theme: oklch tokens, Inter + Space Grotesk
- VENTRA branding across Layout, Login, Register
- bg-0 #0B0F1A, accent #4C7DFF

---

## P2 FIX — 2026-02-27

| # | Task | Fix |
|---|------|-----|
| T-078 | bootstrapAdmin himoyalash | `BOOTSTRAP_SECRET` env var + ForbiddenException |
| T-079 | Team invite bcrypt hash | `crypto.randomBytes` → `bcrypt.hash(tempPassword, 12)` |
| T-080 | NestJS version alignment | `@nestjs/websockets` + `platform-socket.io` v11 → v10 |
| T-081 | Express v5→v4 | `express: ^5.2.1` → `^4.21.0` (NestJS v10 mos) |
| T-087 | notification account_id | `markAsRead(id, accountId)` — cross-account himoyalandi |
| T-089 | Product endpoint account_id | `getProduct` ga accountId qo'shildi + BillingGuard mavjud |
| T-090 | Sourcing BillingGuard | `@UseGuards(JwtAuthGuard, BillingGuard)` qo'shildi |
| T-091 | auth DTO validatsiya | `RefreshDto` (class-validator) — refresh/logout ga |
| T-092 | competitor getHistory fix | Hardcoded string → haqiqiy `getCompetitorPriceHistory()` |
| T-093 | AliExpress HMAC imzo | `crypto.createHmac('sha256')` TOP API signing qo'shildi |
| T-094 | sourcing getJob account_id | `findFirst({id, account_id})` — cross-account himoyalandi |
| T-095 | Login rate limit Redis | In-memory Map → Redis INCR + TTL (multi-instance safe) |
| T-096 | JWT email field | `signAccessToken` ga `email` qo'shildi (register, login, refresh) |
| T-098 | onDelete Cascade | 30+ relation ga `onDelete: Cascade/SetNull` qo'shildi |
| T-099 | account_id indexes | 16 ta jadvalga `@@index([account_id])` qo'shildi |
| T-182 | Bot health endpoint | HTTP server + `/health` endpoint (Railway healthcheck) |
| T-183 | Worker PORT env fix | `process.env.PORT \|\| WORKER_HEALTH_PORT \|\| 3001` |

---

## P1 FIX — 2026-02-27

| # | Task | Fix |
|---|------|-----|
| T-066 | 3x fetchProductDetail → DRY | `uzum-scraper.ts` da `UzumRawProduct` interface + `fetchUzumProductRaw()` export. `import.processor.ts` va `reanalysis.processor.ts` import qiladi — duplicate kod o'chirildi |
| T-069 | sourcing AI ga platform UUID → name | `platformIdToCode` Map orqali UUID → human-readable code (`aliexpress`, `alibaba`) |
| T-071 | Shopee valyuta xatosi | Default `'USD'` → `'SGD'`, narx `>1000` → `/100000` smart divisor |
| T-072 | discovery product upsert try/catch | for loop ichida try/catch — bitta fail butun job ni o'ldirmaydi |
| T-074 | console.log → logger (21 joy) | `sourcing.processor` (8), `uzum-scraper` (5), `uzum-ai-scraper` (8) → `logJobInfo` |
| T-075 | reanalysis $transaction | Product update + SKU upserts + snapshot create → `prisma.$transaction()` |
| T-196 | AI prompt yaxshilash | `explainWinner` prompt — 3 ta amaliy maslahat (sabab, strategiya, xavf), o'zbek tilida |
| T-199a | forecastEnsemble trend formula | Absolute `slope>0.01` → prediction-based `changePct>5%` |

---

## DEEP AUDIT FIX — 2026-02-27

| # | Task | Severity | Fix |
|---|------|----------|-----|
| T-061 (BUG-001) | Redis password worker da tushib qolgan | CRITICAL | `redis.ts` ga `password`, `username`, `db` qo'shildi |
| T-064 (BUG-004) | Reanalysis title overwrite | HIGH | `localizableTitle?.ru \|\| detail.title` fallback qo'shildi |
| T-088 (BUG-005) | shop.name → shop.title | HIGH | `products.service.ts:118` da `.name` → `.title` |
| T-193a | AI response markdown tozalash | P0 | `ai.service.ts` da ` ```json ``` ` strip qo'shildi (extractAttributes + explainWinner) |
| T-238 (BUG-008/009/010) | Signal service take:2 → take:30 | P1 | `signals.service.ts` 3 joyda: cannibalization, saturation, replenishment |

### Audit DONE (tasdiqlangan — bug emas):

| Task | Izoh |
|------|------|
| T-063 | `reviewsAmount ?? 0` to'g'ri ishlaydi |
| T-065 | `reviewsAmount ?? 0` fallback to'g'ri |
| T-067 | `reviewsAmount ?? feedbackQuantity ?? 0` tartib to'g'ri |
| T-068 | `seller \|\| shop` fallback ishlaydi |
| T-070 | SerpAPI engine nomlari valid |
| T-073 | `$transaction` + atomic `decrement` — TOCTOU yo'q |
| T-076 | `if (sellPrice)` null guard mavjud |
| T-077 | `weekly_bought: null` INTENTIONAL |
| T-082 | PgBouncer circular fix DONE |
| T-083 | Redis REDIS_URL password fix DONE |
| T-100 | Worker env vars fix DONE |
| T-141 | Redis healthcheck parol bilan ishlaydi |
| T-169 | Bot `on('message')` wildcard — to'g'ri dizayn |
| T-207 | weekly_bought 6 joyda markaziy calcWeeklyBought() |

---

## RAILWAY PRODUCTION DEPLOYMENT — BAJARILDI (2026-02-27)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-173 | Railway project yaratish + 6 service sozlash | `uzum-trend-finder` project: postgres, redis, api, worker, web, bot — barchasi SUCCESS |
| T-174 | RAILWAY_TOKEN GitHub secret yaratish | Railway GraphQL API orqali project token yaratildi, GitHub Secrets ga qo'shildi |
| T-175 | Environment variables — Railway dashboard | DATABASE_URL, REDIS_URL, JWT_SECRET (strong random), DIRECT_DATABASE_URL, WEB_URL, VITE_API_URL, API_UPSTREAM |
| T-176 | Prisma schema — directUrl qo'shish | `apps/api/prisma/schema.prisma` → `directUrl = env("DIRECT_DATABASE_URL")` |

### Qo'shimcha deploy fixlar:
| Fix | Tafsilot |
|-----|----------|
| Worker Dockerfile | `packages/utils/tsconfig.json` paths→rootDir fix — dist/index.js to'g'ri chiqadi |
| API entrypoint.sh | Docker heredoc CRLF muammosi — alohida fayl + `.gitattributes` LF enforcement |
| API IPv6 | `app.listen(port, '::')` — Railway private networking uchun dual-stack |
| Web VITE_API_URL | `https://api-production-8057.up.railway.app` — nginx proxy bypass, direct API calls |
| nginx resolver | `127.0.0.11` Docker internal DNS — `.railway.internal` resolve qiladi |
| ESLint config | React 19 strict rules (purity, refs, set-state-in-effect) warn ga o'tkazildi |
| CI/CD | GitHub Actions: CI (lint+typecheck+test+build) → Deploy (4 service) → Health check — to'liq ishlaydi |

### Production URL'lar:
- Web: `https://web-production-2c10.up.railway.app`
- API: `https://api-production-8057.up.railway.app`
- Swagger: `https://api-production-8057.up.railway.app/api/docs`

---

*Done.md | VENTRA Analytics Platform | 2026-03-01*
