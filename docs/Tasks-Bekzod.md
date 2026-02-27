# BEKZOD — Vazifalar
# Fayllar: apps/api/, apps/worker/, apps/bot/, packages/*, docker-*, .github/*, prisma
# Yangilangan: 2026-02-27
# Oxirgi audit: 2026-02-27 (kod tekshiruvi)

---

# ✅ AUDIT NATIJASI — DONE (kod tekshiruvida tasdiqlangan)

| Task | Holat | Izoh |
|------|-------|------|
| T-063 | ✅ DONE | `reviewsAmount ?? 0` to'g'ri ishlaydi |
| T-065 | ✅ DONE | `reviewsAmount ?? 0` fallback to'g'ri |
| T-067 | ✅ DONE | `reviewsAmount ?? feedbackQuantity ?? 0` tartib to'g'ri |
| T-068 | ✅ DONE | `seller \|\| shop` — fallback orqali ishlaydi |
| T-070 | ✅ DONE | SerpAPI engine nomlari valid (`1688`, `taobao`, `alibaba`) |
| T-073 | ✅ DONE | `prisma.$transaction` + atomic `decrement` — TOCTOU yo'q |
| T-076 | ✅ DONE | `if (sellPrice)` null guard mavjud |
| T-077 | ✅ BUG EMAS | `weekly_bought: null` — snapshot delta yo'q, INTENTIONAL |
| T-141 | ✅ DONE | Prod da Redis healthcheck parol bilan ishlaydi |
| T-169 | ✅ BUG EMAS | `bot.on('message')` — wildcard handler, to'g'ri dizayn |

---

# QO'LDA QILINADIGAN ISHLAR (.env)

### E-003 | `WEB_URL` qo'shish — CORS xatosi | 5min
- `apps/api/.env` → `WEB_URL=http://localhost:5173`
- `.env` (root) → `WEB_URL=http://localhost:5173`

### E-004 | `JWT_SECRET` root va api da BIR XIL qilish | 5min
- Root `/.env` dagi `JWT_SECRET` ni `apps/api/.env` dagi bilan tenglashtirish

### E-005 | `SERPAPI_API_KEY` olish va yozish | 5min
- https://serpapi.com → key olish
- `apps/api/.env`, `apps/worker/.env`, `.env` → `SERPAPI_API_KEY=xxx`

### E-006 | `ALIEXPRESS_APP_KEY` + `SECRET` olish | 5min
- AliExpress Developer Portal → key olish
- `apps/api/.env`, `apps/worker/.env`, `.env` → yozish

### E-007 | `NODE_ENV=development` qo'shish | 2min
- `apps/api/.env`, `apps/worker/.env`

### E-008 | `REDIS_URL` parol bilan | 2min
### E-009 | `SENTRY_DSN` olish (optional) | 2min
### E-010 | `PROXY_URL` (kerak bo'lganda) | 2min

---

# RAILWAY DEPLOY (Manual)

### T-173 | Railway project + 6 service sozlash | 1h
### T-174 | RAILWAY_TOKEN GitHub secret | 5min
### T-175 | Env vars Railway dashboard | 15min
### T-176 | Prisma schema directUrl | 5min — `apps/api/prisma/schema.prisma`
### T-177 | pgvector extension | 5min
### T-178 | Custom domain + SSL | 10min
### T-179 | Worker memory limit tekshirish | 15min
### T-180 | Monitoring + Uptime | 15min
### T-181 | DB backup tekshirish | 10min
### T-184 | Staging environment (optional) | 30min

---

# P0 — ✅ BAJARILDI (4/4) → docs/Done.md ga ko'chirildi

| Task | Fix |
|------|-----|
| T-061 | redis.ts — password, username, db qo'shildi |
| T-062 | ~~Bug emas~~ — Anthropic SDK crash qilmaydi, graceful fallback |
| T-064 | reanalysis.processor — localizableTitle?.ru fallback qo'shildi |
| T-193a | ai.service.ts — markdown ``` strip qo'shildi |

---

# P1 — MUHIM

### T-066 | 3x fetchProductDetail → 1 ta DRY | 45min
`uzum-scraper.ts` dan bitta canonical funksiya export qilish.
`import.processor.ts:18-25`, `reanalysis.processor.ts:32-43` import qiladi.
**Bu task T-064 ni ham hal qiladi (title fallback).**

### T-069 | sourcing AI ga platform UUID emas, nomi | 20min
`apps/worker/src/processors/sourcing.processor.ts:446`

### T-071 | Shopee valyuta xatosi | 20min
`apps/worker/src/processors/sourcing.processor.ts:263,427`

### T-072 | discovery product upsert try/catch | 20min
`apps/worker/src/processors/discovery.processor.ts:120-149`

### T-074 | console.log → logger (40+ joy) | 45min
`apps/worker/` barcha fayllar

### T-075 | reanalysis tranzaksiyasiz | 20min
`apps/worker/src/processors/reanalysis.processor.ts:77-132` → `$transaction()`

### T-196 | AI prompt yaxshilash — amaliy maslahat | 45min
`apps/api/src/ai/ai.service.ts:225-248` — yangi prompt yozish
Sardor frontend da toggle qo'shadi (T-196b). Bu AVVAL bajarilsin.

### T-199a | forecastEnsemble trend formula fix (BACKEND) | 10min
`packages/utils/src/index.ts:342` — prediction-based changePct ishlatish
Sardor frontend textni yangilaydi (T-199b).

---

# P2 — O'RTA

### T-078 | bootstrapAdmin himoyalash | 30min — `apps/api/src/auth/auth.controller.ts`
### T-079 | Team invite bcrypt hash | 20min — `apps/api/src/team/team.service.ts`
### T-080 | NestJS v10/v11 versiya fix | 30min — `apps/api/package.json`
### T-081 | Express v5→v4 tushirish | 20min — `apps/api/package.json`
### T-087 | notification account_id | 15min — `notification.service.ts`
### ~~T-088~~ | ✅ DONE → Done.md | shop.name→shop.title fix
### T-089 | Product endpoint account_id | 30min — `products.controller.ts`
### T-090 | Sourcing BillingGuard | 10min — `sourcing.controller.ts`
### T-091 | auth DTO validatsiya | 15min — `auth.controller.ts`
### T-092 | competitor getHistory fix | 15min — `competitor.controller.ts`
### T-093 | AliExpress HMAC imzo | 45min — `aliexpress.client.ts`
### T-094 | sourcing getJob account_id | 10min — `sourcing.controller.ts`
### T-095 | Login rate limit Redis | 30min — `auth.service.ts`
### T-096 | JWT email field qo'shish | 15min — backend JWT payload
### T-098 | onDelete Cascade | 30min — `schema.prisma`
### T-099 | account_id indekslari | 20min — `schema.prisma`
### T-182 | Bot health endpoint | 15min — `apps/bot/src/main.ts`
### T-183 | Worker PORT env fix | 5min — `apps/worker/src/main.ts`

---

# P3 — PAST

### T-101 | admin.service 2186 qator bo'lish | 2h
### T-102 | `as any` 30+ joy | 1h
### T-103 | main.ts console.log→Logger | 10min
### T-104 | community dead code | 5min
### T-105 | hardcoded SUPER_ADMIN_ID | 15min
### T-106 | admin @Res() optional crash | 15min
### T-107 | JWT 7d vs 15m conflict | 10min
### T-108 | api-key.guard role | 10min
### T-109 | admin N+1 query | 30min
### T-110 | RotatingFileWriter NPE | 10min
### T-111 | Redis connection nomuvofiq | 15min
### T-112 | community limitless query | 15min
### T-113 | sourcing.queue lazy init | 15min
### T-133 | sourcing hardcoded 0.5kg | 15min
### T-134 | sourcing hardcoded USD 12900 | 10min
### T-135 | predictDeadStock naming | 5min
### T-136 | RMSE→std_dev rename | 5min
### T-137 | breakeven formula | 15min
### T-138 | packages/types UzumProductDetail | 15min
### T-139 | packages/types UzumItem | 10min
### T-142 | catch(e: any)→unknown | 15min
### T-143 | classifyUA bot detect | 10min
### T-144 | auth.module dead expiresIn | 5min
### T-145 | SerpAPI Amazon engine | 10min
### T-146 | prisma tenant check prod | 10min
### T-147 | referral dead code | 10min
### T-148 | sourcing _source dead | 5min
### T-149 | community non-null | 5min
### T-150 | consultant_id naming | 10min
### T-166 | parseWeeklyBought o'chirish | 5min
### T-167 | predictDeadStock NaN | 5min
### T-170 | Bot broadcastDiscovery dead | 5min
### T-171 | Bot sendPriceDropAlert dead | 5min
### T-172 | JobName enum 2 ta qo'shish | 5min

---

## XULOSA

| Prioritet | Tasklar |
|-----------|---------|
| ✅ DONE (audit + fix) | 19 |
| .env (manual) | 8 |
| Railway (manual) | 10 |
| P0 KRITIK | ✅ 0 (HAMMASI BAJARILDI) |
| P1 MUHIM | 8 |
| P2 O'RTA | 17 |
| P3 PAST | 30 |
| **JAMI ochiq** | **73** |

---
*Tasks-Bekzod.md | VENTRA | 2026-02-27*
