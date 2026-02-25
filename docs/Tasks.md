# VENTRA — BARCHA OCHIQ VAZIFALAR
# Manba: DEEP_ANALYSIS + DEVOPS_AUDIT + FRONTEND_TODO
# Yangilangan: 2026-02-26
# Jami: 55 ta vazifa | P0: 10 | P1: 13 | P2: 14 | P3: 18

---

## QOIDALAR

- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Format: `T-XXX | [KATEGORIYA] | Sarlavha | Mas'ul | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI

---

# P0 — KRITIK (deploy oldin) ~5 soat

| # | Kategoriya | Vazifa | Mas'ul | Vaqt |
|---|-----------|--------|--------|------|
| T-001 | BACKEND | BigInt global serializer — `BigInt.prototype.toJSON` main.ts ga qo'shish | Bekzod | 30m |
| T-002 | BACKEND | BillingMiddleware o'chirish — faqat BillingGuard qoldirish (dublikat, bypass xavfi) | Bekzod | 15m |
| T-003 | FRONTEND | 402 handler — Axios interceptor da 402 → billing state yangilash (hozir silent fail) | Sardor | 1s |
| T-004 | FRONTEND | Error Boundary — bitta component crash → butun sahifa oq ekran bo'lmasin | Sardor | 1-2s |
| T-005 | BACKEND | Database indexlar qo'shish — products(category_id), snapshots(product_id,snapshot_at), flash_sales(started_at) | Bekzod | 30m |
| T-006 | DEVOPS | Nginx security headers — X-Frame-Options, HSTS, CSP, Referrer-Policy, Permissions-Policy | Bekzod | 30m |
| T-007 | DEVOPS | .dockerignore yaratish — node_modules, .git, dist, .env*, docs, *.md | Bekzod | 15m |
| T-008 | DEVOPS | Health endpoint — Redis ping + queue depth qo'shish (hozir faqat Postgres) | Bekzod | 30m |
| T-009 | DEVOPS | Redis persistence — `appendonly yes` + volume mount | Bekzod | 15m |
| T-010 | DEVOPS | Secretlarni rotate — JWT_SECRET, ANTHROPIC_API_KEY, BOT_TOKEN (git tarixida exposed) | Bekzod | 1s |

---

# P1 — MUHIM (1 hafta) ~35 soat

| # | Kategoriya | Vazifa | Mas'ul | Vaqt |
|---|-----------|--------|--------|------|
| T-011 | IKKALASI | JWT Refresh Token — httpOnly cookie, 15m access + 7d refresh, Axios interceptor 401→refresh→retry | Ikkalasi | 4-6s |
| T-012 | IKKALASI | 402 PAYMENT_DUE UX — to'lov tugagan user faqat Dashboard+Billing ko'rsin, qolganlari modal overlay | Ikkalasi | 3s |
| T-013 | IKKALASI | API contract — packages/types/ da barcha API response interface, CI type check | Ikkalasi | 4-6s |
| T-014 | FRONTEND | client.ts bo'lish — 500+ qator → api/ papka: auth.api.ts, products.api.ts, signals.api.ts... | Sardor | 2-3s |
| T-015 | FRONTEND | React.lazy() + Suspense — 16+ sahifa statik import → code splitting | Sardor | 2s |
| T-016 | FRONTEND | Sidebar accordion — 16+ link → 4-5 guruh + yechiluvchi (Miller's Law: max 7) | Sardor | 3-4s |
| T-017 | DEVOPS | Database backup — kunlik pg_dump → S3/R2, haftalik to'liq backup, oylik restore test | Bekzod | 4-6s |
| T-018 | DEVOPS | CI pipeline — tsc --noEmit (api+web+worker), pnpm audit, docker build, api lint qo'shish | Bekzod | 3-4s |
| T-019 | DEVOPS | Auto migration olib tashlash — prisma db push CMD dan → alohida CI step | Bekzod | 1-2s |
| T-020 | DEVOPS | Worker + Bot health check — minimal HTTP /health endpoint + Redis ping | Bekzod | 2s |
| T-021 | DEVOPS | Git hooks — husky + lint-staged (eslint, .env block) | Bekzod | 1s |
| T-022 | DEVOPS | Dependency vulnerability scan — pnpm audit CI ga + Dependabot enable | Bekzod | 30m |
| T-023 | FRONTEND | Skeleton komponentlar — SkeletonCard, SkeletonTable, SkeletonStat (loading state) | Sardor | 2s |

---

# P2 — O'RTA (2-3 hafta) ~55 soat

| # | Kategoriya | Vazifa | Mas'ul | Vaqt |
|---|-----------|--------|--------|------|
| T-024 | BACKEND | Multi-Tenant izolyatsiya — Prisma $use() middleware yoki PostgreSQL RLS (account_id global filter) | Bekzod | 3-4s |
| T-025 | BACKEND | Race Condition fix — BullMQ da product_id unique job + SELECT FOR UPDATE | Bekzod | 2-3s |
| T-026 | FRONTEND | Global State — Zustand (auth, billing) + React Query (API caching, stale data) | Sardor | 6-8s |
| T-027 | FRONTEND | EnterprisePage split — Ads, Team, Reports, Watchlist, Community → alohida sahifalar | Sardor | 4-6s |
| T-028 | FRONTEND | SignalsPage mobile — 10 tab → mobile: select dropdown, desktop: scrollable tabs | Sardor | 2s |
| T-029 | FRONTEND | TypeScript `any` tozalash — tsconfig noImplicitAny:true, barcha any → interface | Sardor | 3-4s |
| T-030 | BACKEND | N+1 query fix — 50 tracked product → 50 snapshot query → pagination + LATERAL JOIN | Bekzod | 3-4s |
| T-031 | BACKEND | Rate limiting per-account — Free=30, Pro=120, Enterprise=unlimited; og'ir endpoint alohida | Bekzod | 3-4s |
| T-032 | BACKEND | PgBouncer — connection pooling (transaction mode, max_client_conn=200, pool_size=20) | Bekzod | 2-3s |
| T-033 | DEVOPS | APM/Sentry — @sentry/nestjs + @sentry/react, error tracking, alert Telegram ga | Bekzod | 4-6s |
| T-034 | BACKEND | Graceful shutdown — enableShutdownHooks, SIGTERM handler, BullMQ worker.close() | Bekzod | 2s |
| T-035 | DEVOPS | Docker image tagging — git SHA yoki semver tag, latest dan voz kechish | Bekzod | 1s |
| T-036 | FRONTEND | Login Page emoji → icons — professional SVG iconlar yoki Heroicons | Sardor | 1s |
| T-037 | DEVOPS | Log aggregation — stdout + Loki/Grafana yoki Railway logs, request ID tracing | Bekzod | 4-8s |

---

# P3 — PAST (keyinroq / backlog) ~35 soat

| # | Kategoriya | Vazifa | Mas'ul | Vaqt |
|---|-----------|--------|--------|------|
| T-038 | IKKALASI | WebSocket/REST conflict — WS faqat "refresh signal", data REST dan (single source of truth) | Ikkalasi | 2s |
| T-039 | IKKALASI | Shared Types CI — tsc --noEmit barcha app lar uchun CI da | Ikkalasi | 1s |
| T-040 | BACKEND | API Versioning — breaking change uchun deprecation header + changelog | Bekzod | 2s |
| T-041 | IKKALASI | I18n structured errors — backend: { code: 'X' }, frontend: code → tarjima | Ikkalasi | 3s |
| T-042 | FRONTEND | Optimistic UI — "Kuzatuvga olish" → darhol UI yangilash, xato → rollback | Sardor | 3-4s |
| T-043 | FRONTEND | Competitor Price Tracker UI — ProductPage "Raqiblar narxi" tab, chart, jadval (Feature 01) | Sardor | 4-6s |
| T-044 | FRONTEND | Browser Extension Landing — ExtensionPage, install steps, Chrome/Firefox links (Feature 10) | Sardor | 2s |
| T-045 | FRONTEND | White-label UI — AdminPage tab: logo upload, rang tanlash, custom domain (Feature 14) | Sardor | 3s |
| T-046 | FRONTEND | SharedWatchlistPage — /shared/watchlist/:token route (Feature 36) | Sardor | 2s |
| T-047 | DEVOPS | DR Plan — RTO/RPO hujjatlash, runbook, failover rejasi | Bekzod | 2-3s |
| T-048 | DEVOPS | Staging environment — Railway preview deployment, feature branch → staging → prod | Bekzod | 4-6s |
| T-049 | DEVOPS | CDN — Cloudflare/CloudFront, Vite build assets → CDN, nginx faqat API proxy | Bekzod | 2-3s |
| T-050 | FRONTEND | Axios cache buster — _t=timestamp kerakligini tekshirish (Cache-Control bor), keraksiz bo'lsa olib tashlash | Sardor | 30m |
| T-051 | IKKALASI | CLAUDE.md branding — "Uzum Trend Finder" → "VENTRA", email domain @uzum-trend.uz yangilash | Ikkalasi | 30m |
| T-052 | FRONTEND | Telegram Mini App UI — bot ichida lightweight dashboard (Feature 32) | Sardor | 4-6s |
| T-053 | FRONTEND | Market Share PDF — export hisobot, jadval + chart → PDF generate (Feature 35) | Sardor | 3-4s |
| T-054 | BACKEND | Algorithm Reverse Engineering — Uzum ranking/search algoritm tahlili (Feature 39) | Bekzod | 6-8s |
| T-055 | FRONTEND | Browser Extension Pro — advanced version, inline score overlay (Feature 42) | Sardor | 4-6s |

---

## XULOSA

| Prioritet | Soni | Taxminiy vaqt | Mas'ul taqsimoti |
|-----------|------|--------------|-----------------|
| P0 KRITIK | 10 | ~5 soat | Bekzod: 8, Sardor: 2 |
| P1 MUHIM | 13 | ~35 soat | Bekzod: 7, Sardor: 4, Ikkalasi: 2 |
| P2 O'RTA | 14 | ~55 soat | Bekzod: 7, Sardor: 5, Devops: 2 |
| P3 PAST | 18 | ~55 soat | Bekzod: 5, Sardor: 8, Ikkalasi: 5 |
| **JAMI** | **55** | **~150 soat** | |

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-26*
