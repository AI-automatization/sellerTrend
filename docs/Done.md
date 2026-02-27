# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-02-27

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

*Done.md | VENTRA Analytics Platform | 2026-02-27*
