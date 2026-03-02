# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md

---

## QOIDALAR

- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Format: `T-XXX | [KATEGORIYA] | Sarlavha | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI

---

# ═══════════════════════════════════════════════════════════
# QO'LDA QILINADIGAN ISHLAR — .env KALITLARI VA CONFIG
# ═══════════════════════════════════════════════════════════

## ENV-P1 — MUHIM (Feature'lar ishlamaydi)

### E-006 | CONFIG | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` yo'q | 5min
AliExpress Developer Portal dan key olish va `apps/api/.env` + `apps/worker/.env` ga yozish.

### E-008 | CONFIG | `REDIS_URL` dev da parolsiz — production bilan mos emas | 2min

## ENV-P2 — O'RTA (Optional)

### E-010 | CONFIG | `PROXY_URL` yo'q — Uzum API block qilsa kerak bo'ladi | 2min

---

# ═══════════════════════════════════════════════════════════
# FRONTEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

(hozircha yo'q)

---

## P1 — MUHIM

### T-303 | P1 | FRONTEND | Axios global timeout=30s + sekin endpoint alohida | Sardor | 15min
Tafsilot: Backend Sprint (T-299..T-313) bo'limida to'liq analiz bor.
Qisqacha: `apps/web/src/api/base.ts` da Axios timeout YO'Q → user 60s hang ko'radi.

---

## P2 — O'RTA


---

# ═══════════════════════════════════════════════════════════
# SPRINT: STABILITY & AUTO-RECOVERY (T-299..T-314)
# Sana: 2026-03-03 | Mas'ul: Bekzod (Backend + DevOps)
# Yangilangan: 2026-03-03 (Context7 docs verification)
# ═══════════════════════════════════════════════════════════
#
# PRODUCTION HOLATI (2026-03-03):
#   Redis: Uzilgan ❌  |  API: Sog'lom ✅  |  Queue: barcha 0
#
# ═══════════════════════════════════════════════════════════
# CONTEXT7 TEKSHIRUVDAN KEYIN TUZATILGAN TAHLIL:
#
#   ⚠️ OLDINGI XATO TAHLIL: "enableOfflineQueue: true → hang → 504"
#   ✅ HAQIQAT: BARCHA 4 ta Redis client da enableOfflineQueue: false
#      ALLAQACHON mavjud. Redis down = darhol error, HANG EMAS.
#
#   4 TA REDIS CLIENT HOLATI (API) — BARCHASI SAFE:
#
#   | Client             | enableOfflineQueue | try/catch | Hang? |
#   |--------------------|-------------------|-----------|-------|
#   | MetricsService     | false ✅          | ✅ status check  | YO'Q |
#   | AuthService        | false ✅          | ✅ catch(() => {})| YO'Q |
#   | AdminStatsService  | false ✅          | ✅ try/catch      | YO'Q |
#   | ThrottlerGuard     | false ✅          | ✅ catch(() => {})| YO'Q |
#
#   YAGONA REAL HANG XAVFI:
#   Worker PrismaClient — pool_timeout/statement_timeout YO'Q
#   → DB query hang = 6 queue STOP (T-301 — P0 #1)
#
#   Redis "Uzilgan" = DEGRADATION (feature'lar o'chadi), HANG emas:
#   → Rate limit skip, lockout skip, metrics o'chadi, admin stats 0
#   → API ishlaydi, faqat Redis-dependent feature'lar degraded
#   → retryStrategy fix (T-299, P1) kerak: auto-reconnect uchun
#
# SPRINT REJASI (YANGILANGAN):
#
#   ┌───────────────────┬─────────────────────┬─────────────────────────────┬────────┐
#   │       Qadam       │       Tasklar       │        Nima hal bo'ladi     │  Vaqt  │
#   ├───────────────────┼─────────────────────┼─────────────────────────────┼────────┤
#   │ 1. P0 DARHOL      │ T-301, T-300        │ Worker DB hang fix,        │ ~35min │
#   │                   │                     │ crash logging              │        │
#   ├───────────────────┼─────────────────────┼─────────────────────────────┼────────┤
#   │ 2. P1 Recovery    │ T-299, T-302, T-306 │ Redis reconnect, 502 fix,  │ ~70min │
#   │                   │ T-307               │ bot shutdown, Railway       │        │
#   ├───────────────────┼─────────────────────┼─────────────────────────────┼────────┤
#   │ 3. P1 Reliability │ T-303, T-304, T-305 │ Frontend timeout, queue    │ ~50min │
#   │                   │                     │ retry, error logging        │        │
#   ├───────────────────┼─────────────────────┼─────────────────────────────┼────────┤
#   │ 4. P2 Hardening   │ T-308..T-314        │ Uzum timeout, Redis memory,│ ~95min │
#   │                   │                     │ Docker, nginx, CPU          │        │
#   └───────────────────┴─────────────────────┴─────────────────────────────┴────────┘
#
# JAMI: ~250 min (~4.2 soat)
# ═══════════════════════════════════════════════════════════

---

## P0 — KRITIK (Worker DB hang xavfi)

### T-299 | P0 | BACKEND | Redis retryStrategy + enableOfflineQueue fix | Bekzod | 30min

**Muammo:**
Production da Redis: "Uzilgan", API uptime 0h 0m.
API da 4 ta Redis client **hammasi** `retryStrategy: () => null` — Redis bir marta uzilsa ABADIY qayta ulanmaydi.
Faqat API restart tuzatadi.

**Root Cause Analysis — Redis → 504 Hang zanjiri:**
```
User request → NestJS
  → ThrottlerGuard.handleRequest()
    → this.rateLimitRedis.get(key)           ← Redis dead
    → enableOfflineQueue: true (DEFAULT!)     ← command QUEUE ga tushadi
    → Redis reconnect qilmaydi               ← retryStrategy: () => null
    → command ABADIY kutadi                   ← timeout: YO'Q
  → nginx 60s o'tgach → 504 Gateway Timeout
  → User "Login xatosi" ko'radi
```

**4 ta Redis client tahlili:**

| # | Fayl | lazyConnect | enableOfflineQueue | retryStrategy | Xavf |
|---|------|-------------|-------------------|---------------|------|
| 1 | `metrics.service.ts:49-56` | `false` (eager) | `false` ✅ | `() => null` ❌ | Past — fail-fast |
| 2 | `auth.service.ts:34-44` | `true` | **true** (default) ❌ | `() => null` ❌ | **YUQORI** — login hang |
| 3 | `admin-stats.service.ts:22-29` | `true` | **true** (default) ❌ | `() => null` ❌ | **YUQORI** — admin hang |
| 4 | `custom-throttler.guard.ts:23-35` | `true` | **true** (default) ❌ | `() => null` ❌ | **YUQORI** — HAR request hang |

**Nima buziladi (Redis dead bo'lganda):**
- Rate limiter → `redis.get()` hang → **HAR** request 504
- Auth lockout → `redis.ttl()` hang → login 504
- Metrics pipeline → fail-fast (to'g'ri) → monitoring o'chadi, lekin API tirik
- Admin stats → `redis.llen()` hang → admin panel 504

**Fix (barcha 4 client uchun):**
```typescript
// OLDIN (xato):
retryStrategy: () => null,
// enableOfflineQueue default = true (xato)

// KEYIN (to'g'ri):
retryStrategy: (times) => Math.min(times * 500, 10_000),
//  ↑ 500ms → 1s → 1.5s → ... → max 10s (reconnect loop)
enableOfflineQueue: false,
//  ↑ Redis dead bo'lsa command HANG qilmaydi, darhol fail
connectTimeout: 3000,
//  ↑ 3s connect timeout (allaqachon metrics/auth da bor)
maxRetriesPerRequest: 0,
//  ↑ fail-fast per command (allaqachon bor)
```

**Fayllar:**
- `apps/api/src/common/metrics/metrics.service.ts:49-56` — faqat retryStrategy fix
- `apps/api/src/auth/auth.service.ts:34-44` — retryStrategy + enableOfflineQueue: false
- `apps/api/src/admin/admin-stats.service.ts:22-29` — retryStrategy + enableOfflineQueue: false
- `apps/api/src/common/guards/custom-throttler.guard.ts:23-35` — retryStrategy + enableOfflineQueue: false

**Ehtiyot:** Reconnection loop CPU spike → max 10s interval yetarli himoya.
`enableOfflineQueue: false` qo'shganda, Redis down paytida rate-limit/lockout SKIP bo'ladi — bu TO'G'RI (graceful degradation).

---

### T-300 | P0 | BACKEND | uncaughtException + unhandledRejection handlers | Bekzod | 20min

**Muammo:**
API, Worker, Bot — hech birida `uncaughtException`/`unhandledRejection` handler YO'Q.
Node.js 20 da unhandled rejection → **process crash (exit 1)** → Railway log da sabab KO'RINMAYDI.

**Root Cause Analysis:**
```
Redis connection error emit qiladi
  → ioredis "error" event
  → Agar listener yo'q bo'lsa → Node.js "unhandledRejection"
  → Node.js 20: --unhandled-rejections=throw (DEFAULT)
  → process exit(1) → LOG YO'Q
  → Railway "Application crashed" ko'rsatadi, lekin SABAB noma'lum
  → Production screenshot: uptime 0h 0m (restart loop)
```

**Bu nima uchun P0:**
- Redis error → crash → restart → Redis hali dead → yana crash → **RESTART LOOP**
- Log yo'q → debug imkonsiz → faqat `railway redeploy` bilan vaqtinchalik tuzaladi
- Staging 504 muammosi ham shu sabab edi (17+ soat log yo'q, jarayon jim o'lgan)

**Fayllar va holati:**

| Fayl | Handler | SIGTERM | Natija |
|------|---------|---------|--------|
| `apps/api/src/main.ts` | YO'Q ❌ | NestJS graceful (30s) ✅ | Crash log yo'q |
| `apps/worker/src/main.ts` | YO'Q ❌ | YO'Q ❌ | Crash + hard kill |
| `apps/bot/src/main.ts` | YO'Q ❌ | YO'Q ❌ | Crash + hard kill |

**Fix — har 3 ta main.ts ga (bootstrap() dan OLDIN):**
```typescript
const logger = new Logger('Process');

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
  process.exit(1);  // Railway auto-restart qiladi
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});
```

**Natija:** Crash sababi log'ga tushadi → Railway Logs da ko'rinadi → debug mumkin.

---

### T-301 | P0 | BACKEND | Worker PrismaClient — pool_timeout + statement_timeout | Bekzod | 15min

**Muammo:**
Worker da `apps/worker/src/prisma.ts` — faqat `new PrismaClient()` BARE:
```typescript
// Hozirgi holat (xato):
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
// ↑ Hech qanday timeout, hech qanday pool limit
```

API da T-288 fix bor (`pool_timeout=10`, `statement_timeout=15000`), Worker da YO'Q.

**Root Cause Analysis:**
```
Worker concurrency: 1 per queue × 6 queue = 6 parallel DB session
  → DB query hang (slow query, lock wait, network)
  → Worker connection pool exhaustion (default pool=10)
  → Barcha 6 queue STOP → billing, scraping, discovery TO'XTAYDI
  → Cron job'lar skip → data stale, billing miss
```

**API vs Worker DB config farqi:**

| Sozlama | API (to'g'ri ✅) | Worker (xato ❌) |
|---------|-----------------|-----------------|
| pool_timeout | 10s | YO'Q (default 10s, lekin explicit emas) |
| statement_timeout | 15000ms | YO'Q (default: cheksiz!) |
| connection_limit | 20 | YO'Q (default: 10) |
| ensurePoolParams() | BOR | YO'Q |

**Fix:** Worker prisma.ts ga API dagi `ensurePoolParams()` pattern:
```typescript
function ensurePoolParams(envUrl?: string): string {
  let url = envUrl ?? 'postgresql://localhost:5432/ventra';
  if (!url.includes('pool_timeout')) {
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}pool_timeout=10`;
  }
  if (!url.includes('statement_timeout')) {
    url = `${url}&statement_timeout=15000`;
  }
  if (!url.includes('connection_limit')) {
    url = `${url}&connection_limit=10`;
  }
  return url;
}

export const prisma = new PrismaClient({
  datasourceUrl: ensurePoolParams(process.env.DATABASE_URL),
});
```

---

## P1 — MUHIM

### T-302 | P1 | BACKEND | NestJS keepAliveTimeout=65s, headersTimeout=66s | Bekzod | 10min

**Muammo:**
Node.js HTTP server default `keepAliveTimeout=5s`. nginx `proxy_read_timeout=60s`.
nginx connection'ni 60s ushlab turadi, Node.js 5s da socket yopadi → **502 Bad Gateway** load paytida.

**Root Cause Analysis:**
```
nginx → Node.js: keep-alive connection ochadi
  → Node.js 5s ichida yangi request kelmasa → socket.destroy()
  → nginx 60s kutib turgan edi → "upstream prematurely closed connection"
  → Client → 502 Bad Gateway

Bu faqat LOAD paytida ko'rinadi:
  → idle connection pool'da 5s dan ortiq turgan socket
  → nginx shu socket'dan request yuboradi
  → Node allaqachon yopgan → 502
```

**Load test dalili:** 10 user × 20 URL = 199 concurrent request → ba'zi 502'lar
(REDIS-DEEP-ANALYSIS.md: peak 71 concurrent, response 1-6.6s)

**Fayl:** `apps/api/src/main.ts`

**Fix:**
```typescript
const server = app.getHttpServer();
server.keepAliveTimeout = 65_000;  // nginx 60s dan KO'P bo'lishi SHART
server.headersTimeout = 66_000;    // keepAliveTimeout + 1s
```

**Nima uchun 65s:** nginx `proxy_read_timeout=60s` → Node 65s > nginx 60s → nginx birinchi yopadi (to'g'ri tartib).

---

### T-303 | P1 | FRONTEND | Axios global timeout=30s + sekin endpoint alohida | Sardor | 15min

**Muammo:**
`apps/web/src/api/base.ts:4-6` — Axios instance **global timeout YO'Q**:
```typescript
// Hozirgi holat (xato):
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
  // ← timeout FIELD YO'Q!
});
```

**Root Cause Analysis:**
```
User "Kirish" bosadi → axios.post('/auth/login')
  → API Redis hang (T-299)
  → Axios cheksiz kutadi (timeout: undefined = infinity)
  → nginx 60s o'tgach 504 qaytaradi
  → User 60 SONIYA "Kirilmoqda..." ko'radi
  → Keyin generic "Login xatosi" (504 body bo'sh, getErrorMessage fallback)
```

**Staging test dalili:** Login button 65+ soniya "Kirilmoqda..." holat, keyin "Login xatosi".

**Fix:**
```typescript
// base.ts — global timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
  timeout: 30_000,  // 30s default
});

// Sekin endpoint'lar uchun alohida:
// discovery API:  { timeout: 120_000 }  — Playwright + 200 REST call
// sourcing API:   { timeout: 90_000 }   — Playwright + AI scoring
// analyze API:    { timeout: 60_000 }   — Uzum REST + scoring
```

**UX yaxshilanishi:** 60s hang → 30s da "Xatolik" xabari + aniq error message.

---

### T-304 | P1 | BACKEND | BullMQ 5/6 queue retry qo'shish | Bekzod | 20min

**Muammo:**
6 ta queue — faqat sourcing-search (full) da retry bor. Qolganlari 1 attempt = transient fail → **job abadiy yo'qoladi**.

**Queue-by-queue tahlil:**

| Queue | Hozirgi attempts | Hozirgi backoff | Xavf |
|-------|-----------------|-----------------|------|
| discovery-queue | 1 ❌ | yo'q | Playwright crash → category run FAILED |
| billing-queue | 1 ❌ | yo'q | DB timeout → account charge MISS |
| competitor-queue | 1 ❌ | yo'q | Uzum API 429 → snapshot MISS |
| weekly-scrape-queue | 1 ❌ | yo'q | Network error → stale data |
| import-batch | 1 ❌ | yo'q | Timeout → user import LOST |
| sourcing-search (quick) | 1 ❌ | yo'q | Playwright crash → "not found" |
| sourcing-search (full) | 2 ✅ | fixed 5s ✅ | OK |

**Fix — barcha queue defaultJobOptions:**
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  // → 5s, 25s, 125s (3 urinish)
  removeOnComplete: { age: 86400 },  // 24h keyin tozalash
  removeOnFail: { age: 604800 },     // 7 kun keyin tozalash
}
```

**Fayllar:**
- `apps/api/src/discovery/discovery.queue.ts` — enqueueDiscovery() options
- `apps/api/src/products/weekly-scrape.queue.ts` — enqueueImmediateScrape() options
- `apps/api/src/export/import.queue.ts` — enqueueImportBatch() options
- `apps/api/src/sourcing/sourcing.queue.ts` — enqueueSourcingSearch() options (quick mode)
- Worker cron job'lar: billing.job.ts, competitor-snapshot.job.ts, weekly-scrape.job.ts

---

### T-305 | P1 | BACKEND | BullMQ worker event listeners — error/failed/stalled logging | Bekzod | 15min

**Muammo:**
6 ta worker — **hech birida** `.on('error')`, `.on('failed')`, `.on('stalled')` handler YO'Q.
Job fail bo'lsa yoki worker error bo'lsa — **log'ga TUSHMAYDI**, debug imkonsiz.

**Hozirgi holat (barcha processor fayllar):**
```typescript
// Har processor oxirida:
const worker = new Worker('queue-name', handler, { concurrency: 1 });
// ← .on('error') YO'Q
// ← .on('failed') YO'Q
// ← .on('stalled') YO'Q
// ← .on('completed') YO'Q
```

**Fix — har worker ga:**
```typescript
worker.on('error', (err) => {
  logger.error(`[queue-name] Worker error: ${err.message}`, err.stack);
});
worker.on('failed', (job, err) => {
  logger.error(`[queue-name] Job ${job?.id} failed: ${err.message}`, { data: job?.data });
});
worker.on('stalled', (jobId) => {
  logger.warn(`[queue-name] Job ${jobId} stalled`);
});
```

**Fayllar (6 ta):**
- `apps/worker/src/processors/discovery.processor.ts`
- `apps/worker/src/processors/billing.processor.ts`
- `apps/worker/src/processors/competitor.processor.ts`
- `apps/worker/src/processors/weekly-scrape.processor.ts`
- `apps/worker/src/processors/import.processor.ts`
- `apps/worker/src/processors/sourcing.processor.ts`

---

### T-306 | P1 | BACKEND | Bot graceful shutdown — SIGTERM handler | Bekzod | 10min

**Muammo:**
`apps/bot/src/main.ts` — SIGTERM/SIGINT handler YO'Q.
Railway deploy/restart signal bersa bot **hard kill** bo'ladi → in-flight Telegram message yo'qoladi.

**Hozirgi holat:**
```
Railway → SIGTERM → bot.ts
  → Handler YO'Q
  → 10s grace period (Railway default)
  → SIGKILL → process dead
  → grammY long-polling abruptly stops
  → User message javobsiz qoladi
```

**Fix:**
```typescript
process.on('SIGTERM', async () => {
  logger.log('SIGTERM received — stopping bot gracefully');
  bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.log('SIGINT received — stopping bot');
  bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});
```

---

### T-307 | P1 | DEVOPS | Railway sleep o'chirish + healthcheck configure | Bekzod | 20min

**Muammo:**
Railway Pro plan da ham — agar service tashqi request olmasa **sleep qilishi mumkin**.
Worker va Bot tashqi HTTP request olmaydi → uxlab qoladi → cron job'lar (billing, competitor, weekly-scrape) TO'XTAYDI.

**Dalil:** Staging API 17+ soat log yo'q edi (oldingi session analizi). Production Worker queue'lar 0 (hech job process bo'lmayapti).

**Fix:**

1. **`railway.toml`** (root da yaratish):
```toml
[deploy]
sleepApplication = false
```

2. **Railway Dashboard** — har service uchun health check:

| Service | Port | Path | Interval |
|---------|------|------|----------|
| API | 3000 | /api/v1/health | 60s |
| Worker | 3001 | /health | 60s |
| Bot | 3002 | /health | 60s |

3. **Worker health endpoint** — allaqachon bor (`apps/worker/src/main.ts:46-58`), lekin PORT env kerak
4. **Bot health endpoint** — allaqachon bor (`apps/bot/src/main.ts:30-45`), lekin PORT env kerak

---

## P2 — O'RTA

### T-308 | P2 | BACKEND | Uzum fetch() AbortController 15s timeout | Bekzod | 20min

**Muammo:**
`uzum.client.ts` va `uzum-scraper.ts` — bare `fetch()` hech qanday timeout YO'Q.
Uzum API hang bo'lsa (429, maintenance, network) → API/Worker **cheksiz hang**.

**Hozirgi holat:**
```typescript
// uzum.client.ts:
const resp = await fetch(url, { headers });  // ← timeout YO'Q!
// Uzum 429 handling: 5s sleep, lekin connection hang uchun himoya YO'Q

// uzum-scraper.ts:
// Playwright ga timeout bor (page.goto 30s), lekin REST fetch'ga YO'Q
```

**Fix:**
```typescript
function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 15_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
```

**Fayllar:**
- `apps/api/src/uzum/uzum.client.ts` — barcha fetch() → fetchWithTimeout()
- `apps/worker/src/processors/uzum-scraper.ts` — REST fetch qismlari

---

### T-309 | P2 | BACKEND | BullMQ removeOnComplete/Fail — Redis memory growth | Bekzod | 10min

**Muammo:**
3 ta queue (discovery, billing, competitor) — `removeOnComplete`/`removeOnFail` **sozlanmagan** (default: keeps forever).
Redis memory cheksiz o'sadi → OOM xavfi.

**Hozirgi holat:**

| Queue | removeOnComplete | removeOnFail | Redis memory |
|-------|-----------------|-------------|-------------|
| discovery-queue | **YO'Q** (forever) ❌ | **YO'Q** (forever) ❌ | O'sib boradi |
| billing-queue | **YO'Q** (forever) ❌ | **YO'Q** (forever) ❌ | O'sib boradi |
| competitor-queue | **YO'Q** (forever) ❌ | **YO'Q** (forever) ❌ | O'sib boradi |
| sourcing-search (quick) | 50 ✅ | 20 ✅ | OK |
| sourcing-search (full) | 100 ✅ | 50 ✅ | OK |
| import-batch | 100 ✅ | 50 ✅ | OK |
| weekly-scrape-queue | 100 ✅ | 50 ✅ | OK |

**Fix:** T-304 bilan birga — barcha queue ga `removeOnComplete: { age: 86400 }, removeOnFail: { age: 604800 }`

---

### T-310 | P2 | DEVOPS | Redis maxmemory 256mb + noeviction | Bekzod | 5min

**Muammo:**
Redis maxmemory sozlanmagan. Queue buildup + T-309 (forever job history) → Redis OOM → **barcha worker crash**.

**Fix:** Railway Redis configuration:
```
maxmemory 256mb
maxmemory-policy noeviction
```
`noeviction` = yangi write reject qilinadi (BullMQ error handling orqali retry) — data yo'qolmaydi.

---

### T-311 | P2 | DEVOPS | Docker healthcheck: start_period + worker/bot/web | Bekzod | 15min

**Muammo:**
Docker-compose healthcheck'da `start_period` yo'q → boot paytida false-positive restart.
Worker/Bot/Web da healthcheck umuman yo'q → crash detect qilinmaydi.

**Fix:** Barcha service'da:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 15s   # ← boot vaqti kutiladi
```

---

### T-312 | P2 | BACKEND | Sourcing quick timeout 60s → 90s | Bekzod | 5min

**Muammo:**
`apps/api/src/sourcing/sourcing.queue.ts:61` — `waitUntilFinished(queueEvents, 60_000)`.
Playwright start (~5s) + AliExpress scrape (~15s) + Alibaba scrape (~15s) + AI scoring (~10s) = ~45-70s.
Edge case da 60s → timeout → user "topilmadi" ko'radi.

**Fix:** `60_000` → `90_000`

---

### T-313 | P2 | DEVOPS | nginx upstream keepalive 32 | Bekzod | 10min

**Muammo:**
nginx `proxy_set_header Connection ''` (keepalive) ishlatilmoqda, lekin `upstream` block YO'Q.
Har request yangi TCP connection ochadi → performance loss (TLS handshake + TCP slow start).

**Hozirgi holat (`nginx.conf.template:44-55`):**
```nginx
location /api/ {
    set $api_backend http://${API_UPSTREAM};
    proxy_pass $api_backend;
    proxy_http_version 1.1;
    proxy_set_header Connection '';  # ← keepalive, lekin upstream pool YO'Q
}
```

**Fix:**
```nginx
upstream api_pool {
    server ${API_UPSTREAM};
    keepalive 32;  # 32 ta persistent connection
}

location /api/ {
    proxy_pass http://api_pool;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
}

---

### T-314 | P2 | BACKEND+DEVOPS | CPU limit oshirish + CPU-based capacity estimator | Bekzod | 30min

**Muammo (CPU-analyze.png, 2026-03-03):**
```
CPU:           273.1%    ← restart burst (2.73 core band)
Event Loop:    1ms       ← spike allaqachon o'tgan
Heap:          64 MB     ← normal
Max users:     ~95       ← "Xotira" bottleneck ko'rsatyapti
```

**3 ta muammo:**

**1. CapacityEstimator CPU ni hisoblamaydi:**
`capacity-estimator.ts` faqat 3 faktorni ko'radi: memory, DB pool, event loop lag.
CPU 273% bo'lsa ham "System is healthy" deydi — NOTO'G'RI.

```typescript
// Hozir (capacity-estimator.ts:55):
const estimatedMax = Math.min(maxByMemory, maxByDb, maxByEventLoop);
// ← CPU factor YO'Q!
```

**Fix:**
```typescript
// CPU-based estimate qo'shish:
let maxByCpu = 999;
if (snapshot.cpu_pct > 200) {
  maxByCpu = Math.max(1, effectiveSessions - 20);
  recommendations.push('CPU usage critically high — reduce concurrent processing');
} else if (snapshot.cpu_pct > 100) {
  maxByCpu = effectiveSessions + 20;
  recommendations.push('CPU usage elevated — monitor under load');
}

const estimatedMax = Math.min(maxByMemory, maxByDb, maxByEventLoop, maxByCpu);
```

**2. CPU alert threshold yo'q:**
`metrics.service.ts` da `checkAlerts()` heap va event loop uchun alert bor, CPU uchun YO'Q.
CPU 200%+ doimiy bo'lsa admin xabar olmaydi.

**Fix:** `checkAlerts()` ga CPU threshold qo'shish:
```typescript
if (snapshot.cpu_pct > 150) {
  // SystemAlert yaratish: CPU_HIGH
}
```

**3. Railway CPU allocation:**
Railway Pro da vCPU limit sozlanadi. Hozir default (auto-scale).
Restart paytida CPU spike 273% normal (Prisma, NestJS bootstrap, Redis connect).
Lekin doimiy 100%+ bo'lsa → vCPU limitni oshirish kerak.

**Monitoring:** `railway metrics` yoki Dashboard → Service → Metrics → CPU usage grafigi tekshirish.
Agar 15-daqiqalik average > 80% → vCPU 2 → 4 ga oshirish (Railway Pro: $0.000463/vCPU-min).

**Fayllar:**
- `apps/api/src/common/metrics/capacity-estimator.ts` — CPU factor qo'shish
- `apps/api/src/common/metrics/metrics.service.ts` — CPU alert threshold
- Railway Dashboard → API service → vCPU limit

---

# ═══════════════════════════════════════════════════════════
# DEVOPS OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-281 | P0 | DEVOPS | Cloudflare CDN — frontend static assets 20ms, API caching | 1.5h

**Muammo:** Frontend bundle (JS/CSS/images) har safar Railway serverdan yuklanadi (~300ms per request).
Cloudflare CDN orqali static fayllar eng yaqin edge serverdan beriladi (~20-50ms).

**Benchmark (hozirgi):**
```
index.html:     ~300ms (Railway US)
main.js (~500KB): ~400-600ms (Railway US)
CSS/fonts:      ~300ms har biri
```

**To'liq yechim — qadamma-qadam:**

#### 1-qadam: Cloudflare account + domain
```
1. cloudflare.com da bepul account ochish
2. Domain qo'shish (masalan: ventra.uz yoki ventrastats.com)
3. Cloudflare nameserverlarni domain registrarda o'rnatish
4. DNS record qo'shish:
   - CNAME @ → diligent-courage-production.up.railway.app (Proxied ☁️)
   - CNAME www → diligent-courage-production.up.railway.app (Proxied ☁️)
```

#### 2-qadam: Cloudflare SSL/TLS sozlash
```
Dashboard → SSL/TLS → Overview:
  - Encryption mode: Full (strict)
Dashboard → SSL/TLS → Edge Certificates:
  - Always Use HTTPS: ON
  - Minimum TLS Version: 1.2
  - Automatic HTTPS Rewrites: ON
```

#### 3-qadam: Cache Rules — static assets
```
Dashboard → Caching → Cache Rules → Create Rule:

Rule 1: "Cache Static Assets"
  When: URI Path matches /assets/*
  Then: Cache → Eligible for cache
        Edge TTL: 30 days
        Browser TTL: 7 days

Rule 2: "Cache Fonts & Images"
  When: URI Path matches /*.woff2 OR /*.png OR /*.jpg OR /*.svg OR /*.ico
  Then: Cache → Eligible for cache
        Edge TTL: 90 days
        Browser TTL: 30 days

Rule 3: "No Cache API"
  When: URI Path starts with /api/
  Then: Cache → Bypass cache
  (API so'rovlar HECH QACHON cache qilinmasligi kerak)
```

#### 4-qadam: Page Rules (qo'shimcha)
```
Dashboard → Rules → Page Rules:

1. ventra.uz/api/* → Cache Level: Bypass
2. ventra.uz/assets/* → Cache Level: Cache Everything, Edge TTL: 1 month
3. ventra.uz/*.js → Cache Level: Cache Everything, Edge TTL: 1 month
4. ventra.uz/*.css → Cache Level: Cache Everything, Edge TTL: 1 month
```

#### 5-qadam: Nginx config yangilash (Railway)
```nginx
# apps/web/nginx.conf yoki Railway nginx service
# Cloudflare real IP olish uchun:

set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
real_ip_header CF-Connecting-IP;

# Static assets uchun cache header:
location /assets/ {
    add_header Cache-Control "public, max-age=604800, immutable";
    try_files $uri =404;
}
```

#### 6-qadam: Vite build — content hash
```typescript
// apps/web/vite.config.ts — allaqachon bor bo'lishi kerak:
build: {
  rollupOptions: {
    output: {
      // Fayl nomlari hash bilan — cache invalidation avtomatik
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash].[ext]',
    }
  }
}
```

#### 7-qadam: Cloudflare Performance sozlash
```
Dashboard → Speed → Optimization:
  - Auto Minify: JavaScript ✓, CSS ✓, HTML ✓
  - Brotli: ON
  - Early Hints: ON
  - HTTP/2: ON (default)
  - HTTP/3 (QUIC): ON

Dashboard → Speed → Image Optimization (Pro plan):
  - Polish: Lossless
  - WebP: ON
```

#### 8-qadam: Cloudflare Security (bonus)
```
Dashboard → Security → Settings:
  - Security Level: Medium
  - Challenge Passage: 30 min
  - Bot Fight Mode: ON (bepul)

Dashboard → Security → WAF:
  - Managed Rules: ON (Cloudflare Free Ruleset)
  - Rate Limiting: 100 req/10s per IP (API himoya)
```

#### 9-qadam: Verify
```bash
# Cache ishlayaptimi tekshirish:
curl -sI https://ventra.uz/assets/main-abc123.js | grep -i "cf-cache-status"
# Kutilgan: cf-cache-status: HIT

# API bypass tekshirish:
curl -sI https://ventra.uz/api/v1/health | grep -i "cf-cache-status"
# Kutilgan: cf-cache-status: DYNAMIC (bypass)

# Latency tekshirish:
node -e "
async function p(l,u,n=5){const t=[];for(let i=0;i<n;i++){const s=Date.now();await fetch(u);t.push(Date.now()-s)}console.log(l,'min:',Math.min(...t)+'ms','avg:',Math.round(t.reduce((a,b)=>a+b)/t.length)+'ms')}
p('Static (CDN):', 'https://ventra.uz/assets/main.js');
p('API (bypass):', 'https://ventra.uz/api/v1/health');
"
```

**Kutilgan natija:**
```
OLDIN:                          KEYIN:
Static assets: ~300ms           Static assets: ~20-50ms (CDN edge)
index.html:    ~300ms           index.html:    ~50-80ms (CDN edge)
API calls:     ~300ms           API calls:     ~300ms (bypass, o'zgarmaydi*)
                                * T-280 bilan birga: ~150ms
```

**Bepul Cloudflare plan yetarli:**
- Unlimited bandwidth
- Global CDN (200+ shaharda edge)
- DDoS himoya
- SSL sertifikat (bepul)
- WAF basic rules
- Bot protection

**Xavflar:**
- DNS propagation 1-24 soat kutish
- API so'rovlar BYPASS bo'lishi KERAK (aks holda stale data)
- WebSocket bo'lsa Cloudflare Free da cheklangan (100 concurrent)

---

## P1 — MUHIM

### T-178 | DEVOPS | Custom domain + SSL — web service | 10min (manual: domain kerak)

### T-283 | P1 | DEVOPS | Landing custom domain — ventra.uz DNS sozlash | 10min (manual)

**Holat:** Landing Railway da deploy qilingan, staging URL ishlaydi:
- Staging: `https://landing-staging-39b5.up.railway.app/`
- Railway service: `landing` (staging environment)

**Railway DNS record lari tayyor:**
```
CNAME  @               → d7j7qk9x.up.railway.app
TXT    _railway-verify  → railway-verify=railway-verify=822d30ad3e89eb5a8c969c7ccdcaa4759312a22ee0b2370851e0ded2b6b6b28d
```

**Qadamlar:**
1. `ventra.uz` domenni sotib olish (webhost.uz, ahost.uz yoki Cloudflare)
2. Registrar DNS panelida yuqoridagi CNAME + TXT record qo'shish
3. Propagatsiya kutish (5 daqiqa — 24 soat)
4. `https://ventra.uz` ishlashini tekshirish (Railway avtomatik SSL beradi)
5. Google Search Console da `ventra.uz` verify qilish → `GOOGLE_VERIFICATION_CODE` ni index.html ga qo'yish
6. Yandex Webmaster da verify → `YANDEX_VERIFICATION_CODE` ni index.html ga qo'yish

## P2 — O'RTA

### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API | 5min
### T-245 | DEVOPS | PROXY_URL — API + Worker (optional) | 5min

---

# ═══════════════════════════════════════════════════════════
# CHROME EXTENSION — OCHIQ TASKLAR (T-216..T-233)
# ═══════════════════════════════════════════════════════════
#
# DONE: Faza 1 (T-208..T-211), Faza 2 (T-212..T-215) → Done.md

## Faza 3 — Popup Dashboard (P1) ~1.5h
### T-216 | P1 | FRONTEND | Popup "Tez Tahlil" funksiyasi | 1.5h

## Faza 4 — Category + Advanced (P1) ~5h
### T-217 | P1 | FRONTEND | Content Script — Kategoriya "Top 10" floating widget | 2h
### T-218 | P1 | FRONTEND | Notifications sistema (chrome.notifications + badge) | 1.5h
### T-219 | P1 | FRONTEND | Options (Sozlamalar) sahifasi | 1.5h

## Faza 5 — Competitor + Narx (P2) ~4.5h
### T-220 | P2 | FRONTEND | Content Script — Raqiblar narx taqqoslash overlay | 2h
### T-221 | P2 | FRONTEND | Content Script — Narx tarix grafigi (mini chart) | 1.5h
### T-222 | P2 | FRONTEND | Context Menu integration (o'ng tugma menu) | 1h

## Faza 6 — AI + Hotkeys (P2) ~2.5h
### T-223 | P2 | FRONTEND | Content Script — AI tahlil natijasini overlay da | 1.5h
### T-224 | P2 | FRONTEND | Keyboard shortcuts (hotkeys) | 1h

## Faza 7 — i18n + Testing + Perf (P2) ~4.5h
### T-225 | P2 | FRONTEND | i18n (uz, ru, en) | 1.5h
### T-226 | P2 | FRONTEND | Unit testlar (Vitest + Testing Library) | 2h
### T-227 | P2 | FRONTEND | Performance optimization + bundle size | 1h

## Faza 8 — Build + Publish (P1) ~3h
### T-228 | P1 | DEVOPS | Production build pipeline + Chrome Web Store publish | 2h
### T-229 | P1 | DEVOPS | Edge/Firefox adaptatsiya tayyorlash | 1h

## Faza 9 — Security + Polish (P1) ~3.5h
### T-230 | P1 | IKKALASI | Security audit + CSP + token xavfsizligi | 1h
### T-231 | P1 | FRONTEND | Onboarding flow (birinchi marta ochganda) | 1h
### T-232 | P2 | FRONTEND | Extension icon set (16/48/128) | 30min
### T-233 | P2 | FRONTEND | Error handling + offline mode + graceful degradation | 1h

---

*Tasks.md | VENTRA Analytics Platform | 2026-03-03*
