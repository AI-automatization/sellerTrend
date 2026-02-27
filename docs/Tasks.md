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

### T-207 | DESKTOP | Login ishlamaydi — VITE_API_URL yo'q, URL `app://api/v1` bo'ladi | 30min
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

### T-061 | BACKEND | redis.ts REDIS_URL dan password/username/db tashlab yuboriladi |30min
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

### T-063 | BACKEND | reanalysis.processor har 6 soatda feedback_quantity ni 0 ga yozadi |30min
**Bug:** H-15 + NEW-02
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:82,129`
**Muammo:** `detail.reviewsAmount` o'qiydi, lekin Uzum API `feedbackQuantity` qaytaradi. `reviewsAmount` = `undefined` → `?? 0` = doim 0. Har 6 soatda barcha tracked productlar uchun `feedback_quantity` 0 ga overwrite bo'ladi.
**Fix:** Interface `UzumProductData` (line 16-30) ni yangilash: `reviewsAmount` → `feedbackQuantity`. Kod: `detail.feedbackQuantity ?? 0`.

### T-064 | BACKEND | reanalysis.processor har 6 soatda title ni noto'g'ri yozadi |15min
**Bug:** H-14
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:80`
**Muammo:** `detail.title` ishlatadi, `detail.localizableTitle?.ru || detail.title` o'rniga. Har 6 soatda title non-localized (generic) qiymat bilan overwrite bo'ladi. `import.processor.ts:64-67` to'g'ri ishlaydi — shu pattern kerak.
**Fix:** `title: detail.localizableTitle?.ru || detail.title,`

### T-065 | BACKEND | import.processor.ts feedback_quantity doim 0 |15min
**Bug:** H-12
**Fayl:** `apps/worker/src/processors/import.processor.ts:75,88`
**Muammo:** `detail.reviewsAmount ?? 0` o'qiydi, Uzum API `feedbackQuantity` qaytaradi → doim 0.
**Fix:** `detail.feedbackQuantity ?? detail.reviewsAmount ?? 0`

---

## P1 — MUHIM (Worker + Bugs.md)

### T-066 | BACKEND | 3 ta fetchProductDetail nusxasi — DRY buzilgan |45min
**Bug:** L-25
**Fayllar:** `uzum-scraper.ts:163-201` (canonical), `import.processor.ts:18-25` (raw), `reanalysis.processor.ts:32-43` (raw)
**Muammo:** `import.processor.ts` va `reanalysis.processor.ts` raw API data qaytaradi → H-12, H-13, H-14, H-15 buglar shu sababdan kelib chiqadi. Canonical version `uzum-scraper.ts` da to'g'ri type mapping bor.
**Fix:** Bitta `fetchProductDetail` funksiyani `uzum-scraper.ts` dan import qilish. Raw API field mapping ni bir joyda saqlash.

### T-067 | BACKEND | uzum-scraper.ts feedbackQuantity fallback tartibi noto'g'ri |10min
**Bug:** NEW-01
**Fayl:** `apps/worker/src/processors/uzum-scraper.ts:194`
**Muammo:** `p.reviewsAmount ?? p.feedbackQuantity ?? 0` — noto'g'ri tartib. Uzum API `feedbackQuantity` qaytaradi, shu birinchi bo'lishi kerak.
**Fix:** `p.feedbackQuantity ?? p.reviewsAmount ?? 0`

### T-068 | BACKEND | import.processor.ts seller vs shop field ustunligi |10min
**Bug:** H-13
**Fayl:** `apps/worker/src/processors/import.processor.ts:41`
**Muammo:** `detail.seller || detail.shop` — Uzum API `shop` qaytaradi, `seller` undefined. Hozir fallback orqali ishlaydi, lekin semantik noto'g'ri.
**Fix:** `detail.shop || detail.seller`

### T-069 | BACKEND | sourcing.processor AI ga platform UUID yuboradi |20min
**Bug:** M-32
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:446`
**Muammo:** `r.platform_id` UUID → AI `[a1b2c3d4-...]` ko'radi, `[AliExpress]` o'rniga. AI scoring sifati pasayadi.
**Fix:** `platformMap` dan human-readable `code` yoki `name` olish va `platform: platformName` yuborish.

### T-070 | BACKEND | sourcing.processor SerpAPI engine nomlari noto'g'ri |30min
**Bug:** M-33
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:341-343`
**Muammo:** `'1688'`, `'taobao'`, `'alibaba'` — SerpAPI da bunday engine yo'q. Valid engine: `google`, `google_shopping`, `bing`, `baidu`. Barcha 3 qidiruv doim fail bo'ladi.
**Fix:** Valid SerpAPI engine ishlatish yoki Playwright scraper ga o'tish.

### T-071 | BACKEND | sourcing.processor Shopee valyuta + narx xatosi |20min
**Bug:** M-34 + NEW-05
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:263,427`
**Muammo:** 1) Shopee narxi `/100000` — faqat Indoneziya uchun to'g'ri, boshqa regionlar `/100`. 2) DB ga yozganda valyuta doim `'USD'` hardcode. Cargo hisoblash noto'g'ri.
**Fix:** Shopee API dan `currency` va region-specific divisor olish.

### T-072 | BACKEND | discovery.processor individual product upsert xatosini tutmaydi |20min
**Bug:** M-35
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:120-149`
**Muammo:** for loop ichida try/catch yo'q. Bitta product fail → butun job FAILED. Qolgan productlar process bo'lmaydi.
**Fix:** Har iteration ni try/catch ga o'rash, xatoni log qilish, davom etish.

### T-073 | BACKEND | billing.processor TOCTOU race condition |30min
**Bug:** L-24 + C-03
**Fayl:** `apps/worker/src/processors/billing.processor.ts:31-55`
**Muammo:** Balance tranzaksiyadan TASHQARIDA o'qiladi. Parallel chaqiruvlarda `balance_before/balance_after` noto'g'ri. API server ham bir vaqtda balance o'zgartirishi mumkin.
**Fix:** Tranzaksiya ichida balansni o'qish: `SELECT ... FOR UPDATE` yoki raw SQL `RETURNING`.

### T-074 | BACKEND | Worker 40+ joyda console.log ishlatadi |45min
**Bug:** L-26 + NEW-12
**Fayllar:** `main.ts` (16), `uzum-scraper.ts` (5), `uzum-ai-scraper.ts` (9), `sourcing.processor.ts` (7), `billing.job.ts` (1), `competitor-snapshot.job.ts` (1), `reanalysis.job.ts` (1)
**Muammo:** Worker da structured logger (`logger.ts`) bor, lekin ko'p modul raw `console.log` ishlatadi. Log aggregation toollar uchun yaroqsiz.
**Fix:** Barcha `console.log/error/warn` ni `logger.info/error/warn` ga almashtirish.

### T-075 | BACKEND | reanalysis.processor multi-step update tranzaksiyasiz |20min
**Bug:** NEW-03
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:77-132`
**Muammo:** Product update + snapshot create bir tranzaksiyada emas. Orasida xato bo'lsa product yangilangan lekin snapshot yo'q — inconsistent state.
**Fix:** `prisma.$transaction()` ichiga o'rash.

### T-076 | BACKEND | competitor.processor null sellPrice false alert trigger |15min
**Bug:** NEW-07
**Fayl:** `apps/worker/src/processors/competitor.processor.ts:61-84`
**Muammo:** `sellPrice` `BigInt | null`. `Number(null)` = 0 → `(prevPrice - 0) / prevPrice * 100` = 100% → false PRICE_DROP alert.
**Fix:** `if (sellPrice !== null && sellPrice !== BigInt(0))` guard qo'shish.

### T-077 | BACKEND | discovery scoring — weekly_bought doim null, 55% zeroed |30min
**Bug:** NEW-08
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:108`
**Muammo:** Discovery hech qachon `weekly_bought` hisoblamaydi (snapshot history yo'q). `calculateScore` da 55% og'irlikdagi faktor doim 0. Natija: discovery score 0-4.5 oralig'ida, tracked product score 0-9.0. Ikki score taqqoslab bo'lmaydi.
**Fix:** Discovery da `ordersAmount` dan heuristik `weekly_bought` hisoblash yoki scoring formulada discovery uchun adjusted weights ishlatish.

---

## P2 — O'RTA (Bugs.md Critical + High)

### T-078 | SECURITY | bootstrapAdmin endpoint himoyalanmagan |30min
**Bug:** C-01
**Fayl:** `apps/api/src/auth/auth.controller.ts:40-44`
**Muammo:** `POST /api/v1/auth/bootstrap-admin` auth guard yo'q. SUPER_ADMIN yo'q bo'lsa har kim o'zini admin qilishi mumkin.
**Fix:** `BOOTSTRAP_SECRET` env var tekshirish + first-use dan keyin disable.

### T-079 | BACKEND | Team invite — parol bcrypt hash emas |20min
**Bug:** C-02
**Fayl:** `apps/api/src/team/team.service.ts:127-136`
**Muammo:** `crypto.randomBytes(32).toString('hex')` raw hex sifatida `password_hash` ga yoziladi. `bcrypt.compare()` doim `false` → invite qilingan user login qila olmaydi.
**Fix:** `await bcrypt.hash(tempPassword, 12)` ishlatish yoki "parol belgilash" oqimini qo'shish.

### T-080 | CONFIG | NestJS v10 + WebSocket v11 versiya mismatch |30min
**Bug:** C-04
**Fayl:** `apps/api/package.json:18-27`
**Muammo:** `@nestjs/common` v10, `@nestjs/websockets` v11. Major version mismatch runtime crash qilishi mumkin.
**Fix:** Barcha NestJS paketlarini v10 yoki v11 ga bir xil keltirish.

### T-081 | CONFIG | Express v5 + NestJS v10 nomuvofiq |20min
**Bug:** C-05
**Fayl:** `apps/api/package.json:23,36`
**Muammo:** NestJS v10 Express v4 ni qo'llab-quvvatlaydi. Express v5 breaking changes bor.
**Fix:** Express v4 ga tushirish yoki NestJS v11 ga ko'tarish.

### T-082 | DOCKER | ✅ DONE — PgBouncer circular fix |10min
**Bug:** C-06 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

### T-083 | DOCKER | ✅ DONE — Redis REDIS_URL password fix |10min
**Bug:** C-07 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

### T-084 | FRONTEND | RegisterPage auth store bypass |20min
**Bug:** C-08
**Fayl:** `apps/web/src/pages/RegisterPage.tsx:30-31`
**Muammo:** `useAuthStore.setTokens()` va `queryClient.clear()` chaqirmaydi. Zustand state yangilanmaydi.
**Fix:** LoginPage bilan bir xil pattern ishlatish.

### T-085 | FRONTEND | AnalyzePage tracked=true API xatosida ham o'rnatiladi |10min
**Bug:** C-09
**Fayl:** `apps/web/src/pages/AnalyzePage.tsx:94-102`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-086 | FRONTEND | ProductPage tracked=true API xatosida ham o'rnatiladi |10min
**Bug:** C-10
**Fayl:** `apps/web/src/pages/ProductPage.tsx:261-265`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-087 | SECURITY | notification.markAsRead account_id tekshirmaydi |15min
**Bug:** H-01
**Fayl:** `apps/api/src/notification/notification.service.ts:81-99`
**Fix:** `where: { id, account_id: accountId }` qo'shish.

### T-088 | BACKEND | shop.name → shop.title |10min
**Bug:** H-02
**Fayl:** `apps/api/src/products/products.service.ts:158`
**Muammo:** Prisma `Shop` modelida `title` bor, `name` emas. Doim `undefined`.
**Fix:** `shop.name` → `shop.title`

### T-089 | SECURITY | Product endpoint'lari account_id tekshirmaydi |30min
**Bug:** H-03
**Fayl:** `apps/api/src/products/products.controller.ts:25-62`
**Muammo:** 5 ta endpoint har qanday auth user har qanday product ko'radi.
**Fix:** Har endpoint da `account_id` filter qo'shish.

### T-090 | BACKEND | Sourcing controller BillingGuard yo'q |10min
**Bug:** H-04
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:18`
**Fix:** `@UseGuards(BillingGuard)` qo'shish.

### T-091 | SECURITY | auth refresh/logout DTO validatsiya yo'q |15min
**Bug:** H-05
**Fayl:** `apps/api/src/auth/auth.controller.ts:26-37`
**Fix:** class-validator DTO yaratish.

### T-092 | BACKEND | competitor getHistory hardcoded string qaytaradi |15min
**Bug:** H-06
**Fayl:** `apps/api/src/competitor/competitor.controller.ts:63-72`
**Fix:** Haqiqiy data qaytarish.

### T-093 | BACKEND | AliExpress API HMAC imzo yo'q |45min
**Bug:** H-07
**Fayl:** `apps/api/src/sourcing/platforms/aliexpress.client.ts:55-57`
**Muammo:** Sign parametri hisoblanmaydi. Barcha so'rovlar auth xatosi bilan rad.
**Fix:** AliExpress TOP API HMAC-SHA256 sign implementatsiyasi.

### T-094 | SECURITY | sourcing getJob account_id tekshirmaydi |10min
**Bug:** H-08
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:95-98`
**Fix:** `where: { id, account_id: accountId }` qo'shish.

### T-095 | SECURITY | In-memory login attempt tracking multi-instance da ishlamaydi |30min
**Bug:** H-09
**Fayl:** `apps/api/src/auth/auth.service.ts:32`
**Muammo:** `Map<string, LoginAttempt>` har instance da alohida.
**Fix:** Redis-based rate limiting (ioredis INCR + TTL).

### T-096 | BACKEND | JWT email field sign qilinmaydi |15min
**Bug:** H-10
**Fayl:** `apps/web/src/api/base.ts:116` + backend JWT payload
**Muammo:** Backend JWT ga faqat `sub, account_id, role`. Sidebar doim `'user@ventra.uz'`.
**Fix:** JWT payload ga `email` qo'shish.

### T-097 | FRONTEND | WebSocket dev proxy yo'q |15min
**Bug:** H-11
**Fayl:** `apps/web/vite.config.ts`
**Muammo:** Socket.IO `/ws` proxy yo'q. Dev da real-time ishlamaydi.
**Fix:** Vite config da `/ws` proxy qo'shish (ws: true).

### T-098 | SCHEMA | onDelete: Cascade yo'q — parent o'chirganda crash |30min
**Bug:** H-18
**Fayl:** `apps/api/prisma/schema.prisma`
**Fix:** Tegishli relation'larga `onDelete: Cascade` qo'shish.

### T-099 | SCHEMA | account_id indekslari yo'q — 15 jadval |20min
**Bug:** H-19
**Fayl:** `apps/api/prisma/schema.prisma`
**Muammo:** 15 ta jadval da `account_id` indeksi yo'q → full table scan.
**Fix:** `@@index([account_id])` qo'shish.

### T-100 | DOCKER | ✅ DONE — Worker env vars fix |10min
**Bug:** H-20 — `docker-compose.prod.yml` da allaqachon fix qilindi (Railway arxitektura rebuild).

---

## P3 — PAST (Bugs.md Medium + Low + Worker Low)

### T-101 | BACKEND | admin.service.ts 2186 qator (400+ rule) |2h
**Bug:** M-01. Service ni 4-5 ta kichik service ga bo'lish.

### T-102 | BACKEND | `as any` 30+ joyda |1h
**Bug:** M-02. Typed interface bilan almashtirish.

### T-103 | BACKEND | main.ts console.log → Logger |10min
**Bug:** M-03.

### T-104 | BACKEND | community.service dead code — counterUpdate |5min
**Bug:** M-04. O'chirish.

### T-105 | BACKEND | admin.service hardcoded SUPER_ADMIN_ACCOUNT_ID |15min
**Bug:** M-05. `.env` dan olish yoki DB dan dinamik topish.

### T-106 | BACKEND | admin.controller @Res() optional crash riski |15min
**Bug:** M-06. Optional pattern o'rniga explicit response handling.

### T-107 | BACKEND | JWT module 7d vs service 15m conflict |10min
**Bug:** M-07. Bitta joyda configure qilish.

### T-108 | BACKEND | api-key.guard.ts noto'g'ri role 'API_KEY' |10min
**Bug:** M-08. Role enum ga qo'shish yoki guard logikasini tuzatish.

### T-109 | BACKEND | admin.service getTopUsers N+1 query (400 query) |30min
**Bug:** M-09. Prisma `include` yoki `Promise.all` bilan batch.

### T-110 | BACKEND | RotatingFileWriter stream NPE riski |10min
**Bug:** M-10. Null check qo'shish.

### T-111 | BACKEND | Redis ulanish strategiyasi nomuvofiq |15min
**Bug:** M-11. Barcha queue fayllarini bir xil pattern ga keltirish (REDIS_URL).

### T-112 | BACKEND | community.service limitless query + in-memory sort |15min
**Bug:** M-12. `take` limit va DB-level sort qo'shish.

### T-113 | BACKEND | sourcing.queue.ts modul import da Redis connection |15min
**Bug:** M-13. Lazy initialization.

### T-114 | FRONTEND | admin.ts dead code sendNotification |5min
**Bug:** M-14. O'chirish.

### T-115 | FRONTEND | authStore email field JWT da yo'q |10min
**Bug:** M-15. T-096 bilan birgalikda fix.

### T-116 | FRONTEND | DashboardPage getTracked .catch() yo'q |10min
**Bug:** M-16. `.catch(toast.error)` qo'shish.

### T-117 | FRONTEND | DashboardPage scoreColor(0) gray |5min
**Bug:** M-17. `if (score === null || score === undefined)` ishlatish.

### T-118 | FRONTEND | AdminPage deposits useEffect dependency yo'q |5min
**Bug:** M-18. `[depositLogPage]` dependency qo'shish.

### T-119 | FRONTEND | ProductPage Recharts rect → Cell |10min
**Bug:** M-19. `<Cell>` component ishlatish.

### T-120 | FRONTEND | SourcingPage refreshRates() catch yo'q |5min
**Bug:** M-20.

### T-121 | FRONTEND | SourcingPage stale closure xavfi |10min
**Bug:** M-21. `useCallback` dependencies to'g'irlash.

### T-122 | FRONTEND | AdminPage void setActiveTab dead no-op |5min
**Bug:** M-22.

### T-123 | FRONTEND | AdminPage useEffect stale activeTab |10min
**Bug:** M-23. Dependency array to'g'irlash.

### T-124 | FRONTEND | ProductPage loadData useEffect dependency yo'q |10min
**Bug:** M-24.

### T-125 | FRONTEND | ProductPage extSearched reset bo'lmaydi |10min
**Bug:** M-25. Product o'zgarganda external search qayta boshlash.

### T-126 | FRONTEND | ConsultationPage timezone muammo |15min
**Bug:** M-26. UTC conversion to'g'irlash.

### T-127 | FRONTEND | ConsultationPage 3 ta empty catch |10min
**Bug:** M-27. Toast notification qo'shish.

### T-128 | FRONTEND | DiscoveryPage 2 ta empty catch |10min
**Bug:** M-28.

### T-129 | FRONTEND | ReferralPage empty catch |5min
**Bug:** M-29.

### T-130 | FRONTEND | ApiKeysPage 3 ta empty catch |10min
**Bug:** M-30.

### T-131 | FRONTEND | FeedbackPage 4 ta empty catch |10min
**Bug:** M-31.

### T-133 | BACKEND | sourcing.processor hardcoded 0.5kg weight |15min
**Bug:** NEW-13. Barcha productlar 0.5 kg deb hisoblanadi. Og'ir buyumlar uchun cargo noto'g'ri.
**Fix:** Job data da `weight_kg` parametr qo'llash yoki kategoriya bo'yicha default og'irlik.

### T-134 | BACKEND | sourcing.processor hardcoded USD rate 12900 |10min
**Bug:** NEW-14 + L-20. DB da rate yo'q bo'lsa 12900 fallback. Eskiradi.
**Fix:** Rate yo'q bo'lsa xato qaytarish yoki CBU API dan so'rash.

### T-135 | BACKEND | predictDeadStock days formula naming |5min
**Bug:** NEW-09. Yechim: comment qo'shish, o'zgaruvchi nomlarini tuzatish.

### T-136 | BACKEND | forecastEnsemble RMSE aslida std deviation |5min
**Bug:** NEW-10 + L-30. `rmse` → `std_dev` ga rename qilish.

### T-137 | BACKEND | calculateProfit breakeven formula kontseptual xato |15min
**Bug:** NEW-11 + L-31. Fixed cost model qo'shish yoki formulani hujjatlash.

### T-138 | BACKEND | packages/types UzumProductDetail mos kelmaydi |15min
**Bug:** H-16. `ordersQuantity` → `ordersAmount`, `weeklyBought` o'chirish.

### T-139 | BACKEND | packages/types UzumItem mos kelmaydi |10min
**Bug:** H-17. Hech qayerda ishlatilmaydi — o'chirish yoki yangilash.

### T-141 | DOCKER | Redis healthcheck parol bilan ishlamaydi |5min
**Bug:** M-39. `redis-cli -a ${REDIS_PASSWORD} ping`

### T-142 | BACKEND | catch(e: any) → catch(e: unknown) |15min
**Bug:** L-01.

### T-143 | BACKEND | classifyUA axios/node-fetch ni bot deb aniqlaydi |10min
**Bug:** L-02.

### T-144 | BACKEND | auth.module.ts dead expiresIn 7d |5min
**Bug:** L-03.

### T-145 | BACKEND | SerpAPI Amazon engine noto'g'ri |10min
**Bug:** L-04.

### T-146 | BACKEND | prisma.service tenant check faqat dev |10min
**Bug:** L-05. Production da ham enable qilish (warn level).

### T-147 | BACKEND | referral.service ishlatilmagan kodlarni hisoblaydi |10min
**Bug:** L-06.

### T-148 | BACKEND | sourcing.service _source parametri dead |5min
**Bug:** L-07.

### T-149 | BACKEND | community.service non-null assertion |5min
**Bug:** L-08.

### T-150 | BACKEND | naming consultant_id aslida account_id |10min
**Bug:** L-09.

### T-151 | FRONTEND | useCallback(fn, [fn]) foydasiz |5min
**Bug:** L-10.

### T-152 | FRONTEND | any type api fayllarida 6 ta |10min
**Bug:** L-11.

### T-153 | FRONTEND | ErrorBoundary console.error env check yo'q |5min
**Bug:** L-12.

### T-154 | FRONTEND | getTokenPayload return type tor |10min
**Bug:** L-13.

### T-155 | FRONTEND | isAuthenticated() token expiry tekshirmaydi |15min
**Bug:** L-14. Expired token → flash UI.

### T-156 | FRONTEND | DashboardPage sparkline useMemo yo'q |5min
**Bug:** L-15.

### T-157 | FRONTEND | DashboardPage CSV export empty catch |5min
**Bug:** L-16.

### T-158 | FRONTEND | AdminPage 30+ any type |30min
**Bug:** L-17.

### T-159 | FRONTEND | ProductPage any — mlForecast, trendAnalysis |10min
**Bug:** L-18.

### T-160 | FRONTEND | ProductPage effect ikki marta trigger |10min
**Bug:** L-19.

### T-161 | FRONTEND | ProductPage hardcoded USD rate 12900 |10min
**Bug:** L-20. T-134 bilan birga fix (API dan olish).

### T-162 | FRONTEND | SignalsPage any[] barcha tab'larda |15min
**Bug:** L-21.

### T-163 | FRONTEND | AdminPage 900+ qator (400 limit) |1h
**Bug:** L-22. Komponentlarga bo'lish.

### T-164 | i18n | 7 ta sahifada hardcoded Uzbek matn |30min
**Bug:** L-23. `t()` funksiya bilan almashtirish.

### T-166 | BACKEND | parseWeeklyBought dead code |5min
**Bug:** L-28. O'chirish.

### T-167 | BACKEND | predictDeadStock 0/0 NaN edge case |5min
**Bug:** L-29. Guard qo'shish.

### T-169 | BACKEND | Bot barcha message turlarini tutadi |10min
**Bug:** L-33. `bot.on('message:text')` ishlatish.

### T-170 | BACKEND | Bot broadcastDiscovery dead code |5min
**Bug:** M-36.

### T-171 | BACKEND | Bot sendPriceDropAlert dead code |5min
**Bug:** M-37.

### T-172 | BACKEND | JobName enum 2 ta job nomi yo'q |5min
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

## P0 — KRITIK (Production Blocker) — ✅ CODE DONE

### T-173 | DEVOPS | Railway project yaratish + 6 service sozlash |1h
**Status:** Kod tayyor, Railway dashboard'da sozlash kerak.
**Hujjat:** `docs/RAILWAY.md` → Bosqich 2-3
**Service'lar:** postgres (plugin), redis (plugin), api, worker, web, bot
**Har bir app service:** GitHub Repo → Dockerfile Path → Root `/` → Deploy

### T-174 | DEVOPS | RAILWAY_TOKEN GitHub secret yaratish |5min
**Status:** Qo'lda bajarish kerak.
1. Railway dashboard → Account → Tokens → **Create Token**
2. GitHub repo → Settings → Secrets → **RAILWAY_TOKEN** = token
3. GitHub repo → Settings → Environments → `production` yaratish

### T-175 | DEVOPS | Environment variables — Railway dashboard |15min
**Status:** Qo'lda bajarish kerak.
**Hujjat:** `docs/RAILWAY.md` → Bosqich 3
**Muhim:** Railway reference syntax: `${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`
**DIRECT_DATABASE_URL:** API va Worker'da `${{Postgres.DATABASE_URL}}` (pooler bypass)

### T-176 | DEVOPS | Prisma schema — directUrl qo'shish |5min
**Status:** Kod o'zgartirish kerak.
**Fayl:** `apps/api/prisma/schema.prisma`
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```
**Izoh:** API Dockerfile entrypoint allaqachon `DIRECT_DATABASE_URL` ni ishlatadi. Schema'da ham rasm qilish kerak.

### T-177 | DEVOPS | pgvector extension — Railway PostgreSQL |5min
**Status:** Qo'lda bajarish kerak.
Railway PostgreSQL console (Data tab → Query):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
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

### T-182 | DEVOPS | Bot health endpoint qo'shish |15min
**Muammo:** Bot long-polling, HTTP server yo'q. Railway restart loop'ga tushishi mumkin.
**Fix:** `apps/bot/src/main.ts` ga minimal HTTP server:
```typescript
import http from 'http';
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: 'running' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(process.env.PORT || 3002);
```

### T-183 | DEVOPS | Worker PORT env var fix |5min
**Fayl:** `apps/worker/src/main.ts`
**Muammo:** Worker health `WORKER_HEALTH_PORT` o'qiydi. Railway `PORT` beradi.
**Fix:** `const port = process.env.PORT || process.env.WORKER_HEALTH_PORT || '3001';`

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

### T-191 | FRONTEND | useNativeNotification.ts dead code o'chirish |5min
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

### T-193 | FRONTEND+BACKEND | AI tahlili raw JSON ko'rsatadi — parse buzilgan |30min
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

### T-194 | FRONTEND | Chart X-axis "M02 27" takrorlanadi — sanalar o'qib bo'lmaydi |30min
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

### T-195 | FRONTEND | "Ensemble: WMA + Holt's..." texnik jargon o'chirish |10min
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

### T-196 | BACKEND | AI tahlili generic — raqib/o'z tovar farqi yo'q, amaliy maslahat yo'q |45min
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

### T-197 | FRONTEND | Score tarixi chart — bir kunda ko'p snapshot zigzag ko'rsatadi |20min
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

### T-199 | FRONTEND | "7 kunlik bashorat" trend badge noto'g'ri — 3.25→9.14 = "Barqaror"? |20min
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

### T-200 | FRONTEND | ML Prognoz — "confidence", "snapshot" texnik so'zlar |10min
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

### T-203 | FRONTEND | ML Prognoz 4 ta KPI box labelsiz — raqamlar tushunarsiz | 20min
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

### T-204 | FRONTEND | "7 kunlik sotuv dinamikasi" card da qora to'rtburchak (render bug) | 15min
**Screenshot:** hato/095147.png
**Muammo:** "7 kunlik sotuv dinamikasi" bo'limidagi kartochkalardan biri to'liq QORA TO'RTBURCHAK ko'rsatadi. Image load fail yoki CSS rendering xatosi.
**Fayl:** `ProductPage.tsx` — weekly trend cards section
**Fix:**
1. Image/SVG load failure uchun fallback placeholder qo'shish
2. `onError` handler: qora blok o'rniga "Ma'lumot yo'q" matn ko'rsatish
3. CSS `background-color` va `overflow: hidden` tekshirish

### T-205 | FRONTEND | Footer da raw scoring formula ko'rinadi — foydalanuvchiga ko'rsatilmasligi kerak | 10min
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
| Bugs.md (P2) | 20 (3 done) | T-078...T-100 |
| Bugs.md (P3) | 68 (4 dup o'chirildi) | T-101...T-172 |
| **Railway Deploy (P0)** | **5 ✅ CODE DONE** | **T-173...T-177** |
| **Railway Deploy (P1)** | **4** | **T-178...T-181** |
| **Railway Deploy (P2)** | **3** | **T-182...T-184** |
| PWA O'chirish (P1) | 5 | T-188...T-192 |
| **ProductPage UX (P0)** | **3** | **T-193...T-195** |
| **ProductPage UX (P1)** | **11** | **T-196...T-206** |
| **JAMI** | **136 ochiq** | T-061...T-206 |

| O'zgarish | Tafsilot |
|-----------|----------|
| ✅ Duplicatlar o'chirildi | T-132 (=T-069), T-140 (=T-176), T-165 (=T-073), T-168 (=T-061) |
| ✅ Done belgilandi | T-082, T-083, T-100 (docker-compose fix allaqachon qilindi) |
| ✅ Assignment o'chirildi | Bekzod/Sardor/Ikkalasi barcha tasklardan olib tashlandi |
| ✅ Yangi buglar qo'shildi | T-203 (KPI labelsiz), T-204 (black rect), T-205 (footer formula), T-206 (raqiblar ziddiyat) |

### RAILWAY DEPLOY — QILINGAN ISHLAR (Code Done)
- ✅ Eski `railway/` directory o'chirildi (4 ta toml)
- ✅ Eski `railway.toml` (root) o'chirildi
- ✅ `.github/workflows/ci.yml` qayta yozildi — CI + Deploy (Railway CLI)
- ✅ `docker-compose.prod.yml` fix: C-06 (PgBouncer→postgres), C-07 (Redis password), H-20 (Worker env)
- ✅ `apps/api/Dockerfile` — entrypoint.sh (DIRECT_DATABASE_URL migration, PgBouncer bypass)
- ✅ `.env.production` — to'liq template (DIRECT_DATABASE_URL, REDIS parol)
- ✅ `docs/RAILWAY.md` — yangi production guide (arxitektura diagramma, 6 bosqich, CLI, troubleshoot)

### PRODUCTPAGE UX — TOP MUAMMOLAR (hato/ rasmlardan)
- 🔴 T-193: AI tahlili raw JSON ko'rsatadi (` ```json `, `[`)
- 🔴 T-194: X-axis "M02 27" 10+ marta takrorlanadi
- 🔴 T-195: "WMA + Holt's + Linear Regression · MAE · RMSE" texnik jargon
- 🟡 T-196: AI tahlili generic — raqib/o'z tovar farqi yo'q
- 🟡 T-197: Score chart zigzag — bir kunda ko'p snapshot
- 🟡 T-198: Haftalik sotuvlar chart noto'g'ri data
- 🟡 T-199: "Barqaror" trend badge noto'g'ri (3.25→9.14)
- 🟡 T-200: "confidence", "snapshot" texnik so'zlar
- 🟡 T-201: Raqiblar/Global Bozor loading/bo'sh
- 🟡 T-202: Sahifa tartibi sotuvchi uchun optimal emas
- 🟡 T-203: ML Prognoz KPI boxlar labelsiz — 2.94, 81, 74%, 58 nima?
- 🟡 T-204: "7 kunlik sotuv dinamikasi" da qora to'rtburchak
- 🟡 T-205: Footer da raw scoring formula ko'rinadi
- 🟡 T-206: Raqiblar "50 ta kuzatilmoqda" + "topilmadi" ziddiyat

---

# ═══════════════════════════════════════════════════════════
# WEEKLY_BOUGHT MARKAZLASHTIRISH (2026-02-27) — DATA CONSISTENCY
# ═══════════════════════════════════════════════════════════

### T-207 | P0 | BACKEND+WORKER | weekly_bought 6 joyda 6 xil — markaziy calcWeeklyBought() | 1h
**Muammo:** Bitta product 4 xil weekly_bought: Dashboard=523, Stat=134, Chart=142, Trend=134
**Sabab:** 6 ta turli joy o'z formulasi, har biri boshqa snapshot, boshqa daysDiff
**Yechim:** `calcWeeklyBought(prisma, productId, currentOrders)` — 7 kunlik lookback + min 24h fallback
**Fayllar:** products.service.ts, uzum.service.ts, reanalysis.processor.ts, import.processor.ts, signals.service.ts

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-27*
