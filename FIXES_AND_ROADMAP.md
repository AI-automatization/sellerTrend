# 🛠️ BUG FIXES & FEATURE ROADMAP

> Versiya: 1.0 | Sana: 2026-02-23

---

## QISM 1 — ANIQLANGAN BUGLAR VA TUZATISHLAR

---

### 🔴 BUG 1 — `stockType` noto'g'ri hisoblanadi

**Joylashuv:** `apps/api/src/uzum/uzum.service.ts`

**Muammo:**
```ts
// NOTO'G'RI — stok bor/yo'qligiga qarab FBO/FBS belgilanmoqda
const stockType = sku.availableAmount > 0 ? 'FBO' : 'FBS';
```

FBO (Fulfilled by Uzum) va FBS (Fulfilled by Seller) — bu fulfillment metodi, mavjud miqdor emas.
REST API `sku.stockType` ni to'g'ridan-to'g'ri qaytaradi. Bu xato `supply_pressure` scoring qiymatini buzadi va natijada mahsulot reytingi noto'g'ri hisoblanadi.

**To'g'ri kod:**
```ts
const stockType = (sku.stockType as 'FBO' | 'FBS') ?? 'FBS';
```

**Ta'sir:** Score hisob-kitobi ±0.1 ball xato beradi → leaderboard tartibi noto'g'ri.

---

### 🔴 BUG 2 — `apps/bot` Dockerfile mavjud emas

**Joylashuv:** `docker-compose.prod.yml`

**Muammo:**
```yaml
bot:
  build:
    context: .
    dockerfile: apps/bot/Dockerfile  # ← bu directory yo'q!
```

`apps/bot/` papkasi va `Dockerfile` yaratilmagan. Production `docker-compose up` da **build crash** qiladi.

**Yechim — 2 ta variant:**

A) `apps/bot` ni yaratish:
```
apps/bot/
  src/
    main.ts
    handlers/
  package.json
  tsconfig.json
  Dockerfile
```

B) Hozircha `docker-compose.prod.yml`'dan bot service ni olib tashlash:
```yaml
# bot: service blokini completely comment qiling
# yoki alohida docker-compose.bot.yml ga ko'chiring
```

**Ta'sir:** Production deploy qilishda to'liq stop.

---

### 🔴 BUG 3 — `UserRole` enum mismatch

**Joylashuv:** `packages/types/src/index.ts` vs `apps/api/prisma/schema.prisma`

**Muammo:**
```ts
// packages/types/src/index.ts — 3 ta role
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

// prisma/schema.prisma — 4 ta role (MODERATOR qo'shimcha)
enum UserRole {
  SUPER_ADMIN
  ADMIN
  MODERATOR  // ← shared types'da YO'Q!
  USER
}
```

`MODERATOR` rolida foydalanuvchi yaratilsa, shared types uni inkor qiladi va TypeScript type guard'lar ishlashni to'xtatadi.

**To'g'ri kod (`packages/types/src/index.ts`):**
```ts
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';
```

**Ta'sir:** `MODERATOR` uchun authorization guard'lar ishlaydi lekin type xatosi berib turadi; future refactor'da runtime xato yuz berishi mumkin.

---

### 🟡 BUG 4 — Proxy ishlatilmayapti (IP ban xavfi)

**Joylashuv:** `apps/api/src/uzum/uzum.client.ts`, `apps/worker/src/processors/uzum-scraper.ts`

**Muammo:**
```ts
// Hozir — oddiy fetch, proxy yo'q:
const response = await fetch(url, { headers: HEADERS });
```

`.env.example`'da `PROXY_URL` bor, lekin u hech qaerda ishlatilmaydi. Uzum production'da IP ban qilishi mumkin, ayniqsa discovery (100 req/run) va snapshot job'larida.

**Yechim:**
```ts
// npm install node-fetch-with-proxy yoki undici + ProxyAgent

import { ProxyAgent } from 'undici';

const proxyAgent = process.env.PROXY_URL
  ? new ProxyAgent(process.env.PROXY_URL)
  : undefined;

const response = await fetch(url, {
  headers: HEADERS,
  dispatcher: proxyAgent,
});
```

**Playwright uchun (`uzum-scraper.ts`):**
```ts
const browser = await chromium.launch({
  proxy: process.env.PROXY_URL
    ? { server: process.env.PROXY_URL }
    : undefined,
});
```

**Ta'sir:** MVP da darhol IP ban xavfi — `PROXY_URL` set qilinguncha production'da ishlamasligi mumkin.

---

### 🟡 BUG 5 — `rOrdersAmount` discovery'da noaniq

**Joylashuv:** `apps/worker/src/processors/discovery.processor.ts` vs `apps/worker/src/processors/uzum-scraper.ts`

**Muammo:**
```ts
// discovery.processor.ts ishlatadi:
weekly_bought: p.rOrdersAmount ?? null,

// Lekin uzum-scraper.ts ProductDetail type'da bu maydon bormi?
// Interface tekshirilishi kerak!
```

Agar `ProductDetail` interface'da `rOrdersAmount` bo'lmasa, `weekly_bought` doim `null` → score formulasida 0.55 koeffitsientli qism nolga teng → barcha mahsulotlar past score oladi.

**Tekshirish va to'g'rilash (`uzum-scraper.ts`):**
```ts
export interface ProductDetail {
  id: number;
  title: string;
  rating: number;
  ordersAmount: number;
  rOrdersAmount: number | null;  // ← bu qo'shilishi KERAK
  reviewsAmount: number;
  sellPrice: number;
  stockType: 'FBO' | 'FBS';
}
```

**Ta'sir:** Discovery leaderboard'dagi barcha score'lar past, real trend mahsulotlari top'ga chiqmaydi.

---

### 🟡 BUG 6 — Discovery faqat 1 sahifa (pagination yo'q)

**Joylashuv:** `apps/worker/src/processors/uzum-scraper.ts`

**Muammo:**
```ts
// Hozir: faqat 1 sahifa (6 scroll) — ~48-96 mahsulot
const { ids } = await scrapeCategoryProductIds(url);
// Keyin faqat:
const idsToFetch = productIds.slice(0, 100);
```

Ko'p mahsulotli kategoriyalarda (elektronika, kiyim) 3000+ mahsulot bo'ladi. Faqat birinchi sahifadagi mahsulotlar olinadi → leaderboard to'liq emas.

**Yechim — ko'p sahifali scroll:**
```ts
export async function scrapeCategoryProductIds(
  categoryUrl: string,
  scrollCount = 15,  // 6 → 15 ga oshirish
  maxIds = 200,      // limit qo'shish
): Promise<{ ids: number[] }>
```

Yoki REST API orqali pagination:
```ts
// fetchCategoryListing() allaqachon bor, uni discovery'da ishlatish:
async function fetchAllCategoryIds(categoryId: number, maxProducts = 200) {
  const results = [];
  let page = 0;
  while (results.length < maxProducts) {
    const { items, total } = await uzumClient.fetchCategoryListing(categoryId, page);
    results.push(...items.map(i => i.id));
    if (results.length >= total || items.length === 0) break;
    page++;
    await sleep(500);
  }
  return results.slice(0, maxProducts);
}
```

---

### 🟢 BUG 7 — `docker-compose.prod.yml` nginx config yo'q

**Joylashuv:** `apps/web/Dockerfile` (mavjud emas)

**Muammo:** Web container 80/443 portida ishlaydi lekin `apps/web/Dockerfile` ko'rinmaydi. React build nginx orqali serve qilinmasa blank page chiqadi.

**Yechim — `apps/web/Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`apps/web/nginx.conf`:**
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://api:3000/;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## QISM 2 — YANGI FEATURE: XITOY/EUROPA MANBALARIDAN TAQQOSLAMA QIDIRUV

---

### 📋 Feature Overview

**Maqsad:** Kuzatilayotgan Uzum mahsulotini Xitoy va Yevropa platformalarida avtomat qidirib topish, narxlarni solishtirish va eng optimal import varianti (margin, vaqt, narx hisobida) ni AI orqali tavsiya qilish.

**Foydalanuvchi stsenariysi:**
1. Foydalanuvchi Uzum mahsulotini kuzatuvga oladi (masalan: "Samsung Galaxy Buds2 Pro")
2. "Import search" tugmasini bosadi
3. Sistema Alibaba, Taobao, 1688.com, AliExpress, Amazon.de'dan mahsulotlarni qidiradi
4. Claude AI natijalarni tahlil qiladi va optimal variantni tavsiya qiladi
5. Narx, yetkazib berish muddati, foydali margin hisob-kitob qilinadi

---

### 🗄️ Database Schema (yangi jadvallar)

```prisma
// ============================================================
// EXTERNAL MARKETPLACE SOURCING
// ============================================================

model ExternalPlatform {
  id          String   @id @default(uuid())
  code        String   @unique @db.VarChar(50)  // "alibaba", "taobao", "1688", "aliexpress", "amazon_de"
  name        String   @db.VarChar(100)
  country     String   @db.VarChar(10)           // "CN", "DE", "UK"
  base_url    String   @db.VarChar(255)
  is_active   Boolean  @default(true)
  api_type    String   @db.VarChar(30)           // "serpapi", "rainforest", "direct", "scraper"
  created_at  DateTime @default(now()) @db.Timestamptz

  search_results ExternalSearchResult[]

  @@map("external_platforms")
}

model ExternalSearchJob {
  id              String   @id @default(uuid())
  account_id      String
  product_id      BigInt
  query           String   @db.Text         // AI-generated search query
  status          ExternalSearchStatus @default(PENDING)
  platforms       String[]                   // ["alibaba","taobao","1688","aliexpress"]
  created_at      DateTime @default(now()) @db.Timestamptz
  finished_at     DateTime? @db.Timestamptz

  account  Account                @relation(fields: [account_id], references: [id])
  product  Product                @relation(fields: [product_id], references: [id])
  results  ExternalSearchResult[]
  cargo_calculations CargoCalculation[]

  @@map("external_search_jobs")
}

enum ExternalSearchStatus {
  PENDING
  RUNNING
  DONE
  FAILED
}

model ExternalSearchResult {
  id              String   @id @default(uuid())
  job_id          String
  platform_id     String
  external_id     String?  @db.VarChar(255)  // platform-specific product ID
  title           String   @db.Text
  price_usd       Decimal  @db.Decimal(12, 2)
  price_local     Decimal? @db.Decimal(12, 2) // CNY yoki EUR
  currency        String   @db.VarChar(5)
  url             String   @db.Text
  image_url       String?  @db.Text
  seller_name     String?  @db.VarChar(255)
  seller_rating   Decimal? @db.Decimal(3, 2)
  min_order_qty   Int?     @default(1)
  shipping_days   Int?                        // estimated days to UZ
  ai_match_score  Decimal? @db.Decimal(4, 3) // 0.0-1.0, Claude beradi
  ai_notes        String?  @db.Text          // Claude izohi
  rank            Int?                        // final sorted rank
  created_at      DateTime @default(now()) @db.Timestamptz

  job      ExternalSearchJob @relation(fields: [job_id], references: [id])
  platform ExternalPlatform  @relation(fields: [platform_id], references: [id])

  @@map("external_search_results")
}

model CargoCalculation {
  id              String   @id @default(uuid())
  job_id          String
  result_id       String
  route           String   @db.VarChar(100)  // "CN→UZ_road", "CN→UZ_air", "DE→UZ_auto"
  weight_kg       Decimal  @db.Decimal(8, 3)
  cargo_cost_usd  Decimal  @db.Decimal(10, 2)
  customs_usd     Decimal  @db.Decimal(10, 2)
  vat_usd         Decimal  @db.Decimal(10, 2)
  landed_cost_usd Decimal  @db.Decimal(10, 2)
  uzum_price_uzs  BigInt                     // kuzatilayotgan narx
  margin_percent  Decimal  @db.Decimal(6, 2)
  roi_percent     Decimal  @db.Decimal(6, 2)
  delivery_days   Int
  created_at      DateTime @default(now()) @db.Timestamptz

  job    ExternalSearchJob    @relation(fields: [job_id], references: [id])
  result ExternalSearchResult @relation(fields: [result_id], references: [id])

  @@map("cargo_calculations")
}

model CurrencyRate {
  id         String   @id @default(uuid())
  from_code  String   @db.VarChar(5)  // "USD", "CNY", "EUR"
  to_code    String   @db.VarChar(5)  // "UZS"
  rate       Decimal  @db.Decimal(15, 4)
  source     String   @db.VarChar(50) // "cbu.uz"
  fetched_at DateTime @default(now()) @db.Timestamptz

  @@unique([from_code, to_code])
  @@map("currency_rates")
}
```

---

### 🔌 Qo'llaniladigan API'lar

#### Xitoy Platformalari

| Platform | API Yechim | Narx | Izoh |
|----------|-----------|------|------|
| **1688.com** | SerpAPI (`engine=1688`) | $50/mo | Eng to'g'ri — ulgurji narxlar |
| **Alibaba** | Alibaba Product API (rasmiy) yoki SerpAPI | $50/mo | B2B, MOQ bor |
| **Taobao** | SerpAPI (`engine=taobao`) | $50/mo | B2C, kichik buyurtmalar |
| **AliExpress** | AliExpress Affiliate API (rasmiy, bepul) | Bepul | REST API mavjud |
| **DHgate** | SerpAPI yoki scraper | - | Zaxira variant |

#### Yevropa/Xalqaro

| Platform | API Yechim | Narx | Izoh |
|----------|-----------|------|------|
| **Amazon.de** | Rainforest API yoki SerpAPI | $50/mo | Yevropa ulgurji |
| **Amazon.co.uk** | Rainforest API | $50/mo | GBP narxlar |
| **Wildberries.ru** | Norasmiy REST (open endpoints) | Bepul | RUB → USD konvert |
| **Ozon.ru** | Ozon Seller API (agar seller bo'lsa) | - | Taqqoslash uchun |

**Tavsiya: SerpAPI** — bitta API key bilan 1688, Taobao, Google Shopping ni qoplaydi. AliExpress uchun rasmiy Affiliate API qo'shimcha.

---

### ⚙️ Backend Arxitektura

#### `apps/api/src/sourcing/` moduli

```
sourcing/
  sourcing.module.ts
  sourcing.controller.ts   — POST /sourcing/search, GET /sourcing/jobs/:id
  sourcing.service.ts      — orchestrator
  platforms/
    serpapi.client.ts      — 1688, Taobao, Google Shopping
    aliexpress.client.ts   — AliExpress Affiliate API
    rainforest.client.ts   — Amazon EU
    wildberries.client.ts  — WB norasmiy REST
  cargo.service.ts         — landed cost hisob-kitobi
  currency.service.ts      — CBU kurslari (cron: har 6 soat)
```

#### `apps/worker/src/processors/sourcing.processor.ts`

```typescript
async function processSourcingJob(data: SourcingJobData) {
  const { productId, jobId, accountId } = data;

  // Step 1: Mahsulot ma'lumotlarini olish
  const product = await prisma.product.findUnique({ where: { id: BigInt(productId) } });

  // Step 2: Claude AI orqali qidiruv so'rovini yaratish
  const searchQuery = await generateSearchQuery(product.title);
  // Output: { cn_query: "Samsung TWS earbuds Galaxy Buds2 Pro", en_query: "Samsung Galaxy Buds2 Pro" }

  // Step 3: Parallel API chaqiruvlar
  const [serpResults, aliexpressResults, amazonResults] = await Promise.allSettled([
    serpApiClient.search1688(searchQuery.cn_query),
    serpApiClient.searchTaobao(searchQuery.cn_query),
    aliexpressClient.searchProducts(searchQuery.en_query),
    rainforestClient.searchAmazonDE(searchQuery.en_query),
  ]);

  // Step 4: Natijalarni DB'ga saqlash
  const allResults = [...serpResults, ...aliexpressResults, ...amazonResults];
  await saveExternalResults(jobId, allResults);

  // Step 5: Claude AI — match scoring va filtrlash
  const scoredResults = await aiScoringAndRanking(product, allResults);

  // Step 6: Har bir top-10 natija uchun cargo hisob-kitobi
  const uzumPrice = await getCurrentUzumPrice(productId);
  for (const result of scoredResults.slice(0, 10)) {
    await calculateCargoOptions(jobId, result, uzumPrice);
  }

  // Step 7: Final ranking — ROI bo'yicha sort
  await finalRankByROI(jobId);
}
```

#### Claude AI orqali qidiruv so'rovi yaratish

```typescript
// apps/api/src/ai/sourcing-ai.service.ts

async generateSearchQuery(productTitle: string): Promise<{
  cn_query: string;
  en_query: string;
  keywords: string[];
}> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Mahsulot nomi: "${productTitle}"
      
Quyidagi JSON formatida qidiruv so'rovlari yarat (boshqa hech narsa yozmang):
{
  "cn_query": "Xitoy marketplace uchun inglizcha yoki xitoycha qidiruv (qisqa, aniq)",
  "en_query": "Amazon/Yevropa uchun inglizcha qidiruv",
  "keywords": ["asosiy", "kalit", "so'zlar"]
}`,
    }],
  });
  // parse va return
}
```

#### Claude AI orqali match scoring va filtrlash

```typescript
async aiScoringAndRanking(
  uzumProduct: Product,
  externalResults: ExternalSearchResult[],
): Promise<ScoredResult[]> {

  // Batch: 20 ta natija birga yuboriladi (token tejash)
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',  // Sonnet — aniqroq matching kerak
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Uzum mahsuloti: "${uzumProduct.title}"
      
Quyidagi tashqi platformalardan topilgan mahsulotlar ro'yxatini tahlil qil.
Har birga 0.0-1.0 oralig'ida match_score ber.
Bir xil mahsulotga 0.8+, o'xshashiga 0.5-0.8, boshqasiga 0.5 dan past.

Mahsulotlar:
${externalResults.map((r, i) => `${i}. [${r.platform}] ${r.title} — $${r.price_usd}`).join('\n')}

JSON qaytار (faqat):
[{"index": 0, "match_score": 0.95, "note": "Xuddi shu model"}, ...]`,
    }],
  });

  // parse, filter (match_score >= 0.5), va DB'ga yozish
}
```

---

### 📦 Cargo Hisob-kitobi

```typescript
// apps/api/src/sourcing/cargo.service.ts

const CARGO_ROUTES = {
  'CN→UZ_road': { cost_per_kg: 5.5, days: 18, min_days: 15 },
  'CN→UZ_rail': { cost_per_kg: 3.8, days: 15, min_days: 12 },
  'CN→UZ_air':  { cost_per_kg: 6.5, days: 5,  min_days: 3  },
  'DE→UZ_road': { cost_per_kg: 3.5, days: 14, min_days: 10 },
  'DE→UZ_air':  { cost_per_kg: 8.0, days: 3,  min_days: 2  },
  'TR→UZ_road': { cost_per_kg: 4.0, days: 10, min_days: 7  },  // Turkiya orqali
};

function calculateLandedCost(params: {
  productPriceUSD: number;
  quantity: number;
  weightKg: number;
  route: keyof typeof CARGO_ROUTES;
  customsRate: number;  // 0.10 - 0.20
  vatRate: number;      // 0.12
}): LandedCostResult {
  const cargo = CARGO_ROUTES[params.route];
  const totalProductCost = params.productPriceUSD * params.quantity;
  const cargoCost = cargo.cost_per_kg * params.weightKg * params.quantity;
  const customs = (totalProductCost + cargoCost) * params.customsRate;
  const vat = (totalProductCost + cargoCost + customs) * params.vatRate;
  const landedCost = totalProductCost + cargoCost + customs + vat;

  return {
    landed_cost_usd: landedCost,
    per_unit_usd: landedCost / params.quantity,
    delivery_days: cargo.days,
    breakdown: { product: totalProductCost, cargo: cargoCost, customs, vat },
  };
}

function calculateMargin(landedCostUSD: number, uzumPriceUZS: bigint, usdToUzs: number) {
  const uzumPriceUSD = Number(uzumPriceUZS) / usdToUzs;
  const margin = ((uzumPriceUSD - landedCostUSD) / uzumPriceUSD) * 100;
  const roi = ((uzumPriceUSD - landedCostUSD) / landedCostUSD) * 100;
  return { margin_percent: margin, roi_percent: roi };
}
```

---

### 📊 Final Sorting Algoritmi

Natijalar quyidagi formula bo'yicha sortlanadi:

```
final_score = (
  0.40 × normalized(roi_percent)        // ROI eng muhim
  0.25 × ai_match_score                 // Mahsulot to'g'riligini Claude tasdiqlagan
  0.20 × normalized(1 / delivery_days)  // Tezroq = yaxshiroq
  0.15 × normalized(seller_rating)      // Sotuvchi ishonchliligi
)
```

Qo'shimcha filtrlar:
- `ai_match_score < 0.5` → avtomatik chiqarib tashlash
- `roi_percent < 10%` → "past margin" belgisi bilan ko'rsatish
- `margin_percent < 0` → qizil rang, tavsiya qilinmaydi

---

### 🖥️ Frontend — `apps/web/src/pages/SourcingPage.tsx`

**Komponentlar:**

```
SourcingPage
├── ProductHeader (kuzatilayotgan Uzum mahsuloti)
├── SearchTriggerButton ("Import qidiruvni boshlash")
├── PlatformFilterBar (Alibaba | Taobao | 1688 | AliExpress | Amazon)
├── SourcingResultsTable
│   ├── ResultCard (har bir mahsulot)
│   │   ├── Platform badge (🇨🇳 / 🇩🇪)
│   │   ├── Mahsulot nomi + rasm
│   │   ├── Narx (CNY/EUR/USD)
│   │   ├── AI Match Score (0.0-1.0, rang bilan)
│   │   ├── Landed Cost (kargo + bojxona + QQS)
│   │   ├── Margin % + ROI %
│   │   ├── Yetkazib berish muddati
│   │   └── Sotib olish havolasi
│   └── ROI bo'yicha sort (yuqoridan pastga)
└── CargoRouteSelector (yo'l | temir yo'l | avia)
```

---

### 🔄 Worker Job: `apps/worker/src/jobs/sourcing.job.ts`

```typescript
export const sourcingQueue = new Queue('sourcing-queue', redisConnection);

export async function enqueueSourcingSearch(data: {
  productId: number;
  jobId: string;
  accountId: string;
  platforms: string[];
}) {
  return sourcingQueue.add('external-search', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}
```

---

### 💰 API Xarajatlar Tahlili

| Xizmat | Narx | Limitlar | Eslatma |
|--------|------|----------|---------|
| SerpAPI | $50/mo | 5,000 search/mo | 1688 + Taobao + Google Shopping |
| AliExpress Affiliate API | Bepul | 1,000 req/day | Rasmiy API |
| Rainforest API | $50/mo | 10,000 req/mo | Amazon EU |
| Wildberries REST | Bepul | Rate limit | Norasmiy, beqaror |
| Claude (Haiku) | ~$0.001/call | - | Query generation |
| Claude (Sonnet) | ~$0.003/call | - | AI matching (20 result/call) |
| CBU Currency API | Bepul | - | `cbu.uz` rasmiy |

**Oylik xarajat (100 search/kun):** ~$120-130

---

### 📋 Implementatsiya Ketma-ketligi

```
1. [ ] CurrencyRate modeli + CBU cron (sodda, tez)
2. [ ] ExternalPlatform seed data (5 platform yozing)
3. [ ] SerpAPI client — 1688 + Taobao (eng muhim Xitoy)
4. [ ] AliExpress Affiliate API client
5. [ ] CargoCalculation service
6. [ ] Claude AI query generation (Haiku, kesh bilan)
7. [ ] Claude AI match scoring (Sonnet, batch 20)
8. [ ] BullMQ sourcing-queue + processor
9. [ ] NestJS SourcingModule + controller
10. [ ] React SourcingPage + ResultCard UI
11. [ ] Rainforest Amazon.de (keyingi sprint)
12. [ ] Wildberries client (keyingi sprint)
```

---

### ⚠️ Risklar

| Risk | Muammo | Yechim |
|------|--------|--------|
| SerpAPI Xitoy blok | 1688/Taobao bot protection kuchli | SerpAPI shu muammoni hal qiladi |
| Noto'g'ri match | Turli brend nomi, Xitoy imlo | Claude match_score filter (0.5+) |
| Narx valyuta kursi | USD/CNY/EUR o'zgarishi | CBU kursi, har 6 soatda yangilanadi |
| Yuqori Claude xarajat | Ko'p search = ko'p AI call | Haiku query gen + Sonnet faqat scoring |
| Amazon rate limit | Rainforest API limit | Queue + cache (24h) |
| Tovar GTIN/barcode yo'q | Noto'g'ri taqqoslash | Claude title-based matching fallback |

---

*Hujjat: FIXES_AND_ROADMAP.md | Loyiha: TrendShopAnalyze | 2026-02-23*
