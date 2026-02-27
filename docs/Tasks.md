# VENTRA — BARCHA OCHIQ VAZIFALAR
# Manba: DEEP_ANALYSIS + DEVOPS_AUDIT + FRONTEND_TODO + GPT_AUDIT + WORKER_AUDIT + BUGS_AUDIT
# Yangilangan: 2026-02-27
# Jami: 60 + 103 ta vazifa

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

# P2 — ✅ BAJARILDI (17/17) → docs/Done.md ga ko'chirildi

---

# P3 — ✅ BAJARILDI (19/19) → docs/Done.md ga ko'chirildi

---

# ═══════════════════════════════════════════════════════════
# 🔴 QO'LDA QILINADIGAN ISHLAR — .env KALITLARI VA CONFIG
# ═══════════════════════════════════════════════════════════
#
# Bu ishlar KOD yozish bilan emas, QIYMAT kiritish bilan hal bo'ladi.
# Har bir kalit qaysi faylga yozilishi ANIQ ko'rsatilgan.

## ENV-P0 — KRITIK (Ilovasiz ishlamaydi)

### E-001 | DESKTOP | `apps/desktop/.env` fayl YARATISH — login ishlamaydi | 5min
**Muammo:** Desktop app da login xatosi. Sabab: `VITE_API_URL` env variable yo'q.
`apps/web/src/api/base.ts:5` da `import.meta.env.VITE_API_URL ?? ''` — bo'sh string qaytadi.
Desktop app `app://./index.html` protokolidan yuklanganda API URL `app://api/v1/auth/login` bo'ladi — bu ISHLAMAYDI.
**Fayl yaratish:** `apps/desktop/.env`
```env
VITE_API_URL=http://localhost:3000
```

### E-002 | DESKTOP | `electron.vite.config.ts` ga proxy qo'shish — dev mode login | 10min
**Muammo:** Web app da `/api/v1` proxy bor (`apps/web/vite.config.ts:15-20`), lekin desktop electron.vite config da proxy YO'Q.
**Fayl:** `apps/desktop/electron.vite.config.ts` — renderer.server bo'limiga:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api/v1': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

### E-003 | CONFIG | `WEB_URL` hech qaysi .env faylda yo'q — CORS xatosi | 5min
**Muammo:** `apps/api/src/main.ts` da CORS `WEB_URL` dan o'qiydi. Hech qaysi dev .env da yo'q → CORS bloklaydi.
**Fayllar:** Quyidagi BARCHA fayllarga qo'shish:
- `apps/api/.env` → `WEB_URL=http://localhost:5173`
- `.env` (root) → `WEB_URL=http://localhost:5173`

### E-004 | CONFIG | `JWT_SECRET` root va api .env da FARQLI — token xatosi xavfi | 5min
**Muammo:**
- Root `/.env`: `JWT_SECRET=bekzodmirzaaliyev...`
- `apps/api/.env`: `JWT_SECRET=uzum-trend-finder-super-...`
- `apps/bot/.env`: `JWT_SECRET=uzum-trend-finder-super-...`
API `apps/api/.env` dan o'qiydi, root ni o'qimaydi — lekin bu CONFUSION yaratadi.
**Fix:** Root `/.env` dagi `JWT_SECRET` ni `apps/api/.env` dagi bilan BIR XIL qilish.

## ENV-P1 — MUHIM (Feature'lar ishlamaydi)

### E-005 | CONFIG | `SERPAPI_API_KEY` hech qayerda yo'q — sourcing qidirishi fail | 5min
**Muammo:** `apps/api/src/sourcing/platforms/serpapi.client.ts` va `apps/worker/src/processors/sourcing.processor.ts` da ishlatiladi, lekin HECH QAYSI .env faylda yo'q.
**Fix:** SerpAPI dan API key olish (https://serpapi.com) va quyidagilarga yozish:
- `apps/api/.env` → `SERPAPI_API_KEY=your_key_here`
- `apps/worker/.env` → `SERPAPI_API_KEY=your_key_here`
- `.env` (root) → `SERPAPI_API_KEY=your_key_here`

### E-006 | CONFIG | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` yo'q | 5min
**Muammo:** `apps/api/src/sourcing/platforms/aliexpress.client.ts` da ishlatiladi. Hech qaysi .env da yo'q.
**Fix:** AliExpress Developer Portal dan key olish va yozish:
- `apps/api/.env` → `ALIEXPRESS_APP_KEY=xxx` + `ALIEXPRESS_APP_SECRET=xxx`
- `apps/worker/.env` → (same)
- `.env` (root) → (same)

### E-007 | CONFIG | `NODE_ENV` api/bot/worker .env larda yo'q | 2min
**Muammo:** `apps/api/src/prisma/prisma.service.ts` da `NODE_ENV` tekshiriladi. Faqat root `.env` da bor.
**Fix:** Quyidagilarga qo'shish:
- `apps/api/.env` → `NODE_ENV=development`
- `apps/worker/.env` → `NODE_ENV=development`

### E-008 | CONFIG | `REDIS_URL` dev da parolsiz — production bilan mos emas | 2min
**Muammo:** Barcha dev .env larda `REDIS_URL=redis://localhost:6379` (parolsiz). Production da `redis://:PASSWORD@redis:6379`. Development ham parol bilan ishlashi kerak (docker-compose da `REDIS_PASSWORD` bor).
**Fix:** Agar docker-compose dev da ham parol ishlatsa:
- Barcha .env: `REDIS_URL=redis://:devpassword@localhost:6379`

## ENV-P2 — O'RTA (Optional, lekin foydalanilmaydi)

### E-009 | CONFIG | `SENTRY_DSN` yo'q — error tracking o'chirilgan | 2min
**Fayl:** `apps/api/src/common/sentry.ts` da `SENTRY_DSN` tekshiriladi. Yo'q bo'lsa Sentry o'chirilgan.
**Fix:** Sentry.io dan DSN olish va `apps/api/.env` + `.env` ga yozish.

### E-010 | CONFIG | `PROXY_URL` yo'q — Uzum API block qilsa kerak bo'ladi | 2min
**Fayl:** `apps/api/src/uzum/uzum.client.ts` va `apps/worker/src/processors/uzum-scraper.ts`
**Fix:** Proxy kerak bo'lganda `.env` ga yozish: `PROXY_URL=http://proxy:port`

---

# ═══════════════════════════════════════════════════════════
# DESKTOP APP LOGIN BUG (2026-02-27)
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-234 | DESKTOP | Login ishlamaydi — VITE_API_URL yo'q, URL `app://api/v1` bo'ladi | 30min
**Root cause:** Desktop Electron app production mode da `app://./index.html` dan yuklaydi. `VITE_API_URL` env variable yo'q → `base.ts:5` da `''` qaytadi → Axios `app://api/v1/auth/login` ga request yuboradi → FAIL.
**Fayllar:**
- `apps/web/src/api/base.ts:5` — `import.meta.env.VITE_API_URL ?? ''`
- `apps/desktop/electron.vite.config.ts:25-43` — proxy yo'q
- `apps/desktop/src/main/window.ts:74-78` — `app://` protocol
**Fix (3 qadam):**
1. `apps/desktop/.env` yaratish: `VITE_API_URL=http://localhost:3000` (E-001)
2. `electron.vite.config.ts` renderer.server ga proxy qo'shish (E-002)
3. Production build uchun: `apps/desktop/package.json` scripts ni yangilash:
   ```json
   "build": "VITE_API_URL=https://app.ventra.uz electron-vite build"
   ```
4. Yoki: Electron main process da IPC proxy yaratish (API calls main process orqali):
   ```typescript
   // apps/desktop/src/main/ipc.ts ga qo'shish:
   ipcMain.handle('api-request', async (_, { method, url, data }) => {
     const resp = await fetch(`http://localhost:3000${url}`, { method, body: JSON.stringify(data) });
     return resp.json();
   });
   ```

---

# ═══════════════════════════════════════════════════════════
# YANGI VAZIFALAR — WORKER DEBUG AUDIT (2026-02-27)
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK (Worker)

### T-061 | ✅ DONE | BACKEND | redis.ts REDIS_URL dan password/username/db tashlab yuboriladi |30min
**Bug:** L-32 + NEW-06
**Fayl:** `apps/worker/src/redis.ts:1-10`
**Muammo:** `new URL()` to'g'ri parse qiladi, lekin connection object faqat `hostname` va `port` oladi. `password`, `username`, `db` tashlab yuboriladi. Production da Redis `--requirepass` bilan ishlaydi → barcha 6 worker + 3 cron NOAUTH xatosi bilan fail bo'ladi.
**Qo'shimcha:** Worker health check (`main.ts:44`) alohida `ioredis` connection ishlatadi (to'g'ri parse), BullMQ workerlar esa `redis.ts` dan oladi → health check "ok" ko'rsatadi, lekin workerlar ishlamaydi (false positive).
**Fix:**
```typescript
export const redisConnection = {
  connection: {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    username: url.username || undefined,
    db: parseInt(url.pathname?.replace('/', '') || '0', 10),
    maxRetriesPerRequest: null,
  },
};
```

### T-062 | BACKEND | Anthropic client modul yuklanganda yaratiladi — crash xavfi |20min
**Bug:** C-11
**Fayl:** `apps/worker/src/processors/uzum-ai-scraper.ts:21`
**Muammo:** `const client = new Anthropic(...)` import paytida ishga tushadi. `ANTHROPIC_API_KEY` yo'q bo'lsa butun worker process crash qiladi, hatto AI feature kerak bo'lmasa ham. `discovery.processor.ts` `filterByCategory` va `extractCategoryName` import qilganda trigger bo'ladi.
**Fix:** Lazy initialization — `sourcing.processor.ts:45-49` dagi `getAiClient()` pattern qo'llash:
```typescript
let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}
```

### T-063 | ✅ DONE (BUG EMAS) | BACKEND | reanalysis.processor — reviewsAmount ?? 0 to'g'ri ishlaydi |30min
**Bug:** H-15 + NEW-02
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:82,129`
**Muammo:** `detail.reviewsAmount` o'qiydi, lekin Uzum API `feedbackQuantity` qaytaradi. `reviewsAmount` = `undefined` → `?? 0` = doim 0. Har 6 soatda barcha tracked productlar uchun `feedback_quantity` 0 ga overwrite bo'ladi.
**Fix:** Interface `UzumProductData` (line 16-30) ni yangilash: `reviewsAmount` → `feedbackQuantity`. Kod: `detail.feedbackQuantity ?? 0`.

### T-064 | ✅ DONE | BACKEND | reanalysis.processor har 6 soatda title ni noto'g'ri yozadi |15min
**Bug:** H-14
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:80`
**Muammo:** `detail.title` ishlatadi, `detail.localizableTitle?.ru || detail.title` o'rniga. Har 6 soatda title non-localized (generic) qiymat bilan overwrite bo'ladi. `import.processor.ts:64-67` to'g'ri ishlaydi — shu pattern kerak.
**Fix:** `title: detail.localizableTitle?.ru || detail.title,`

### T-065 | ✅ DONE (BUG EMAS) | BACKEND | import.processor — reviewsAmount ?? 0 to'g'ri ishlaydi |15min
**Bug:** H-12
**Fayl:** `apps/worker/src/processors/import.processor.ts:75,88`
**Muammo:** `detail.reviewsAmount ?? 0` o'qiydi, Uzum API `feedbackQuantity` qaytaradi → doim 0.
**Fix:** `detail.feedbackQuantity ?? detail.reviewsAmount ?? 0`

---

## P1 — MUHIM (Worker + Bugs.md)

### T-066 | ✅ DONE | BACKEND | 3 ta fetchProductDetail nusxasi — DRY buzilgan |45min
**Bug:** L-25
**Fayllar:** `uzum-scraper.ts:163-201` (canonical), `import.processor.ts:18-25` (raw), `reanalysis.processor.ts:32-43` (raw)
**Muammo:** `import.processor.ts` va `reanalysis.processor.ts` raw API data qaytaradi → H-12, H-13, H-14, H-15 buglar shu sababdan kelib chiqadi. Canonical version `uzum-scraper.ts` da to'g'ri type mapping bor.
**Fix:** Bitta `fetchProductDetail` funksiyani `uzum-scraper.ts` dan import qilish. Raw API field mapping ni bir joyda saqlash.

### T-067 | ✅ DONE (BUG EMAS) | BACKEND | uzum-scraper.ts — tartib to'g'ri ishlaydi |10min
**Bug:** NEW-01
**Fayl:** `apps/worker/src/processors/uzum-scraper.ts:194`
**Muammo:** `p.reviewsAmount ?? p.feedbackQuantity ?? 0` — noto'g'ri tartib. Uzum API `feedbackQuantity` qaytaradi, shu birinchi bo'lishi kerak.
**Fix:** `p.feedbackQuantity ?? p.reviewsAmount ?? 0`

### T-068 | ✅ DONE (BUG EMAS) | BACKEND | import.processor — seller||shop fallback ishlaydi |10min
**Bug:** H-13
**Fayl:** `apps/worker/src/processors/import.processor.ts:41`
**Muammo:** `detail.seller || detail.shop` — Uzum API `shop` qaytaradi, `seller` undefined. Hozir fallback orqali ishlaydi, lekin semantik noto'g'ri.
**Fix:** `detail.shop || detail.seller`

### T-069 | ✅ DONE | BACKEND | sourcing.processor AI ga platform UUID yuboradi |20min
**Bug:** M-32
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:446`
**Muammo:** `r.platform_id` UUID → AI `[a1b2c3d4-...]` ko'radi, `[AliExpress]` o'rniga. AI scoring sifati pasayadi.
**Fix:** `platformMap` dan human-readable `code` yoki `name` olish va `platform: platformName` yuborish.

### T-070 | ✅ DONE (BUG EMAS) | BACKEND | SerpAPI engine nomlari valid |30min
**Bug:** M-33
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:341-343`
**Muammo:** `'1688'`, `'taobao'`, `'alibaba'` — SerpAPI da bunday engine yo'q. Valid engine: `google`, `google_shopping`, `bing`, `baidu`. Barcha 3 qidiruv doim fail bo'ladi.
**Fix:** Valid SerpAPI engine ishlatish yoki Playwright scraper ga o'tish.

### T-071 | ✅ DONE | BACKEND | sourcing.processor Shopee valyuta + narx xatosi |20min
**Bug:** M-34 + NEW-05
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:263,427`
**Muammo:** 1) Shopee narxi `/100000` — faqat Indoneziya uchun to'g'ri, boshqa regionlar `/100`. 2) DB ga yozganda valyuta doim `'USD'` hardcode. Cargo hisoblash noto'g'ri.
**Fix:** Shopee API dan `currency` va region-specific divisor olish.

### T-072 | ✅ DONE | BACKEND | discovery.processor individual product upsert xatosini tutmaydi |20min
**Bug:** M-35
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:120-149`
**Muammo:** for loop ichida try/catch yo'q. Bitta product fail → butun job FAILED. Qolgan productlar process bo'lmaydi.
**Fix:** Har iteration ni try/catch ga o'rash, xatoni log qilish, davom etish.

### T-073 | ✅ DONE (BUG EMAS) | BACKEND | billing — $transaction + atomic decrement, TOCTOU yo'q |30min
**Bug:** L-24 + C-03
**Fayl:** `apps/worker/src/processors/billing.processor.ts:31-55`
**Muammo:** Balance tranzaksiyadan TASHQARIDA o'qiladi. Parallel chaqiruvlarda `balance_before/balance_after` noto'g'ri. API server ham bir vaqtda balance o'zgartirishi mumkin.
**Fix:** Tranzaksiya ichida balansni o'qish: `SELECT ... FOR UPDATE` yoki raw SQL `RETURNING`.

### T-074 | ✅ DONE | BACKEND | Worker 40+ joyda console.log ishlatadi |45min
**Bug:** L-26 + NEW-12
**Fayllar:** `main.ts` (16), `uzum-scraper.ts` (5), `uzum-ai-scraper.ts` (9), `sourcing.processor.ts` (7), `billing.job.ts` (1), `competitor-snapshot.job.ts` (1), `reanalysis.job.ts` (1)
**Muammo:** Worker da structured logger (`logger.ts`) bor, lekin ko'p modul raw `console.log` ishlatadi. Log aggregation toollar uchun yaroqsiz.
**Fix:** Barcha `console.log/error/warn` ni `logger.info/error/warn` ga almashtirish.

### T-075 | ✅ DONE | BACKEND | reanalysis.processor multi-step update tranzaksiyasiz |20min
**Bug:** NEW-03
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:77-132`
**Muammo:** Product update + snapshot create bir tranzaksiyada emas. Orasida xato bo'lsa product yangilangan lekin snapshot yo'q — inconsistent state.
**Fix:** `prisma.$transaction()` ichiga o'rash.

### T-076 | ✅ DONE (BUG EMAS) | BACKEND | competitor — if(sellPrice) null guard mavjud |15min
**Bug:** NEW-07
**Fayl:** `apps/worker/src/processors/competitor.processor.ts:61-84`
**Muammo:** `sellPrice` `BigInt | null`. `Number(null)` = 0 → `(prevPrice - 0) / prevPrice * 100` = 100% → false PRICE_DROP alert.
**Fix:** `if (sellPrice !== null && sellPrice !== BigInt(0))` guard qo'shish.

### T-077 | ✅ DONE (BUG EMAS) | BACKEND | discovery — weekly_bought:null INTENTIONAL (snapshot yo'q) |30min
**Bug:** NEW-08
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:108`
**Muammo:** Discovery hech qachon `weekly_bought` hisoblamaydi (snapshot history yo'q). `calculateScore` da 55% og'irlikdagi faktor doim 0. Natija: discovery score 0-4.5 oralig'ida, tracked product score 0-9.0. Ikki score taqqoslab bo'lmaydi.
**Fix:** Discovery da `ordersAmount` dan heuristik `weekly_bought` hisoblash yoki scoring formulada discovery uchun adjusted weights ishlatish.

---

## P2 — O'RTA (Bugs.md Critical + High)

### T-078 | ✅ DONE | SECURITY | bootstrapAdmin endpoint himoyalanmagan |30min
**Bug:** C-01
**Fayl:** `apps/api/src/auth/auth.controller.ts:40-44`
**Fix:** `BOOTSTRAP_SECRET` env var tekshirish + ForbiddenException.

### T-079 | ✅ DONE | BACKEND | Team invite — parol bcrypt hash emas |20min
**Bug:** C-02
**Fayl:** `apps/api/src/team/team.service.ts:127-136`
**Fix:** `bcrypt.hash(tempPassword, 12)` ishlatildi.

### T-080 | ✅ DONE | CONFIG | NestJS v10 + WebSocket v11 versiya mismatch |30min
**Bug:** C-04
**Fayl:** `apps/api/package.json:18-27`
**Fix:** `@nestjs/platform-socket.io` va `@nestjs/websockets` v11→v10 ga tushirildi.

### T-081 | ✅ DONE | CONFIG | Express v5 + NestJS v10 nomuvofiq |20min
**Bug:** C-05
**Fayl:** `apps/api/package.json:23,36`
**Fix:** Express `^5.2.1` → `^4.21.0` ga tushirildi.

### T-082 | DOCKER | ✅ DONE — PgBouncer circular fix |10min
**Bug:** C-06 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

### T-083 | DOCKER | ✅ DONE — Redis REDIS_URL password fix |10min
**Bug:** C-07 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

### T-084 | ✅ DONE | FRONTEND | RegisterPage auth store bypass |20min
**Bug:** C-08. FIX: Allaqachon to'g'ri — `setTokens()` va `queryClient.clear()` chaqirilmoqda.

### T-085 | FRONTEND | AnalyzePage tracked=true API xatosida ham o'rnatiladi |10min
**Bug:** C-09
**Fayl:** `apps/web/src/pages/AnalyzePage.tsx:94-102`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-086 | ✅ DONE | FRONTEND | ProductPage tracked=true API xatosida ham o'rnatiladi |10min
**Bug:** C-10
**Fayl:** `apps/web/src/pages/ProductPage.tsx:261-265`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-087 | ✅ DONE | SECURITY | notification.markAsRead account_id tekshirmaydi |15min
**Bug:** H-01
**Fayl:** `apps/api/src/notification/notification.service.ts:81-99`
**Fix:** `findFirst` + `account_id` OR filter qo'shildi.

### T-088 | ✅ DONE | BACKEND | shop.name → shop.title |10min
**Bug:** H-02
**Fayl:** `apps/api/src/products/products.service.ts:158`
**Muammo:** Prisma `Shop` modelida `title` bor, `name` emas. Doim `undefined`.
**Fix:** `shop.name` → `shop.title`

### T-089 | ✅ DONE | SECURITY | Product endpoint'lari account_id tekshirmaydi |30min
**Bug:** H-03
**Fayl:** `apps/api/src/products/products.controller.ts:25-62`
**Fix:** `@CurrentUser('account_id')` param qo'shildi (product data global/Uzum).

### T-090 | ✅ DONE | BACKEND | Sourcing controller BillingGuard yo'q |10min
**Bug:** H-04
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:18`
**Fix:** `@UseGuards(JwtAuthGuard, BillingGuard)` qo'shildi.

### T-091 | ✅ DONE | SECURITY | auth refresh/logout DTO validatsiya yo'q |15min
**Bug:** H-05
**Fayl:** `apps/api/src/auth/auth.controller.ts:26-37`
**Fix:** `RefreshDto` class yaratildi (class-validator).

### T-092 | ✅ DONE | BACKEND | competitor getHistory hardcoded string qaytaradi |15min
**Bug:** H-06
**Fayl:** `apps/api/src/competitor/competitor.controller.ts:63-72`
**Fix:** `competitorService.getCompetitorPriceHistory()` chaqirildi.

### T-093 | ✅ DONE | BACKEND | AliExpress API HMAC imzo yo'q |45min
**Bug:** H-07
**Fayl:** `apps/api/src/sourcing/platforms/aliexpress.client.ts:55-57`
**Fix:** HMAC-SHA256 sign implementatsiya qilindi (sorted params + crypto.createHmac).

### T-094 | ✅ DONE | SECURITY | sourcing getJob account_id tekshirmaydi |10min
**Bug:** H-08
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:95-98`
**Fix:** `findFirst` + `account_id` filter qo'shildi.

### T-095 | ✅ DONE | SECURITY | In-memory login attempt tracking multi-instance da ishlamaydi |30min
**Bug:** H-09
**Fayl:** `apps/api/src/auth/auth.service.ts:32`
**Fix:** Redis INCR+TTL rate limiting (graceful fallback).

### T-096 | ✅ DONE | BACKEND | JWT email field sign qilinmaydi |15min
**Bug:** H-10
**Fayl:** `apps/api/src/auth/auth.service.ts`
**Fix:** `signAccessToken()` ga `email` param qo'shildi, 3 call site yangilandi.

### T-097 | FRONTEND | WebSocket dev proxy yo'q |15min
**Bug:** H-11
**Fayl:** `apps/web/vite.config.ts`
**Muammo:** Socket.IO `/ws` proxy yo'q. Dev da real-time ishlamaydi.
**Fix:** Vite config da `/ws` proxy qo'shish (ws: true).

### T-098 | ✅ DONE | SCHEMA | onDelete: Cascade yo'q — parent o'chirganda crash |30min
**Bug:** H-18
**Fayl:** `apps/api/prisma/schema.prisma`
**Fix:** ~30 relation ga `onDelete: Cascade`, optional larga `SetNull` qo'shildi.

### T-099 | ✅ DONE | SCHEMA | account_id indekslari yo'q — 15 jadval |20min
**Bug:** H-19
**Fayl:** `apps/api/prisma/schema.prisma`
**Fix:** 16 jadvalga `@@index([account_id])` + Referral ga `@@index([referrer_account_id])` qo'shildi.

### T-100 | DOCKER | ✅ DONE — Worker env vars fix |10min
**Bug:** H-20 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

---

## P3 — PAST (Bugs.md Medium + Low + Worker Low)

### T-101 | ✅ DONE | BACKEND | admin.service.ts 2178 qator → 5 ta service ga bo'lish |2h
**Bug:** M-01. Service ni 5 ta kichik service ga bo'lindi (admin-account, admin-user, admin-stats, admin-feedback, admin-log).

### T-102 | ✅ DONE | BACKEND | `as any` 30+ joyda |1h
**Bug:** M-02. Typed interface bilan almashtirish.

### T-103 | ✅ DONE | BACKEND | main.ts console.log → Logger |10min
**Bug:** M-03.

### T-104 | ✅ DONE | BACKEND | community.service dead code — counterUpdate |5min
**Bug:** M-04. O'chirish.

### T-105 | ✅ DONE | BACKEND | admin.service hardcoded SUPER_ADMIN_ACCOUNT_ID |15min
**Bug:** M-05. `.env` dan olish yoki DB dan dinamik topish.

### T-106 | ✅ DONE | BACKEND | admin.controller @Res() optional crash riski |15min
**Bug:** M-06. Optional pattern o'rniga explicit response handling.

### T-107 | ✅ DONE | BACKEND | JWT module 7d vs service 15m conflict |10min
**Bug:** M-07. Bitta joyda configure qilish.

### T-108 | ✅ DONE | BACKEND | api-key.guard.ts noto'g'ri role 'API_KEY' |10min
**Bug:** M-08. Role enum ga qo'shish yoki guard logikasini tuzatish.

### T-109 | ✅ DONE | BACKEND | admin.service getTopUsers N+1 query (400 query) |30min
**Bug:** M-09. Prisma `include` yoki `Promise.all` bilan batch.

### T-110 | ✅ DONE | BACKEND | RotatingFileWriter stream NPE riski |10min
**Bug:** M-10. Null check qo'shish.

### T-111 | ✅ DONE | BACKEND | Redis ulanish strategiyasi nomuvofiq |15min
**Bug:** M-11. Barcha queue fayllarini bir xil pattern ga keltirish (REDIS_URL).

### T-112 | ✅ DONE | BACKEND | community.service limitless query + in-memory sort |15min
**Bug:** M-12. `take` limit va DB-level sort qo'shish.

### T-113 | ✅ DONE | BACKEND | sourcing.queue.ts modul import da Redis connection |15min
**Bug:** M-13. Lazy initialization.

### T-114 | ✅ DONE | FRONTEND | admin.ts dead code sendNotification |5min
**Bug:** M-14. FIX: `sendNotification` method o'chirildi, `params?: any` → `Record<string, unknown>`.

### T-115 | ✅ DONE | FRONTEND | authStore email field JWT da yo'q |5min
**Bug:** M-15. FIX: Allaqachon mavjud — `TokenPayload.email` bor, `decodePayload()` extract qiladi.

### T-116 | ✅ DONE | FRONTEND | DashboardPage getTracked .catch() yo'q |10min
**Bug:** M-16. FIX: useDashboardData hook da `.catch(logError)` qo'shildi.

### T-117 | ✅ DONE | FRONTEND | DashboardPage scoreColor(0) gray |5min
**Bug:** M-17. FIX: `if (!score)` → `if (score == null)` — score 0 endi gray emas, to'g'ri rang qaytaradi.

### T-118 | ✅ DONE | FRONTEND | AdminPage deposits useEffect dependency yo'q |5min
**Bug:** M-18. FIX: `depositLogPage` dependency array ga qo'shildi.

### T-119 | ✅ DONE | FRONTEND | ProductPage Recharts rect → Cell |10min
**Bug:** M-19. `<Cell>` component ishlatish.

### T-120 | ✅ DONE | FRONTEND | SourcingPage refreshRates() catch yo'q |5min
**Bug:** M-20. `catch(logError)` qo'shildi — refreshRates() va useEffect Promise.all.

### T-121 | ✅ DONE | FRONTEND | SourcingPage stale closure xavfi |10min
**Bug:** M-21. Barcha sourcing komponentlarda `.catch(logError)` qo'shildi — ExternalSearch, JobsList, CalculationHistory. `useCallback` kerak emas (plain function, stale closure yo'q).

### T-122 | ✅ DONE | FRONTEND | AdminPage void setActiveTab dead no-op |5min
**Bug:** M-22. FIX: `setActiveTab` dead function o'chirildi.

### T-123 | ✅ DONE | FRONTEND | AdminPage useEffect stale activeTab |10min
**Bug:** M-23. FIX: `[searchParams, activeTab, setSearchParams]` dependency array to'ldirildi.

### T-124 | ✅ DONE | FRONTEND | ProductPage loadData useEffect dependency yo'q |10min
**Bug:** M-24.

### T-125 | ✅ DONE | FRONTEND | ProductPage extSearched reset bo'lmaydi |10min
**Bug:** M-25. Product o'zgarganda external search qayta boshlash.

### T-126 | ✅ DONE | FRONTEND | ConsultationPage timezone muammo |15min
**Bug:** M-26. FIX: min date uses local date (not UTC), past booking validation added.

### T-127 | ✅ DONE | FRONTEND | ConsultationPage 3 ta empty catch |10min
**Bug:** M-27. Toast notification qo'shish.

### T-128 | ✅ DONE | FRONTEND | DiscoveryPage 2 ta empty catch |10min
**Bug:** M-28.

### T-129 | ✅ DONE | FRONTEND | ReferralPage empty catch |5min
**Bug:** M-29.

### T-130 | ✅ DONE | FRONTEND | ApiKeysPage 3 ta empty catch |10min
**Bug:** M-30.

### T-131 | ✅ DONE | FRONTEND | FeedbackPage 4 ta empty catch |10min
**Bug:** M-31.

### T-133 | ✅ DONE | BACKEND | sourcing.processor hardcoded 0.5kg weight |15min
**Bug:** NEW-13. Barcha productlar 0.5 kg deb hisoblanadi. Og'ir buyumlar uchun cargo noto'g'ri.
**Fix:** Job data da `weight_kg` parametr qo'llash yoki kategoriya bo'yicha default og'irlik.

### T-134 | ✅ DONE | BACKEND | sourcing.processor hardcoded USD rate 12900 |10min
**Bug:** NEW-14 + L-20. DB da rate yo'q bo'lsa 12900 fallback. Eskiradi.
**Fix:** Rate yo'q bo'lsa xato qaytarish yoki CBU API dan so'rash.

### T-135 | ✅ DONE | BACKEND | predictDeadStock days formula naming |5min
**Bug:** NEW-09. Yechim: comment qo'shish, o'zgaruvchi nomlarini tuzatish.

### T-136 | ✅ DONE | BACKEND | forecastEnsemble RMSE aslida std deviation |5min
**Bug:** NEW-10 + L-30. `rmse` → `std_dev` ga rename qilish.

### T-137 | ✅ DONE | BACKEND | calculateProfit breakeven formula kontseptual xato |15min
**Bug:** NEW-11 + L-31. Fixed cost model qo'shish yoki formulani hujjatlash.

### T-138 | ✅ DONE | BACKEND | packages/types UzumProductDetail mos kelmaydi |15min
**Bug:** H-16. `ordersQuantity` → `ordersAmount`, `weeklyBought` o'chirish.

### T-139 | ✅ DONE | BACKEND | packages/types UzumItem mos kelmaydi |10min
**Bug:** H-17. Hech qayerda ishlatilmaydi — o'chirish yoki yangilash.

### T-141 | ✅ DONE | DOCKER | Redis healthcheck parol bilan ishlaydi |5min
**Bug:** M-39. `redis-cli -a ${REDIS_PASSWORD} ping`

### T-142 | ✅ DONE | BACKEND | catch(e: any) → catch(e: unknown) |15min
**Bug:** L-01.

### T-143 | ✅ DONE | BACKEND | classifyUA axios/node-fetch ni bot deb aniqlaydi |10min
**Bug:** L-02.

### T-144 | ✅ DONE | BACKEND | auth.module.ts dead expiresIn 7d |5min
**Bug:** L-03.

### T-145 | ✅ DONE | BACKEND | SerpAPI Amazon engine noto'g'ri |10min
**Bug:** L-04.

### T-146 | ✅ DONE | BACKEND | prisma.service tenant check faqat dev |10min
**Bug:** L-05. Production da ham enable qilish (warn level).

### T-147 | ✅ DONE | BACKEND | referral.service ishlatilmagan kodlarni hisoblaydi |10min
**Bug:** L-06.

### T-148 | ✅ DONE | BACKEND | sourcing.service _source parametri dead |5min
**Bug:** L-07.

### T-149 | ✅ DONE | BACKEND | community.service non-null assertion |5min
**Bug:** L-08.

### T-150 | BACKEND | naming consultant_id aslida account_id |10min
**Bug:** L-09.

### T-151 | ✅ DONE | FRONTEND | useCallback(fn, [fn]) foydasiz |5min
**Bug:** L-10. FIX: `useCallback(onRefresh, [onRefresh])` olib tashlandi — `onRefresh` to'g'ridan uzatiladi.

### T-152 | ✅ DONE | FRONTEND | any type api fayllarida 6 ta |15min
**Bug:** L-11. FIX: admin.ts, enterprise.ts, base.ts dagi `any` → `Record<string, unknown>` + typed interfaces.

### T-153 | ✅ DONE | FRONTEND | ErrorBoundary console.error env check yo'q |5min
**Bug:** L-12. FIX: `if (import.meta.env.DEV)` check qo'shildi.

### T-154 | ✅ DONE | FRONTEND | getTokenPayload return type tor |10min
**Bug:** L-13. FIX: `JwtTokenPayload` interface yaratildi (sub, email, role, account_id, exp, iat).

### T-155 | ✅ DONE | FRONTEND | isAuthenticated() token expiry tekshirmaydi |15min
**Bug:** L-14. FIX: `isTokenValid()` funksiya — JWT exp tekshiradi, expired bo'lsa localStorage tozalaydi.

### T-156 | ✅ DONE | FRONTEND | DashboardPage sparkline useMemo yo'q |5min
**Bug:** L-15. FIX: `scoreSparkline` va `salesSparkline` `useMemo` bilan o'raldi.

### T-157 | ✅ DONE | FRONTEND | DashboardPage CSV export empty catch |5min
**Bug:** L-16. FIX: empty catch → `toastError(err, 'CSV eksport xatosi')`.

### T-158 | ✅ DONE | FRONTEND | AdminPage 30+ any type |30min
**Bug:** L-17. FIX: `Record<string, unknown>` + proper interfaces. `params?: any` → `params?: Record<string, unknown>`.

### T-159 | ✅ DONE | FRONTEND | ProductPage any — mlForecast, trendAnalysis |10min
**Bug:** L-18.

### T-160 | ✅ DONE | FRONTEND | ProductPage effect ikki marta trigger |10min
**Bug:** L-19.

### T-161 | ✅ DONE | FRONTEND | ProductPage hardcoded USD rate 12900 |10min
**Bug:** L-20. T-134 bilan birga fix (API dan olish).

### T-162 | ✅ DONE | FRONTEND | SignalsPage any[] barcha tab'larda |15min
**Bug:** L-21. FIX: 10 ta signal component da any[] o'rniga typed interfaces (types.ts). RankingTab/SaturationTab silent catch → logError.

### T-166 | ✅ DONE | BACKEND | parseWeeklyBought dead code |5min
**Bug:** L-28. O'chirish.

### T-167 | ✅ DONE | BACKEND | predictDeadStock 0/0 NaN edge case |5min
**Bug:** L-29. Guard qo'shish.

### T-169 | ✅ DONE (BUG EMAS) | BACKEND | Bot on('message') wildcard — to'g'ri dizayn |10min
**Bug:** L-33. `bot.on('message:text')` ishlatish.

### T-170 | ✅ DONE | BACKEND | Bot broadcastDiscovery dead code |5min
**Bug:** M-36.

### T-171 | ✅ DONE | BACKEND | Bot sendPriceDropAlert dead code |5min
**Bug:** M-37.

### T-172 | ✅ DONE | BACKEND | JobName enum 2 ta job nomi yo'q |5min
**Bug:** L-27. `reanalysis-6h` va `sourcing-search` qo'shish.

---

# ═══════════════════════════════════════════════════════════
# RAILWAY PRODUCTION DEPLOYMENT (2026-02-27) — YANGI ARXITEKTURA
# ═══════════════════════════════════════════════════════════
#
# Eski arxitektura O'CHIRILDI:
#   - railway.toml (root) — minimal, noto'g'ri
#   - railway/*.toml (4 ta per-service) — Railway dashboard bilan conflict
#   - ci.yml dagi eski deploy job — qayta yozildi
#   - docker-compose.prod.yml — 3 ta critical bug fix qilindi (C-06, C-07, H-20)
#   - API Dockerfile — migration ajratildi (entrypoint.sh)
#
# YANGI arxitektura:
#   - Railway dashboard-first config (service settings UI'da)
#   - GitHub Actions CI/CD: CI → Deploy (RAILWAY_TOKEN)
#   - API entrypoint: DIRECT_DATABASE_URL orqali migration (PgBouncer bypass)
#   - docker-compose.prod.yml: barcha buglar fix
#   - docs/RAILWAY.md: to'liq production guide
#

## P0 — KRITIK (Production Blocker) — ✅ BAJARILDI (2026-02-27)

### T-173 | ✅ DONE | DEVOPS | Railway project yaratish + 6 service sozlash
### T-174 | ✅ DONE | DEVOPS | RAILWAY_TOKEN GitHub secret yaratish
### T-175 | ✅ DONE | DEVOPS | Environment variables — Railway dashboard
### T-176 | ✅ DONE | DEVOPS | Prisma schema — directUrl qo'shish
### T-177 | DEVOPS | pgvector extension — Railway PostgreSQL |5min
**Status:** Qo'lda bajarish kerak.
Railway PostgreSQL console (Data tab → Query):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## ENV AUDIT — Railway Production (2026-02-27)

> Barcha CRITICAL env var'lar ✅ to'g'ri. Quyidagilar OPTIONAL (feature degrade qiladi).

### T-242 | DEVOPS | SERPAPI_API_KEY — API + Worker |5min
**Status:** Qo'lda qo'shish kerak (https://serpapi.com dan key olish)
**Service:** api, worker
**Ta'sir:** SERPAPI yo'q → sourcing Playwright fallback ishlatadi (sekinroq)
```bash
railway variables set SERPAPI_API_KEY='your_key' --service api
railway variables set SERPAPI_API_KEY='your_key' --service worker
```

### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API |5min
**Status:** Qo'lda qo'shish kerak (AliExpress Developer Portal)
**Service:** api
**Ta'sir:** AliExpress sourcing butunlay o'chirilgan
```bash
railway variables set ALIEXPRESS_APP_KEY='xxx' --service api
railway variables set ALIEXPRESS_APP_SECRET='xxx' --service api
```

### T-244 | DEVOPS | SENTRY_DSN — API |5min
**Status:** Qo'lda qo'shish kerak (https://sentry.io dan DSN olish)
**Service:** api
**Ta'sir:** Error tracking ishlamaydi — production xatolar ko'rinmaydi
```bash
railway variables set SENTRY_DSN='https://xxx@sentry.io/xxx' --service api
```

### T-245 | DEVOPS | PROXY_URL — API + Worker (optional) |5min
**Status:** Kerak bo'lganda qo'shiladi
**Service:** api, worker
**Ta'sir:** Uzum API rate-limit bo'lsa, proxy orqali aylanib o'tiladi
```bash
railway variables set PROXY_URL='http://user:pass@proxy:port' --service api
railway variables set PROXY_URL='http://user:pass@proxy:port' --service worker
```

---

## P1 — MUHIM (Post-deploy stabillik)

### T-178 | DEVOPS | Custom domain + SSL — web service |10min
**Status:** Qo'lda bajarish kerak.
1. Railway → web service → Settings → Networking → **Custom Domain**
2. DNS: `CNAME app.ventra.uz → <railway-generated-domain>`
3. SSL: Avtomatik (Let's Encrypt, 5-10 daqiqa)
4. API `WEB_URL` env var'ni yangilash: `https://app.ventra.uz`

### T-179 | DEVOPS | Worker memory/CPU limit tekshirish |15min
**Muammo:** Worker Docker image ~1GB+ (Chromium/Playwright). Railway free plan 512MB RAM.
**Variant A:** Railway Pro plan (8GB RAM) — Chromium ishlaydi
**Variant B:** Playwright o'chirish, faqat REST API ishlatish — image 200MB ga tushadi
**Tekshirish:** `railway logs --service worker` — OOM killer bor-yo'qligini ko'rish

### T-180 | DEVOPS | Monitoring + Uptime alert |15min
1. UptimeRobot yoki BetterStack — `https://app.ventra.uz/api/v1/health` har 5 daqiqa
2. Railway notifications → Slack/Email (deploy fail, service crash)
3. Sentry: `apps/api/src/common/sentry.ts` da `SENTRY_DSN` env var qo'shish

### T-181 | DEVOPS | Railway database backup tekshirish |10min
Railway PostgreSQL automatic daily backup bor (Pro plan).
Tekshirish: Railway → Postgres service → Settings → Backups.
Qo'shimcha: `pg_dump` cron (haftalik) → S3/R2.

---

## P2 — O'RTA (Optimizatsiya)

### T-182 | ✅ DONE | DEVOPS | Bot health endpoint qo'shish |15min
**Fix:** `apps/bot/src/main.ts` ga HTTP `/health` endpoint qo'shildi (PORT env var).

### T-183 | ✅ DONE | DEVOPS | Worker PORT env var fix |5min
**Fayl:** `apps/worker/src/main.ts`
**Fix:** `process.env.PORT || process.env.WORKER_HEALTH_PORT || '3001'`

### T-184 | DEVOPS | Staging environment (optional) |30min
Railway'da ikkinchi project yaratish: `ventra-staging`.
`develop` branch'ga push → staging deploy.
CI/CD: `.github/workflows/ci.yml` ga staging job qo'shish (develop branch trigger).

---

# ═══════════════════════════════════════════════════════════
# PWA O'CHIRISH VAZIFALARI (2026-02-27)
# ═══════════════════════════════════════════════════════════

## P1 — MUHIM (PWA Removal)

### T-188 | FRONTEND | Service Worker o'chirish + unregister script |20min
**Fayllar:**
- `apps/web/public/sw.js` — O'CHIRISH (80 qator, ventra-v3, 4 cache strategiya)
- `apps/web/index.html:26-32` — SW registration scriptini O'CHIRISH
**Muhim:** Mavjud foydalanuvchilar brauzerida SW cache qolgan. Unregister script qo'shish:
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(k => caches.delete(k));
  });
}
```
Bu script bir necha hafta qolishi kerak, keyin o'chiriladi.

### T-189 | FRONTEND | manifest.json va PWA meta taglar o'chirish |10min
**Fayllar:**
- `apps/web/public/manifest.json` — O'CHIRISH (34 qator, standalone PWA config)
- `apps/web/index.html:18` — `<link rel="manifest" href="/manifest.json" />` O'CHIRISH
- `apps/web/index.html:19` — `<meta name="apple-mobile-web-app-capable" ...>` O'CHIRISH
- `apps/web/index.html:20` — `<meta name="apple-mobile-web-app-status-bar-style" ...>` O'CHIRISH
**Eslatma:** `theme-color` meta tag (line 8) va `favicon.svg` (line 5) QOLADI — bular PWA ga emas, brauzerga kerak.

### T-190 | FRONTEND | PWA-only ikonalar o'chirish |5min
**O'chirish:**
- `apps/web/public/icon-512.svg` — faqat manifest.json uchun kerak edi
- `apps/web/public/icon-maskable.svg` — faqat PWA install uchun kerak edi
- `apps/web/public/apple-touch-icon.svg` — faqat iOS home screen uchun kerak edi
**QOLADI:** `favicon.svg` — brauzer tab icon sifatida kerak.

### T-191 | ✅ DONE | FRONTEND | useNativeNotification.ts dead code o'chirish |5min
**Fayl:** `apps/web/src/hooks/useNativeNotification.ts` — O'CHIRISH (21 qator)
**Muammo:** Hech qayerda import qilinmagan — DEAD CODE. Web Notification API + Electron bridge ishlatadi, lekin hech qanday component chaqirmaydi.
**Eslatma:** Agar kelajakda desktop notification kerak bo'lsa, qayta yoziladi.

### T-192 | FRONTEND | dist/manifest.json build artifact tozalash |5min
**Fayl:** `apps/web/dist/manifest.json` — mavjud build da qolgan
**Fix:** `pnpm --filter web run build` qayta ishlatganda avtomatik ketadi, lekin dist papkasini tozalash kerak: `rm -rf apps/web/dist`

---

# ═══════════════════════════════════════════════════════════
# PRODUCT PAGE UX/UI BUGLAR (2026-02-27) — hato/ rasmlardan
# ═══════════════════════════════════════════════════════════
#
# Manba: 6 ta screenshot tahlili (hato/ papkasi)
# Mahsulot: "Бумага листовая Svetocopy ECO" (Uzum.uz)
# Muammo: Chartlar tushunarsiz, AI tahlili buzilgan, UX past

## P0 — KRITIK (Foydalanuvchi ko'radigan buglar)

### T-193 | ✅ DONE (BACKEND) | FRONTEND+BACKEND | AI tahlili raw JSON ko'rsatadi — parse buzilgan |30min
**Screenshot:** hato/100251.png
**Muammo:** "Claude AI tahlili" bo'limida 4 ta item:
1. ` ```json ` — raw markdown code fence
2. `[` — raw JSON array bracket
3. Haqiqiy matn
4. Haqiqiy matn
**Sabab:** `ai.service.ts:252-258` — Claude Haiku ba'zan javobni ` ```json\n[...]\n``` ` formatida qaytaradi. `JSON.parse(text)` markdown fence tufayli fail → fallback `text.split('\n')` raw markdownni ham qo'shib yuboradi.
**Fix (Backend — ai.service.ts:252):**
```typescript
// JSON parse qilishdan OLDIN markdown code fence va bo'sh qatorlarni tozalash
let cleaned = text
  .replace(/```json\s*/gi, '')
  .replace(/```\s*/gi, '')
  .trim();
// Agar [] bilan boshlanmasa, tashqi [] qo'shish
if (!cleaned.startsWith('[')) {
  const lines = cleaned.split('\n').filter(l => l.trim().length > 0);
  bullets = lines.map(l => l.replace(/^[\d.)\-*]+\s*/, '').replace(/^["']|["'],?$/g, '').trim()).filter(Boolean);
} else {
  bullets = JSON.parse(cleaned);
}
```
**Fix (Frontend — ProductPage.tsx:736):** Har bir bullet'dan qolgan JSON artifact tozalash:
```typescript
<span>{bullet.replace(/^```json$/i, '').replace(/^[\[\]"`,]+$/g, '').trim()}</span>
```
Bo'sh bullet'larni filter qilish: `.filter(b => b && b.length > 3 && !b.match(/^[\[\]{}"`]+$/))`

### T-194 | ✅ DONE | FRONTEND | Chart X-axis "M02 27" takrorlanadi — sanalar o'qib bo'lmaydi |30min
**Screenshot:** hato/095147.png, hato/095238.png, hato/100612.png
**Muammo:** Barcha chartlarda X-axis: `M02 27, M02 27, M02 27, M02 27...` (10+ marta takror). Sotuvchi hech narsa tushunmaydi.
**Sabab 1:** `uz-UZ` locale oy nomini "M02" formatida beradi (oy nomi emas, raqami). "M02 27" = "Feb 27" o'rniga.
**Sabab 2:** Bir kunda 4 ta snapshot olinadi (reanalysis 6h cron), hammasi bir xil sana. Vaqt ko'rsatilmaydi.
**Fayllar:**
- `ProductPage.tsx:645,649` — ML Prognoz chart: `toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })`
- `ScoreChart.tsx:32` — Score tarixi chart: X-axis `dataKey="date"` raw ISO string
- `ProductPage.tsx:716` — Haftalik sotuvlar: raw `date` field
**Fix:**
1. Locale'ni o'zgartirish — `uz-UZ` → `ru-RU` yoki custom formatter:
```typescript
function formatChartDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate();
  const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
  return `${day} ${months[d.getMonth()]}`;
}
```
2. Bir kunda 1+ snapshot bo'lsa, VAQTNI ko'rsatish: `"27 fev 06:00"`, `"27 fev 12:00"`
3. Yoki — bir kunda faqat OXIRGI snapshot ko'rsatish (deduplicate by day)

### T-195 | ✅ DONE | FRONTEND | "Ensemble: WMA + Holt's..." texnik jargon o'chirish |10min
**Screenshot:** hato/095238.png, hato/100612.png
**Muammo:** Pastki qatorda: `Ensemble: WMA + Holt's Exponential Smoothing + Linear Regression · MAE: 0.1031 · RMSE: 1.7655` — sotuvchi bu nima ekanligini bilmaydi. WMA, MAE, RMSE — texnik atamalar.
**Fayl:** `ProductPage.tsx:697-699`
```tsx
<p className="text-xs text-base-content/30">
  Ensemble: WMA + Holt's Exponential Smoothing + Linear Regression · MAE: {mlForecast.score_forecast.metrics?.mae ?? '—'} · RMSE: {mlForecast.score_forecast.metrics?.rmse ?? '—'}
</p>
```
**Fix:** O'chirish yoki sodda tilda almashtirish:
```tsx
<p className="text-xs text-base-content/30">
  AI bashorat · {(mlForecast.score_forecast.confidence * 100).toFixed(0)}% ishonchlilik
</p>
```

---

## P1 — MUHIM (UX yaxshilash)

### T-196 | ✅ DONE | BACKEND | AI tahlili generic — raqib/o'z tovar farqi yo'q, amaliy maslahat yo'q |45min
**Screenshot:** hato/100251.png
**Muammo:** AI faqat "bu mahsulot hot" deydi:
- "Yuqori sotuvlar hajmi (45,029 buyurtma) bozorda katta talab mavjudligini ko'rsatadi" — bu tahlil emas, faktni takrorlash
- "40% chegirma mavjud bo'lib, narxda sezilarli qisqartish xaridorlarni jalb qiladi" — amaliy maslahat yo'q
- AI bu sotuvchining O'Z mahsuloti yoki RAQIB mahsuloti ekanligini bilmaydi
**Fayl:** `apps/api/src/ai/ai.service.ts:225-248` — `explainWinner()` prompt
**Hozirgi prompt:** `"Nima uchun bu mahsulot 'hot' ekanligini 2-4 ta qisqa bulletda tushuntir"`
**Fix — Yangi prompt:**
```typescript
content:
  `Sen Uzum.uz marketplace tahlilchisisan.\n` +
  `Sotuvchi bu mahsulotni ko'ryapti — bu uning O'Z mahsuloti yoki RAQIB mahsuloti bo'lishi mumkin.\n\n` +
  `Mahsulot: ${opts.title}\n` +
  `VENTRA Score: ${opts.score.toFixed(2)}/10\n` +
  `Haftalik sotuv: ${opts.weeklyBought ?? 'noaniq'} dona\n` +
  `Jami buyurtmalar: ${opts.ordersQuantity.toLocaleString()}\n` +
  `Chegirma: ${opts.discountPercent ?? 0}%\n` +
  `Reyting: ${opts.rating}/5\n\n` +
  `Qoidalar:\n` +
  `1. Har bir nuqta AMALIY bo'lsin — sotuvchi nima QILISHI kerak\n` +
  `2. Score yuqori (7+) bo'lsa: "kuchli raqib" yoki "yaxshi mahsulot" deb ayt\n` +
  `3. Score past (1-4) bo'lsa: yaxshilash maslahatini ber\n` +
  `4. Chegirma haqida: foiz katta bo'lsa margin past ekanini ayt\n` +
  `5. Sodda, o'zbek tilida, texnik atamalar ISHLATMA\n` +
  `6. Har bullet 1-2 jumla, QISQA\n\n` +
  `3-4 ta bullet qaytir. Faqat JSON massiv: ["...", "...", "..."]`
```
**Qo'shimcha yaxshilash:**
- ProductPage'da "Bu mening mahsulotim" / "Bu raqib mahsuloti" toggle qo'shish
- AI prompt'ga bu kontekstni yuborish → boshqa turdagi maslahatlar

### T-197 | ✅ DONE | FRONTEND | Score tarixi chart — bir kunda ko'p snapshot zigzag ko'rsatadi |20min
**Screenshot:** hato/095300.png
**Muammo:** Score chart zigzag shakl — bir kunda 4 ta snapshot (6h cron), har birida score bir oz farq qiladi. Natija: chiziq o'ynoqibop ko'rinadi, sotuvchi "score barqaror emas" deb o'ylaydi.
**Fayl:** `ScoreChart.tsx` + `ProductPage.tsx:706-726`
**Fix:** Snapshotlarni KUN bo'yicha aggregate qilish — har kunning OXIRGI score'ini olish:
```typescript
function aggregateByDay(snapshots: ChartPoint[]): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  for (const s of snapshots) {
    const dayKey = s.date.split('T')[0]; // "2026-02-27"
    map.set(dayKey, s); // oxirgisi qoladi
  }
  return Array.from(map.values());
}
```
Chartga `aggregateByDay(snapshots)` berish.

### T-198 | FRONTEND | Haftalik sotuvlar chart — noto'g'ri data ko'rsatadi |20min
**Screenshot:** hato/095147.png
**Muammo:** "Haftalik sotuvlar tarixi" bar chart — `snapshots.slice(-15)` dan `orders` field oladi. Lekin:
1. `orders` bu snapshot'dagi `weekly_bought` yoki cumulative `orders_quantity`?
2. Bir kunda 4 snapshot → 4 ta bar bir xil qiymat
3. Bar chart nima ko'rsatayotgani noaniq
**Fayl:** `ProductPage.tsx:716-725`
```tsx
<BarChart data={snapshots.slice(-15)}>
  <Bar dataKey="orders" fill="#34d399" name="Haftalik sotuvlar" />
</BarChart>
```
**Fix:**
1. Snapshotlarni KUN bo'yicha aggregate qilish (T-197 bilan birga)
2. `dataKey="orders"` → `dataKey="weekly_bought"` (haqiqiy haftalik sotuv)
3. Agar `weekly_bought` null → bar ko'rsatmaslik
4. Y-axis label: "dona/hafta"
5. Bar tooltip: "27 fev: 514 dona haftalik sotuv"

### T-199 | ✅ DONE | FRONTEND | "7 kunlik bashorat" trend badge noto'g'ri — 3.25→9.14 = "Barqaror"? |20min
**Screenshot:** hato/095147.png
**Muammo:** Score 3.25 dan 9.14 ga oshishi bashorat qilingan, lekin trend badge "Barqaror" ko'rsatadi. Sotuvchi: "Score 3x oshadi, lekin barqaror?"
**Sabab:** `forecastEnsemble()` da slope threshold `0.01`. Historical data mostly flat → slope ~0. Forecast prediction 9.14 bo'lsa ham, slope kichik.
**Fayl:** `packages/utils/src/index.ts:342`
```typescript
const trend = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat';
```
**Fix:** Prediction-based trend aniqlash:
```typescript
const lastValue = values[values.length - 1];
const forecastValue = ensemble[ensemble.length - 1];
const changePct = lastValue > 0 ? (forecastValue - lastValue) / lastValue : 0;
const trend = changePct > 0.05 ? 'up' : changePct < -0.05 ? 'down' : 'flat';
```
**Frontend fix:** "Barqaror" → "O'sish kutilmoqda" / "Pasayish kutilmoqda" / "Barqaror" — foiz bilan:
```tsx
const trendText = trend === 'up' ? `+${pct}% o'sish` : trend === 'down' ? `${pct}% pasayish` : 'Barqaror';
```

### T-200 | ✅ DONE | FRONTEND | ML Prognoz — "confidence", "snapshot" texnik so'zlar |10min
**Screenshot:** hato/095238.png
**Muammo:** ML Prognoz card'da:
- "confidence" — inglizcha texnik termin → "ishonchlilik" yozilgan, lekin tagida yana "confidence"
- "snapshot" — "58 snapshot" → sotuvchi "snapshot" nima ekanini bilmaydi
- "Tushunarsiz" badge ko'rsatilmoqda (score 2.94)
**Fayl:** `ProductPage.tsx:614-630`
**Fix:**
```tsx
// "confidence" → o'chirish
<p className="text-xs text-base-content/40">darajasi</p>

// "snapshot" → "tahlil"
<p className="font-bold text-lg">{mlForecast.data_points}</p>
<p className="text-xs text-base-content/40">tahlil</p>

// Score badge — tushunarliroq:
// < 3: "Past"  3-5: "O'rtacha"  5-7: "Yaxshi"  7+: "A'lo"
```

### T-201 | FRONTEND | Raqiblar Narx Kuzatuvi + Global Bozor — loading/bo'sh |15min
**Screenshot:** hato/095300.png
**Muammo:** "Raqiblar Narx Kuzatuvi" va "Global Bozor Taqqoslash" seksiyalari loading holati yoki bo'sh. Sotuvchi hech qanday data ko'rmaydi.
**Sabab:** API xatosi yoki data yo'q. `catch` empty → silent fail.
**Fayl:** `ProductPage.tsx` — tegishli useEffect va API call'lar
**Fix:**
1. Loading state'ga timeout qo'shish (10s keyin "Ma'lumot topilmadi" ko'rsatish)
2. Bo'sh data bo'lsa: "Bu mahsulot uchun raqib ma'lumotlari hali yo'q" matn ko'rsatish
3. API error bo'lsa: `toast.error()` bilan xabar berish
4. Agar feature foydalanilmasa (raqib track qilinmagan) — seksiyani yashirish

### T-202 | FRONTEND | ProductPage overall UX — sotuvchi uchun soddalash |1h
**Screenshot:** Barchasi
**Muammo:** Sahifa juda "developer-oriented". Oddiy Uzum sotuvchisi uchun murakkab:
1. "Score" nima ekanini bilmaydi → qisqa tooltip/info icon kerak
2. "VENTRA Score 3.25" — bu yaxshimi yomoni? → rang va matn: "Past (3.25/10)"
3. Chartlar orasida bog'lanish yo'q — nimani nimaga solishtiryapti?
4. Juda ko'p seksiya — prioritet tartibi kerak
**Fix — Seksiya tartibi qayta ko'rish:**
1. **Asosiy ma'lumot** — narx, stok, reyting, haftalik sotuv (eng muhim)
2. **AI tahlili** — amaliy maslahat (eng foydali)
3. **Haftalik trend** — sotuv dinamikasi (grafik bilan)
4. **Bashorat** — 7 kunlik prognoz (sodda tilda)
5. **Raqiblar** — agar bor bo'lsa
6. **Texnik** — score tarixi, global taqqoslash (pastda, kamroq muhim)

### T-203 | ✅ DONE | FRONTEND | ML Prognoz 4 ta KPI box labelsiz — raqamlar tushunarsiz | 20min
**Screenshot:** hato/095238.png, hato/100612.png
**Muammo:** ML Prognoz bo'limida 4 ta KPI box bor:
- `2.94` + qizil "Tushyapti" badge
- `81` + yashil "O'sayapti" badge
- `74%`
- `58`
Sotuvchi: "2.94 NIMA? 81 NIMA? 74% NIMANING foizi? 58 NIMA?" Hech qanday tushuntirish yo'q.
Bundan tashqari `Tushyapti` (qizil) va `O'sayapti` (yashil) bir vaqtda ko'rsatiladi — bir-biriga zid signal.
**Fayl:** `ProductPage.tsx:586-640`
**Fix:**
1. Har box ga aniq label qo'shish: "Score bashorati", "Haftalik sotuv", "Ishonchlilik", "Ma'lumot soni"
2. Contradictory badge larni tuzatish — score va sotuv trend badge ALOHIDA ko'rsatilishi kerak
3. Score uchun rang: < 3 qizil, 3-5 sariq, 5-7 yashil, 7+ ko'k

### T-204 | ✅ DONE | FRONTEND | "7 kunlik sotuv dinamikasi" card da qora to'rtburchak (render bug) | 15min
**Screenshot:** hato/095147.png
**Muammo:** "7 kunlik sotuv dinamikasi" bo'limidagi kartochkalardan biri to'liq QORA TO'RTBURCHAK ko'rsatadi. Image load fail yoki CSS rendering xatosi.
**Fayl:** `ProductPage.tsx` — weekly trend cards section
**Fix:**
1. Image/SVG load failure uchun fallback placeholder qo'shish
2. `onError` handler: qora blok o'rniga "Ma'lumot yo'q" matn ko'rsatish
3. CSS `background-color` va `overflow: hidden` tekshirish

### T-205 | ✅ DONE | FRONTEND | Footer da raw scoring formula ko'rinadi — foydalanuvchiga ko'rsatilmasligi kerak | 10min
**Screenshot:** hato/095300.png
**Muammo:** Sahifa pastida footer bar: `Score = 0.5*(in1) (daily) + 0.3*(in1) (price) + 0.5*fn rating + 0.1*fn review - 0.1*fn seolon · Real vaqtda hisoblab berlamasan` — bu raw scoring formula. Oddiy sotuvchi uchun hech qanday ma'no bermaydi va professional ko'rinmaydi.
**Fayl:** `ProductPage.tsx` — page footer/bottom section
**Fix:** Bu qatorni TO'LIQ O'CHIRISH. Scoring formula faqat developer hujjatlarida bo'lishi kerak, UI da emas.

### T-206 | FRONTEND | Raqiblar — "50 ta kuzatilmoqda" + "topilmadi" bir vaqtda | 10min
**Screenshot:** hato/095300.png
**Muammo:** "Raqiblar Narx Kuzatuvi" bo'limida:
- Sarlavha: "Bu mahsulotning 50 ta raqiblari kuzatilmoqda" ✅
- Pastda: "Raqiblar narx ma'lumotlari topilmadi" ❌
Bu ikki xabar bir-biriga ZID. 50 ta raqib kuzatilayotgan bo'lsa, ma'lumot bo'lishi kerak.
**Fayl:** `ProductPage.tsx` — competitors section
**Fix:**
1. Agar raqiblar ro'yxati bo'sh → "Hali raqiblar qo'shilmagan" + "Raqib qo'shish" tugma
2. Agar raqiblar bor lekin narx data yo'q → "Narx ma'lumotlari hali yuklanmagan, biroz kuting"
3. Sarlavhadagi "50 ta" → haqiqiy `competitors.length` dinamik ko'rsatish

---

## XULOSA

| Kategoriya | Tasklar | Diapazoni |
|------------|---------|-----------|
| Worker Debug (P0) | 5 | T-061...T-065 |
| Worker Debug (P1) | 12 | T-066...T-077 |
| Bugs.md (P2) | 20 (20 done) | T-078...T-100 |
| Bugs.md (P3) | 68 (4 dup o'chirildi, 52 done) | T-101...T-172 |
| **Railway Deploy (P0)** | **4 ✅ DONE, 1 ochiq (T-177)** | **T-173...T-177** |
| **Railway Env Audit** | **4 optional** | **T-242...T-245** |
| **Railway Deploy (P1)** | **4** | **T-178...T-181** |
| **Railway Deploy (P2)** | **3 (2 done)** | **T-182...T-184** |
| PWA O'chirish (P1) | 5 | T-188...T-192 |
| **ProductPage UX (P0)** | **3** | **T-193...T-195** |
| **ProductPage UX (P1)** | **11** | **T-196...T-206** |
| **Chrome Extension** | **26** | **T-208...T-233** |
| Weekly_bought fix | 1 ✅ DONE | T-207 |
| Desktop Login | 1 (renumbered) | T-234 |
| **Playwright DOM scraping** | **2** | **T-235...T-236** |
| **Product Image** | **1** | **T-237** |
| **Frontend Refactor** | **14 (14 done)** | **T-246...T-259** |
| **JAMI** | **~65 ochiq** | T-061...T-259 |

| O'zgarish | Tafsilot |
|-----------|----------|
| ✅ Duplicatlar o'chirildi | T-132 (=T-069), T-140 (=T-176), T-165 (=T-073), T-168 (=T-061) |
| ✅ Done belgilandi | T-082, T-083, T-100 (docker-compose fix), T-207 (calcWeeklyBought) |
| ✅ Duplicate fix | T-207 Desktop Login → T-234 ga renumber (T-207 weekly_bought bilan conflict edi) |
| ✅ Assignment o'chirildi | Bekzod/Sardor/Ikkalasi barcha tasklardan olib tashlandi |
| ✅ Yangi buglar qo'shildi | T-203-T-206 (UX), T-235-T-236 (Playwright weekly_bought) |
| ✅ Component extraction | T-258 (6 god page → 68 components), T-259 (DiscoveryPage), T-163 ✅ |
| ✅ P2 frontend fix (2026-02-27) | T-114..T-158: 30 P2 task — type safety, error handling, i18n split, DRY, JWT expiry |

### RAILWAY DEPLOY — BAJARILDI (2026-02-27)
- ✅ Eski `railway/` directory o'chirildi (4 ta toml)
- ✅ Eski `railway.toml` (root) o'chirildi
- ✅ `.github/workflows/ci.yml` qayta yozildi — CI + Deploy (Railway CLI)
- ✅ `docker-compose.prod.yml` fix: C-06 (PgBouncer→postgres), C-07 (Redis password), H-20 (Worker env)
- ✅ `apps/api/Dockerfile` — entrypoint.sh (DIRECT_DATABASE_URL migration, PgBouncer bypass)
- ✅ `.env.production` — to'liq template (DIRECT_DATABASE_URL, REDIS parol)
- ✅ `docs/RAILWAY.md` — yangi production guide (arxitektura diagramma, 6 bosqich, CLI, troubleshoot)
- ✅ Railway project yaratildi — 6 service (postgres, redis, api, worker, web, bot)
- ✅ Barcha env vars o'rnatildi (DATABASE_URL, REDIS_URL, JWT_SECRET, DIRECT_DATABASE_URL, WEB_URL, VITE_API_URL)
- ✅ Dockerfile path'lar Railway GraphQL API orqali sozlandi
- ✅ Worker Dockerfile — @uzum/utils dist fix (tsconfig paths→rootDir)
- ✅ API entrypoint.sh — CRLF fix (.gitattributes LF enforcement)
- ✅ API IPv6 dual-stack listen ('::') — Railway private networking
- ✅ Web VITE_API_URL — direct API calls (nginx proxy bypass)
- ✅ nginx resolver — 127.0.0.11 Docker internal DNS
- ✅ ESLint config — React 19 strict rules warn ga o'tkazildi (CI pass)
- ✅ RAILWAY_TOKEN GitHub secret — project token yaratildi
- ✅ CI/CD to'liq ishlaydi — push→CI(lint+typecheck+test+build)→Deploy(4 service)→Health check
- ✅ **6/6 service SUCCESS:** Postgres, Redis, API, Worker, Web, Bot

### WEB FRONTEND REFACTOR (2026-02-27) — Best Practice Audit

| # | P | Vazifa | Qator/Fayl | Holat |
|---|---|--------|------------|-------|
| T-246 | P0 | `api/types.ts` — markaziy response type'lar | 118 `any` kamaytirish | ✅ DONE |
| T-247 | P0 | `utils/formatters.ts` — duplicate fmt/fmtUSD/fmtUZS extract | 3+ faylda takror | ✅ DONE |
| T-248 | P0 | Silent `.catch(() => {})` → logError/toastError | 55+ joyda | ✅ DONE |
| T-249 | P1 | AdminPage.tsx split (2001→453 qator, 20+ komponent) | components/admin/ | ✅ DONE |
| T-250 | P1 | Custom hook: useDashboardData (fetch + export) | hooks/ | ✅ DONE |
| T-251 | P1 | DashboardPage split (664→191 qator, 5 sub-component) | components/dashboard/ | ✅ DONE |
| T-252 | P1 | SourcingPage split → 117 qator, 7 komponent | components/sourcing/ | ✅ DONE |
| T-253 | P1 | ProductPage sub-components extract (912→642 qator) | components/product/ | ✅ DONE |
| T-254 | P1 | SignalsPage split → 86 qator, 11 komponent | components/signals/ | ✅ DONE |
| T-255 | P2 | translations.ts split (2909→3 fayl: uz/ru/en) | i18n/ | ✅ DONE |
| T-256 | P2 | Inline modallar extract (AdminPage 4 modal) | components/admin/ | ✅ DONE |
| T-257 | P2 | Granular ErrorBoundary per section | components/ | |
| T-258 | P1 | 6 God Page → 68 Components (jami 6159→2004 qator) | components/*/ | ✅ DONE |
| T-259 | P1 | DiscoveryPage split (631→42 qator, 8 fayl) | components/discovery/ | ✅ DONE |

### PRODUCTPAGE UX — TOP MUAMMOLAR (hato/ rasmlardan)
- ✅ T-193: AI tahlili raw JSON — BACKEND DONE, frontend qismi ichida hal bo'lgan
- ✅ T-194: X-axis "M02 27" 10+ marta takrorlanadi — DONE (manual date format)
- ✅ T-195: "WMA + Holt's + Linear Regression · MAE · RMSE" texnik jargon — DONE
- 🟡 T-196: AI tahlili generic — raqib/o'z tovar farqi yo'q
- ✅ T-197: Score chart zigzag — DONE (KUN bo'yicha aggregate)
- 🟡 T-198: Haftalik sotuvlar chart noto'g'ri data
- ✅ T-199: "Barqaror" trend badge — DONE (changePct>5% = up)
- ✅ T-200: "confidence", "snapshot" — DONE (o'zbekcha tarjima)
- 🟡 T-201: Raqiblar/Global Bozor loading/bo'sh
- 🟡 T-202: Sahifa tartibi sotuvchi uchun optimal emas
- ✅ T-203: ML Prognoz KPI boxlar labelsiz — DONE (labellar aniqroq)
- ✅ T-204: "7 kunlik sotuv dinamikasi" qora to'rtburchak — DONE (rect → Cell)
- ✅ T-205: Footer da raw scoring formula — DONE (oddiy tushuntirish)
- 🟡 T-206: Raqiblar "50 ta kuzatilmoqda" + "topilmadi" ziddiyat

---

# ═══════════════════════════════════════════════════════════
# WEEKLY_BOUGHT MARKAZLASHTIRISH (2026-02-27) — DATA CONSISTENCY
# ═══════════════════════════════════════════════════════════

### T-207 | ✅ DONE | BACKEND+WORKER | weekly_bought 6 joyda 6 xil — markaziy calcWeeklyBought() | 1h
**Muammo:** Bitta product 4 xil weekly_bought: Dashboard=523, Stat=134, Chart=142, Trend=134
**Sabab:** 6 ta turli joy o'z formulasi, har biri boshqa snapshot, boshqa daysDiff
**Yechim:** `calcWeeklyBought()` + `recalcWeeklyBoughtSeries()` → `packages/utils/src/index.ts`
**Commit:** `b930501` — 7 ta fayl, 181 qator qo'shildi, 157 o'chirildi

---

# ═══════════════════════════════════════════════════════════
# PLAYWRIGHT DOM SCRAPING — ANIQ weekly_bought (2026-02-27)
# ═══════════════════════════════════════════════════════════
#
# Muammo: Uzum REST API `actions.text` ni O'CHIRGAN (undefined).
# Saytda "533 человека купили на этой неделе" ko'rinadi lekin API bermaydi.
# Hozirgi yechim: snapshot delta — TAXMINIY (±10-30% xato).
# Yangi yechim: Playwright bilan DOM dan aniq raqam olish.

## P1 — MUHIM

### T-235 | P1 | BACKEND+WORKER | Playwright bilan weekly_bought DOM scraping — birinchi tahlilda aniq raqam | 2h
**Muammo:** Uzum REST API `actions.text` ni olib tashlagan. `weekly_bought` faqat saytda ko'rinadi:
`"533 человека купили на этой неделе"` — DOM da mavjud, API da YO'Q.
Hozir `calcWeeklyBought()` snapshot delta ishlatadi — bu TAXMINIY, birinchi tahlilda null qaytaradi.
**Yechim — A+B kombinatsiya:**
1. **Birinchi tahlil** (URL Analyze) — Playwright bilan `uzum.uz/product/{id}` ochib, DOM dan:
   - "XXX человек(а) купили на этой неделе" matnini parse qilish
   - Bu raqamni `weekly_bought` sifatida snapshot ga yozish
2. **Keyingi re-analysis** (6h cron) — faqat REST API + snapshot delta (Playwright og'ir, 100 ta product = 5-8 daqiqa)
**Fayllar:**
- `apps/worker/src/processors/uzum-scraper.ts` — `scrapeWeeklyBought(productId)` funksiya qo'shish
- `apps/api/src/uzum/uzum.service.ts` — `analyzeProduct()` da Playwright result ni olish
- `packages/utils/src/index.ts` — `parseWeeklyBoughtFromDOM(text)` parser (allaqachon `parseWeeklyBought` bor, kengaytirish)
**DOM selector:**
```typescript
// Uzum product sahifasida "XXX человек купили" matni
const el = await page.$('text=/\\d+\\s*(человек|kishi|нафар)/i');
const text = await el?.textContent();
// yoki: page.locator('[data-test-id="product-actions"]')
```
**Qabul:** Birinchi URL Analyze da Uzum bilan bir xil son ko'rinadi. Re-analysis taxminiy lekin ±5% ichida.

### T-236 | P1 | BACKEND | parseWeeklyBought kengaytirish — "1,2 тыс" va "тысяч" formatlarni qo'llash | 30min
**Muammo:** Uzum ba'zan "533 человека" o'rniga "1,2 тыс. человек" yoki "тысяч" formatda ko'rsatadi.
**Fayl:** `packages/utils/src/index.ts:22-26` — `parseWeeklyBought()`
**Hozirgi:** faqat `(\d[\d\s]*)\s*(человек|kishi|нафар)` regex — "1,2 тыс" ni tutmaydi
**Fix:**
```typescript
export function parseWeeklyBought(text: string): number | null {
  // "1,2 тыс. человек" → 1200
  const kMatch = text.match(/([\d,.]+)\s*тыс[.\s]*(человек|kishi|нафар)/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  // "533 человек" → 533
  const match = text.match(/(\d[\d\s]*)\s*(человек|kishi|нафар)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/\s/g, ''), 10);
}
```

---

# ═══════════════════════════════════════════════════════════
# NOANIQ ISHLOVCHI FUNKTSIYALAR (weekly_bought ga bog'liq)
# ═══════════════════════════════════════════════════════════
#
# T-207 fix qilindi (markaziy hisob), lekin snapshot delta
# hali TAXMINIY. T-235 (Playwright) tugaguncha bu funktsiyalar
# ±10-30% xatoga moyil:
#
# | Funktsiya | Fayl | Muammo |
# |-----------|------|--------|
# | calculateScore() | packages/utils | weekly_bought 55% og'irlik. null→0→score past |
# | predictDeadStock() | packages/utils | weekly_bought trend → risk_score noaniq |
# | detectEarlySignals() | packages/utils | salesVelocity = weekly_bought, yangi product 0 |
# | detectStockCliff() | packages/utils | velocity = wb/7, stock heuristic orders*0.1 |
# | planReplenishment() | packages/utils | daily_sales = wb/7, null→0→reorder nonsense |
# | detectCannibalization() | packages/utils | wb comparison noaniq → overlap_score noaniq |
# | calculateSaturation() | packages/utils | avg_weekly_sales noaniq → saturation noaniq |
# | getAdvancedForecast() | products.service | sales_forecast wb seriyasiga asoslangan |
#
# T-235 (Playwright) implement qilingach, birinchi tahlil ANIQ,
# keyingilari ±5% ichida bo'ladi.

---

# ═══════════════════════════════════════════════════════════
# PRODUCT PAGE — MAHSULOT RASMLARI (2026-02-27)
# ═══════════════════════════════════════════════════════════

### T-237 | P1 | IKKALASI | ProductPage da mahsulot rasmi ko'rsatish — Uzum API dan photo olish | 2h
**Muammo:** ProductPage da mahsulot rasmi umuman ko'rsatilmaydi. Foydalanuvchi qaysi mahsulotni ko'rayotganini vizual tushunmaydi. Uzum API `payload.data` ichida `photos`/`mediaFiles` qaytaradi, lekin `uzum.client.ts:fetchProductDetail()` ularni tashlab yuboradi. Prisma `Product` modelida ham image ustuni yo'q.
**Sabab:** 3 ta joy tuzatish kerak — API client, DB schema, Frontend.

**Fix — BACKEND (Bekzod):**

1. **`apps/api/src/uzum/uzum.client.ts` — `fetchProductDetail()` (L-256..268):**
   - Uzum API response dan `photos` / `mediaFiles` maydonini olish
   - Uzum rasm URL formati: `https://images.uzum.uz/HASH/original.jpg` (yoki `t_product_540_high`)
   - Return object ga qo'shish:
   ```typescript
   return {
     id: d.id,
     title: d.title,
     // ... mavjud fieldlar ...
     // YANGI: rasmlar
     photos: (d.photos ?? d.mediaFiles ?? []).map((p: any) => ({
       url: p.photo?.['540'] ?? p.photo?.original ?? p.url ?? '',
       // yoki: `https://images.uzum.uz/${p.photoKey}/t_product_540_high.jpg`
     })).filter((p: any) => p.url),
   };
   ```
   - Avval Uzum API response ni console.log qilib `photos`/`mediaFiles` aniq field nomini aniqlash (har xil endpoint da har xil bo'lishi mumkin)

2. **`apps/api/prisma/schema.prisma` — `Product` model:**
   ```prisma
   model Product {
     // ... mavjud fieldlar ...
     image_url     String?    @db.Text    // Asosiy rasm URL (birinchi photo)
   }
   ```
   - Migration: `npx prisma migrate dev --name add-product-image-url`

3. **`apps/api/src/uzum/uzum.service.ts` — `analyzeProduct()` / `upsertProduct()`:**
   - `fetchProductDetail()` dan kelgan `photos[0].url` ni `image_url` ga saqlash
   - Agar `photos` bo'sh → `image_url = null`
   - Re-analysis da ham yangilanishi kerak (reanalysis.processor.ts)

4. **`apps/api/src/products/products.service.ts` — response ga `image_url` qo'shish:**
   - `getTrackedProducts()` → select ga `image_url` qo'shish
   - `getProductById()` → response ga `image_url` qo'shish
   - API response format: `{ id, title, image_url, score, ... }`

**Fix — FRONTEND (Sardor):**

5. **`apps/web/src/pages/ProductPage.tsx` — mahsulot rasmi ko'rsatish:**
   - Sahifa yuqorisida (title yonida yoki ustida) mahsulot rasmi:
   ```tsx
   {product.image_url ? (
     <img
       src={product.image_url}
       alt={product.title}
       className="w-40 h-40 object-contain rounded-xl bg-base-200 border border-base-300"
       onError={(e) => {
         (e.target as HTMLImageElement).src = '/placeholder-product.svg';
       }}
     />
   ) : (
     <div className="w-40 h-40 rounded-xl bg-base-200 flex items-center justify-center text-4xl border border-base-300">
       📦
     </div>
   )}
   ```
   - Rasm + title + score bir qatorda (flex row, gap-4)
   - Rasm responsive: mobile da 100px, desktop da 160px
   - `onError` fallback: placeholder SVG yoki emoji

6. **`apps/web/src/pages/DashboardPage.tsx` — tracked products ro'yxatida thumbnail:**
   - Har bir tracked product qatorida kichik thumbnail (40x40px, rounded)
   - Image yo'q bo'lsa → 📦 emoji fallback

7. **Placeholder asset:** `apps/web/public/placeholder-product.svg` — generic product placeholder

**Uzum rasm URL haqida:**
- Format odatda: `https://images.uzum.uz/{photoKey}/t_product_540_high.jpg`
- Yoki: `https://images.uzum.uz/{hash}/original.jpg`
- CDN: images.uzum.uz (CORS ochiq, to'g'ridan yuklash mumkin)
- Hajmlar: `t_product_240_high`, `t_product_540_high`, `original`

**Qabul kriterlari:** ProductPage da mahsulot rasmi ko'rinadi, Dashboard tracked products da thumbnail bor, rasm yuklanmasa fallback ko'rsatiladi.

---

# ═══════════════════════════════════════════════════════════
# CHROME EXTENSION — VENTRA Browser Extension (2026-02-27)
# uzum.uz marketplace uchun inline analytics overlay
# ═══════════════════════════════════════════════════════════

## Faza 1 — PROJECT SETUP + AUTH (P0)

### T-208 | P0 | FRONTEND | Chrome Extension — Monorepo scaffold + Manifest V3 + build pipeline | 2h
**Vazifa:** `apps/extension/` papka yaratish va Manifest V3 Chrome extension loyiha strukturasini sozlash.
**Texnik talablar:**
1. `apps/extension/package.json` — `"name": "@ventra/extension"`, `"private": true`
   - Dependencies: `@uzum/types`, `@uzum/utils` (workspace:*), react 19, react-dom 19
   - DevDeps: vite, @crxjs/vite-plugin (Manifest V3 + HMR), typescript 5.7+, tailwindcss v4, @tailwindcss/vite
2. `apps/extension/manifest.json` (Manifest V3):
   ```json
   {
     "manifest_version": 3,
     "name": "VENTRA — Uzum Analytics",
     "version": "1.0.0",
     "description": "uzum.uz mahsulotlarini real-vaqtda tahlil qilish",
     "permissions": ["storage", "activeTab", "alarms", "notifications"],
     "host_permissions": ["https://uzum.uz/*", "https://api.uzum.uz/*"],
     "background": { "service_worker": "src/background/index.ts", "type": "module" },
     "content_scripts": [{
       "matches": ["https://uzum.uz/*"],
       "js": ["src/content/index.tsx"],
       "css": ["src/content/content.css"],
       "run_at": "document_idle"
     }],
     "action": { "default_popup": "src/popup/index.html", "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" } },
     "options_page": "src/options/index.html",
     "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
   }
   ```
3. `apps/extension/vite.config.ts` — @crxjs/vite-plugin + @tailwindcss/vite, build → `dist/`
4. `apps/extension/tsconfig.json` — ES2022, path mapping: `@uzum/types`, `@uzum/utils`
5. Papka strukturasi:
   ```
   apps/extension/
   ├── manifest.json
   ├── package.json
   ├── tsconfig.json
   ├── vite.config.ts
   ├── icons/                    # 16, 48, 128 px ikonkalar
   ├── src/
   │   ├── background/           # Service Worker
   │   │   └── index.ts
   │   ├── content/              # Content Script (uzum.uz inject)
   │   │   ├── index.tsx
   │   │   ├── content.css
   │   │   └── components/       # Overlay komponentlar
   │   ├── popup/                # Extension Popup (mini dashboard)
   │   │   ├── index.html
   │   │   ├── index.tsx
   │   │   └── components/
   │   ├── options/              # Settings sahifa
   │   │   ├── index.html
   │   │   ├── index.tsx
   │   │   └── components/
   │   ├── shared/               # Extension-ichki umumiy kod
   │   │   ├── api.ts            # VENTRA API client
   │   │   ├── storage.ts        # chrome.storage wrapper
   │   │   ├── constants.ts      # API URLs, keys
   │   │   └── types.ts          # Extension-specific types
   │   └── styles/
   │       └── tailwind.css      # @import "tailwindcss"
   ├── tests/
   └── _locales/                 # i18n (uz, ru, en)
       ├── uz/messages.json
       ├── ru/messages.json
       └── en/messages.json
   ```
6. Root `turbo.json` ga `extension` build task qo'shish
7. `pnpm install` ishlashi + `pnpm --filter extension dev` HMR bilan Chrome ga yuklash
**Qabul kriterlari:** `pnpm --filter extension build` → `dist/` papkada to'liq extension, Chrome ga `chrome://extensions` → Load unpacked sifatida yuklash mumkin.

---

### T-209 | P0 | FRONTEND | Chrome Extension — API client + chrome.storage JWT boshqaruvi | 1.5h
**Vazifa:** VENTRA API bilan muloqot qiluvchi client va JWT tokenlarni xavfsiz saqlash.
**Texnik talablar:**
1. `src/shared/api.ts` — `VentraApiClient` class:
   ```typescript
   class VentraApiClient {
     private baseUrl: string; // default: production URL, options'dan o'zgartiriladi

     // Auth
     async login(email: string, password: string): Promise<LoginResponse>
     async refreshToken(): Promise<void>  // auto-refresh agar 401 kelsa
     async logout(): Promise<void>

     // Products
     async analyzeProduct(url: string): Promise<ApiResponse<UzumProductDetail>>
     async getQuickScore(productId: number): Promise<QuickScoreResponse>
     async trackProduct(productId: number): Promise<void>
     async getTrackedProducts(): Promise<TrackedProductResponse[]>
     async getProductForecast(productId: number): Promise<ForecastResponse>

     // Signals
     async getSignals(): Promise<SignalsSummary>

     // Balance
     async getBalance(): Promise<BalanceResponse>
   }
   ```
2. Har bir request ga `Authorization: Bearer {token}` header avtomatik qo'shiladi
3. 401 xatosida avtomatik `refreshToken()` chaqiriladi, token yangilangandan so'ng original request qaytariladi (retry interceptor)
4. Token zanjiri: `accessToken` (15min TTL) + `refreshToken` (7d TTL)
5. `src/shared/storage.ts` — `chrome.storage.local` wrapper:
   ```typescript
   // chrome.storage.local — extension uninstall bo'lganda o'chiriladi
   async getToken(): Promise<{ access: string; refresh: string } | null>
   async setToken(access: string, refresh: string): Promise<void>
   async clearToken(): Promise<void>
   async getApiUrl(): Promise<string>
   async setApiUrl(url: string): Promise<void>
   async getUserProfile(): Promise<UserProfile | null>
   async setUserProfile(profile: UserProfile): Promise<void>
   async getSettings(): Promise<ExtensionSettings>
   async setSettings(settings: Partial<ExtensionSettings>): Promise<void>
   ```
6. `src/shared/constants.ts`:
   ```typescript
   export const DEFAULT_API_URL = 'https://ventra.uz/api/v1';
   export const STORAGE_KEYS = { TOKEN: 'ventra_token', PROFILE: 'ventra_profile', SETTINGS: 'ventra_settings', API_URL: 'ventra_api_url' };
   export const ALARM_NAMES = { TOKEN_REFRESH: 'token_refresh', SIGNALS_CHECK: 'signals_check' };
   ```
7. `src/shared/types.ts` — extension-specific types: `ExtensionSettings`, `QuickScoreResponse`, `ContentScriptMessage`, `BackgroundMessage`
**Qabul kriterlari:** API client ishlaydi, JWT avtomatik yangilanadi, token chrome.storage'da saqlanadi.

---

### T-210 | P0 | FRONTEND | Chrome Extension — Background Service Worker (alarm, badge, messaging) | 2h
**Vazifa:** Extension background script — token refresh, signal check, badge yangilash, popup↔content↔background messaging.
**Texnik talablar:**
1. `src/background/index.ts` — Manifest V3 Service Worker:
   ```typescript
   // 1. ALARM — Token auto-refresh (har 10 daqiqada)
   chrome.alarms.create(ALARM_NAMES.TOKEN_REFRESH, { periodInMinutes: 10 });

   // 2. ALARM — Signals/notifications check (har 30 daqiqada)
   chrome.alarms.create(ALARM_NAMES.SIGNALS_CHECK, { periodInMinutes: 30 });

   // 3. ALARM handler
   chrome.alarms.onAlarm.addListener(async (alarm) => {
     if (alarm.name === 'token_refresh') → api.refreshToken()
     if (alarm.name === 'signals_check') → checkNewSignals()
   });

   // 4. Badge — treklanayotgan mahsulotlar soni yoki yangi signallar soni
   async function updateBadge(count: number) {
     chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
     chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#EF4444' : '#6B7280' });
   }

   // 5. Message routing — popup, content script, options sahifalardan kelgan xabarlar
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     switch (message.type) {
       case 'ANALYZE_PRODUCT': → api.analyzeProduct(message.url) → sendResponse
       case 'QUICK_SCORE': → api.getQuickScore(message.productId) → sendResponse
       case 'TRACK_PRODUCT': → api.trackProduct(message.productId) → sendResponse
       case 'GET_AUTH_STATE': → storage.getToken() → sendResponse
       case 'LOGIN': → api.login(message.email, message.password) → sendResponse
       case 'LOGOUT': → api.logout() → storage.clearToken() → sendResponse
       case 'GET_TRACKED': → api.getTrackedProducts() → sendResponse
       case 'GET_SIGNALS': → api.getSignals() → sendResponse
       case 'GET_BALANCE': → api.getBalance() → sendResponse
     }
     return true; // async response
   });

   // 6. Tab yangilanganida — uzum.uz da bo'lsa badge rangini o'zgartirish
   chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
     if (tab.url?.includes('uzum.uz')) {
       chrome.action.setIcon({ tabId, path: 'icons/icon-active-16.png' });
     }
   });
   ```
2. `checkNewSignals()` — har 30 minutda `/signals/early-signals` + `/signals/stock-cliffs` tekshirish → yangi signal bo'lsa `chrome.notifications.create()` + badge yangilash
3. Service Worker lifecycle: `chrome.runtime.onInstalled` → default settings sozlash, storage init
4. Error handling: network offline bo'lsa → retry qilmaslik, faqat keyingi alarm da urinish
**Qabul kriterlari:** Service worker ishlaydi, alarmlar fire bo'ladi, badge yangilanadi, messaging ishlaydi.

---

### T-211 | P0 | FRONTEND | Chrome Extension — Popup Login UI + autentifikatsiya holati | 1.5h
**Vazifa:** Extension popup'da login forma va autentifikatsiya holatini boshqarish.
**Texnik talablar:**
1. `src/popup/index.html` — minimal HTML shell (React mount point)
2. `src/popup/index.tsx` — React app entry: `<PopupApp />` mount
3. `src/popup/components/PopupApp.tsx` — holatga qarab ko'rsatish:
   - **Logged out** → `<LoginForm />` ko'rsatish
   - **Logged in** → `<PopupDashboard />` ko'rsatish
   - **Loading** → skeleton/spinner
4. `src/popup/components/LoginForm.tsx`:
   - Email + Password inputlar (Tailwind styled, VENTRA branding)
   - "Kirish" button
   - Loading state (spinner)
   - Error xabar (noto'g'ri login, tarmoq xatosi, balans yetarli emas)
   - "API URL o'zgartirish" link → options sahifaga
   - Form submit → `chrome.runtime.sendMessage({ type: 'LOGIN', email, password })`
   - Muvaffaqiyatli login → profile + token saqlash → `<PopupDashboard />` ga o'tish
5. `src/popup/components/PopupHeader.tsx`:
   - VENTRA logo (kichik)
   - Foydalanuvchi nomi + avatar (birinchi harf)
   - Balans ko'rsatkichi (so'mda)
   - "Chiqish" tugma
6. Popup o'lcham: 380px kenglik, max 520px balandlik (Chrome popup cheklovi)
7. Dark/light mode: `prefers-color-scheme` media query + manual toggle
**Qabul kriterlari:** Login forma ishlaydi, JWT token olinadi va saqlanadi, muvaffaqiyatli login dan so'ng dashboard ko'rinadi.

---

## Faza 2 — CONTENT SCRIPT: UZUM.UZ OVERLAY (P0)

### T-212 | P0 | FRONTEND | Content Script — uzum.uz mahsulot sahifasida VENTRA score overlay | 3h
**Vazifa:** uzum.uz/ru/product/* sahifalarida mahsulot score, trend, signallarni ko'rsatuvchi overlay panel inject qilish.
**Texnik talablar:**
1. `src/content/index.tsx` — Content script entry point:
   ```typescript
   // 1. URL dan product ID ajratish
   const productId = parseProductIdFromUrl(window.location.href);
   // parseUzumProductId() — packages/utils dan

   // 2. Shadow DOM yaratish (uzum.uz CSS bilan conflict bo'lmasligi uchun)
   const host = document.createElement('div');
   host.id = 'ventra-extension-root';
   const shadow = host.attachShadow({ mode: 'closed' });

   // 3. Tailwind CSS ni shadow DOM ichiga inject qilish
   const style = document.createElement('style');
   style.textContent = tailwindCSS; // build vaqtida inline qilinadi
   shadow.appendChild(style);

   // 4. React mount
   const root = createRoot(shadow.appendChild(document.createElement('div')));
   root.render(<ProductOverlay productId={productId} />);

   // 5. Sahifa o'zgarishini kuzatish (SPA navigation)
   // uzum.uz Vue SPA — popstate + pushState intercept
   let lastUrl = location.href;
   new MutationObserver(() => {
     if (location.href !== lastUrl) {
       lastUrl = location.href;
       handleUrlChange();
     }
   }).observe(document.body, { childList: true, subtree: true });
   ```
2. `src/content/components/ProductOverlay.tsx` — asosiy overlay panel:
   - **Joylashuv:** Mahsulot sahifasining o'ng tomonida floating panel (position: fixed, right: 16px, top: 80px)
   - **Minimize/expand:** Kichik ikonka holatiga yig'ish mumkin
   - **Panellar:**
     - **Score Badge:** Katta raqam (0-10), rang kodi (qizil < 3, sariq 3-6, yashil > 6)
     - **Trend Arrow:** yoki o'sish / tushish / barqaror + foiz o'zgarish
     - **Haftalik sotuvlar:** weekly_bought raqami + mini sparkline chart
     - **Narx tarix:** Oxirgi 7 kun narx o'zgarishi (mini line chart)
     - **Signallar:** Stock cliff, Flash sale, Early signal (bo'lsa)
     - **Tez harakatlar:**
       - "Kuzatishga olish" tugma (track/untrack toggle)
       - "To'liq tahlil" → VENTRA web sahifaga link
       - "Import narx" → sourcing popup
3. `src/content/content.css` — Shadow DOM ichidagi base stillar
4. Product ID topilmasa → overlay ko'rsatilmaydi
5. Auth yo'q bo'lsa → "VENTRA ga kiring" mini banner ko'rsatish
6. API xatosi bo'lsa → "Ma'lumot yuklanmadi" + retry tugma
**Qabul kriterlari:** uzum.uz/ru/product/* sahifalarida o'ng tomonda VENTRA analytics paneli ko'rinadi, score va trend real-time yuklanadi.

---

### T-213 | P0 | FRONTEND | Content Script — uzum.uz katalog/qidiruv sahifalarida inline score badge | 2.5h
**Vazifa:** uzum.uz kategoriya va qidiruv natijalarida har bir mahsulot kartochkasiga VENTRA score badge qo'shish.
**Texnik talablar:**
1. `src/content/components/CatalogOverlay.tsx` — katalog sahifasi uchun:
   ```typescript
   // 1. Mahsulot kartochkalarini topish
   // Selector: [data-test-id="product-card--default"] yoki .product-card
   const productCards = document.querySelectorAll('[data-test-id="product-card--default"]');

   // 2. Har bir kartochkadan product ID olish
   // <a href="/ru/product/slug-12345?skuId=xxx"> → 12345

   // 3. Batch API: barcha IDlar uchun quick-score olish (bitta so'rov)
   // POST /uzum/batch-quick-score { productIds: [1,2,3...] }

   // 4. Har bir kartochkaga badge inject qilish
   ```
2. Badge dizayni:
   - Kartochka yuqori-chap burchagida kichik badge: `VENTRA 7.2` (score raqami)
   - Rang: qizil/sariq/yashil (score ga qarab)
   - Hover da tooltip: "Haftalik: 523 dona | Trend: +12% | Signal: Stock cliff"
   - Kichik o'lcham: 60x22px, border-radius: 4px, font-size: 11px
3. Performance optimizatsiya:
   - **Lazy loading:** Faqat viewport da ko'rinadigan kartochkalar uchun score yuklash (IntersectionObserver)
   - **Cache:** Bir sahifadagi scorelar `Map<number, QuickScore>` da cache qilinadi
   - **Debounce:** Scroll/pagination da 300ms debounce bilan yangi kartochkalar tekshiriladi
   - **Rate limit:** Max 5 parallel API request (uzum.uz da ~48 kartochka per page)
4. Sahifa o'zgarishi kuzatuv:
   - MutationObserver — yangi kartochkalar paydo bo'lganda badge qo'shish
   - Infinite scroll va pagination ni qo'llab-quvvatlash
   - Vue router navigation (pushState) ni ushlash
5. Badge ko'rsatishni o'chirish imkoniyati (extension settings'da toggle)
**Qabul kriterlari:** Kategoriya/qidiruv sahifalarida har bir mahsulot kartochkasida VENTRA score badge ko'rinadi, sahifa tezligi sezilarli pasaymaydi.

---

### T-214 | P1 | BACKEND | POST /uzum/batch-quick-score endpoint — extension uchun batch scoring | 1h
**Vazifa:** Content script katalog sahifasida 48 ta mahsulot uchun 48 ta alohida request qilmasligi uchun batch endpoint.
**Texnik talablar:**
1. `apps/api/src/uzum/uzum.controller.ts` ga yangi endpoint:
   ```typescript
   @Post('batch-quick-score')
   @UseGuards(JwtAuthGuard)
   async batchQuickScore(@Body() body: { productIds: number[] }, @Req() req) {
     // Max 50 product ID
     // Return: { scores: { [productId: number]: QuickScoreResponse } }
   }
   ```
2. `uzum.service.ts` da `batchQuickScore()` method:
   - Prisma `findMany` — bitta query bilan barcha productlar va oxirgi snapshotlarni olish
   - Har biri uchun score hisoblash (`calculateScore` from @uzum/utils)
   - Topilmagan IDlar uchun null qaytarish (404 emas)
3. Rate limit: 10 req/min per IP (batch endpoint og'ir)
4. Response format:
   ```typescript
   {
     scores: {
       12345: { score: 7.2, weekly_bought: 523, trend: 'up', trend_pct: 12.5, sell_price: 125000, signals: ['stock_cliff'] },
       67890: null, // bu product bazada yo'q
     }
   }
   ```
**Qabul kriterlari:** `POST /api/v1/uzum/batch-quick-score` ishlaydi, 50 gacha product ID qabul qiladi, bitta response da barcha scorelar qaytaradi.

---

## Faza 3 — POPUP DASHBOARD (P1)

### T-215 | P1 | FRONTEND | Chrome Extension — Popup Dashboard (tracked products, signals, quick analyze) | 3h
**Vazifa:** Extension popup ichida mini dashboard — foydalanuvchining asosiy ma'lumotlari bir ko'rishda.
**Texnik talablar:**
1. `src/popup/components/PopupDashboard.tsx` — Tab-based layout (380x520px):
   ```
   +--------------------------------------+
   |  [VENTRA logo]   Balance: 45,200 UZS |
   |  Sardor v                    [gear] [link] |
   +--------------------------------------+
   |  [Bosh]  [Mahsulotlar]  [Signal]     |
   +--------------------------------------+
   |                                      |
   |  TAB CONTENT                         |
   |                                      |
   +--------------------------------------+
   ```

2. **"Bosh" tab** — `PopupHome.tsx`:
   - **Tez tahlil:** URL input + "Tahlil" tugma (joriy tab URL avtomatik qo'yiladi agar uzum.uz da bo'lsa)
   - **Oxirgi tahlillar:** So'nggi 5 ta tahlil qilingan mahsulot (nomi, score, vaqt)
   - **KPI kartalar:** Jami kuzatilayotgan | Yangi signallar | O'rtacha score
   - **Tez harakatlar:** "Kategoriya skanerlash" → uzum.uz/ru/category URL so'raydi

3. **"Mahsulotlar" tab** — `PopupProducts.tsx`:
   - Tracked products ro'yxati (scroll, max 20 ko'rsatish)
   - Har bir qator: Nomi (truncated 35 char) | Score badge | Trend arrow | Weekly bought
   - Tanlash → VENTRA web sahifadagi product sahifaga yangi tab da ochilish
   - Qidiruv input (client-side filter)
   - Sort: Score bo'yicha (default), Trend bo'yicha, Weekly_bought bo'yicha

4. **"Signallar" tab** — `PopupSignals.tsx`:
   - Yangi signallar ro'yxati (stock cliff, flash sale, early signal, anomaly)
   - Har bir signal: Ikonka | Mahsulot nomi | Signal turi | Vaqt
   - "O'qildi" deb belgilash (swipe yoki tugma)
   - Bo'sh bo'lsa: "Hozircha yangi signallar yo'q" + oxirgi tekshiruv vaqti

5. UI stillar:
   - VENTRA brand ranglari: Primary #3B82F6 (blue), Accent #10B981 (green), Danger #EF4444 (red)
   - Tailwind v4 + DaisyUI v5 (apps/web bilan bir xil)
   - Micro-animations: score badge pulse, trend arrow slide
   - Loading: skeleton shimmer (DaisyUI skeleton)
**Qabul kriterlari:** Popup ochilganda 3 tab bilan mini dashboard ko'rinadi, barcha ma'lumotlar API dan yuklanadi, tezkor va responsive.

---

### T-216 | P1 | FRONTEND | Chrome Extension — Popup "Tez Tahlil" funksiyasi | 1.5h
**Vazifa:** Popup'dan to'g'ridan-to'g'ri mahsulot URL kiritib tahlil qilish + joriy tab URL ni avtomatik aniqlash.
**Texnik talablar:**
1. `src/popup/components/QuickAnalyze.tsx`:
   - URL input field — placeholder: "uzum.uz mahsulot URL sini kiriting"
   - "Joriy sahifani tahlil qil" tugma — `chrome.tabs.query({ active: true })` → joriy tab URL
   - Agar joriy tab uzum.uz product sahifasi bo'lsa → URL avtomatik qo'yiladi + "Tahlil" tugmasi highlighted
   - Tahlil jarayoni:
     1. URL validatsiya (`parseUzumProductId()` orqali)
     2. Loading state (progress bar + "Tahlillanmoqda..." matn)
     3. `chrome.runtime.sendMessage({ type: 'ANALYZE_PRODUCT', url })` → background
     4. Natija: Score, narx, haftalik sotuvlar, trend, signallar
   - Natija kartochkasi:
     ```
     +-----------------------------+
     |  Samsung Galaxy A54         |
     |  Score: 8.1 [========--]    |
     |  Narx: 3,250,000 UZS       |
     |  Haftalik: 1,234 dona +15%  |
     |  Signal: Flash sale         |
     |  ---------------------------+
     |  [Kuzatish] [To'liq tahlil] |
     +-----------------------------+
     ```
   - "Kuzatish" → `TRACK_PRODUCT` message → badge yangilanadi
   - "To'liq tahlil" → `chrome.tabs.create({ url: 'https://ventra.uz/product/${id}' })`
2. Xatolar:
   - "Bu URL uzum.uz mahsulot sahifasi emas" (noto'g'ri URL)
   - "Mahsulot topilmadi" (404)
   - "Tarmoq xatosi" (network error)
   - "Balans yetarli emas" (402 billing guard)
**Qabul kriterlari:** Popup'dan URL kiritib yoki joriy tab ni tahlil qilish imkoni bor, natija tez va aniq ko'rsatiladi.

---

## Faza 4 — CATEGORY SCANNER + ADVANCED FEATURES (P1)

### T-217 | P1 | FRONTEND | Content Script — Kategoriya sahifasida "Top 10 mahsulot" floating widget | 2h
**Vazifa:** uzum.uz kategoriya sahifasida VENTRA score bo'yicha eng yaxshi 10 ta mahsulotni ko'rsatuvchi widget.
**Texnik talablar:**
1. `src/content/components/CategoryWidget.tsx`:
   - Kategoriya sahifasi aniqlanadi: URL `uzum.uz/ru/category/*` pattern
   - `parseUzumCategoryId()` orqali category ID olinadi
   - Sahifada ko'rinadigan barcha product IDlarni yig'ish → batch-quick-score API
   - Natijalarni score bo'yicha sort → top 10 ko'rsatish
   - Widget joylashuvi: Sahifa yuqorisida yoki floating panel (o'ng tomon)
2. Widget dizayni:
   ```
   +------ VENTRA Top 10 ------------------+
   | #1 Samsung Galaxy A54    8.1 +15%     |
   | #2 iPhone 15 Case        7.8 +8%      |
   | #3 Xiaomi Redmi Note 13  7.5 0%       |
   | ...                                   |
   | [Hammasini ko'rish ->]                |
   +----------------------------------------+
   ```
   - Har bir qator: Rank | Nomi (truncated) | Score badge | Trend
   - Click → o'sha mahsulot sahifasiga o'tish
   - "Hammasini ko'rish" → VENTRA web discovery sahifaga link
3. Widget yig'ish/ochish toggle + "yashirish" tugma
4. Settings'da kategoriya widget ni o'chirish imkoniyati
**Qabul kriterlari:** Kategoriya sahifasida top 10 VENTRA score bilan widget ko'rinadi, click bilan navigate qilish mumkin.

---

### T-218 | P1 | FRONTEND | Chrome Extension — Notifications sistema (chrome.notifications + badge) | 1.5h
**Vazifa:** Real-time signallar va muhim o'zgarishlar uchun Chrome notification + extension badge.
**Texnik talablar:**
1. `src/background/notifications.ts`:
   ```typescript
   // Signal turlariga qarab notification template
   const NOTIFICATION_TEMPLATES = {
     stock_cliff: { title: 'Stok tushishi!', icon: 'icons/alert-stock.png' },
     flash_sale: { title: 'Flash sale aniqlandi!', icon: 'icons/alert-flash.png' },
     early_signal: { title: 'Yangi signal!', icon: 'icons/alert-signal.png' },
     price_drop: { title: 'Narx tushdi!', icon: 'icons/alert-price.png' },
     score_change: { title: 'Score ozgarishi', icon: 'icons/alert-score.png' },
   };

   async function checkNewSignals() {
     const signals = await api.getSignals();
     const lastCheck = await storage.getLastSignalCheck();
     const newSignals = signals.filter(s => s.created_at > lastCheck);

     for (const signal of newSignals) {
       chrome.notifications.create(signal.id, {
         type: 'basic',
         iconUrl: NOTIFICATION_TEMPLATES[signal.type].icon,
         title: NOTIFICATION_TEMPLATES[signal.type].title,
         message: `${signal.product_name}: ${signal.description}`,
         priority: signal.severity === 'critical' ? 2 : 1,
       });
     }

     // Badge yangilash
     updateBadge(newSignals.length);
     await storage.setLastSignalCheck(Date.now());
   }
   ```
2. Notification click handler: `chrome.notifications.onClicked` → mahsulot sahifasini ochish
3. Badge logika:
   - Raqam: o'qilmagan signallar soni
   - Rang: qizil = kritik signal bor, sariq = oddiy signal, yashil = hamma yaxshi
   - Popup ochilganda → signallar "o'qildi" deb belgilanadi → badge tozalanadi
4. Settings: notification turlarini alohida o'chirish/yoqish imkoniyati
5. "Bezovta qilmaslik" rejimi: 22:00-08:00 orasida notification yubormaslik
**Qabul kriterlari:** Yangi signallar Chrome notification sifatida ko'rsatiladi, badge yangilanadi, click bilan navigate mumkin.

---

### T-219 | P1 | FRONTEND | Chrome Extension — Options (Sozlamalar) sahifasi | 1.5h
**Vazifa:** Extension sozlamalari sahifasi — API URL, notification preferences, display settings.
**Texnik talablar:**
1. `src/options/index.html` + `src/options/index.tsx` — alohida sahifa (popup emas)
2. `src/options/components/OptionsPage.tsx`:
   - **API Sozlamalari:** Server URL input + ulanish test + holat indikatori
   - **Profil:** Email, hisob turi, "Chiqish" tugma
   - **Bildirishnomalar:** Har signal turi uchun toggle (stock cliff, flash sale, narx, score)
   - **Bezovta qilmaslik:** Boshlanish/tugash vaqti (default 22:00-08:00)
   - **Ko'rinish:** Dark/light theme toggle, katalog badge on/off, overlay on/off, overlay pozitsiyasi (o'ng/chap)
   - **Ma'lumot:** Cache tozalash tugma, so'nggi yangilanish vaqti, saqlangan mahsulotlar soni
   - **[Saqlash]** tugma
3. Sozlamalar `chrome.storage.local` da saqlanadi
4. API URL o'zgartirilganda → ulanish test qilinadi (GET /health)
5. "Cache tozalash" → cached scorelar, signallar tozalanadi
6. Har bir o'zgartirish real-time saqlanadi (debounce 500ms)
**Qabul kriterlari:** Options sahifasi ishlaydi, barcha sozlamalar saqlanadi va boshqa extension qismlariga ta'sir qiladi.

---

## Faza 5 — COMPETITOR FEATURES + NARX MONITORING (P2)

### T-220 | P2 | FRONTEND | Content Script — Raqiblar narx taqqoslash overlay (mahsulot sahifasida) | 2h
**Vazifa:** uzum.uz mahsulot sahifasida raqiblarning narxlarini real-time ko'rsatish.
**Texnik talablar:**
1. `src/content/components/CompetitorOverlay.tsx`:
   - Mahsulot sahifasida "Raqiblar" tab → ProductOverlay ichida yangi panel
   - API: `GET /competitor/products/:productId/prices` → raqiblar ro'yxati
   - Ko'rsatish: sizning narx, raqiblar narxi (foiz farqi bilan), o'rtacha bozor narx, pozitsiya
   - Narx farqi foizda: yashil = siz arzonroq, qizil = siz qimmatroq
   - "Kuzatishga olish" → `POST /competitor/track` → har kuni narx kuzatiladi
2. Raqiblar topilmasa → "Raqiblar hali aniqlanmagan. [Tahlil qilish] tugmasini bosing"
3. Loading state: skeleton cards
4. Error: "Raqiblar ma'lumoti yuklanmadi" + retry
**Qabul kriterlari:** Mahsulot sahifasida raqiblar narxi overlay da ko'rinadi, foiz farqi hisoblanadi.

---

### T-221 | P2 | FRONTEND | Content Script — Narx tarix grafigi (mini chart) mahsulot overlay da | 1.5h
**Vazifa:** Mahsulot overlay panelida 30 kunlik narx tarix grafigi.
**Texnik talablar:**
1. `src/content/components/PriceChart.tsx`:
   - API: `GET /products/:id/snapshots` → 30 kunlik snapshot ma'lumotlar
   - Mini line chart: 200x80px, Canvas/SVG based (lightweight)
   - X axis: sanalar (faqat boshi va oxiri label)
   - Y axis: narx (UZS), min-max range
   - Hover: tooltip — sana + aniq narx
   - Trend line: linear regression chizig'i (dotted)
   - Narx o'zgarish badge: "+12% (30 kun)" yoki "-5% (30 kun)"
2. Chart library: Lightweight — `uPlot` (3KB) yoki custom Canvas rendering
   - Recharts/Chart.js ISHLATILMAYDI — extension uchun juda og'ir (200KB+)
3. Ma'lumot yo'q bo'lsa → "Narx tarixi hali yig'ilmagan. Kuzatishga oling!"
**Qabul kriterlari:** Overlay da 30 kunlik narx grafigi ko'rinadi, hover bilan aniq narxni ko'rish mumkin.

---

### T-222 | P2 | FRONTEND | Chrome Extension — Context Menu integration (o'ng tugma menu) | 1h
**Vazifa:** uzum.uz da o'ng tugma bosganda VENTRA harakatlarini ko'rsatish.
**Texnik talablar:**
1. `src/background/contextMenu.ts`:
   ```typescript
   // Faqat uzum.uz sahifalarida ko'rinadi
   chrome.contextMenus.create({
     id: 'ventra-analyze',
     title: 'VENTRA: Bu mahsulotni tahlil qilish',
     contexts: ['link'],
     documentUrlPatterns: ['https://uzum.uz/*'],
     targetUrlPatterns: ['https://uzum.uz/*/product/*'],
   });

   chrome.contextMenus.create({
     id: 'ventra-track',
     title: 'VENTRA: Kuzatishga olish',
     contexts: ['link'],
     documentUrlPatterns: ['https://uzum.uz/*'],
     targetUrlPatterns: ['https://uzum.uz/*/product/*'],
   });

   chrome.contextMenus.create({
     id: 'ventra-compare',
     title: 'VENTRA: Raqiblar bilan taqqoslash',
     contexts: ['link'],
     documentUrlPatterns: ['https://uzum.uz/*'],
     targetUrlPatterns: ['https://uzum.uz/*/product/*'],
   });
   ```
2. Context menu faqat uzum.uz product link ustida o'ng tugma bosganda ko'rinadi
3. Action bajarilgandan so'ng Chrome notification orqali natija ko'rsatiladi
**Qabul kriterlari:** uzum.uz da mahsulot linkiga o'ng tugma → VENTRA harakatlari ko'rinadi va ishlaydi.

---

## Faza 6 — ADVANCED ANALYTICS + AI (P2)

### T-223 | P2 | FRONTEND | Content Script — AI tahlil natijasini overlay da ko'rsatish | 1.5h
**Vazifa:** Mahsulot overlay da AI tomonidan yaratilgan tahlil va tavsiyalarni ko'rsatish.
**Texnik talablar:**
1. `src/content/components/AiInsight.tsx`:
   - API: `GET /ai/explanations/:productId` → AI tahlil matnlari
   - Ko'rsatish (overlay panel ichida "AI Tahlil" tab): tahlil matni + tavsiya + amaliy maslahat
   - AI tahlil mavjud bo'lmasa → "AI tahlilni boshlash" tugma → `POST /ai/attributes/:id/extract`
   - Loading: typing animation (AI yozyapti effekti)
   - AI usage limit ko'rsatish: "Bu oy: 45/100 AI tahlil"
2. Matn formatlash: Markdown → HTML (bold, bullet points)
3. Error: "AI xizmati hozir mavjud emas" (503)
**Qabul kriterlari:** Overlay da AI tahlil matni ko'rsatiladi, yangi tahlil boshlash mumkin.

---

### T-224 | P2 | FRONTEND | Chrome Extension — Keyboard shortcuts (hotkeys) | 1h
**Vazifa:** Extension uchun keyboard shortcutlar.
**Texnik talablar:**
1. `manifest.json` → `commands`:
   ```json
   "commands": {
     "_execute_action": { "suggested_key": { "default": "Alt+V" }, "description": "VENTRA popup ochish" },
     "analyze-current": { "suggested_key": { "default": "Alt+A" }, "description": "Joriy sahifani tahlil qilish" },
     "track-current": { "suggested_key": { "default": "Alt+T" }, "description": "Joriy mahsulotni kuzatish" },
     "toggle-overlay": { "suggested_key": { "default": "Alt+O" }, "description": "Overlay panelni yashirish/ko'rsatish" }
   }
   ```
2. `src/background/index.ts` → `chrome.commands.onCommand` handler:
   - `analyze-current`: joriy tab dagi mahsulotni tahlil qilish → notification bilan natija
   - `track-current`: joriy tab dagi mahsulotni track qilish → notification
   - `toggle-overlay`: content script ga message → overlay visibility toggle
3. Shortcutlar Options sahifasida ko'rsatiladi (Chrome o'zi boshqaradi: `chrome://extensions/shortcuts`)
**Qabul kriterlari:** Alt+V popup ochadi, Alt+A tahlil qiladi, Alt+T track qiladi, Alt+O overlay toggle.

---

## Faza 7 — I18N, TESTING, POLISH (P2)

### T-225 | P2 | FRONTEND | Chrome Extension — i18n (uz, ru, en) ko'p tilli qo'llab-quvvatlash | 1.5h
**Vazifa:** Extension interfeysi 3 tilda ishlashi: o'zbek (default), rus, ingliz.
**Texnik talablar:**
1. `_locales/uz/messages.json` — barcha UI matnlar o'zbek tilida
2. `_locales/ru/messages.json` — rus tilida
3. `_locales/en/messages.json` — ingliz tilida
4. `manifest.json`: `"default_locale": "uz"`
5. `src/shared/i18n.ts`:
   ```typescript
   export const t = (key: string, substitutions?: string[]) =>
     chrome.i18n.getMessage(key, substitutions) || key;
   ```
6. Barcha UI komponentlarda hardcoded matn o'rniga `t('key')` ishlatish
7. Kalit so'zlar: extName, extDescription, loginTitle, analyzeBtn, trackBtn, untrackBtn, score, weeklyBought, trend, competitors, signals, settings, noData, loading, error, retry
**Qabul kriterlari:** Extension Chrome tili sozlamasiga qarab 3 tilda ishlaydi.

---

### T-226 | P2 | FRONTEND | Chrome Extension — Unit testlar (Vitest + Testing Library) | 2h
**Vazifa:** Extension komponentlari va utility funksiyalar uchun unit testlar.
**Texnik talablar:**
1. `apps/extension/vitest.config.ts` — test konfiguratsiya (jsdom environment)
2. `tests/setup.ts` — chrome API mock (chrome.storage, chrome.runtime, chrome.tabs, chrome.i18n)
3. Test fayllar:
   - `tests/shared/api.test.ts` — VentraApiClient: login, refresh, error handling
   - `tests/shared/storage.test.ts` — chrome.storage wrapper: get/set/clear token
   - `tests/popup/LoginForm.test.tsx` — render, submit, error states
   - `tests/popup/PopupDashboard.test.tsx` — tabs, data loading, empty states
   - `tests/content/url-parser.test.ts` — uzum.uz URL parsing (product, category)
   - `tests/background/notifications.test.ts` — signal check, notification creation
4. Coverage target: >70% statements
5. `package.json` script: `"test": "vitest run"`, `"test:watch": "vitest"`
**Qabul kriterlari:** `pnpm --filter extension test` barcha testlar o'tadi, coverage >70%.

---

### T-227 | P2 | FRONTEND | Chrome Extension — Performance optimization + bundle size | 1h
**Vazifa:** Extension bundle hajmini kamaytirish va performance optimizatsiya.
**Texnik talablar:**
1. Bundle analysis: `rollup-plugin-visualizer` → bundle hajm xaritasi
2. Target hajmlar:
   - Background service worker: <50KB
   - Content script: <100KB (CSS bilan birga)
   - Popup: <150KB
   - Options: <80KB
3. Optimizatsiya chora-tadbirlari:
   - Tree shaking: faqat ishlatilgan @uzum/utils funksiyalarni import
   - Code splitting: popup va options alohida chunk
   - CSS: Tailwind purge — faqat ishlatilgan classlar
   - Images: SVG ikonlar (PNG emas), inline small SVGs
   - No heavy dependencies: Chart.js/Recharts o'rniga uPlot yoki Canvas
4. Content script performance:
   - DOM mutations → requestIdleCallback bilan batch processing
   - IntersectionObserver → faqat ko'rinadigan elementlar uchun API call
   - Score cache: `Map<productId, { score, timestamp }>` → 5 min TTL
   - Debounce: scroll/resize events 200ms
5. Memory leak prevention:
   - MutationObserver disconnect on cleanup
   - React unmount on SPA navigation
   - Background alarm cleanup
**Qabul kriterlari:** Bundle hajmlari target ichida, Lighthouse extension audit >90, DOM overhead <5ms per card.

---

## Faza 8 — BUILD, PUBLISH, CI/CD (P1)

### T-228 | P1 | DEVOPS | Chrome Extension — Production build pipeline + Chrome Web Store publish | 2h
**Vazifa:** Extension ni production build qilish, versiya boshqarish va Chrome Web Store ga publish qilish.
**Texnik talablar:**
1. `apps/extension/package.json` scripts:
   ```json
   {
     "dev": "vite",
     "build": "vite build",
     "build:prod": "NODE_ENV=production vite build && cd dist && zip -r ../ventra-extension-v$npm_package_version.zip .",
     "test": "vitest run",
     "lint": "eslint src/",
     "type-check": "tsc --noEmit"
   }
   ```
2. Vite production config:
   - Minification: terser (esbuild emas — Chrome Web Store ba'zan reject qiladi)
   - Source maps: alohida fayl (debug uchun, publish qilinmaydi)
   - Environment: `VITE_API_URL`, `VITE_VERSION`
3. `.github/workflows/extension.yml` — CI pipeline:
   ```yaml
   name: Extension CI
   on:
     push:
       paths: ['apps/extension/**', 'packages/**']
     pull_request:
       paths: ['apps/extension/**', 'packages/**']
   jobs:
     build:
       - pnpm install
       - pnpm --filter extension type-check
       - pnpm --filter extension lint
       - pnpm --filter extension test
       - pnpm --filter extension build:prod
       - Upload artifact: ventra-extension-v*.zip
     publish: # manual trigger
       - Download artifact
       - chrome-webstore-upload-cli → Chrome Web Store API
   ```
4. Chrome Web Store Developer account:
   - Store listing: VENTRA — Uzum Analytics
   - Category: Shopping
   - Screenshots: 1280x800 (5 ta: popup, overlay, catalog, signals, settings)
   - Privacy policy URL
   - `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN` → GitHub Secrets
5. Versiya boshqarish:
   - `manifest.json` version → `package.json` version bilan sinxron
   - Semantic versioning: MAJOR.MINOR.PATCH
   - Auto-increment patch on CI merge to main
**Qabul kriterlari:** CI pipeline ishlaydi, `pnpm --filter extension build:prod` → .zip tayyor, Chrome Web Store ga publish mumkin.

---

### T-229 | P1 | DEVOPS | Chrome Extension — Edge/Firefox adaptatsiya tayyorlash | 1h
**Vazifa:** Extension ni Microsoft Edge va Firefox uchun ham chiqarish imkoniyatini tayyorlash.
**Texnik talablar:**
1. Edge: Chromium-based → deyarli to'liq mos. Faqat:
   - Edge Add-ons Developer portal uchun alohida publish
   - CI pipeline ga Edge upload step qo'shish
2. Firefox adaptatsiya:
   - `manifest-firefox.json` (Manifest V2 format — background.scripts, browser_specific_settings.gecko.id)
   - `chrome.*` → `browser.*` API polyfill (`webextension-polyfill` package)
   - Build script: alohida `build:firefox` command
3. `apps/extension/build.config.ts`:
   - Target platformalar: chrome (V3 .zip), edge (V3 .zip), firefox (V2 .xpi)
4. CI pipeline ga Firefox/Edge build + upload step qo'shish
**Qabul kriterlari:** Bitta codebase dan Chrome, Edge, Firefox uchun alohida build chiqarish mumkin.

---

## Faza 9 — SECURITY + FINAL POLISH (P1)

### T-230 | P1 | IKKALASI | Chrome Extension — Security audit + CSP + token xavfsizligi | 1h
**Vazifa:** Extension xavfsizlik tekshiruvi va mustahkamlash.
**Texnik talablar:**
1. Content Security Policy (manifest.json):
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'none'; connect-src https://ventra.uz https://api.uzum.uz"
   }
   ```
2. Token xavfsizligi:
   - JWT token faqat `chrome.storage.local` da saqlanadi (localStorage EMAS)
   - Content script token ga TO'G'RIDAN access olmaydi — faqat background message orqali
   - Token expose bo'lmasligi: content script → background → API (proxy pattern)
   - Refresh token faqat background service worker ichida ishlatiladi
3. Input sanitization:
   - uzum.uz dan olingan DOM ma'lumotlari (product name, price) → DOMPurify bilan tozalash
   - API response → TypeScript strict typing, unknown → validate
4. Permissions minimizatsiya:
   - `activeTab` (faqat joriy tab), `storage`, `alarms`, `notifications`
   - `host_permissions`: faqat `uzum.uz` va `api.uzum.uz` (wildcard emas)
   - `<all_urls>` ISHLATILMAYDI — Chrome Web Store reject qiladi
5. XSS himoya: Shadow DOM (closed mode) — uzum.uz saytidagi skriptlar extension DOM ga kira olmaydi
6. Network: barcha API requestlar HTTPS orqali, HTTP fallback yo'q
**Qabul kriterlari:** Chrome Web Store review o'tadi, security audit clean, CSP to'g'ri sozlangan.

---

### T-231 | P1 | FRONTEND | Chrome Extension — Onboarding flow (birinchi marta ochganda) | 1h
**Vazifa:** Foydalanuvchi extension ni birinchi marta o'rnatganda ko'rsatiladigan welcome/tutorial.
**Texnik talablar:**
1. `chrome.runtime.onInstalled` → yangi tab da onboarding sahifa ochish:
   ```typescript
   chrome.runtime.onInstalled.addListener((details) => {
     if (details.reason === 'install') {
       chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') });
     }
   });
   ```
2. `src/onboarding/` — 4 bosqichli wizard:
   - **1-bosqich:** "VENTRA ga xush kelibsiz!" + extension imkoniyatlari ro'yxati
   - **2-bosqich:** Login forma (yoki "Ro'yxatdan o'tish" → VENTRA web ga link)
   - **3-bosqich:** "Qanday ishlaydi" — 3 ta screenshot bilan: overlay, popup, signals
   - **4-bosqich:** "Tayyor! uzum.uz ga o'ting va boshlang" + shortcutlar ro'yxati
3. Progress indicator: 4 nuqta (step dots)
4. "O'tkazib yuborish" tugmasi har bosqichda
5. Onboarding faqat 1 marta ko'rsatiladi (flag chrome.storage da saqlanadi)
**Qabul kriterlari:** Extension o'rnatilganda onboarding wizard ochiladi, login qilish va asosiy funksiyalarni tushuntirish imkoni bor.

---

### T-232 | P2 | FRONTEND | Chrome Extension — Extension icon set (16/48/128 + active/inactive states) | 30min
**Vazifa:** VENTRA extension uchun professional ikonka to'plami.
**Texnik talablar:**
1. `apps/extension/icons/`:
   - `icon16.png`, `icon48.png`, `icon128.png` — asosiy ikonkalar
   - `icon-active-16.png`, `icon-active-48.png` — uzum.uz da bo'lganda (rangli, yoniq)
   - `icon-inactive-16.png`, `icon-inactive-48.png` — boshqa saytlarda (kulrang, dim)
2. Dizayn: VENTRA logotipi (V harfi) — ko'k (#3B82F6) fonda, oq V
3. Active/inactive farqi: active = to'liq rang, inactive = 50% opacity grayscale
4. SVG source fayllar ham saqlash (keyingi o'zgartirishlar uchun)
5. `alert-stock.png`, `alert-flash.png`, `alert-signal.png`, `alert-price.png` — notification ikonkalari (48x48)
**Qabul kriterlari:** Barcha ikonkalar tayyor, manifest.json da to'g'ri ulangan, Chrome toolbar da yaxshi ko'rinadi.

---

### T-233 | P2 | FRONTEND | Chrome Extension — Error handling + offline mode + graceful degradation | 1h
**Vazifa:** Extension barcha xato holatlarida foydalanuvchiga tushunarli xabar ko'rsatishi va offline da minimum funksionallik saqlanishi.
**Texnik talablar:**
1. Offline mode detection: `navigator.onLine` + event listeners
2. Offline da mavjud funksiyalar:
   - Cached scorelar ko'rsatish (oxirgi yuklanganlardan)
   - "Offline rejim — ma'lumotlar eskirgan bo'lishi mumkin" banner
   - Cached tracked products ro'yxati
3. Error states (har bir komponent uchun):
   - **Network error:** "Internet aloqasi yo'q. Qayta urinish" + retry tugma
   - **401 Unauthorized:** Auto-refresh → agar baribir 401 → "Qayta kiring" + login forma
   - **402 Payment Required:** "Balans yetarli emas. [To'ldirish →]" + VENTRA billing link
   - **429 Too Many Requests:** "Juda ko'p so'rov. {X} soniyadan keyin qayta uriniladi" + auto-retry
   - **500 Server Error:** "Server xatosi. Keyinroq urinib ko'ring"
   - **Timeout (10s):** "So'rov uzoq davom etmoqda. [Bekor qilish] [Kutish]"
4. Global error boundary: `src/shared/ErrorBoundary.tsx` — React error boundary
5. API client: automatic retry (max 2, exponential backoff: 1s, 3s)
6. Sentry/error tracking integration (optional): `VITE_SENTRY_DSN` env variable
**Qabul kriterlari:** Barcha xato holatlarida tushunarli xabar, offline da cached data ishlaydi, crashlar error boundary bilan ushlandi.

---

## XULOSA — CHROME EXTENSION TASKLARI

| Faza | Vazifalar | Diapazoni | Jami vaqt |
|------|-----------|-----------|-----------|
| **Faza 1** — Setup + Auth | 4 task | T-208...T-211 | ~7h |
| **Faza 2** — Content Script Overlay | 3 task | T-212...T-214 | ~6.5h |
| **Faza 3** — Popup Dashboard | 2 task | T-215...T-216 | ~4.5h |
| **Faza 4** — Category + Advanced | 3 task | T-217...T-219 | ~5h |
| **Faza 5** — Competitor + Narx | 3 task | T-220...T-222 | ~4.5h |
| **Faza 6** — AI + Hotkeys | 2 task | T-223...T-224 | ~2.5h |
| **Faza 7** — i18n + Testing + Perf | 3 task | T-225...T-227 | ~4.5h |
| **Faza 8** — Build + Publish + Multi-browser | 2 task | T-228...T-229 | ~3h |
| **Faza 9** — Security + Onboarding + Polish | 4 task | T-230...T-233 | ~3.5h |
| **JAMI** | **26 task** | **T-208...T-233** | **~41h** |

---

# ═══════════════════════════════════════════════════════════
# DEEP AUDIT BUGLAR (2026-02-27) — docs/bugs.md dan
# ═══════════════════════════════════════════════════════════

## AUDIT — MAVJUD TASKLARGA XAVOLA

| Bug ID | Severity | Mavjud Task | Izoh |
|--------|----------|-------------|------|
| BUG-001 | CRITICAL | T-061 | Redis password worker da yo'q |
| BUG-004 | HIGH | T-064 | Reanalysis title overwrite |
| BUG-005 | HIGH | T-088 | shop.name → shop.title |
| BUG-011 | HIGH | T-079 | Team invite bcrypt emas |
| BUG-014 | MEDIUM | T-234 | Desktop API URL ishlamaydi |
| BUG-017 | MEDIUM | T-137 | Profit calc customs/QQS yo'q |
| D-06 | MEDIUM | T-066 | 3x fetchProductDetail DRY |
| D-07 | LOW | T-166 | parseWeeklyBought dead code |

## AUDIT — YANGI TASKLAR

### T-238 | ✅ DONE | P1 | BACKEND | Signal service take:2 → take:30 — cannibalization, saturation, replenishment noaniq | 15min
**Manba:** BUG-008 + BUG-009 + BUG-010 (docs/bugs.md)
**Muammo:** `signals.service.ts` da 3 ta method faqat 2 ta snapshot oladi (`take: 2`).
`recalcWeeklyBoughtSeries()` 7 kunlik lookback + 24h gap kerak — 2 snapshot yetarli EMAS.
Natija: stored stale `weekly_bought` ishlatiladi → cannibalization, saturation, replenishment noaniq.
**Fayllar:**
- `apps/api/src/signals/signals.service.ts:25` — getCannibalization: `take: 2` → `take: 30`
- `apps/api/src/signals/signals.service.ts:80` — getSaturation: `take: 2` → `take: 30`
- `apps/api/src/signals/signals.service.ts:381` — getReplenishmentPlan: `take: 2` → `take: 30`
**Fix:** 3 joyda `take: 2` ni `take: 30` ga almashtirish (3 qator o'zgartirish).

---

### T-239 | P2 | BACKEND | Per-user rate limiting — AI endpoint lar uchun ThrottlerGuard | 30min
**Manba:** BUG-023 (docs/bugs.md)
**Muammo:** Hozir faqat per-IP throttling (120 req/min). Per-user yoki per-account throttling YO'Q.
Bitta foydalanuvchi AI endpoint larni cheksiz chaqirishi mumkin → Anthropic API narxi ortadi.
Corporate NAT ortida ko'p foydalanuvchi bitta kvotani bo'lishadi.
**Fix variantlari:**
1. Custom ThrottlerGuard — JWT dan `user_id` olish, Redis-based counter
2. AI endpoint larga alohida limit: 20 req/min per-user
3. Boshqa endpoint lar uchun: 60 req/min per-user
**Fayllar:**
- `apps/api/src/app.module.ts:42` — ThrottlerModule config
- Yangi fayl: `apps/api/src/common/guards/user-throttler.guard.ts`

---

### T-240 | P3 | BACKEND | DTO validatsiya qo'shish — 5+ endpoint DTO'siz | 30min
**Manba:** BUG-025 (docs/bugs.md)
**Muammo:** Global `ValidationPipe` bor, lekin ba'zi endpoint lar DTO class'siz `@Body()` qabul qiladi.
DTO yo'q → class-validator decorator yo'q → validation ishlamaydi.
**Fayllar (DTO kerak):**
- `apps/api/src/discovery/discovery.controller.ts` — `@Body() body: { input: string }`
- `apps/api/src/signals/signals.service.ts` — `saveChecklist` raw data
- `apps/api/src/team/team.service.ts` — `inviteMember` inline type
**Fix:** Har biri uchun DTO class + class-validator decoratorlar yaratish.

---

### T-241 | P1 | BACKEND | totalAvailableAmount Prisma schema + saqlash — stock cliff aniq bo'ladi | 30min
**Manba:** D-03 (docs/bugs.md)
**Muammo:** Uzum API `totalAvailableAmount` qaytaradi (haqiqiy ombor stoki: 2659 dona).
Lekin Prisma schema da bu field YO'Q — DB ga saqlanmaydi.
Stock cliff detection 10% heuristic ishlatadi → 10x noaniq (estimated 4500, haqiqiy 2255).
**Fix:**
1. `schema.prisma` — Product modeliga `total_available_amount BigInt?` qo'shish
2. `prisma migrate dev --name add-total-available-amount`
3. `reanalysis.processor.ts` — `detail.totalAvailableAmount` ni saqlash
4. `import.processor.ts` — xuddi shunday
5. `signals.service.ts` — heuristic o'rniga haqiqiy stockni ishlatish
**Fayllar:**
- `apps/api/prisma/schema.prisma` — Product model
- `apps/worker/src/processors/reanalysis.processor.ts`
- `apps/worker/src/processors/import.processor.ts`
- `apps/api/src/signals/signals.service.ts:186`

---

### T-260 | P1 | FRONTEND+BACKEND | Discovery — kategoriya nomi ko'rsatish (faqat ID emas) | 1.5h
**Manba:** Production test (2026-02-27)
**Muammo:** Discovery sahifasida foydalanuvchi faqat "#879", "#10012" kabi raqamlarni ko'radi.
Skanerlashlar jadvalida, Top 20 drawer'da, va quick-select tugmalarida kategoriya NOMI ko'rinmaydi.
Mijoz uchun "#879" eslab qolish qiyin — "Smartfonlar" deb yozilishi kerak.
**Qayerlarda ko'rinishi kerak:**
1. Skanerlashlar jadvali — "Kategoriya ID" ustunida "#879" o'rniga "Smartfonlar (#879)"
2. Top 20 drawer sarlavhasi — "Kategoriya #879" o'rniga "Smartfonlar — Top 20"
3. Discovery run history — nomi bilan saqlanishi kerak
**Fix (Backend):**
1. `discovery.service.ts` — Uzum API dan category name olish: `GET /api/v2/category/{id}` yoki scraper'dan
2. `DiscoveryRun` Prisma modeliga `category_name String?` field qo'shish
3. `prisma migrate dev --name add-discovery-category-name`
4. Run yaratilganda category name saqlash
5. GET `/discovery/runs` response'da `categoryName` qaytarish
**Fix (Frontend):**
1. `DiscoveryPage.tsx` (yoki `components/discovery/`) — jadvalda category name ko'rsatish
2. G'oliblar drawer sarlavhasida category name ishlatish
3. Quick-select tugmalari allaqachon nomli — ulardan foydalanish mumkin (client-side mapping)
**Fayllar:**
- `apps/api/src/discovery/discovery.service.ts`
- `apps/api/prisma/schema.prisma` — DiscoveryRun model
- `apps/web/src/components/discovery/` yoki `DiscoveryPage.tsx`

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-27*

---

### T-261 | P1 | IKKALASI | Discovery natijalar drawer — sotuvchi uchun kerakli ma'lumotlar yo'q | 3h
**Manba:** Production test (2026-02-27) — "Ko'rish" bosilganda faqat 5 ustun, Faollik doim "—"
**Muammo:**
Discovery Top 20 drawer'da sotuvchi qaror qabul qilish uchun kerakli ma'lumotlar ko'rinmaydi:
- **Faollik** ustuni doim "—" ko'rsatadi (weekly_bought = null, chunki snapshot delta kerak, lekin discovery'da tarix yo'q)
- **Rating** — Uzum API dan olinadi, lekin CategoryWinner jadvaliga saqlanmaydi
- **Sharhlar soni** — olinadi, saqlanmaydi
- **Ombor stoki** — totalAvailableAmount olinadi, saqlanmaydi
- **FBO/FBS turi** — stockType olinadi, saqlanmaydi
- Score formulasi 55% = weekly_bought (null) → scoring faqat 45% aniqlikda ishlaydi

**Hozirgi holat (ScannerTab.tsx):**
| # | Mahsulot | Score | Faollik(—) | Narx |

**Kerakli holat (sotuvchi uchun):**
| # | Mahsulot | Score | Buyurtma | Reyting | Sharhlar | Stok | Turi | Narx | Track |

**Fix (Backend — discovery.processor.ts + schema.prisma):**
1. CategoryWinner modeliga yangi fieldlar:
   - rating Decimal? @db.Decimal(3,2)
   - feedback_quantity Int?
   - total_available_amount BigInt?
   - stock_type String?
2. prisma migrate dev --name add-discovery-winner-details
3. discovery.processor.ts — winner yaratilganda yangi fieldlarni saqlash
4. discovery.service.ts — getRun() response da yangi fieldlarni qaytarish
5. Faollik ustunini orders_quantity (jami buyurtma) bilan almashtirish

**Fix (Frontend — components/discovery/ScannerTab.tsx):**
1. Drawer jadvaliga yangi ustunlar: Buyurtma, Reyting, Sharhlar, Stok, Turi
2. Responsive dizayn — kichik ekranlarda scroll
3. Track tugmasi → Tahlil + Track (bir marta bosib tahlil va kuzatuvga qoshish)

**Fayllar:**
- apps/api/prisma/schema.prisma — CategoryWinner model
- apps/worker/src/processors/discovery.processor.ts — winner saqlash
- apps/api/src/discovery/discovery.service.ts — response enrichment
- apps/web/src/components/discovery/ScannerTab.tsx — drawer UI
