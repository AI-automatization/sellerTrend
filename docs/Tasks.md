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
# YANGI VAZIFALAR — WORKER DEBUG AUDIT (2026-02-27)
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK (Worker)

### T-061 | BACKEND | redis.ts REDIS_URL dan password/username/db tashlab yuboriladi | Bekzod | 30min
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

### T-062 | BACKEND | Anthropic client modul yuklanganda yaratiladi — crash xavfi | Bekzod | 20min
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

### T-063 | BACKEND | reanalysis.processor har 6 soatda feedback_quantity ni 0 ga yozadi | Bekzod | 30min
**Bug:** H-15 + NEW-02
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:82,129`
**Muammo:** `detail.reviewsAmount` o'qiydi, lekin Uzum API `feedbackQuantity` qaytaradi. `reviewsAmount` = `undefined` → `?? 0` = doim 0. Har 6 soatda barcha tracked productlar uchun `feedback_quantity` 0 ga overwrite bo'ladi.
**Fix:** Interface `UzumProductData` (line 16-30) ni yangilash: `reviewsAmount` → `feedbackQuantity`. Kod: `detail.feedbackQuantity ?? 0`.

### T-064 | BACKEND | reanalysis.processor har 6 soatda title ni noto'g'ri yozadi | Bekzod | 15min
**Bug:** H-14
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:80`
**Muammo:** `detail.title` ishlatadi, `detail.localizableTitle?.ru || detail.title` o'rniga. Har 6 soatda title non-localized (generic) qiymat bilan overwrite bo'ladi. `import.processor.ts:64-67` to'g'ri ishlaydi — shu pattern kerak.
**Fix:** `title: detail.localizableTitle?.ru || detail.title,`

### T-065 | BACKEND | import.processor.ts feedback_quantity doim 0 | Bekzod | 15min
**Bug:** H-12
**Fayl:** `apps/worker/src/processors/import.processor.ts:75,88`
**Muammo:** `detail.reviewsAmount ?? 0` o'qiydi, Uzum API `feedbackQuantity` qaytaradi → doim 0.
**Fix:** `detail.feedbackQuantity ?? detail.reviewsAmount ?? 0`

---

## P1 — MUHIM (Worker + Bugs.md)

### T-066 | BACKEND | 3 ta fetchProductDetail nusxasi — DRY buzilgan | Bekzod | 45min
**Bug:** L-25
**Fayllar:** `uzum-scraper.ts:163-201` (canonical), `import.processor.ts:18-25` (raw), `reanalysis.processor.ts:32-43` (raw)
**Muammo:** `import.processor.ts` va `reanalysis.processor.ts` raw API data qaytaradi → H-12, H-13, H-14, H-15 buglar shu sababdan kelib chiqadi. Canonical version `uzum-scraper.ts` da to'g'ri type mapping bor.
**Fix:** Bitta `fetchProductDetail` funksiyani `uzum-scraper.ts` dan import qilish. Raw API field mapping ni bir joyda saqlash.

### T-067 | BACKEND | uzum-scraper.ts feedbackQuantity fallback tartibi noto'g'ri | Bekzod | 10min
**Bug:** NEW-01
**Fayl:** `apps/worker/src/processors/uzum-scraper.ts:194`
**Muammo:** `p.reviewsAmount ?? p.feedbackQuantity ?? 0` — noto'g'ri tartib. Uzum API `feedbackQuantity` qaytaradi, shu birinchi bo'lishi kerak.
**Fix:** `p.feedbackQuantity ?? p.reviewsAmount ?? 0`

### T-068 | BACKEND | import.processor.ts seller vs shop field ustunligi | Bekzod | 10min
**Bug:** H-13
**Fayl:** `apps/worker/src/processors/import.processor.ts:41`
**Muammo:** `detail.seller || detail.shop` — Uzum API `shop` qaytaradi, `seller` undefined. Hozir fallback orqali ishlaydi, lekin semantik noto'g'ri.
**Fix:** `detail.shop || detail.seller`

### T-069 | BACKEND | sourcing.processor AI ga platform UUID yuboradi | Bekzod | 20min
**Bug:** M-32
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:446`
**Muammo:** `r.platform_id` UUID → AI `[a1b2c3d4-...]` ko'radi, `[AliExpress]` o'rniga. AI scoring sifati pasayadi.
**Fix:** `platformMap` dan human-readable `code` yoki `name` olish va `platform: platformName` yuborish.

### T-070 | BACKEND | sourcing.processor SerpAPI engine nomlari noto'g'ri | Bekzod | 30min
**Bug:** M-33
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:341-343`
**Muammo:** `'1688'`, `'taobao'`, `'alibaba'` — SerpAPI da bunday engine yo'q. Valid engine: `google`, `google_shopping`, `bing`, `baidu`. Barcha 3 qidiruv doim fail bo'ladi.
**Fix:** Valid SerpAPI engine ishlatish yoki Playwright scraper ga o'tish.

### T-071 | BACKEND | sourcing.processor Shopee valyuta + narx xatosi | Bekzod | 20min
**Bug:** M-34 + NEW-05
**Fayl:** `apps/worker/src/processors/sourcing.processor.ts:263,427`
**Muammo:** 1) Shopee narxi `/100000` — faqat Indoneziya uchun to'g'ri, boshqa regionlar `/100`. 2) DB ga yozganda valyuta doim `'USD'` hardcode. Cargo hisoblash noto'g'ri.
**Fix:** Shopee API dan `currency` va region-specific divisor olish.

### T-072 | BACKEND | discovery.processor individual product upsert xatosini tutmaydi | Bekzod | 20min
**Bug:** M-35
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:120-149`
**Muammo:** for loop ichida try/catch yo'q. Bitta product fail → butun job FAILED. Qolgan productlar process bo'lmaydi.
**Fix:** Har iteration ni try/catch ga o'rash, xatoni log qilish, davom etish.

### T-073 | BACKEND | billing.processor TOCTOU race condition | Bekzod | 30min
**Bug:** L-24 + C-03
**Fayl:** `apps/worker/src/processors/billing.processor.ts:31-55`
**Muammo:** Balance tranzaksiyadan TASHQARIDA o'qiladi. Parallel chaqiruvlarda `balance_before/balance_after` noto'g'ri. API server ham bir vaqtda balance o'zgartirishi mumkin.
**Fix:** Tranzaksiya ichida balansni o'qish: `SELECT ... FOR UPDATE` yoki raw SQL `RETURNING`.

### T-074 | BACKEND | Worker 40+ joyda console.log ishlatadi | Bekzod | 45min
**Bug:** L-26 + NEW-12
**Fayllar:** `main.ts` (16), `uzum-scraper.ts` (5), `uzum-ai-scraper.ts` (9), `sourcing.processor.ts` (7), `billing.job.ts` (1), `competitor-snapshot.job.ts` (1), `reanalysis.job.ts` (1)
**Muammo:** Worker da structured logger (`logger.ts`) bor, lekin ko'p modul raw `console.log` ishlatadi. Log aggregation toollar uchun yaroqsiz.
**Fix:** Barcha `console.log/error/warn` ni `logger.info/error/warn` ga almashtirish.

### T-075 | BACKEND | reanalysis.processor multi-step update tranzaksiyasiz | Bekzod | 20min
**Bug:** NEW-03
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:77-132`
**Muammo:** Product update + snapshot create bir tranzaksiyada emas. Orasida xato bo'lsa product yangilangan lekin snapshot yo'q — inconsistent state.
**Fix:** `prisma.$transaction()` ichiga o'rash.

### T-076 | BACKEND | competitor.processor null sellPrice false alert trigger | Bekzod | 15min
**Bug:** NEW-07
**Fayl:** `apps/worker/src/processors/competitor.processor.ts:61-84`
**Muammo:** `sellPrice` `BigInt | null`. `Number(null)` = 0 → `(prevPrice - 0) / prevPrice * 100` = 100% → false PRICE_DROP alert.
**Fix:** `if (sellPrice !== null && sellPrice !== BigInt(0))` guard qo'shish.

### T-077 | BACKEND | discovery scoring — weekly_bought doim null, 55% zeroed | Bekzod | 30min
**Bug:** NEW-08
**Fayl:** `apps/worker/src/processors/discovery.processor.ts:108`
**Muammo:** Discovery hech qachon `weekly_bought` hisoblamaydi (snapshot history yo'q). `calculateScore` da 55% og'irlikdagi faktor doim 0. Natija: discovery score 0-4.5 oralig'ida, tracked product score 0-9.0. Ikki score taqqoslab bo'lmaydi.
**Fix:** Discovery da `ordersAmount` dan heuristik `weekly_bought` hisoblash yoki scoring formulada discovery uchun adjusted weights ishlatish.

---

## P2 — O'RTA (Bugs.md Critical + High)

### T-078 | SECURITY | bootstrapAdmin endpoint himoyalanmagan | Bekzod | 30min
**Bug:** C-01
**Fayl:** `apps/api/src/auth/auth.controller.ts:40-44`
**Muammo:** `POST /api/v1/auth/bootstrap-admin` auth guard yo'q. SUPER_ADMIN yo'q bo'lsa har kim o'zini admin qilishi mumkin.
**Fix:** `BOOTSTRAP_SECRET` env var tekshirish + first-use dan keyin disable.

### T-079 | BACKEND | Team invite — parol bcrypt hash emas | Bekzod | 20min
**Bug:** C-02
**Fayl:** `apps/api/src/team/team.service.ts:127-136`
**Muammo:** `crypto.randomBytes(32).toString('hex')` raw hex sifatida `password_hash` ga yoziladi. `bcrypt.compare()` doim `false` → invite qilingan user login qila olmaydi.
**Fix:** `await bcrypt.hash(tempPassword, 12)` ishlatish yoki "parol belgilash" oqimini qo'shish.

### T-080 | CONFIG | NestJS v10 + WebSocket v11 versiya mismatch | Bekzod | 30min
**Bug:** C-04
**Fayl:** `apps/api/package.json:18-27`
**Muammo:** `@nestjs/common` v10, `@nestjs/websockets` v11. Major version mismatch runtime crash qilishi mumkin.
**Fix:** Barcha NestJS paketlarini v10 yoki v11 ga bir xil keltirish.

### T-081 | CONFIG | Express v5 + NestJS v10 nomuvofiq | Bekzod | 20min
**Bug:** C-05
**Fayl:** `apps/api/package.json:23,36`
**Muammo:** NestJS v10 Express v4 ni qo'llab-quvvatlaydi. Express v5 breaking changes bor.
**Fix:** Express v4 ga tushirish yoki NestJS v11 ga ko'tarish.

### T-082 | DOCKER | PgBouncer o'ziga ishora (circular) | Bekzod | 10min
**Bug:** C-06
**Fayl:** `docker-compose.prod.yml:43`
**Muammo:** `DATABASE_URL: ...@pgbouncer:5432/...` — PgBouncer o'ziga ulanadi. Production ISHGA TUSHMAYDI.
**Fix:** `@postgres:5432` ga o'zgartirish.

### T-083 | DOCKER | Redis parol REDIS_URL da yo'q | Bekzod | 10min
**Bug:** C-07
**Fayl:** `docker-compose.prod.yml:27,69,96`
**Muammo:** Redis `--requirepass`, lekin `REDIS_URL` parolsiz. NOAUTH xatosi.
**Fix:** `redis://:${REDIS_PASSWORD}@redis:6379`

### T-084 | FRONTEND | RegisterPage auth store bypass | Sardor | 20min
**Bug:** C-08
**Fayl:** `apps/web/src/pages/RegisterPage.tsx:30-31`
**Muammo:** `useAuthStore.setTokens()` va `queryClient.clear()` chaqirmaydi. Zustand state yangilanmaydi.
**Fix:** LoginPage bilan bir xil pattern ishlatish.

### T-085 | FRONTEND | AnalyzePage tracked=true API xatosida ham o'rnatiladi | Sardor | 10min
**Bug:** C-09
**Fayl:** `apps/web/src/pages/AnalyzePage.tsx:94-102`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-086 | FRONTEND | ProductPage tracked=true API xatosida ham o'rnatiladi | Sardor | 10min
**Bug:** C-10
**Fayl:** `apps/web/src/pages/ProductPage.tsx:261-265`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-087 | SECURITY | notification.markAsRead account_id tekshirmaydi | Bekzod | 15min
**Bug:** H-01
**Fayl:** `apps/api/src/notification/notification.service.ts:81-99`
**Fix:** `where: { id, account_id: accountId }` qo'shish.

### T-088 | BACKEND | shop.name → shop.title | Bekzod | 10min
**Bug:** H-02
**Fayl:** `apps/api/src/products/products.service.ts:158`
**Muammo:** Prisma `Shop` modelida `title` bor, `name` emas. Doim `undefined`.
**Fix:** `shop.name` → `shop.title`

### T-089 | SECURITY | Product endpoint'lari account_id tekshirmaydi | Bekzod | 30min
**Bug:** H-03
**Fayl:** `apps/api/src/products/products.controller.ts:25-62`
**Muammo:** 5 ta endpoint har qanday auth user har qanday product ko'radi.
**Fix:** Har endpoint da `account_id` filter qo'shish.

### T-090 | BACKEND | Sourcing controller BillingGuard yo'q | Bekzod | 10min
**Bug:** H-04
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:18`
**Fix:** `@UseGuards(BillingGuard)` qo'shish.

### T-091 | SECURITY | auth refresh/logout DTO validatsiya yo'q | Bekzod | 15min
**Bug:** H-05
**Fayl:** `apps/api/src/auth/auth.controller.ts:26-37`
**Fix:** class-validator DTO yaratish.

### T-092 | BACKEND | competitor getHistory hardcoded string qaytaradi | Bekzod | 15min
**Bug:** H-06
**Fayl:** `apps/api/src/competitor/competitor.controller.ts:63-72`
**Fix:** Haqiqiy data qaytarish.

### T-093 | BACKEND | AliExpress API HMAC imzo yo'q | Bekzod | 45min
**Bug:** H-07
**Fayl:** `apps/api/src/sourcing/platforms/aliexpress.client.ts:55-57`
**Muammo:** Sign parametri hisoblanmaydi. Barcha so'rovlar auth xatosi bilan rad.
**Fix:** AliExpress TOP API HMAC-SHA256 sign implementatsiyasi.

### T-094 | SECURITY | sourcing getJob account_id tekshirmaydi | Bekzod | 10min
**Bug:** H-08
**Fayl:** `apps/api/src/sourcing/sourcing.controller.ts:95-98`
**Fix:** `where: { id, account_id: accountId }` qo'shish.

### T-095 | SECURITY | In-memory login attempt tracking multi-instance da ishlamaydi | Bekzod | 30min
**Bug:** H-09
**Fayl:** `apps/api/src/auth/auth.service.ts:32`
**Muammo:** `Map<string, LoginAttempt>` har instance da alohida.
**Fix:** Redis-based rate limiting (ioredis INCR + TTL).

### T-096 | BACKEND | JWT email field sign qilinmaydi | Bekzod | 15min
**Bug:** H-10
**Fayl:** `apps/web/src/api/base.ts:116` + backend JWT payload
**Muammo:** Backend JWT ga faqat `sub, account_id, role`. Sidebar doim `'user@ventra.uz'`.
**Fix:** JWT payload ga `email` qo'shish.

### T-097 | FRONTEND | WebSocket dev proxy yo'q | Sardor | 15min
**Bug:** H-11
**Fayl:** `apps/web/vite.config.ts`
**Muammo:** Socket.IO `/ws` proxy yo'q. Dev da real-time ishlamaydi.
**Fix:** Vite config da `/ws` proxy qo'shish (ws: true).

### T-098 | SCHEMA | onDelete: Cascade yo'q — parent o'chirganda crash | Bekzod | 30min
**Bug:** H-18
**Fayl:** `apps/api/prisma/schema.prisma`
**Fix:** Tegishli relation'larga `onDelete: Cascade` qo'shish.

### T-099 | SCHEMA | account_id indekslari yo'q — 15 jadval | Bekzod | 20min
**Bug:** H-19
**Fayl:** `apps/api/prisma/schema.prisma`
**Muammo:** 15 ta jadval da `account_id` indeksi yo'q → full table scan.
**Fix:** `@@index([account_id])` qo'shish.

### T-100 | DOCKER | Worker env da API kalitlari yo'q | Bekzod | 10min
**Bug:** H-20
**Fayl:** `docker-compose.prod.yml:93-103`
**Fix:** `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY`, `ALIEXPRESS_APP_KEY` env'lari qo'shish.

---

## P3 — PAST (Bugs.md Medium + Low + Worker Low)

### T-101 | BACKEND | admin.service.ts 2186 qator (400+ rule) | Bekzod | 2h
**Bug:** M-01. Service ni 4-5 ta kichik service ga bo'lish.

### T-102 | BACKEND | `as any` 30+ joyda | Bekzod | 1h
**Bug:** M-02. Typed interface bilan almashtirish.

### T-103 | BACKEND | main.ts console.log → Logger | Bekzod | 10min
**Bug:** M-03.

### T-104 | BACKEND | community.service dead code — counterUpdate | Bekzod | 5min
**Bug:** M-04. O'chirish.

### T-105 | BACKEND | admin.service hardcoded SUPER_ADMIN_ACCOUNT_ID | Bekzod | 15min
**Bug:** M-05. `.env` dan olish yoki DB dan dinamik topish.

### T-106 | BACKEND | admin.controller @Res() optional crash riski | Bekzod | 15min
**Bug:** M-06. Optional pattern o'rniga explicit response handling.

### T-107 | BACKEND | JWT module 7d vs service 15m conflict | Bekzod | 10min
**Bug:** M-07. Bitta joyda configure qilish.

### T-108 | BACKEND | api-key.guard.ts noto'g'ri role 'API_KEY' | Bekzod | 10min
**Bug:** M-08. Role enum ga qo'shish yoki guard logikasini tuzatish.

### T-109 | BACKEND | admin.service getTopUsers N+1 query (400 query) | Bekzod | 30min
**Bug:** M-09. Prisma `include` yoki `Promise.all` bilan batch.

### T-110 | BACKEND | RotatingFileWriter stream NPE riski | Bekzod | 10min
**Bug:** M-10. Null check qo'shish.

### T-111 | BACKEND | Redis ulanish strategiyasi nomuvofiq | Bekzod | 15min
**Bug:** M-11. Barcha queue fayllarini bir xil pattern ga keltirish (REDIS_URL).

### T-112 | BACKEND | community.service limitless query + in-memory sort | Bekzod | 15min
**Bug:** M-12. `take` limit va DB-level sort qo'shish.

### T-113 | BACKEND | sourcing.queue.ts modul import da Redis connection | Bekzod | 15min
**Bug:** M-13. Lazy initialization.

### T-114 | FRONTEND | admin.ts dead code sendNotification | Sardor | 5min
**Bug:** M-14. O'chirish.

### T-115 | FRONTEND | authStore email field JWT da yo'q | Sardor | 10min
**Bug:** M-15. T-096 bilan birgalikda fix.

### T-116 | FRONTEND | DashboardPage getTracked .catch() yo'q | Sardor | 10min
**Bug:** M-16. `.catch(toast.error)` qo'shish.

### T-117 | FRONTEND | DashboardPage scoreColor(0) gray | Sardor | 5min
**Bug:** M-17. `if (score === null || score === undefined)` ishlatish.

### T-118 | FRONTEND | AdminPage deposits useEffect dependency yo'q | Sardor | 5min
**Bug:** M-18. `[depositLogPage]` dependency qo'shish.

### T-119 | FRONTEND | ProductPage Recharts rect → Cell | Sardor | 10min
**Bug:** M-19. `<Cell>` component ishlatish.

### T-120 | FRONTEND | SourcingPage refreshRates() catch yo'q | Sardor | 5min
**Bug:** M-20.

### T-121 | FRONTEND | SourcingPage stale closure xavfi | Sardor | 10min
**Bug:** M-21. `useCallback` dependencies to'g'irlash.

### T-122 | FRONTEND | AdminPage void setActiveTab dead no-op | Sardor | 5min
**Bug:** M-22.

### T-123 | FRONTEND | AdminPage useEffect stale activeTab | Sardor | 10min
**Bug:** M-23. Dependency array to'g'irlash.

### T-124 | FRONTEND | ProductPage loadData useEffect dependency yo'q | Sardor | 10min
**Bug:** M-24.

### T-125 | FRONTEND | ProductPage extSearched reset bo'lmaydi | Sardor | 10min
**Bug:** M-25. Product o'zgarganda external search qayta boshlash.

### T-126 | FRONTEND | ConsultationPage timezone muammo | Sardor | 15min
**Bug:** M-26. UTC conversion to'g'irlash.

### T-127 | FRONTEND | ConsultationPage 3 ta empty catch | Sardor | 10min
**Bug:** M-27. Toast notification qo'shish.

### T-128 | FRONTEND | DiscoveryPage 2 ta empty catch | Sardor | 10min
**Bug:** M-28.

### T-129 | FRONTEND | ReferralPage empty catch | Sardor | 5min
**Bug:** M-29.

### T-130 | FRONTEND | ApiKeysPage 3 ta empty catch | Sardor | 10min
**Bug:** M-30.

### T-131 | FRONTEND | FeedbackPage 4 ta empty catch | Sardor | 10min
**Bug:** M-31.

### T-132 | BACKEND | sourcing.processor AI ga platform nomi (fixed M-32) | Bekzod | — (T-069 da)

### T-133 | BACKEND | sourcing.processor hardcoded 0.5kg weight | Bekzod | 15min
**Bug:** NEW-13. Barcha productlar 0.5 kg deb hisoblanadi. Og'ir buyumlar uchun cargo noto'g'ri.
**Fix:** Job data da `weight_kg` parametr qo'llash yoki kategoriya bo'yicha default og'irlik.

### T-134 | BACKEND | sourcing.processor hardcoded USD rate 12900 | Bekzod | 10min
**Bug:** NEW-14 + L-20. DB da rate yo'q bo'lsa 12900 fallback. Eskiradi.
**Fix:** Rate yo'q bo'lsa xato qaytarish yoki CBU API dan so'rash.

### T-135 | BACKEND | predictDeadStock days formula naming | Bekzod | 5min
**Bug:** NEW-09. Yechim: comment qo'shish, o'zgaruvchi nomlarini tuzatish.

### T-136 | BACKEND | forecastEnsemble RMSE aslida std deviation | Bekzod | 5min
**Bug:** NEW-10 + L-30. `rmse` → `std_dev` ga rename qilish.

### T-137 | BACKEND | calculateProfit breakeven formula kontseptual xato | Bekzod | 15min
**Bug:** NEW-11 + L-31. Fixed cost model qo'shish yoki formulani hujjatlash.

### T-138 | BACKEND | packages/types UzumProductDetail mos kelmaydi | IKKALASI | 15min
**Bug:** H-16. `ordersQuantity` → `ordersAmount`, `weeklyBought` o'chirish.

### T-139 | BACKEND | packages/types UzumItem mos kelmaydi | IKKALASI | 10min
**Bug:** H-17. Hech qayerda ishlatilmaydi — o'chirish yoki yangilash.

### T-140 | DOCKER | Prisma db push PgBouncer orqali | Bekzod | 10min
**Bug:** M-38. `directUrl` qo'shish (non-pooled).

### T-141 | DOCKER | Redis healthcheck parol bilan ishlamaydi | Bekzod | 5min
**Bug:** M-39. `redis-cli -a ${REDIS_PASSWORD} ping`

### T-142 | BACKEND | catch(e: any) → catch(e: unknown) | Bekzod | 15min
**Bug:** L-01.

### T-143 | BACKEND | classifyUA axios/node-fetch ni bot deb aniqlaydi | Bekzod | 10min
**Bug:** L-02.

### T-144 | BACKEND | auth.module.ts dead expiresIn 7d | Bekzod | 5min
**Bug:** L-03.

### T-145 | BACKEND | SerpAPI Amazon engine noto'g'ri | Bekzod | 10min
**Bug:** L-04.

### T-146 | BACKEND | prisma.service tenant check faqat dev | Bekzod | 10min
**Bug:** L-05. Production da ham enable qilish (warn level).

### T-147 | BACKEND | referral.service ishlatilmagan kodlarni hisoblaydi | Bekzod | 10min
**Bug:** L-06.

### T-148 | BACKEND | sourcing.service _source parametri dead | Bekzod | 5min
**Bug:** L-07.

### T-149 | BACKEND | community.service non-null assertion | Bekzod | 5min
**Bug:** L-08.

### T-150 | BACKEND | naming consultant_id aslida account_id | Bekzod | 10min
**Bug:** L-09.

### T-151 | FRONTEND | useCallback(fn, [fn]) foydasiz | Sardor | 5min
**Bug:** L-10.

### T-152 | FRONTEND | any type api fayllarida 6 ta | Sardor | 10min
**Bug:** L-11.

### T-153 | FRONTEND | ErrorBoundary console.error env check yo'q | Sardor | 5min
**Bug:** L-12.

### T-154 | FRONTEND | getTokenPayload return type tor | Sardor | 10min
**Bug:** L-13.

### T-155 | FRONTEND | isAuthenticated() token expiry tekshirmaydi | Sardor | 15min
**Bug:** L-14. Expired token → flash UI.

### T-156 | FRONTEND | DashboardPage sparkline useMemo yo'q | Sardor | 5min
**Bug:** L-15.

### T-157 | FRONTEND | DashboardPage CSV export empty catch | Sardor | 5min
**Bug:** L-16.

### T-158 | FRONTEND | AdminPage 30+ any type | Sardor | 30min
**Bug:** L-17.

### T-159 | FRONTEND | ProductPage any — mlForecast, trendAnalysis | Sardor | 10min
**Bug:** L-18.

### T-160 | FRONTEND | ProductPage effect ikki marta trigger | Sardor | 10min
**Bug:** L-19.

### T-161 | FRONTEND | ProductPage hardcoded USD rate 12900 | Sardor | 10min
**Bug:** L-20. T-134 bilan birga fix (API dan olish).

### T-162 | FRONTEND | SignalsPage any[] barcha tab'larda | Sardor | 15min
**Bug:** L-21.

### T-163 | FRONTEND | AdminPage 900+ qator (400 limit) | Sardor | 1h
**Bug:** L-22. Komponentlarga bo'lish.

### T-164 | i18n | 7 ta sahifada hardcoded Uzbek matn | Sardor | 30min
**Bug:** L-23. `t()` funksiya bilan almashtirish.

### T-165 | BACKEND | Worker billing.processor TOCTOU race | Bekzod | — (T-073 da)

### T-166 | BACKEND | parseWeeklyBought dead code | Bekzod | 5min
**Bug:** L-28. O'chirish.

### T-167 | BACKEND | predictDeadStock 0/0 NaN edge case | Bekzod | 5min
**Bug:** L-29. Guard qo'shish.

### T-168 | BACKEND | redis.ts parol tashlab yuboradi | Bekzod | — (T-061 da)

### T-169 | BACKEND | Bot barcha message turlarini tutadi | Bekzod | 10min
**Bug:** L-33. `bot.on('message:text')` ishlatish.

### T-170 | BACKEND | Bot broadcastDiscovery dead code | Bekzod | 5min
**Bug:** M-36.

### T-171 | BACKEND | Bot sendPriceDropAlert dead code | Bekzod | 5min
**Bug:** M-37.

### T-172 | BACKEND | JobName enum 2 ta job nomi yo'q | IKKALASI | 5min
**Bug:** L-27. `reanalysis-6h` va `sourcing-search` qo'shish.

---

# ═══════════════════════════════════════════════════════════
# RAILWAY DEPLOYMENT VAZIFALARI (2026-02-27)
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK (Deploy blockerlar)

### T-173 | DEVOPS | Railway project yaratish — 6 service | Bekzod | 1h
**Tarkib:**
1. PostgreSQL plugin (Railway managed, pgvector tekshirish)
2. Redis plugin (Railway managed, v7)
3. API service (Docker, `apps/api/Dockerfile`)
4. Worker service (Docker, `apps/worker/Dockerfile`)
5. Web service (Docker, `apps/web/Dockerfile`)
6. Bot service (Docker, `apps/bot/Dockerfile`)
**Eslatma:** pgvector Railway managed PG da mavjudligini tekshirish. Agar yo'q — custom Docker image (`pgvector/pgvector:pg16`).

### T-174 | DEVOPS | Environment variables sozlash | Bekzod | 30min
**Har service uchun env vars:**
- **Shared:** `DATABASE_URL` (PG reference), `REDIS_URL` (Redis reference), `NODE_ENV=production`
- **API:** `JWT_SECRET`, `WEB_URL` (frontend Railway URL), `ANTHROPIC_API_KEY`, `PORT` (auto)
- **Worker:** `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `SERPAPI_API_KEY` (optional)
- **Web:** `PORT` (auto), `API_UPSTREAM` (Railway private networking: `api.railway.internal:3000`)
- **Bot:** `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`

### T-175 | DEVOPS | Worker PORT issue fix | Bekzod | 10min
**Muammo:** Worker health check `WORKER_HEALTH_PORT` (default 3001) o'qiydi. Railway `PORT` beradi.
**Fix:** `apps/worker/src/main.ts:42` → `process.env.PORT || process.env.WORKER_HEALTH_PORT || '3001'`

### T-176 | DEVOPS | Prisma directUrl qo'shish — migration PgBouncer muammosi | Bekzod | 10min
**Muammo:** `prisma db push` PgBouncer transaction mode da ishlamaydi. Railway Postgres built-in pooler bor.
**Fix:** `schema.prisma` ga `directUrl = env("DIRECT_DATABASE_URL")` qo'shish. Railway da ikki reference: pooled + direct.

### T-177 | DEVOPS | Bot health check — HTTP endpoint yo'q | Bekzod | 15min
**Muammo:** Bot long-polling, HTTP port yo'q. Railway health check fail qiladi.
**Fix:** Minimal HTTP server qo'shish (worker pattern):
```typescript
const server = http.createServer((req, res) => {
  if (req.url === '/health') res.end(JSON.stringify({ status: 'ok', bot: 'running' }));
});
server.listen(process.env.PORT || 3002);
```

---

## P1 — MUHIM (CI/CD)

### T-178 | DEVOPS | GitHub Actions → Railway auto-deploy pipeline | Bekzod | 1h
**Mavjud:** `.github/workflows/ci.yml` — tsc + test + lint + build + docker
**Qo'shilishi kerak:**
```yaml
deploy:
  name: Deploy to Railway
  runs-on: ubuntu-latest
  needs: ci
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4
    - name: Install Railway CLI
      run: npm install -g @railway/cli
    - name: Deploy API
      run: railway up --service api
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    - name: Deploy Worker
      run: railway up --service worker
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    - name: Deploy Web
      run: railway up --service web
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    - name: Deploy Bot
      run: railway up --service bot
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```
**Alternativa:** Railway GitHub integration (auto-deploy on push, simpler). Ikkalasini config qilish mumkin.

### T-179 | DEVOPS | RAILWAY_TOKEN GitHub secret qo'shish | Bekzod | 5min
Railway dashboard → Settings → Tokens → New Token. GitHub repo → Settings → Secrets → RAILWAY_TOKEN.

### T-180 | DEVOPS | Railway service build settings | Bekzod | 15min
Har service uchun:
- **Root directory:** `/` (monorepo root)
- **Dockerfile path:** `apps/<service>/Dockerfile`
- **Health check path:** API: `/api/v1/health`, Worker: `/health`, Web: `/`, Bot: `/health`
- **Health check interval:** 30s, timeout 10s.

### T-181 | DEVOPS | CORS va WEB_URL to'g'ri sozlash | Bekzod | 10min
API `WEB_URL` → Railway frontend public URL (e.g., `https://ventra.up.railway.app`).
WebSocket gateway ham `WEB_URL` ishlatadi — ikkalasi ham to'g'ri bo'lishi kerak.

### T-182 | DEVOPS | Web API_UPSTREAM Railway private networking | Bekzod | 10min
nginx.conf.template `$API_UPSTREAM` env var ishlatadi. Railway private networking format: `api.railway.internal:3000`. Bu env var Railway Web service da to'g'ri set bo'lishi kerak.

---

## P2 — O'RTA (Stabillik)

### T-183 | DEVOPS | PgBouncer o'rniga Railway built-in pooler | Bekzod | 15min
Railway managed PostgreSQL built-in connection pooler bor. `docker-compose.prod.yml` dagi PgBouncer service keraksiz. Railway da pooled + direct URL ajratish.

### T-184 | DEVOPS | pgvector extension Railway da enable qilish | Bekzod | 10min
Railway PostgreSQL console: `CREATE EXTENSION IF NOT EXISTS vector;`
Yoki Prisma `postgresqlExtensions` preview feature orqali.

### T-185 | DEVOPS | Worker Docker image optimizatsiya | Bekzod | 30min
Worker image ~1GB+ (Chromium). Railway memory limitlarini tekshirish. Playwright kerak bo'lmasa Chromium o'chirish yoki headless browser alohida service qilish.

### T-186 | DEVOPS | Railway monitoring + alerting | Bekzod | 20min
Railway dashboard: logs, metrics, alerts. Sentry integration (API + Worker). Uptime monitoring (UptimeRobot/BetterStack).

### T-187 | DEVOPS | Database backup Railway da | Bekzod | 15min
Railway automatic backups bor. Point-in-time recovery sozlash. External backup (`pg_dump`) cron qo'shish optional.

---

## XULOSA

| Kategoriya | Yangi Tasklar | Diapazoni |
|------------|---------------|-----------|
| Worker Debug (P0) | 5 | T-061...T-065 |
| Worker Debug (P1) | 12 | T-066...T-077 |
| Bugs.md (P2) | 23 | T-078...T-100 |
| Bugs.md (P3) | 72 | T-101...T-172 |
| Railway Deploy (P0) | 5 | T-173...T-177 |
| Railway Deploy (P1) | 5 | T-178...T-182 |
| Railway Deploy (P2) | 5 | T-183...T-187 |
| **JAMI YANGI** | **127** | T-061...T-187 |

| Prioritet | Eski | Yangi | Jami |
|-----------|------|-------|------|
| P0 KRITIK | 9 ✅ | 10 | 10 ochiq |
| P1 MUHIM | 15 ✅ | 17 | 17 ochiq |
| P2 O'RTA | 17 ✅ | 23 | 23 ochiq |
| P3 PAST | 19 ✅ | 77 | 77 ochiq |
| **JAMI** | **60 ✅** | **127** | **127 ochiq** |

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-27*
