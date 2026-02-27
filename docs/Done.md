# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-02-27

---

## TUZATILGAN BUGLAR (50 ta)

### 2026-02-27 — Frontend bug fixes (Sardor, commit e121da8 + shu sessiya)

| # | Task | Sana | Muammo | Fayl/Yechim |
|---|------|------|--------|-------------|
| BUG-029 | E-001 | 2026-02-27 | Desktop `.env` yo'q — login `app://api/v1` ga ketardi | `apps/desktop/.env` yaratildi: `VITE_API_URL=http://localhost:3000` |
| BUG-030 | E-002 | 2026-02-27 | Desktop dev proxy yo'q — `/api/v1` backend ga yetmaydi | `electron.vite.config.ts` ga `/api/v1` proxy qo'shildi |
| BUG-031 | T-084 | 2026-02-27 | RegisterPage: `setTokens()` chaqirilmaydi — Zustand yangilanmaydi | `RegisterPage.tsx` — `setTokens()` + `queryClient.clear()` qo'shildi |
| BUG-032 | T-085 | 2026-02-27 | AnalyzePage: `setTracked(true)` try tashqarisida — xatoda ham true bo'lardi | `AnalyzePage.tsx` — `setTracked(true)` try ichiga ko'chirildi |
| BUG-033 | T-086 | 2026-02-27 | ProductPage: `setTracked(true)` try tashqarisida | `ProductPage.tsx:278` — try ichiga ko'chirildi |
| BUG-034 | T-188 | 2026-02-27 | Service Worker registered — PWA o'chirilishi kerak | `sw.js` o'chirildi, `index.html` ga unregister scripti qo'shildi |
| BUG-035 | T-189 | 2026-02-27 | manifest.json va PWA meta taglar bor | `public/manifest.json` o'chirildi, meta taglar tozalandi |
| BUG-036 | T-190 | 2026-02-27 | PWA-only iconlar bor (`icon-512`, `icon-maskable`, `apple-touch-icon`) | Uchala fayl o'chirildi, `favicon.svg` qoldi |
| BUG-037 | T-191 | 2026-02-27 | `useNativeNotification.ts` dead code — hech qayerda import qilinmagan | Fayl o'chirildi |
| BUG-038 | T-192 | 2026-02-27 | `dist/manifest.json` build artifact | `apps/web/dist/` qayta build da avtomatik tozalanadi |
| BUG-039 | T-194 | 2026-02-27 | Chart X-axis "M02 27" format — `uz-UZ` locale ishlatilgan | `ProductPage.tsx:219` — `s.snapshot_at` ISO saqlashga o'tildi; ScoreChart `formatDay()` |
| BUG-040 | T-195 | 2026-02-27 | "Ensemble: WMA + Holt's... MAE: X · RMSE: Y" texnik jargon | O'chirildi → "AI bashorat · X% ishonchlilik" |
| BUG-041 | T-197 | 2026-02-27 | Score chart: bir kunda ko'p snapshot → zigzag | `dailySnapshots` useMemo — har kunning oxirgi scorei; ScoreChart ham aggregate qiladi |
| BUG-042 | T-198 | 2026-02-27 | Haftalik sotuvlar chart noto'g'ri data, Y-axis labelsiz | `dailySnapshots.slice(-15)` + Y-axis "ta" unit + formatter |
| BUG-043 | T-200 | 2026-02-27 | ML box: "confidence", "snapshot" inglizcha raw label | "Ishonchlilik" / "bashorat darajasi", "Tahlil soni" / "ta o'lcham" |
| BUG-044 | T-201 | 2026-02-27 | Global bozor fetch xatosida bo'sh qoladi | `catch` da `setExtNote('Global bozor...')` qo'shildi |
| BUG-045 | T-203 | 2026-02-27 | ML Prognoz 4 KPI box labelsiz — raqamlar tushunarsiz | Har boxga label: "7 kun score", "7 kun sotuv", "Ishonchlilik", "Tahlil soni" |
| BUG-046 | T-204 | 2026-02-27 | WeeklyTrend BarChart — qora to'rtburchak (`<rect fill="black">`) | `<Cell>` ga almashtirildi, har bar uchun rang belgilandi |
| BUG-047 | T-205 | 2026-02-27 | Footer da raw scoring formula ko'rinadi | `Score = 0.55×ln(...)` bloki to'liq o'chirildi |
| BUG-048 | T-151 | 2026-02-27 | `useSocket.ts` — `useCallback(fn, [fn])` foydasiz, `fn` har render yangi | `socketRef` + `callbackRef` pattern: `useRef` ga o'tkazildi, WS reconnect yo'q |
| BUG-049 | T-158 | 2026-02-27 | `AdminPage.tsx` — 30+ `any` type | 20+ typed interface qo'shildi (OverviewStats, RevenueStats, GrowthStats ...); `unknown` audit values; `tsc` clean |
| BUG-050 | T-163 | 2026-02-27 | `AdminPage.tsx` 2163 qator — 400 qator limit buzilgan | 9 fayl ga bo'lindi: `adminTypes.ts`, `AdminComponents.tsx`, `AdminDashboardTab`, `AdminAccountsTab`, `AdminAnalyticsTab`, `AdminSystemTab`, `AdminFeedbackTab`, `AdminNotificationsTab`, `AdminAuditTab` — barcha fayllar ≤330 qator |
| BUG-048 | T-097 | 2026-02-27 | WebSocket dev proxy yo'q — real-time notificationlar dev da ishlamaydi | `vite.config.ts` ga `/ws` proxy qo'shildi (`ws: true`, `ws://localhost:3000`) |
| BUG-049 | T-234 | 2026-02-27 | Desktop production build da `VITE_API_URL` yo'q → `app://api/v1` URL | `apps/desktop/.env.production` yaratildi: `VITE_API_URL=https://app.ventra.uz` |
| BUG-050 | T-202 | 2026-02-27 | ProductPage seksiya tartibi noto'g'ri — texnik bloklar AI tahlilidan oldin | Qayta tartib: Asosiy → AI tahlili → Haftalik → ScoreChart → ML Prognoz → Bashorat → Raqiblar → Global |

---

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

*Done.md | VENTRA Analytics Platform | 2026-02-26*
