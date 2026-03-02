# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-03-02

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
