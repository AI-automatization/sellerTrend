# VENTRA — BARCHA OCHIQ VAZIFALAR
# Manba: DEEP_ANALYSIS + DEVOPS_AUDIT + FRONTEND_TODO + GPT_AUDIT
# Yangilangan: 2026-02-26
# Jami: 60 ta vazifa | P0: ✅ DONE (9/9) | P1: ✅ DONE (15/15) | P2: 17 | P3: 19

---

## QOIDALAR

- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Format: `T-XXX | [KATEGORIYA] | Sarlavha | Mas'ul | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI

---

# P0 — ✅ BAJARILDI (9/9) → docs/Done.md ga ko'chirildi

---

# P1 — ✅ BAJARILDI (15/15) → docs/Done.md ga ko'chirildi

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
| T-058 | BACKEND | Domain unit testlar — jest/vitest setup + signals, billing, scoring algorithm testlar (hozir 0 ta unit test) | Bekzod | 6-8s |
| T-059 | IKKALASI | Monorepo boundary lint — eslint-plugin-boundaries + no-restricted-imports (apps/ cross-import taqiqlash) | Ikkalasi | 2s |
| T-060 | BACKEND | Feature usage telemetry — qaysi feature qancha ishlatiladi (CAC/LTV/funnel hisoblash uchun asos) | Bekzod | 4-6s |

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

| Prioritet | Soni | Holat |
|-----------|------|-------|
| P0 KRITIK | 9 | ✅ DONE (9/9) |
| P1 MUHIM | 15 | ✅ DONE (15/15) |
| P2 O'RTA | 17 | OCHIQ |
| P3 PAST | 19 | OCHIQ |
| **JAMI** | **60** | **24 DONE / 36 OCHIQ** |

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-26*
