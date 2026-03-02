# T-288 | P0 | BACKEND | API Hang — Barcha endpoint'lar javob bermaydi

**Sana:** 2026-03-02
**Status:** OCHIQ
**Mas'ul:** Bekzod (Backend)
**Muhimlik:** P0 — KRITIK (production API ishlamaydi)

---

## SIMPTOMLAR

| Test | Natija |
|------|--------|
| `GET /api/v1/health` | `200 "ok"` 0.7s — **nginx static response**, API'ga bormaydi |
| `POST /api/v1/auth/login` | **504 Gateway Time-out** (60s+) |
| `GET /api/v1/auth/me` | **Timeout** (15s+, hech qanday javob yo'q) |
| `GET /admin/accounts` | Birinchi marta 200, keyin **timeout** |
| `GET /admin/monitoring/*` | **Doimo timeout** |
| `GET /admin/stats/health` | **Timeout** |
| `GET /admin/stats/ai-usage` | **Timeout** |

**Pattern:** API boshida ishlaydi (10-20 soniya), keyin **butunlay muzlaydi**. Hatto autentifikatsiya talab qilmaydigan endpoint'lar ham javob bermaydi. NestJS process "tirik" lekin event loop to'liq bloklangan.

---

## ROOT CAUSE: Prisma Connection Pool Exhaustion

### Muammo zanjiri

```
┌─────────────────────────────────────────────────────┐
│ 1. API ishga tushadi → MetricsService init           │
│ 2. Har 15s → collectSnapshot() → 2-3 DB query       │
│ 3. Har 5 min → persistLatest() → 1 DB query         │
│ 4. User admin sahifani ochadi                        │
│ 5. Frontend 8 ta concurrent API request yuboradi     │
│ 6. getUserHealthSummary() → 5 sequential DB query    │
│ 7. getAiUsageStats() → 5 parallel DB aggregate       │
│ 8. Boshqa endpoint'lar → yana 5-8 DB query           │
│                                                       │
│ JAMI: ~20 concurrent DB operations                   │
│ CONNECTION LIMIT: 20                                 │
│ POOL TIMEOUT: ❌ YO'Q (default = cheksiz kutish)     │
│                                                       │
│ ═══════════════════════════════════════════════════   │
│ NATIJA: Pool to'ldi → yangi query'lar ABADIY kutadi  │
│ → Barcha HTTP request'lar hang → API muzlaydi        │
└─────────────────────────────────────────────────────┘
```

### Nima uchun butun API muzlaydi?

1. **Prisma bitta global connection pool ishlatadi.** `connection_limit=20` — butun app uchun 20 connection.

2. **`pool_timeout` o'rnatilmagan.** DATABASE_URL da `&pool_timeout=10` yo'q. Shuning uchun Prisma yangi query uchun connection kutayotganda **timeout YO'Q** — abadiy kutadi.

3. **MetricsService background loop har 15s ishlaydi** va 2-3 DB connection oladi:
   - `getDbPoolActive()` → `SELECT count(*) FROM pg_stat_activity` (1 conn)
   - `checkAlerts()` → `findFirst` + `create` (1-2 conn)
   - `persistLatest()` → `create` (1 conn, har 5 min)

4. **System tab ochilganda 8 endpoint parallel fire bo'ladi:**
   - `monitoring/metrics` — ring buffer (tez)
   - `monitoring/capacity` — 1 DB query
   - `monitoring/user-health` — **5 sequential DB query** (HEAVY!)
   - `monitoring/baselines` — 1 DB query
   - `monitoring/alerts` — 1 DB query
   - `stats/health` — 1 DB query
   - `stats/ai-usage` — **5 parallel DB aggregate** (HEAVY!)
   - `system-errors` — 2 DB query

5. **Connection hisob:** Background (3) + HTTP requests (18) = **21 > 20 limit**

6. **Pool to'lganda:** Yangi query `pool_timeout` yo'qligi uchun **abadiy kutadi**. Query response kelmaydi → HTTP response kelmaydi → **butun API muzlaydi**.

7. **Cascading hang:** Hatto oddiy endpoint'lar (auth/login, auth/me) ham Prisma orqali DB ga murojaat qiladi → ular ham navbatda kutadi → timeout.

---

## TASDIQLASH DALILLARI

### 1. API dastlab ishlaydi, keyin muzlaydi

```
Vaqt 0s:    API start → MetricsService init, 15s kutish
Vaqt 15s:   Birinchi metrics collection (2-3 conn)
Vaqt 20s:   User dashboard ochadi → accounts, users (200 OK)
Vaqt 25s:   User system tab ochadi → 8 endpoint fire
Vaqt 26s:   getUserHealthSummary() 5 query + getAiUsageStats() 5 query
Vaqt 27s:   Pool to'ldi (20/20) → yangi query'lar kutishda
Vaqt 30s:   Keyingi metrics collection boshlanadi → pool'da joy yo'q
Vaqt 87s+:  BARCHA request'lar timeout → 502/504
```

### 2. nginx health check "ok" qaytaradi lekin API javob bermaydi

```nginx
# apps/web/nginx.conf.template:31-36
location = /api/v1/health {
    access_log off;
    return 200 'ok';           ← nginx o'zi qaytaradi, API'ga BORMAYDI
    add_header Content-Type text/plain;
}
```

Bu health check API ishlayaptimi tekshirmaydi. Shuning uchun Railway container'ni "healthy" deb hisoblaydi.

### 3. Frontend timeout yo'q → infinite spinner

```typescript
// apps/web/src/api/admin.ts:148-149
getMonitoringMetrics: (period = '1h') =>
    api.get<...>('/admin/monitoring/metrics', { params: { period } }),
    // ❌ timeout parameter YO'Q — abadiy kutadi
```

---

## TEGISHLI FAYLLAR

| Fayl | Muammo |
|------|--------|
| `apps/api/src/common/metrics/metrics.service.ts:62-66` | Background loop har 15s — DB connection oladi |
| `apps/api/src/common/metrics/metrics.service.ts:85-113` | `collectSnapshot()` — 3 sequential DB/Redis operation |
| `apps/api/src/common/metrics/metrics.service.ts:49-55` | Redis `lazyConnect: true` — birinchi call 3s block |
| `apps/api/src/common/metrics/metrics.service.ts:166-181` | `getQueueDepths()` — 6 sequential Redis calls |
| `apps/api/src/admin/admin-monitoring.service.ts:30-146` | `getUserHealthSummary()` — 5 sequential raw SQL |
| `apps/api/src/admin/admin-stats.service.ts:491-568` | `getAiUsageStats()` — 5 parallel DB aggregate |
| `apps/api/src/prisma/prisma.service.ts` | Prisma pool — `pool_timeout` o'rnatilmagan |
| `DATABASE_URL` (Railway env) | `connection_limit=20` bor, lekin `pool_timeout` YO'Q |

---

## YECHIM REJASI

### Darhol (API'ni qayta ishlatish)

| # | Nima | Qaerda | Ta'sir |
|---|------|--------|--------|
| **F1** | `pool_timeout=10` qo'shish | Railway → `DATABASE_URL` env | Query 10s dan ko'p kutmaydi, error qaytaradi, pool bo'shamaydi |
| **F2** | `getUserHealthSummary()` da 4 sequential query → `Promise.all()` | `admin-monitoring.service.ts:39-78` | 4 ta connection emas, 4 ta parallel → tezroq tugaydi |
| **F3** | MetricsService collection'da `getDbPoolActive()` ni o'chirish yoki cache qilish | `metrics.service.ts:89` | Background loop DB connection kamayadi |
| **F4** | Redis `lazyConnect: false` → explicit `.connect()` + parallel queue check | `metrics.service.ts:49-55, 166-181` | Redis 18s block yo'qoladi |

### Yaqin vaqtda (stabilizatsiya)

| # | Nima | Qaerda | Ta'sir |
|---|------|--------|--------|
| **F5** | Frontend monitoring chaqiruvlarida `timeout: 10000` | `SystemTab.tsx` fetchMetrics | Infinite spinner → 10s keyin error |
| **F6** | `connection_limit` oshirish: 20 → 30 | Railway `DATABASE_URL` | Ko'proq concurrent query sig'adi |
| **F7** | Monitoring endpoint'larga try/catch + graceful fallback | `admin-monitoring.service.ts` | 500 emas, bo'sh data qaytaradi |
| **F8** | Real API health check (nginx static emas) | `nginx.conf.template` + `health.controller.ts` | Railway API muzlaganda container restart qiladi |

### O'rta muddatli (arxitektura)

| # | Nima | Sabab |
|---|------|-------|
| **F9** | Monitoring data'ni Redis cache'ga olish | DB load kamayadi |
| **F10** | `getUserHealthSummary` ni materialized view ga o'tkazish | 5 query → 1 query |
| **F11** | MetricsService collection interval: 15s → 30s yoki 60s | DB load ikki baravar kamayadi |

---

## QAYTA ISHLAB CHIQARISH (Reproduce)

```bash
# 1. Admin sifatida login
# 2. /admin sahifasini ochish (dashboard yukladi)
# 3. /admin?tab=system ga o'tish
# 4. 30 soniya kutish
# 5. Barcha endpoint'lar hang — hatto /api/v1/auth/login ham timeout
```

---

*T-288 | API Hang Report | 2026-03-02*
