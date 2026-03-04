# VENTRA — Database Architecture & Scraping System
# ChatGPT uchun to'liq texnik hujjat

---

## 1. LOYIHA HAQIDA

VENTRA — `uzum.uz` marketplace uchun SaaS analytics platforma.
Sotuvchilar mahsulot URLini kiritadi → tizim avtomatik scrape qiladi → trend, narx, stok tahlili ko'rsatiladi.

**Stack:**
- Backend API: NestJS + Prisma + PostgreSQL
- Queue/Worker: BullMQ + Redis
- Scraping: Playwright (DOM) + REST API (uzum.uz)

---

## 2. UZUM API — MA'LUMOT MANBALARI

### 2.1 REST API (asosiy manba)
```
GET https://api.uzum.uz/api/v2/product/{productId}

Response: { payload: { data: { ...productFields } } }
```

Bu endpoint **har doim ishlaydi** va quyidagi ma'lumotlarni beradi:
- Mahsulot nomi, reyting, sharhlar soni
- Narx (sellPrice, fullPrice)
- Stok (totalAvailableAmount)
- SKU list (variantlar)
- Kategoriya (nested parent chain)
- Foto URLlar
- Sotuvchi ma'lumotlari

### 2.2 Playwright DOM Scraper (qo'shimcha manba)
```
URL: https://uzum.uz/ru/product/-{productId}
Maqsad: "N человек купили на этой неделе" bannerini o'qish
```

Bu ma'lumot REST API da **yo'q** — faqat sahifa HTML/DOM da render bo'ladi.
Playwright Chromium brauzerini ochib, banner textni o'qiydi.

**4 ta strategiya (kaskad):**
1. SSR HTML regex: `badge_bought` JSON ichida
2. HTML regex: `/(\d+)\s*человек\s*купили/i`
3. DOM TreeWalker: "человек купили" textli node
4. Badge img parent: `img[src*="badge_bought"]` elementi

---

## 3. DATABASE MODELLARI

### 3.1 Product (asosiy jadval)
```sql
products
├── id                     BigInt PK    -- Uzum product ID (masalan: 50000)
├── title                  Text         -- Mahsulot nomi (Ruscha) [Key 1]
├── title_uz               Text?        -- Mahsulot nomi (O'zbekcha) [Key 1]
├── category_id            BigInt?      -- Leaf kategoriya ID
├── category_path          Json?        -- [{id,title}] root→leaf zanjir [Key 2]
├── badges                 Json?        -- [{type?,label?,...}] promo badge'lar [Key 3]
├── shop_id                BigInt FK    -- Sotuvchi ID
├── rating                 Decimal(3,2) -- Reyting: 0.00 – 5.00 [Key 4]
├── feedback_quantity      Int          -- Sharhlar soni [Key 5]
├── orders_quantity        BigInt       -- JAMI buyurtmalar (kumulyativ, haftalik EMAS!)
├── total_available_amount BigInt?      -- Haqiqiy ombor stoki [Key 12]
├── photo_url              Text?        -- Asosiy rasm URL [Key 13]
├── photo_urls             String[]     -- Barcha rasmlar URL massivi [Key 14]
└── is_active              Boolean
```

**Eslatma:** `orders_quantity` — bu JAMI buyurtmalar sonining snapshot da qiymati.
Haftalik sotuvni hisoblash uchun 2 ta snapshot farqi olinadi (delta).

### 3.2 Sku (variantlar)
```sql
skus
├── id              BigInt PK    -- Uzum SKU ID
├── product_id      BigInt FK → products
├── min_sell_price  BigInt       -- Hozirgi narx (so'mda)
├── min_full_price  BigInt       -- Eski narx (chegirmadan oldin)
├── stock_type      VarChar(10)  -- 'FBO' yoki 'FBS'
└── is_available    Boolean      -- availableAmount > 0
```

**SKU nima?** Bir mahsulotning turli rangi/o'lchami. Masalan: qizil/40 razmer.
Ko'pchilik mahsulotlarda 1 ta SKU bo'ladi.

### 3.3 ProductSnapshot (vaqt seriyasi — eng muhim jadval)
```sql
product_snapshots
├── id                   UUID PK
├── product_id           BigInt FK → products
├── orders_quantity      BigInt       -- O'sha paytdagi JAMI buyurtmalar
├── weekly_bought        Int          -- Haftalik sotuv (hisoblangan yoki scraped)
├── weekly_bought_source VarChar(20)  -- 'scraped' | 'stored_scraped' | 'calculated'
├── rating               Decimal(3,2)
├── feedback_quantity    Int
├── score                Decimal(8,4) -- VENTRA scoring formula natijasi
└── snapshot_at          DateTime     -- Qachon olingan
```

**Bu jadval nima uchun?** Vaqt o'tishi bilan o'zgarishlarni kuzatish.
Masalan: 3 kun oldingi `orders_quantity` bilan hozirgiini solishtirib, haftalik o'sish hisoblanadi.

### 3.4 SkuSnapshot (narx tarixi)
```sql
sku_snapshots
├── id                  UUID PK
├── sku_id              BigInt FK → skus
├── sell_price          BigInt?      -- O'sha paytdagi narx [Key 7]
├── full_price          BigInt?      -- O'sha paytdagi eski narx [Key 6]
├── discount_percent    Int?         -- Chegirma foizi (hisoblangan)
├── discount_badge      VarChar(100)?-- Chegirma badge string: "-15%" [Key 8]
├── charge_price        BigInt?      -- Oylik muddatli to'lov (so'm) [Key 9]
├── charge_quantity     Int?         -- Asosiy variant oylari: 12 [Key 10]
├── charge_quantity_alt Int?         -- Qo'shimcha variant oylari: 24 [Key 11]
├── stock_type          VarChar(10)
└── snapshot_at         DateTime
```

### 3.5 TrackedProduct (tracking holati)
```sql
tracked_products
├── id              UUID PK
├── account_id      String FK → accounts  -- Qaysi foydalanuvchi track qilayapti
├── product_id      BigInt FK → products
├── is_active       Boolean
├── next_scrape_at  DateTime  -- Keyingi scrape vaqti (scheduler uchun)
└── last_scraped_at DateTime  -- Oxirgi muvaffaqiyatli scrape
```

### 3.6 Shop (sotuvchi)
```sql
shops
├── id              BigInt PK    -- Uzum seller ID
├── title           VarChar(500) -- Do'kon nomi
├── rating          Decimal(3,2)
└── orders_quantity BigInt       -- Do'konning jami buyurtmalari
```

---

## 4. 14 KEY → DATABASE MAPPING

Uzum API dan olinadigan 14 ta key va ular qayerga saqlanishi:

```
Key  | API field                              | DB jadval         | DB ustun
-----|----------------------------------------|-------------------|------------------
 1   | localizableTitle.ru                    | products          | title
     | localizableTitle.uz                    | products          | title_uz ✅
 2   | category.parent.parent... (ierarxiya)  | products          | category_id (leaf)
     | (to'liq zanjir [{id,title}])           | products          | category_path ✅
 3   | badges[]                               | products          | badges (Json) ✅
 4   | rating                                 | products          | rating
     |                                        | product_snapshots | rating
 5   | reviewsAmount                          | products          | feedback_quantity
     |                                        | product_snapshots | feedback_quantity
 6   | skuList[0].fullPrice                   | skus              | min_full_price
     |                                        | sku_snapshots     | full_price
 7   | skuList[0].purchasePrice               | skus              | min_sell_price
     |                                        | sku_snapshots     | sell_price
 8   | skuList[0].discountBadge               | sku_snapshots     | discount_badge ✅
 9   | productOptionDtos[0].paymentPerMonth   | sku_snapshots     | charge_price ✅
10   | productOptionDtos[0].period            | sku_snapshots     | charge_quantity ✅
11   | productOptionDtos[1].period            | sku_snapshots     | charge_quantity_alt ✅
12   | totalAvailableAmount                   | products          | total_available_amount
13   | photos[0].photo["720"].high            | products          | photo_url
14   | photos[].photo["720"].high (array)     | products          | photo_urls (String[]) ✅
```

**Xulosa:**
- ✅ Saqlanadigan: **14 ta key hammasi** (2026-03-04 migratsiyadan keyin)
- ❌ Saqlanmaydi: 0

---

## 5. SCRAPING ALGORITMLARI

### 5.1 Import (foydalanuvchi URL kiritganda)

```
Trigger: User → POST /api/v1/import → BullMQ "import-batch" queue

Algorithm:
1. URL → productId parse (masalan: uzum.uz/ru/product/...-50000 → 50000)
2. REST API: GET /api/v2/product/50000
3. Shop upsert (sotuvchi ma'lumoti)
4. Product upsert (title, rating, orders, stock, category_id)
5. Oxirgi 20 ta snapshot o'qiladi
6. weekly_bought hisoblanadi:
   a. Agar oldin 'scraped' snapshot bo'lsa → 'stored_scraped' (eski scraped qiymat ishlatiladi)
   b. Agar yo'q → calcWeeklyBought() [delta formula]
7. Score hisoblanadi (calculateScore formula)
8. ProductSnapshot YARATILADI
9. TrackedProduct YARATILADI (account bilan bog'lanadi)
10. BullMQ: immediate Playwright scrape trigger (fire-and-forget)
    → "weekly-scrape-queue" ga 'single' mode job qo'shiladi
```

### 5.2 Weekly Scrape (avtomatik, har 15 daqiqada)

```
Trigger: Cron "*/15 * * * *" → BullMQ "weekly-scrape-queue"

Mode A — BATCH (cron):
  1. TrackedProduct dan next_scrape_at <= NOW() bo'lgan max 50 ta topiladi
  2. Har bir product uchun scrapeAndSaveProduct() chaqiriladi
  3. Har product orasida 3-5 sekund random kutiladi (anti-detection)

Mode B — SINGLE (import/analyze dan trigger bo'lganda):
  1. Bitta productId uchun scrapeAndSaveProduct() chaqiriladi

scrapeAndSaveProduct() algoritmi:
  ┌─────────────────────────────────────────────────────┐
  │ 1. Playwright → scrapeWeeklyBought(productId)       │
  │    - Brauzer ochadi: uzum.uz/ru/product/-{id}       │
  │    - 4 ta strategiya bilan banner text qidiriladi   │
  │    - Natija: number | null                          │
  │                                                     │
  │ 2. REST API → fetchUzumProductRaw(productId)        │
  │    - orders, rating, reviews, price, stock, skus    │
  │                                                     │
  │ 3. weekly_bought manbasini aniqlash:                │
  │    if scrapedWb !== null  → source = 'scraped'      │
  │    else if lastScraped    → source = 'stored_scraped'│
  │    else                   → source = 'calculated'   │
  │                                                     │
  │ 4. Dedup guard:                                     │
  │    if lastSnapshot < 5 daqiqa oldin → SKIP          │
  │    (faqat wb update qilinadi, yangi snapshot yo'q)  │
  │                                                     │
  │ 5. Score hisoblash:                                 │
  │    calculateScore({weekly_bought, orders, rating,   │
  │                    supply_pressure})                │
  │                                                     │
  │ 6. Prisma $transaction (atomik):                    │
  │    ├── Product UPDATE (title, title_uz,             │
  │    │   category_path, badges, photo_url,            │
  │    │   photo_urls, rating, orders, stock)           │
  │    ├── Sku UPSERT (sell_price, full_price, type)    │
  │    ├── SkuSnapshot CREATE (discount_badge,          │
  │    │   charge_price, charge_quantity, charge_alt)   │
  │    ├── ProductSnapshot CREATE                       │
  │    └── TrackedProduct UPDATE (next_scrape_at)       │
  └─────────────────────────────────────────────────────┘
```

### 5.3 Discovery (kategoriya skanerlash)

```
Trigger: User → POST /api/v1/discovery/run → BullMQ "discovery-queue"

Algorithm:
1. Playwright → scrapeCategoryProductIds(categoryUrl)
   - Kategoriya sahifasi ochiladi
   - 15 marta scroll qilinadi (lazy load)
   - [data-test-id="product-card--default"] selektori bilan product IDlar olinadi
   - Max 200 ta ID

2. batchFetchDetails(ids, batchSize=5)
   - Parallel 5 ta, keyin 500ms pauza
   - REST API: har ID uchun fetchProductDetail()

3. AI Filter (filterByCategory)
   - Claude Haiku: cross-category noise tozalanadi

4. Score hisoblash (ordersAmount asosida, weekly_bought = null)
   - Hali snapshot tarixi yo'q → delta hisoblab bo'lmaydi

5. Top 20 tanlash, ProductWinner DB ga saqlanadi

6. CategoryRun status: PENDING → RUNNING → DONE/FAILED
```

---

## 6. WEEKLY_BOUGHT HISOBLASH FORMULASI

```
weekly_bought = ordersAmount DELTA

Misol:
  Snapshot 1 (Dushanba): ordersAmount = 1000
  Snapshot 2 (Juma):     ordersAmount = 1035
  Farq: 35, vaqt: 4 kun

  weekly_bought = 35 * (7 / 4) = 61.25 ≈ 61 ta/hafta

Muhim:
  - ordersAmount = KUMULYATIV (oshib boradi, hech qachon kamaymaydi)
  - rOrdersAmount = ROUNDED total (haftalik EMAS!) → ISHLATMA
  - availableAmount = per-order limit (5 ta) → real stok EMAS
  - totalAvailableAmount = haqiqiy ombor stoki (masalan: 2659)
```

---

## 7. SCORING FORMULA

```typescript
// packages/utils/src/index.ts

function calculateScore({ weekly_bought, orders_quantity, rating, supply_pressure }):

score = (
  weekly_bought_normalized * 0.4  +   // Haftalik sotuv (eng muhim)
  orders_normalized        * 0.3  +   // Jami sotuv tarixi
  rating_normalized        * 0.2  +   // Reyting
  supply_pressure          * 0.1      // FBO=1.0 (Uzum omborida), FBS=0.7 (sotuvchida)
)

Supply pressure:
  FBO = 1.0 → Uzum o'zi yetkazadi → ishonchli
  FBS = 0.7 → Sotuvchi yetkazadi → biroz past

Score range: 0.0 – 10.0
```

---

## 8. SNAPSHOT YARATILISH VAQTLARI

```
Qachon yangi ProductSnapshot yaratiladi:

1. Import vaqtida         — user URL kiritganda (1 marta)
2. Immediate scrape       — importdan 1-2 daqiqa keyin (Playwright bilan)
3. Weekly batch           — har 15 daqiqada (next_scrape_at <= NOW())
4. Manual analyze         — user "Qayta tahlil" bosganda

Qachon YARATILMAYDI (dedup):
  - Oxirgi snapshot < 5 daqiqa oldin bo'lsa → skip
  - Faqat weekly_bought yangilanishi mumkin (update)

next_scrape_at hisoblash:
  - Muvaffaqiyatli: +24 soat + random(0-30 daqiqa) jitter
  - Xato: +6 soat (erta retry)
```

---

## 9. PRODUCT LIFECYCLE (to'liq oqim)

```
USER: "https://uzum.uz/ru/product/sabun-123456" kiritadi
           │
           ▼
    [import-batch queue]
           │
    ┌──────────────────────────────────────┐
    │ 1. REST API → productId=123456       │
    │ 2. Shop upsert                       │
    │ 3. Product upsert                    │   DB: products table
    │ 4. Snapshot #1 yaratiladi            │   DB: product_snapshots
    │ 5. TrackedProduct yaratiladi         │   DB: tracked_products
    │ 6. → Playwright scrape trigger       │
    └──────────────────────────────────────┘
           │
           ▼ (5 daqiqa ichida)
    [weekly-scrape-queue, SINGLE mode]
           │
    ┌──────────────────────────────────────┐
    │ 1. Playwright → weekly_bought banner │
    │ 2. REST API → fresh data             │
    │ 3. Snapshot #1 UPDATE (wb scraped)   │   DB: product_snapshots (update)
    │    yoki Snapshot #2 yaratiladi       │   DB: product_snapshots (create)
    │ 4. Sku upsert                        │   DB: skus
    │ 5. next_scrape_at = +24h             │   DB: tracked_products
    └──────────────────────────────────────┘
           │
           ▼ (keyingi kun)
    [weekly-scrape-queue, BATCH mode, har 15 daqiqa]
           │
    ┌──────────────────────────────────────┐
    │ next_scrape_at <= NOW() bo'lganlar   │
    │ → Har biri uchun scrapeAndSave()     │
    │ → Yangi snapshot har kuni            │
    │ → Delta = weekly_bought              │
    └──────────────────────────────────────┘

Natija DB da (3 kundan keyin):
  product_snapshots:
    ├── snapshot #1: orders=1000, wb=null, score=5.2
    ├── snapshot #2: orders=1000, wb=45,   score=6.1 (scraped)
    ├── snapshot #3: orders=1015, wb=45,   score=6.3 (stored_scraped)
    └── snapshot #4: orders=1035, wb=52,   score=6.8 (calculated delta)
```

---

## 10. WORKER ARXITEKTURASI

```
BullMQ Workers (6 ta):

1. billing-queue      — Kunlik hisob (00:00 UTC)
2. discovery-queue    — Kategoriya skanerlash (user trigger)
3. sourcing-queue     — Tashqi platforma qidiruv (1688, AliExpress)
4. competitor-queue   — Raqib mahsulotlar tracking
5. import-batch       — Mahsulot URL import (user trigger)
6. weekly-scrape-queue— Asosiy scraping loop (*/15 * * * *)

Concurrency:
  - weekly-scrape: 1 (Playwright bitta Chromium)
  - discovery:     1 (Playwright)
  - import-batch:  1 (ketma-ket)
  - billing:       1

Redis: Job queue + lock storage
```

---

## 11. MIGRATSIYA TARIXI

```
2026-03-04 — add-missing-scrape-fields (prisma db push)

Qo'shilgan fieldlar:
  products:
    + title_uz          Text?        — O'zbekcha nom [Key 1]
    + category_path     Json?        — [{id,title}] root→leaf [Key 2]
    + badges            Json?        — badge massivi [Key 3]
    + photo_urls        String[]     — barcha foto URLlar [Key 14]

  sku_snapshots:
    + discount_badge      VarChar(100)? — "-15%" [Key 8]
    + charge_price        BigInt?       — oylik to'lov [Key 9]
    + charge_quantity     Int?          — asosiy oylar [Key 10]
    + charge_quantity_alt Int?          — qo'shimcha oylar [Key 11]

Natija: 14 ta key hammasi DBga saqlanadi.
```

---

## 12. MUHIM ESLATMALAR

```
❌ NOTO'G'RI tushunish:
  - rOrdersAmount = haftalik sotuv            → NOTO'G'RI (bu ROUNDED total)
  - availableAmount = real stok               → NOTO'G'RI (bu per-order limit)
  - orders_quantity kamayishi mumkin          → NOTO'G'RI (kumulyativ, faqat oshadi)
  - badges[] har doim to'liq                  → NOTO'G'RI (ko'pincha bo'sh array)

✅ TO'G'RI:
  - rOrdersAmount = rounded TOTAL orders      → display uchun, hisoblashda ISHLATMA
  - availableAmount = bitta orderda max 5 ta  → real stok emas
  - totalAvailableAmount = haqiqiy stok       → bu ishlatiladi
  - weekly_bought = snapshot delta * 7/days   → haftalik hisob
  - chargePrice = productOptionDtos[0].paymentPerMonth → REST API da bu joyda
```

---

*ARCHITECTURE-SCRAPING.md | VENTRA | 2026-03-04 (migration: add-missing-scrape-fields)*
