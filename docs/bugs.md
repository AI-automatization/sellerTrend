# VENTRA — CODEBASE AUDIT & BUG TRACKER
# Yangilangan: 2026-02-27
# Manba: Deep codebase audit (27 bug tekshirildi, 16 tasdiqlandi)
# Dastur tayyor: ~72%

---

## PRODUCTION READINESS: ~72%

| Kategoriya | Soni | Foiz |
|-----------|------|------|
| ISHLAYDI (to'liq) | 24 | ~60% |
| QISMAN ISHLAYDI | 8 | ~20% |
| BUZILGAN / ISHLAMAYDI | 4 | ~10% |
| DEAD CODE | 2 | ~5% |
| PRODUCTION BLOCKER | 3 | ~5% |

### PRODUCTION BLOCKER (deploy qilishdan OLDIN tuzatish SHART):
1. **BUG-001** — Redis password worker da tushib qolgan (1 qator fix)
2. **BUG-004** — Reanalysis har 6 soatda title ni buzadi
3. **BUG-005** — shop.name doim null (shop.title bo'lishi kerak)

### ISHLAYDI (to'liq):
- Auth (JWT, RBAC, login, register)
- URL Analyze (Uzum API → upsert → score)
- Dashboard (KPIs, charts, tracked products)
- Billing (cron charge, 402 guard, balance)
- Admin panel (accounts, audit log, deposit, fees)
- Discovery (BullMQ + Playwright DOM scraping)
- Niche Finder (division-by-zero himoyalangan)
- Competitor tracking (NotFoundException to'g'ri ishlaydi)
- Sourcing — Cargo calculator (customs 10/20% + QQS 12%)
- Sourcing — AliExpress/Alibaba Playwright scraping
- AI — extractAttributes, explainWinner (graceful fallback)
- AI — generateSearchQuery, generateDescription
- Bot — /subscribe, /unsubscribe, /status, /top, /help
- Rate limiting (120 req/min per IP — ThrottlerModule)
- Error boundaries (React — LazyRoute + ErrorBoundary)
- Graceful shutdown (Worker — 6 worker + Redis + 30s timeout)
- Docker healthcheck (pg_isready → PgBouncer → API/Worker)
- Service Worker (ventra-v3, API network-only)
- Cache-busting (Axios _t=timestamp, Cache-Control: no-store)
- Weekly Trend (7-day delta, daily breakdown, advice)

### QISMAN ISHLAYDI:
- ~~Signals — cannibalization, saturation (take:2)~~ ✅ TUZATILDI (take:30)
- ~~Signals — replenishment planner (take:2)~~ ✅ TUZATILDI (take:30)
- Profit Calculator (customs/QQS yo'q — import mahsulotlar uchun noaniq)
- Input validation (Global pipe bor, lekin ba'zi endpoint DTO'siz)
- BigInt serialization (asosiy path'lar to'g'ri, edge case'lar bor)
- Rate limiting per-user (faqat per-IP, AI endpoint uchun yetarli emas)

### BUZILGAN:
- Team invite (parol reset flow yo'q — foydalanuvchi kira olmaydi)
- Desktop app (API URL app:// protokolida ishlamaydi)
- Stock cliff signal (totalAvailableAmount DB da yo'q — heuristic 10x noaniq)

### DEAD CODE:
- parseWeeklyBought() — Uzum API dan actions.text olib tashlangan
- ~~3x fetchProductDetail duplicate~~ ✅ TUZATILDI (fetchUzumProductRaw shared)

---

## Uzum.uz dan olinadigan MA'LUMOTLAR XARITASI

```
Uzum sahifada ko'rinadi          Uzum REST API qaytaradi         Bizda (DB/kod)
─────────────────────────        ─────────────────────────       ─────────────────────
"533 человека купили"            YO'Q (API da mavjud emas)       weekly_bought (snapshot delta)
"38 600 сум" (narx)              purchasePrice                   min_sell_price
"Можно купить 5 шт"             sku.availableAmount              XATO: stok deb ishlatilgan
Ombor stoki (ko'rinmaydi)       totalAvailableAmount             DB da YO'Q
"4.7 тыс buyurtma"              ordersAmount                     orders_quantity
"8 894 ta sharh"                 reviewsAmount                    feedback_quantity
"4.7" reyting                    rating                           rating
Do'kon nomi                      shop.title                      XATO: shop.name (undefined)
Chegirma narx                    fullPrice                        min_full_price
FBO/FBS turi                     stockType                        stock_type
```

---

# TASDIQLANGAN BUGLAR

---

## BUG-001 | CRITICAL | Redis password worker da tushib qolgan

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/worker/src/redis.ts`

**Muammo:**
Worker Redis URL dan faqat `host` va `port` ni oladi, `password` ni EMAS:
```typescript
export const redisConnection = {
  connection: {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    maxRetriesPerRequest: null,
  },
};
```

Production da `docker-compose.prod.yml` Redis ni `--requirepass` bilan ishga tushiradi.
`REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379` — password bor, lekin kod uni o'qimaydi.

**Natija:** Production da worker Redis ga ulanolmaydi → BARCHA 6 ta queue ishlamaydi (billing, discovery, sourcing, competitor, import, reanalysis).

**Cascading:** BUG-001 → billing to'xaydi, discovery to'xaydi, reanalysis to'xaydi, import to'xaydi

**Fix:** 1 qator qo'shish:
```typescript
password: url.password || undefined,
```

---

## BUG-004 | HIGH | Reanalysis har 6 soatda product title ni buzadi

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/worker/src/processors/reanalysis.processor.ts:73`

**Muammo:**
Reanalysis processor title ni raw API dan oladi:
```typescript
title: detail.title,  // RAW — localize qilinmagan
```

Import processor TURI to'g'ri:
```typescript
const title = detail.localizableTitle?.ru || detail.title || `Product ${productId}`;
```

Har 6 soatda reanalysis ishlaganda, localize qilingan Russian title (masalan, "Смартфон Samsung Galaxy A55") raw title bilan almashadi (masalan, "Smartfon Samsung Galaxy A55 128/8 SM-A556EZKDSKZ").

**Cascading:** BUG-004 ← BUG-021 (duplicate fetchProductDetail)

**Fix:**
```typescript
title: detail.localizableTitle?.ru || detail.title,
```

Yoki `UzumProductData` interface ga `localizableTitle` qo'shish.

---

## BUG-005 | HIGH | shop.name doim null — shop.title bo'lishi kerak

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/api/src/products/products.service.ts:118`

**Muammo:**
```typescript
shop_name: (product.shop as any)?.name ?? null,  // XATO
```

Prisma `Shop` modelida `title` field bor (`schema.prisma:141`), `name` YO'Q.
`product.shop.name` doim `undefined` → shop nomi frontend da ko'rinmaydi.

**Fix:**
```typescript
shop_name: (product.shop as any)?.title ?? null,
```

---

## BUG-008 | MEDIUM | Signal cannibalization take:2 — noaniq weekly_bought

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/api/src/signals/signals.service.ts:25`

**Muammo:**
```typescript
snapshots: { orderBy: { snapshot_at: 'desc' }, take: 2 },
```

`recalcWeeklyBoughtSeries()` 7 kunlik lookback + 24h gap kerak.
6 soatlik snapshot interval bilan 2 ta snapshot = max 12 soat → 24h gap shartini bajarmaydi.
Natija: stored `weekly_bought` ishlatiladi (stale bo'lishi mumkin).

**Fix:** `take: 2` → `take: 30`

---

## BUG-009 | MEDIUM | Signal saturation take:2 — noaniq weekly_bought

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/api/src/signals/signals.service.ts:80`

**Muammo:** BUG-008 bilan bir xil. Category saturation index noaniq weekly_bought bilan hisoblanadi.

**Fix:** `take: 2` → `take: 30`

---

## BUG-010 | HIGH | Signal replenishment take:2 — xato buyurtma miqdori

**Holat:** ✅ TUZATILDI (2026-02-27)
**Fayl:** `apps/api/src/signals/signals.service.ts:381`

**Muammo:** BUG-008 bilan bir xil, lekin severity yuqoriroq.
Replenishment planner weekly_bought ga asoslanib buyurtma miqdori va sanasini hisoblaydi.
Noaniq weekly_bought → noto'g'ri reorder quantity → sotuvchi kam yoki ko'p buyurtma beradi.

**Cascading:** BUG-008 + BUG-009 + BUG-010 bir xil root cause (take:2)

**Fix:** `take: 2` → `take: 30`

---

## BUG-011 | HIGH | Team invite — foydalanuvchi kira olmaydi

**Holat:** OCHIQ
**Fayl:** `apps/api/src/team/team.service.ts:127-136`

**Muammo:**
```typescript
const tempHash = crypto.randomBytes(32).toString('hex');
await this.prisma.user.create({
  data: {
    password_hash: tempHash,  // random hex, bcrypt EMAS
    ...
  },
});
```

`password_hash` ga random hex yoziladi. Comment "user must reset" deydi, lekin:
- `auth.service.ts` da `forgotPassword()`, `resetPassword()`, `setPassword()` YO'Q
- `bcrypt.compare(anything, randomHex)` doim FALSE → login MUMKIN EMAS

**Natija:** Team invite feature butunlay buzilgan. Taklif qilingan foydalanuvchi hech qachon kira olmaydi.

**Fix variantlari:**
1. Email + temporary password yuborish (email service kerak)
2. Invite link + password set page qo'shish (frontend + backend)
3. Admin tomonidan parol belgilash imkoniyati

---

## BUG-014 | MEDIUM | Desktop app — API chaqiruvlari ishlamaydi

**Holat:** OCHIQ
**Fayl:** `apps/web/src/api/base.ts:5` + `apps/desktop/src/main/window.ts`

**Muammo:**
```typescript
baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
```

Desktop app da `VITE_API_URL` yo'q → baseURL = `/api/v1`.
Electron `app://` protokolidan yuklanganda:
- Request: `app:///api/v1/auth/login`
- Electron `window.ts`: har qanday path ga `index.html` qaytaradi
- Natija: API o'rniga HTML qaytadi

**Fix:** `apps/desktop/.env` ga `VITE_API_URL=http://localhost:3000` yoki electron.vite.config da proxy.

---

## BUG-017 | MEDIUM | Profit Calculator — customs/QQS yo'q

**Holat:** OCHIQ
**Fayl:** `packages/utils/src/index.ts:286-327`

**Muammo:**
`calculateProfit()` faqat: `unit_cost_usd * usd_to_uzs + fbo_cost + ads_spend + commission` hisoblaydi.

YO'Q:
- Bojxona boji (10-20%)
- QQS / VAT (12%)
- Kargo narxi (Xitoy → O'zbekiston)

Sourcing module da alohida cargo calculator BOR (customs + QQS), lekin asosiy profit calculator buni hisoblamaydi.
Import mahsulotlar uchun foyda 20-30% ga ortiq ko'rsatiladi.

**Fix:** `calculateProfit()` ga `customs_percent`, `vat_percent`, `cargo_cost` parametrlari qo'shish.

---

## BUG-023 | LOW | Rate limiting faqat per-IP

**Holat:** OCHIQ
**Fayl:** `apps/api/src/app.module.ts:42`

**Muammo:**
```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
```

Per-IP throttling. Per-user/per-account throttling YO'Q.
Bitta foydalanuvchi AI endpoint larni cheksiz chaqirishi mumkin (Anthropic API narxi ortadi).
Corporate NAT ortida bir nechta foydalanuvchi bitta IP kvotani bo'lishadi.

**Fix:** Custom ThrottlerGuard + JWT dan user_id olish.

---

## BUG-025 | LOW | Ba'zi endpoint lar DTO'siz — validation ishlamaydi

**Holat:** OCHIQ
**Fayllar:**
- `apps/api/src/discovery/discovery.controller.ts` — `@Body() body: { input: string }` (DTO yo'q)
- `apps/api/src/signals/signals.service.ts` — `saveChecklist` raw data
- `apps/api/src/team/team.service.ts` — `inviteMember` inline type

**Muammo:** Global `ValidationPipe` bor, lekin DTO class'siz decorator lar yo'q → validation ishlamaydi.

**Fix:** Har bir endpoint uchun DTO class yaratish (class-validator decorator bilan).

---

# ALLAQACHON TUZATILGAN / BUG EMAS

| Bug ID | Holat | Izoh |
|--------|-------|------|
| BUG-002 | BUG EMAS | Anthropic client crash qilmaydi, AI method'lar graceful fallback |
| BUG-003 | BUG EMAS | `detail.reviewsAmount ?? 0` to'g'ri ishlaydi |
| BUG-006 | BUG EMAS | Discovery va main scoring bir xil `calculateScore` funksiyadan |
| BUG-007 | BUG EMAS | Billing BigInt arithmetic to'g'ri |
| BUG-012 | BUG EMAS | Alert rules feature mavjud emas (non-existent code) |
| BUG-013 | BUG EMAS | `NotFoundException` to'g'ri throw qilinadi |
| BUG-015 | TUZATILGAN | Service Worker ventra-v3, API network-only (v5.3 da fix) |
| BUG-016 | BUG EMAS | Niche finder `Math.max(..., 1)` bilan himoyalangan |
| BUG-018 | TUZATILGAN | Cache-busting + SW fix (v5.3 da) |
| BUG-022 | TUZATILGAN | ErrorBoundary mavjud, LazyRoute bilan har route da |
| BUG-024 | BUG EMAS | Bot /top bo'sh natijani to'g'ri handle qiladi |
| BUG-026 | BUG EMAS | Docker healthcheck zanjiri to'g'ri (pg → pgbouncer → api/worker) |
| BUG-027 | TUZATILGAN | Graceful shutdown — 6 worker + Redis + 30s timeout |

---

# OLDINGI DATA ACCURACY BUGLAR

## D-01 | KRITIK | Haftalik sotuv — Uzum ko'rsatadi, biz hisoblaymiz (NOANIQ)

**Holat:** OCHIQ (API bermaydi — yechim faqat Playwright DOM scraping)

Uzum sahifada "533 человека купили на этой неделе" ko'rsatiladi.
API bu raqamni QAYTARMAYDI. Biz snapshot delta bilan hisoblaymiz:
```
weekly_bought = (bugungi ordersAmount - 7 kun oldingi ordersAmount) * 7 / kunlar_farqi
```

**Fayllar:**
- `packages/utils/src/index.ts:78-133` — `calcWeeklyBought()`
- `packages/utils/src/index.ts:135-180` — `recalcWeeklyBoughtSeries()`

---

## D-02 | KRITIK | `availableAmount` = buyurtma limiti, stok EMAS

**Holat:** OCHIQ (kodda to'g'ri ishlatilgan, lekin UI da tushuntirish kerak)

`sku.availableAmount = 5` → bir xaridda max 5 ta olish limiti.
`totalAvailableAmount = 2659` → haqiqiy ombor stoki.

---

## D-03 | YUQORI | `totalAvailableAmount` DB schema da YO'Q

**Holat:** OCHIQ

Uzum API `totalAvailableAmount` qaytaradi, lekin Prisma schema da bu field yo'q.
Stock cliff detection 10% heuristic ishlatadi — 10x noaniq.

**Fix:** Prisma migration: `total_available_amount Int?` qo'shish.

---

## D-06 | O'RTA | 3 ta `fetchProductDetail` nusxasi — DRY buzilgan

**Holat:** OCHIQ (BUG-021 bilan bir xil)

| Fayl | Type mapping |
|------|-------------|
| `uzum-scraper.ts:163-201` | Canonical, to'g'ri |
| `import.processor.ts:18-25` | Raw API, mapping yo'q |
| `reanalysis.processor.ts:32-43` | Raw API, mapping yo'q |

BUG-004 (title overwrite) shu DRY buzilishdan kelib chiqadi.

---

## D-07 | O'RTA | `parseWeeklyBought()` DEAD CODE

**Holat:** OCHIQ (BUG-020 bilan bir xil)

`packages/utils/src/index.ts:22-26` — Uzum API dan `actions.text` olib tashlangan.
Funksiya hech qachon ishga tushmaydi. O'chirish kerak.

---

# CASCADING BUG CHAINS (zanjirli buglar)

```
CHAIN 1: BUG-001 (Redis password) → Barcha 6 worker queue ishlamaydi
  → billing to'xtaydi → accountlar charge qilinmaydi
  → discovery to'xtaydi → yangi mahsulotlar topilmaydi
  → reanalysis to'xtaydi → snapshot'lar yangilanmaydi
  → import to'xtaydi → URL import ishlamaydi
  → sourcing to'xtaydi → tashqi narx qidirish ishlamaydi
  → competitor to'xtaydi → raqobatchi monitoring to'xtaydi

CHAIN 2: D-06 (3x fetchProductDetail) → BUG-004 (title overwrite)
  → Reanalysis raw title ishlatadi
  → Har 6 soatda localized title yo'qoladi

CHAIN 3: BUG-008 + BUG-009 + BUG-010 (take:2 root cause)
  → Cannibalization signal noaniq
  → Saturation index noaniq
  → Replenishment planner xato buyurtma miqdori

CHAIN 4: BUG-011 (Team invite) — izolyatsiya qilingan
  → Yangi foydalanuvchi kira olmaydi
  → Password reset flow yo'q
  → Feature butunlay buzilgan

CHAIN 5: BUG-005 (shop.name → shop.title)
  → Product detail da do'kon nomi doim null
  → Frontend do'kon ma'lumotini ko'rsatmaydi
```

---

# XULOSA

| # | Bug | Severity | Holat |
|---|-----|----------|-------|
| BUG-001 | Redis password dropped (worker) | CRITICAL | OCHIQ |
| BUG-004 | Reanalysis title overwrite | HIGH | OCHIQ |
| BUG-005 | shop.name → shop.title | HIGH | OCHIQ |
| BUG-008 | Signal cannibalization take:2 | MEDIUM | OCHIQ |
| BUG-009 | Signal saturation take:2 | MEDIUM | OCHIQ |
| BUG-010 | Signal replenishment take:2 | HIGH | OCHIQ |
| BUG-011 | Team invite unusable password | HIGH | OCHIQ |
| BUG-014 | Desktop app API ishlamaydi | MEDIUM | OCHIQ |
| BUG-017 | Profit calc customs/QQS yo'q | MEDIUM | OCHIQ |
| BUG-023 | Rate limit per-IP only | LOW | OCHIQ |
| BUG-025 | Ba'zi endpoint DTO'siz | LOW | OCHIQ |
| D-01 | weekly_bought noaniq (API bermaydi) | CRITICAL | OCHIQ |
| D-02 | availableAmount = limit, stok emas | CRITICAL | OCHIQ |
| D-03 | totalAvailableAmount DB da yo'q | HIGH | OCHIQ |
| D-06 | 3x fetchProductDetail DRY | MEDIUM | OCHIQ |
| D-07 | parseWeeklyBought dead code | LOW | OCHIQ |

**Jami ochiq buglar: 16**
- CRITICAL: 3 (BUG-001, D-01, D-02)
- HIGH: 5 (BUG-004, BUG-005, BUG-010, BUG-011, D-03)
- MEDIUM: 5 (BUG-008, BUG-009, BUG-014, BUG-017, D-06)
- LOW: 3 (BUG-023, BUG-025, D-07)

**Production deploy uchun minimum fix: BUG-001 + BUG-004 + BUG-005 (3 ta bug, ~30 minut ish)**

---

*bugs.md | VENTRA Analytics Platform | Deep Audit | 2026-02-27*
