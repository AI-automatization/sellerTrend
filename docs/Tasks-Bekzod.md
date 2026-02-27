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
- `.env` (root) → `WEB_URL=http://localhost:5173` ✅ DONE

### E-004 | `JWT_SECRET` root va api da BIR XIL qilish | 5min
- Root `/.env` dagi `JWT_SECRET` ni `apps/api/.env` dagi bilan tenglashtirish ✅ DONE

### E-005 | `SERPAPI_API_KEY` olish va yozish | 5min 
- https://serpapi.com → key olish
- `apps/api/.env`, `apps/worker/.env`, `.env` → `SERPAPI_API_KEY=xxx` ✅ DONE

### E-006 | `ALIEXPRESS_APP_KEY` + `SECRET` olish | 5min
- AliExpress Developer Portal → key olish
- `apps/api/.env`, `apps/worker/.env`, `.env` → yozish ❌ Regionni deb ro'yxatdan o'tib bo'lmadi

### E-007 | `NODE_ENV=development` qo'shish | 2min
- `apps/api/.env`, `apps/worker/.env` ✅ DONE

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

# P1 — ✅ BAJARILDI (8/8) → docs/Done.md ga ko'chirildi

| Task | Fix |
|------|-----|
| T-066 | `fetchUzumProductRaw()` DRY — 3 nusxa → 1 shared funksiya |
| T-069 | platformIdToCode Map — UUID → human-readable code |
| T-071 | Shopee: USD→SGD, smart price divisor |
| T-072 | discovery upsert try/catch — fail-safe loop |
| T-074 | 21 joyda console.log → logJobInfo |
| T-075 | reanalysis $transaction() atomic |
| T-196 | AI prompt: 3 amaliy maslahat, o'zbek tili |
| T-199a | forecastEnsemble: slope → changePct (5%) |

---

# P2 — ✅ BAJARILDI (17/17) → docs/Done.md ga ko'chirildi

| Task | Fix |
|------|-----|
| T-078 | bootstrapAdmin — BOOTSTRAP_SECRET env var himoyasi |
| T-079 | Team invite — bcrypt.hash(tempPassword, 12) |
| T-080 | NestJS websockets v11→v10 alignment |
| T-081 | Express v5→v4 downgrade |
| T-087 | notification.markAsRead — account_id filter |
| T-088 | shop.name → shop.title (oldindan done) |
| T-089 | Product endpoint — account_id param |
| T-090 | Sourcing controller — BillingGuard qo'shildi |
| T-091 | auth refresh/logout — RefreshDto validatsiya |
| T-092 | competitor getHistory — haqiqiy service call |
| T-093 | AliExpress API — HMAC-SHA256 sign |
| T-094 | sourcing getJob — account_id filter |
| T-095 | Login rate limit — Redis INCR+TTL |
| T-096 | JWT payload — email field qo'shildi |
| T-098 | onDelete: Cascade — ~30 relation |
| T-099 | @@index([account_id]) — 16 jadval |
| T-182 | Bot health — HTTP /health endpoint |
| T-183 | Worker PORT — process.env.PORT fallback |

---

# P3 — ✅ BAJARILDI (31/34 — 3 ta skip: T-101 2h refactor, T-150 migration kerak, T-141/T-169 oldin done)

| # | Vazifa | Holat |
|---|--------|-------|
| T-102 | `as any` 13 ta typed cast | ✅ |
| T-103 | main.ts console.log→Logger | ✅ |
| T-104 | community dead code | ✅ |
| T-105 | hardcoded SUPER_ADMIN_ID | ✅ |
| T-106 | admin @Res() optional crash | ✅ |
| T-107 | JWT 7d vs 15m conflict | ✅ |
| T-108 | api-key.guard role | ✅ |
| T-109 | admin N+1 query | ✅ |
| T-110 | RotatingFileWriter NPE | ✅ |
| T-111 | Redis connection nomuvofiq | ✅ |
| T-112 | community limitless query | ✅ |
| T-113 | sourcing.queue lazy init | ✅ |
| T-133 | sourcing hardcoded 0.5kg | ✅ |
| T-134 | sourcing hardcoded USD 12900 | ✅ |
| T-135 | predictDeadStock naming | ✅ |
| T-136 | RMSE→std_dev rename | ✅ |
| T-137 | breakeven formula | ✅ |
| T-138 | packages/types UzumProductDetail | ✅ |
| T-139 | packages/types UzumItem | ✅ |
| T-142 | catch(e: any)→unknown (17 ta) | ✅ |
| T-143 | classifyUA bot detect | ✅ |
| T-144 | auth.module dead expiresIn | ✅ |
| T-145 | SerpAPI Amazon engine | ✅ |
| T-146 | prisma tenant check prod | ✅ |
| T-147 | referral dead code | ✅ |
| T-148 | sourcing _source dead | ✅ |
| T-149 | community non-null | ✅ |
| T-166 | parseWeeklyBought o'chirish | ✅ |
| T-167 | predictDeadStock NaN | ✅ |
| T-170 | Bot broadcastDiscovery dead | ✅ |
| T-171 | Bot sendPriceDropAlert dead | ✅ |
| T-172 | JobName enum 2 ta qo'shish | ✅ |
| T-101 | admin.service 2186 qator bo'lish | ⏭ Skip (2h refactor) |
| T-150 | consultant_id naming | ⏭ Skip (migration kerak) |

---

## XULOSA

| Prioritet | Tasklar |
|-----------|---------|
| ✅ DONE (audit + fix) | 19 |
| .env (manual) | 8 |
| Railway (manual) | 10 |
| P0 KRITIK | ✅ 0 (HAMMASI BAJARILDI) |
| P1 MUHIM | ✅ 0 (HAMMASI BAJARILDI) |
| P2 O'RTA | ✅ 0 (HAMMASI BAJARILDI) |
| P3 PAST | ✅ 2 qoldi (T-101 refactor, T-150 migration) |
| **JAMI ochiq** | **28** |

---
*Tasks-Bekzod.md | VENTRA | 2026-02-27*
