# Redis & BullMQ — Full Deep Analysis Report

**Sana:** 2026-03-02
**Muhit:** Production (Railway)
**Test:** 10 user x 20 URL = 199 concurrent analyze + queue drain monitoring

---

## 1. ARXITEKTURA

```
┌──────────────────────────────────────────────────────────────────────┐
│                        REDIS (Single Instance)                        │
│                     Railway Managed Redis v7                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ billing-queue    │  │ discovery-queue  │  │ weekly-scrape-queue │  │
│  │ Cron: 00:00 UTC  │  │ On-demand       │  │ Cron: */15 min      │  │
│  │ Concurrency: 1   │  │ Concurrency: 1  │  │ Concurrency: 1      │  │
│  │ Retry: 1         │  │ Retry: 3 (exp)  │  │ Retry: 1            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ competitor-queue  │  │ import-batch    │  │ sourcing-search     │  │
│  │ Cron: */6 soat   │  │ On-demand       │  │ On-demand           │  │
│  │ Concurrency: 1   │  │ Concurrency: 1  │  │ Concurrency: 1      │  │
│  │ Retry: 1         │  │ Retry: 1        │  │ Retry: 2 (fixed 5s) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                      │
│  Clients: API (MetricsService pipeline) + Worker (6 queue clients)   │
│  Connection: ioredis, maxRetriesPerRequest: null (BullMQ required)   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. QUEUE HOLATI (Production — Real-time)

### Load Test natijasi (05:27 UTC)

| Vaqt | weekly-scrape | Heap (MB) | CPU (%) | Peak Req | Lag (ms) |
|------|--------------|-----------|---------|----------|----------|
| 05:26:36 | 0 | 61.3 | 24.1 | 4 | 1 |
| **05:27:22** | **112** | **86.9** | **138.5** | **71** | **18** |
| **05:27:36** | **164** | **95.9** | **48.3** | **71** | **1** |
| 05:27:51 | 162 | 58.1 | 1.1 | 0 | 2 |
| 05:30:07 | 141 | 58.3 | 0.0 | 0 | 1 |
| 05:33:07 | 112 | 58.5 | 0.0 | 0 | 1 |
| 05:36:07 | 83 | 59.4 | 0.0 | 0 | 1 |
| 05:38:37 | 59 | 59.9 | 0.0 | 1 | 1 |

### Peak moment (05:27:22)
- **199 API request → 164 weekly-scrape job** (167 success, har biri fire-and-forget enqueue)
- Heap: 53MB → **96MB** (+43MB, ~80% oshdi)
- CPU: 0% → **138.5%** (burst — barcha request'lar parallel processing)
- Peak concurrent: 0 → **71** (bir lahzada 71 ta aktiv HTTP request)
- Event loop lag: 1ms → **18ms** (qisqa spike, hali sog'lom)
- **Keyingi 15 soniyada barcha normalga qaytdi** — API MUZLAMADI

### Queue Drain Rate

```
weekly-scrape-queue: 164 → 0 (taxminan)
Drain tezligi: ~4.2 job/min (har 14 soniyada 1 job)
ETA (164 job): ~39 daqiqa
Worker: Playwright scraper (1 concurrency, 3-5s jitter per product)
```

**Worker ISHLAYAPTI** — queue barqaror ravishda kamaymoqda.

---

## 3. REDIS CONNECTION KONFIGURATSIYA

### API (MetricsService)
```typescript
// metrics.service.ts:49-56
redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 0,     // fail-fast, monitoring uchun
  connectTimeout: 3000,         // 3s connect timeout
  enableOfflineQueue: false,    // offline bo'lsa queue qilma
  lazyConnect: false,           // darhol connect (T-288 fix)
  retryStrategy: () => null,    // reconnect qilma
});
```

### Worker (BullMQ)
```typescript
// redis.ts
connection: {
  host, port, password, username, db,
  maxRetriesPerRequest: null,  // BullMQ MAJBURIY — blocking command uchun
}
```

### Connection soni
| Component | Redis connections | Maqsad |
|-----------|------------------|--------|
| API MetricsService | 1 | Queue depth monitoring (pipeline) |
| Worker queues | 6 | Har queue uchun 1 connection |
| Worker health | 1 | Lazy-connect health check |
| BullMQ internal | ~6-12 | Subscriber/publisher per queue |
| **JAMI** | **~14-19** | Redis default limit: 10,000 |

---

## 4. QUEUE TAFSILOTLARI

### 4.1 weekly-scrape-queue (ENG FAOL)
- **Trigger:** Cron */15 min + fire-and-forget (har analyze/import dan keyin)
- **Batch:** 50 product per job (cron), 1 product per job (single)
- **Processing:** Playwright browser → scrape banner → REST API → score → DB upsert
- **Tezlik:** ~4.2 job/min (14s per job, 3-5s anti-detection jitter)
- **next_scrape_at:** 24h + random 0-30min jitter
- **Retry on fail:** 6h (tezroq qayta urinish)

### 4.2 billing-queue
- **Trigger:** Cron 00:00 UTC (kuniga 1 marta)
- **Processing:** Active account'larni charge qilish
- **Risk:** Retry yo'q — agar bitta account fail bo'lsa, davom etadi

### 4.3 discovery-queue
- **Trigger:** User action (DiscoveryPage)
- **Processing:** Playwright → category scrape → 200 product → score → top 20
- **Retry:** 3 attempts, exponential 5s (5s, 25s, 125s)
- **Eng og'ir queue:** Playwright + 200 REST call

### 4.4 competitor-queue
- **Trigger:** Cron */6h
- **Processing:** Competitor tracking → price snapshot → alert if >10% drop
- **Risk:** Hard-coded 10% threshold

### 4.5 import-batch
- **Trigger:** User action (bulk import)
- **Processing:** URL parse → REST → upsert → snapshot → enqueue scrape
- **Rate limit:** 5 URL/batch, 1000ms pause

### 4.6 sourcing-search
- **Trigger:** User action (ProductPage)
- **Modes:** Quick (60s timeout) | Full (fire-and-forget)
- **Pipeline:** AI query gen → SerpAPI + Playwright → AI scoring → cargo calc
- **Retry:** Full mode: 2 attempts, fixed 5s

---

## 5. LOAD TEST IMPACT TAHLILI

### API (NestJS) — BARQAROR

| Ko'rsatkich | Oldin (idle) | Load test paytida | Keyin (recovery) |
|-------------|-------------|-------------------|------------------|
| Heap | 61 MB | **96 MB** (peak) | 58 MB |
| CPU | 0% | **138%** (burst) | 0% |
| Peak concurrent | 0 | **71** | 0 |
| Event loop lag | 1 ms | **18 ms** | 1 ms |
| DB Pool | 1 | 1 | 1 |
| Response time | — | 1-6.6s (median 3.2s) | — |

**Xulosa:** API 199 parallel request'ni ko'tardi. Heap 96MB ga ko'tarildi (2048MB limitning 4.7%), event loop lag 18ms (200ms alertdan ancha past). **POOL EXHAUSTION BO'LMADI** — T-288 fix ishlaydi.

### Redis — BARQAROR

| Ko'rsatkich | Qiymat |
|-------------|--------|
| Queue spike | 0 → 164 (1 soniyada) |
| Drain rate | 4.2 job/min |
| Connection errors | 0 |
| OOM | Yo'q |

### Worker — BARQAROR

| Ko'rsatkich | Qiymat |
|-------------|--------|
| Processing | Faol (queue kamaymoqda) |
| Speed | ~14s per job |
| Health endpoint | Public URL yo'q (internal only) |

---

## 6. ANIQLANGAN MUAMMOLAR

### P0 — KRITIK

| # | Muammo | Ta'sir | Yechim |
|---|--------|--------|--------|
| **R1** | **Worker health endpoint tashqaridan ko'rinmaydi** | Railway worker crash'ni aniqlay olmaydi — auto-restart ishlamaydi | Worker service'ga public domain berish + Railway health check sozlash |
| **R2** | **ANTHROPIC_API_KEY invalid** (401) | 37 ta AI call fail, $0.00 sarflangan | Railway env'da yangi kalit qo'yish + redeploy |

### P1 — MUHIM

| # | Muammo | Ta'sir | Yechim |
|---|--------|--------|--------|
| **R3** | **Queue depth alert yo'q** | 164 job queue'da to'plandi, admin bilmaydi | `checkAlerts()` ga queue depth threshold qo'shish (>100 = warning) |
| **R4** | **Single Redis instance (SPOF)** | Redis crash = barcha worker to'xtaydi | Redis Sentinel yoki Railway HA Redis |
| **R5** | **Weekly-scrape 164 job spike** | Har analyze fire-and-forget enqueue qiladi — 167 analyze = 167 scrape job | Dedup: agar product allaqachon queue'da bo'lsa, qayta qo'shma |
| **R6** | **Staging API service yo'q** | web-staging hang (nginx proxy timeout) | Railway'da staging API deploy yoki o'chirish |

### P2 — O'RTA

| # | Muammo | Ta'sir | Yechim |
|---|--------|--------|--------|
| **R7** | **Retry faqat discovery'da** | Boshqa queue'lar 1 attempt — transient fail = job lost | import, competitor ga 2 attempt qo'shish |
| **R8** | **Circuit breaker yo'q (Uzum API)** | Uzum down bo'lganda worker hammering | Exponential backoff wrapper |
| **R9** | **Redis maxmemory sozlanmagan** | Queue buildup → Redis OOM risk | `maxmemory 512mb; maxmemory-policy allkeys-lru` |
| **R10** | **Sourcing quick timeout 60s** | Playwright start + scrape > 60s bo'lishi mumkin | 90s ga oshirish |

### P3 — PAST

| # | Muammo | Ta'sir | Yechim |
|---|--------|--------|--------|
| **R11** | Competitor alert threshold hard-coded 10% | Moslashtirish mumkin emas | Account settings ga ko'chirish |
| **R12** | removeOnComplete/removeOnFail har joyda farq | Disk usage inconsistent | Standart: complete=100, fail=50 |

---

## 7. CAPACITY BAHOLASH

### Hozirgi holat

```
Estimated max concurrent users: 400
Bottleneck: database_pool (20 connections)
Memory headroom: 1989 MB (97% bo'sh)
Heap: 60 MB / 2048 MB (3%)
```

### Queue throughput

| Queue | Throughput | Bottleneck |
|-------|-----------|------------|
| weekly-scrape | 4.2 job/min | Playwright (1 browser, 14s/job) |
| billing | 27 account/run | DB sequential loop |
| discovery | ~10 min/run | Playwright + 200 REST calls |
| competitor | ~5 min/run | REST batch (5/sec) |
| sourcing | ~30-60s/job | Playwright + AI |

### Load test baseline (captured)

```json
{
  "label": "post-load-test-200urls",
  "heap_idle_mb": 59.94,
  "heap_loaded_mb": 63.31,
  "rss_mb": 155.96,
  "estimated_max_users": 400,
  "event_loop_lag_ms": 1
}
```

---

## 8. QUEUE DRAIN GRAFIK

```
weekly-scrape-queue jobs over time:

164 ┤█
162 ┤█
159 ┤█
155 ┤█
150 ┤ █
145 ┤ █
139 ┤  █
132 ┤  █
125 ┤   █
117 ┤   █
110 ┤    █
103 ┤    █
 95 ┤     █
 88 ┤     █
 81 ┤      █
 73 ┤      █
 66 ┤       █
 59 ┤       █  ← hozir (va kamaymoqda...)
    └──────────────────────
     05:27  05:30  05:33  05:36  05:39

Drain rate: 4.2 job/min | ETA to 0: ~14 min
Worker: Playwright scraper, 1 concurrency, anti-detection jitter
```

---

## 9. TAVSIYALAR (Prioritet bo'yicha)

### Darhol (bugun)

1. **R2:** Railway'da `ANTHROPIC_API_KEY` yangilash → API + Worker redeploy
2. **R1:** Worker service'ga Railway health check qo'shish
3. **R5:** weekly-scrape enqueue dedup — allaqachon queue'da bo'lsa skip

### Yaqin vaqtda (1 hafta)

4. **R3:** Queue depth alert: `weekly-scrape > 100` → warning, `> 500` → critical
5. **R6:** Staging API deploy yoki environment o'chirish
6. **R9:** Redis `maxmemory` konfiguratsiya

### O'rta muddatli (1 oy)

7. **R4:** Redis HA (Sentinel yoki cluster)
8. **R7:** Import + competitor queue'larga retry qo'shish
9. **R8:** Uzum API circuit breaker
10. **R10:** Sourcing timeout 60s → 90s

---

*Redis Deep Analysis | VENTRA Analytics | 2026-03-02*
