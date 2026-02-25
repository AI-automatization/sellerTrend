# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-02-26

---

## TUZATILGAN BUGLAR (26 ta)

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

**Qolgan 8 ta → docs/Tasks.md:** T-043 (F01), T-044 (F10), T-045 (F14), T-046 (F36), T-052 (F32), T-053 (F35), T-054 (F39), T-055 (F42)

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
