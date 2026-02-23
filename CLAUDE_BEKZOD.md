# CLAUDE_BEKZOD.md — BEKZOD UCHUN
# NestJS · Prisma · BullMQ · PostgreSQL · Redis · Claude API · Telegram
# Claude CLI bu faylni Bekzod ekanligi aniqlanganidan keyin o'qiydi

---

## 👋 SALOM BEKZOD!

Sen bu loyihada **Backend Engineer** sifatida ishlaysan.
Sening zonang: `apps/api/` · `apps/worker/` · `apps/bot/` · `docker-compose.yml`

Frontend (`apps/web/`) — Sardorniki. U yerga teginma.

---

## 🏗️ CLEAN CODE STANDARTLARI (MAJBURIY)

### 1. NestJS Arxitektura Qoidalari

```typescript
// ✅ TO'G'RI — har bir modul o'z papkasida
apps/api/src/
  sourcing/
    sourcing.module.ts        // imports, providers, exports
    sourcing.controller.ts    // HTTP layer FAQAT — biznes logika YO'Q
    sourcing.service.ts       // biznes logika — DB, queue, AI
    dto/
      create-search.dto.ts    // input validation (class-validator)
      search-result.dto.ts    // output shape
    interfaces/
      platform.interface.ts   // TypeScript interfaces
    platforms/
      serpapi.client.ts       // tashqi API clients

// ❌ NOTO'G'RI — controller ichida DB chaqiruvi
@Get(':id')
async getResult(@Param('id') id: string) {
  return this.prisma.externalSearchJob.findUnique({ where: { id } }); // ← NO!
}

// ✅ TO'G'RI — service orqali
@Get(':id')
async getResult(@Param('id') id: string, @CurrentUser('account_id') accountId: string) {
  return this.sourcingService.getJobById(id, accountId); // ← YES
}
```

### 2. Har Doim Type-Safe Yoz

```typescript
// ❌ NOTO'G'RI
async function processResult(data: any) {
  return data.price * 1.2;
}

// ✅ TO'G'RI
interface CargoInput {
  readonly productPriceUSD: number;
  readonly weightKg: number;
  readonly route: CargoRoute;
  readonly customsRate: number;
  readonly vatRate: number;
}

interface LandedCostResult {
  readonly landedCostUSD: number;
  readonly perUnitUSD: number;
  readonly deliveryDays: number;
  readonly breakdown: {
    product: number;
    cargo: number;
    customs: number;
    vat: number;
  };
}

function calculateLandedCost(input: CargoInput): LandedCostResult { ... }
```

### 3. Error Handling — Har Doim Explicit

```typescript
// ❌ NOTO'G'RI
try {
  const result = await this.serpApiClient.search(query);
  return result;
} catch (e) {
  console.log(e);
}

// ✅ TO'G'RI
try {
  const result = await this.serpApiClient.search1688(query);
  return result;
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  this.logger.error(`SerpAPI 1688 search failed: ${message}`, { query });
  // Caller'ga qaytarish yoki fallback
  return [];
}
```

### 4. Logger — console.log EMAS, NestJS Logger

```typescript
// ❌ NOTO'G'RI
console.log('Job started');
console.error('Failed:', err);

// ✅ TO'G'RI
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SourcingService {
  private readonly logger = new Logger(SourcingService.name);

  async startSearch(jobId: string) {
    this.logger.log(`Starting sourcing job: ${jobId}`);
    // ...
    this.logger.warn(`Low match results for job: ${jobId}`);
    this.logger.error(`Job failed: ${jobId}`, error.stack);
  }
}
```

### 5. DTO Validation — class-validator MAJBURIY

```typescript
// dto/create-search.dto.ts
import { IsString, IsArray, IsOptional, IsIn, Length } from 'class-validator';

export class CreateSourcingSearchDto {
  @IsString()
  @Length(1, 100)
  product_id: string;

  @IsArray()
  @IsOptional()
  @IsIn(['alibaba', 'taobao', '1688', 'aliexpress', 'amazon_de'], { each: true })
  platforms?: string[];

  @IsOptional()
  weight_kg?: number;
}
```

### 6. BigInt Qoidasi — Prisma bilan

```typescript
// ❌ NOTO'G'RI — BigInt JSON serialize bo'lmaydi
return { product_id: product.id }; // BigInt → JSON error!

// ✅ TO'G'RI — toString() yoki Number()
return {
  product_id: product.id.toString(),           // ID uchun string
  orders_quantity: Number(product.orders_quantity), // count uchun number
  price: product.sell_price?.toString() ?? null,    // pul uchun string
};
```

### 7. Prisma Query — Select Faqat Keraklilarni

```typescript
// ❌ NOTO'G'RI — barcha fieldlarni olish
const products = await this.prisma.product.findMany();

// ✅ TO'G'RI — faqat keraklilarni
const products = await this.prisma.product.findMany({
  where: { is_active: true },
  select: {
    id: true,
    title: true,
    rating: true,
    orders_quantity: true,
  },
  orderBy: { orders_quantity: 'desc' },
  take: 100,
});
```

### 8. Multi-tenant — account_id HAR DOIM filter

```typescript
// ❌ NOTO'G'RI — account filter yo'q
async getJobs() {
  return this.prisma.externalSearchJob.findMany();
}

// ✅ TO'G'RI — account scoped
async getJobs(accountId: string) {
  return this.prisma.externalSearchJob.findMany({
    where: { account_id: accountId },
    orderBy: { created_at: 'desc' },
  });
}
```

### 9. BullMQ Job — Structured Data

```typescript
// ❌ NOTO'G'RI
await queue.add('job', { id: jobId, acc: accountId });

// ✅ TO'G'RI — typed interface
interface SourcingJobData {
  readonly jobId: string;
  readonly accountId: string;
  readonly productId: string;
  readonly platforms: readonly string[];
  readonly weightKg?: number;
}

await sourcingQueue.add('external-search', jobData satisfies SourcingJobData, {
  attempts: 2,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 86400 }, // 24h
  removeOnFail: { age: 604800 },    // 7 kun
});
```

### 10. Async/Await — Promise.allSettled parallel uchun

```typescript
// ❌ NOTO'G'RI — ketma-ket, sekin
const alibaba = await serpApi.searchAlibaba(query);
const taobao  = await serpApi.searchTaobao(query);
const amazon  = await rainforest.searchAmazonDE(query);

// ✅ TO'G'RI — parallel
const [alibabaResult, taobaoResult, amazonResult] = await Promise.allSettled([
  serpApi.searchAlibaba(query),
  serpApi.searchTaobao(query),
  rainforest.searchAmazonDE(query),
]);

const results = [alibabaResult, taobaoResult, amazonResult]
  .filter((r): r is PromiseFulfilledResult<SearchResult[]> => r.status === 'fulfilled')
  .flatMap(r => r.value);
```

---

## 📋 FEATURES — BACKEND TASKLAR (v1.0 → v4.0)

---

### 🔵 v1.0 FEATURES (01–10) — Backend

---

#### FEATURE 01 — Competitor Price Tracker

**Maqsad:** Bir xil yoki o'xshash mahsulotlarning narxini raqiblardan kuzatish.

**Backend Tasks:**
```
[ ] apps/api/src/competitor/
      competitor.module.ts
      competitor.service.ts
      competitor.controller.ts

[ ] GET  /api/v1/competitor/products/:productId/prices
    → Shu mahsulot bilan bir kategoriyada top-10 raqiblar narxi

[ ] POST /api/v1/competitor/track
    → { product_id, competitor_product_ids[] } → kuzatuvga olish

[ ] apps/worker/src/jobs/competitor-snapshot.job.ts
    → Har 6 soatda raqib narxlarini yangilash (cron: 0 */6 * * *)

[ ] Prisma model: competitor_price_snapshots
    id, tracked_product_id, competitor_product_id,
    sell_price, full_price, discount_percent, snapshot_at
```

**Clean Code misol:**
```typescript
// competitor.service.ts
async getCompetitorPrices(
  productId: bigint,
  accountId: string,
): Promise<CompetitorPriceDto[]> {
  // 1. O'z mahsulotimizni topish
  const product = await this.prisma.product.findUnique({
    where: { id: productId },
    select: { category_id: true, title: true },
  });
  if (!product?.category_id) return [];

  // 2. Bir kategoriyadan top-20 mahsulot (Uzum dan)
  const similar = await this.uzumClient.fetchCategoryListing(
    Number(product.category_id), 0
  );

  // 3. Narx solishtirma
  return similar
    .filter(item => item.id !== productId)
    .slice(0, 10)
    .map(item => ({
      product_id: item.id.toString(),
      title: item.title,
      sell_price: item.sellPrice,
      is_cheaper: item.sellPrice < currentPrice,
      diff_percent: ((item.sellPrice - currentPrice) / currentPrice * 100).toFixed(1),
    }));
}
```

---

#### FEATURE 02 — Seasonal Trend Calendar

**Maqsad:** Ramazon, 8-mart, Navro'z, yangi yil davrida qaysi kategoriyalar trend bo'lishini ko'rsatish.

**Backend Tasks:**
```
[ ] Prisma model: seasonal_trends
    id, category_id, season_name, season_start, season_end,
    avg_score_boost, peak_week, historical_years, created_at

[ ] GET /api/v1/discovery/seasonal-calendar
    → Yillik heatmap data: { month, week, events: [{name, boost}] }

[ ] GET /api/v1/discovery/seasonal-calendar/upcoming
    → Kelasi 30 kun ichidagi eventlar va tavsiya qilinadigan kategoriyalar

[ ] apps/worker/src/jobs/seasonal-analysis.job.ts
    → Har yil yanvarda snapshot tarixini tahlil qilib seasonal_trends yangilash
```

**Seed data yozing:**
```typescript
// prisma/seeds/seasonal.seed.ts
const UZBEK_SEASONS = [
  { name: 'Ramazon', months: [3, 4], boost: 2.1 },
  { name: '8-Mart',  months: [3],    boost: 1.8 },
  { name: "Navro'z", months: [3],    boost: 2.4 },
  { name: 'Yangi Yil', months: [12, 1], boost: 1.9 },
  { name: 'Maktab mavsumi', months: [8, 9], boost: 1.6 },
];
```

---

#### FEATURE 03 — Shop Intelligence Dashboard

**Maqsad:** Shop profili: trust score, o'sish dinamikasi, top mahsulotlar.

**Backend Tasks:**
```
[ ] GET /api/v1/shops/:shopId
    → { shop info, trust_score, top_products[5], growth_30d }

[ ] Trust Score formula (packages/utils):
    trust_score = (
      0.30 * normalize(orders_quantity) +
      0.25 * rating +
      0.20 * normalize(feedback_quantity) +
      0.15 * fbo_ratio +        // FBO mahsulotlar ulushi
      0.10 * age_months         // platformada qancha vaqt
    )

[ ] GET /api/v1/shops/:shopId/snapshots
    → Oxirgi 30 kunlik o'sish grafigi uchun data

[ ] apps/worker/src/jobs/shop-snapshot.job.ts
    → Har 12 soatda tracked shop'larni yangilash
```

---

#### FEATURE 04 — Niche Finder ⭐ (Muhim!)

**Maqsad:** Yuqori sotuv + past raqobat = bozorga kirish imkoniyati.

**Backend Tasks:**
```
[ ] GET /api/v1/discovery/niches?category_id=...
    → Niche score bo'yicha sorted mahsulot guruhlari

[ ] Niche Score formula (packages/utils/src/niche.ts):
    niche_score = (
      weekly_demand_score * 0.40 +  // weekly_bought o'rtacha
      (1 - competition_density) * 0.30 + // kategoriyada mahsulot soni
      growth_velocity * 0.20 +      // oxirgi 14 kun o'sish
      margin_potential * 0.10       // narx - taxminiy tannarx
    )
    // Threshold: niche_score > 0.65 → "Kirish imkoniyati"

[ ] GET /api/v1/discovery/niches/gaps
    → demand_supply_gaps: yuqori sotuv, past taklif
    Mantiq: weekly_bought > avg_category * 1.5 AND
             seller_count < avg_category * 0.7
```

---

#### FEATURE 05 — CSV/Excel Import & Export

**Backend Tasks:**
```
[ ] pnpm add --filter api xlsx papaparse

[ ] POST /api/v1/products/import/csv
    → multipart/form-data → URL list → batch analyze (max 100)
    → Response: { queued: number, job_id: string }

[ ] GET /api/v1/products/export/csv
    → Tracked products → CSV stream download
    Headers: Content-Disposition: attachment; filename=uzum-trends.csv

[ ] GET /api/v1/discovery/export/excel?run_id=...
    → Discovery winners → XLSX download (xlsx library)

[ ] apps/worker/src/processors/import.processor.ts
    → Batch URL analyze (5 ta parallel, rate limited)
```

---

#### FEATURE 06 — Referral Tizimi

**Backend Tasks:**
```
[ ] Prisma model: referrals
    id, referrer_account_id, referred_account_id,
    code, status (PENDING/ACTIVE/EXPIRED),
    reward_days, credited_at, created_at

[ ] POST /api/v1/referrals/generate-code
    → Unikal 8 belgili kod yaratish (nanoid)

[ ] POST /api/v1/auth/register bilan integratsiya:
    Body: { ...registerDto, referral_code?: string }
    → Referral topilsa: referred account'ga +7 kun bepul

[ ] GET /api/v1/referrals/stats
    → { my_code, total_referred, active_referrals, earned_days }

[ ] pnpm add --filter api nanoid
```

---

#### FEATURE 07 — API Access (Dev Plan)

**Backend Tasks:**
```
[ ] Prisma model: api_keys
    id, account_id, name, key_prefix (ilk 8 belgi),
    key_hash (SHA-256), last_used_at, daily_limit,
    requests_today, is_active, created_at

[ ] POST /api/v1/api-keys         → yangi kalit yaratish
    GET  /api/v1/api-keys         → kalitlar ro'yxati (prefix ko'rsatiladi)
    DELETE /api/v1/api-keys/:id   → kalit o'chirish

[ ] apps/api/src/common/guards/api-key.guard.ts
    → X-API-Key header → SHA-256 → DB tekshirish
    → daily_limit ni tekshirish → 429 Too Many Requests

[ ] Rate limit: 1000 req/day per key (default)

[ ] pnpm add --filter api @nestjs/throttler
```

**API Key yaratish:**
```typescript
// Xavfsiz kalit yaratish
import { randomBytes, createHash } from 'crypto';

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `utf_${randomBytes(32).toString('hex')}`; // utf_ prefix
  const prefix = key.slice(0, 12);
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}
// key faqat yaratishda bir marta ko'rsatiladi, DB'ga hash saqlanadi
```

---

#### FEATURE 08 — Public Leaderboard

**Backend Tasks:**
```
[ ] GET /api/v1/leaderboard/public
    → Auth shart emas!
    → Oxirgi 24 soatdagi top-5 (score bilan)
    → Qolganlar: { rank, title_masked: "Samsung Gal***", score: null }

[ ] GET /api/v1/leaderboard/public/categories
    → Kategoriya bo'yicha top-3

[ ] Cache: Redis 1 soat (har soatda yangilanadi)
    → @nestjs/cache-manager + ioredis

[ ] SEO: OpenGraph meta uchun endpoint
    GET /api/v1/leaderboard/public/og-data
```

---

#### FEATURE 09 — Profit Calculator 2.0

**Backend Tasks:**
```
[ ] packages/utils/src/profit.ts
    interface ProfitInput {
      sell_price_uzs: number;    // Uzum da sotuv narxi
      unit_cost_usd: number;     // xarid narxi (USD)
      usd_to_uzs: number;        // kurs
      uzum_commission_pct: number; // 5-15%
      fbo_cost_uzs?: number;     // FBO xarajati
      ads_spend_uzs?: number;    // reklama xarajati
      quantity: number;
    }

    interface ProfitResult {
      revenue_uzs: number;
      total_cost_uzs: number;
      gross_profit_uzs: number;
      net_profit_uzs: number;
      margin_pct: number;
      roi_pct: number;
      breakeven_qty: number;
      breakeven_price: number;
    }

[ ] POST /api/v1/tools/profit-calculator
    → Body: ProfitInput → Response: ProfitResult
    → Auth shart (billing guard bilan)
```

---

#### FEATURE 10 — Browser Extension

**Backend Tasks:**
```
[ ] GET /api/v1/uzum/product/:productId/quick-score
    → { score, weekly_bought, trend, last_updated }
    → CORS: chrome-extension://* ruxsat berish
    → Cache: Redis 30 daqiqa

[ ] apps/api/src/common/cors.config.ts
    allowedOrigins: [
      'http://localhost:5173',
      'chrome-extension://*',
      process.env.WEB_URL,
    ]
```

---

### 🔵 v2.0 FEATURES (11–20) — Backend

---

#### FEATURE 11 — Trend Prediction (ML)

**Status:** `apps/api/src/products/products.service.ts` da `getForecast()` allaqachon bor!

**Qo'shimcha tasks:**
```
[ ] Forecast accuracy monitoring:
    Har hafta: predicted_score vs actual_score farqini yozish
    Prisma model: forecast_accuracy_log
    id, product_id, predicted_score, actual_score, predicted_at, actual_at

[ ] GET /api/v1/products/:id/forecast
    Javobga qo'shish: confidence_score (0.0-1.0)
    Hisoblash: R² koeffitsienti (snapshot count bilan proporsional)
```

---

#### FEATURE 12 — Auto Description Generator

**Backend Tasks:**
```
[ ] POST /api/v1/ai/generate-description
    Body: { product_id: string }
    → Cache: product_ai_attributes da description bo'lsa — qaytarish
    → Aks holda: Claude Haiku → { ru: "...", uz: "..." }
    → Saqlash: product_ai_attributes.raw_json ga

[ ] apps/api/src/ai/ai.service.ts ga yangi metod:
    async generateProductDescription(
      productId: bigint, title: string
    ): Promise<{ ru: string; uz: string } | null>

[ ] Token limit: max_tokens: 512 (Haiku — arzon)
[ ] Cache TTL: 7 kun (description tez-tez o'zgarmaydi)
```

---

#### FEATURE 13 — Review Sentiment Analysis

**Backend Tasks:**
```
[ ] GET /api/v1/products/:id/sentiment
    → Uzum dan reviewlar olish (productReviews query)
    → Claude Haiku'ga batch (max 20 review)
    → Output: { positive: [], negative: [], overall_score: 0.0-1.0 }

[ ] Prisma model: sentiment_analysis
    id, product_id, positive_points (jsonb),
    negative_points (jsonb), overall_score,
    reviews_analyzed, analyzed_at

[ ] Cache: 24 soat (reviewlar tez-tez o'zgarmaydi)

[ ] Batch prompt (token tejash):
    "20 ta review: [...]\nJSON qaytir: {pos:[],neg:[],score:0.0-1.0}"
```

---

#### FEATURE 14 — White-label

**Backend Tasks:**
```
[ ] Prisma model: white_label_configs
    id, account_id, brand_name, logo_url,
    primary_color, domain, is_active, created_at

[ ] GET  /api/v1/admin/white-label/:accountId
[ ] POST /api/v1/admin/white-label/:accountId
[ ] PATCH /api/v1/admin/white-label/:accountId

[ ] apps/api/src/common/middleware/white-label.middleware.ts
    → Request domain → white_label_configs lookup
    → req['brandConfig'] ga ulash (frontend uchun)

[ ] GET /api/v1/brand-config
    → Public endpoint: domain → { brand_name, logo_url, primary_color }
```

---

#### FEATURE 15 — Konsultatsiya Marketplace

**Backend Tasks:**
```
[ ] Prisma models:
    consultants: id, account_id, name, expertise,
                 hourly_rate_uzs, rating, is_available
    consultation_sessions: id, client_account_id, consultant_id,
                           scheduled_at, duration_min, status,
                           total_price, platform_commission_pct

[ ] GET    /api/v1/consultants         → ro'yxat (filter: expertise, rating)
[ ] POST   /api/v1/consultants         → consultant bo'lish
[ ] POST   /api/v1/consultants/:id/book → sessiya band qilish
[ ] PATCH  /api/v1/consultants/sessions/:id → status yangilash
[ ] Komissiya: 20% — billing service orqali avtomatik ushlab qolish
```

---

#### FEATURE 17 — WebSocket Real-time

**Backend Tasks:**
```
[ ] pnpm add --filter api @nestjs/websockets @nestjs/platform-socket.io socket.io

[ ] apps/api/src/events/events.gateway.ts
    @WebSocketGateway({ cors: { origin: '*' } })
    
    Rooms: `account:${accountId}`
    
    Events emit:
      score_update    → { product_id, new_score, old_score }
      discovery_done  → { run_id, category_id, winners_count }
      alert_triggered → { rule_id, product_id, message, type }
      balance_low     → { balance, daily_fee }

[ ] apps/api/src/events/events.service.ts
    → Barcha service'lardan emit qilish uchun inject qilinadigan service

[ ] Guard: JWT token → WebSocket auth
    socket.handshake.auth.token → JwtService.verify()
```

---

#### FEATURE 18 — Multi-language (i18n) — Backend

**Backend Tasks:**
```
[ ] Error message'larni i18n bilan qaytarish:
    Accept-Language header → uz | ru | en

[ ] apps/api/src/common/i18n/
    uz.json → { "product_not_found": "Mahsulot topilmadi" }
    ru.json → { "product_not_found": "Продукт не найден" }
    en.json → { "product_not_found": "Product not found" }

[ ] pnpm add --filter api nestjs-i18n

[ ] Barcha exception message'larda:
    throw new NotFoundException(this.i18n.t('product_not_found'));
```

---

#### FEATURE 19 — Demand-Supply Gap Detector

**Backend Tasks:**
```
[ ] GET /api/v1/discovery/gaps?category_id=...
    Mantiq:
      high_demand = weekly_bought > category_avg_weekly * 1.5
      low_supply  = seller_count < category_avg_sellers * 0.7
      gap_score   = high_demand_score / supply_pressure

[ ] Prisma model: demand_supply_gaps
    id, category_id, product_type, gap_score,
    avg_weekly_demand, seller_count, detected_at

[ ] Worker job: har 24 soatda gap tahlil
    → gap_score > 0.7 → alert yaratish
```

---

#### FEATURE 20 — Price Elasticity Calculator

**Backend Tasks:**
```
[ ] GET /api/v1/products/:id/price-elasticity
    → Snapshot tarixidan: narx o'zgarganda sotuv qanday o'zgargan
    → Linear regression: delta_price → delta_weekly_bought
    → Output: { elasticity_coefficient, optimal_price_range, chart_data }

[ ] packages/utils/src/elasticity.ts
    function calculateElasticity(
      snapshots: { price: number; weekly_bought: number; date: Date }[]
    ): ElasticityResult
```

---

### 🔵 v3.0 FEATURES (21–30) — Backend

---

#### FEATURE 21 — Cannibalization Alert

```
[ ] GET /api/v1/alerts/cannibalization
    → Bir account'dagi 2+ mahsulot o'rtasida raqobat bor bo'lsa
    Mantiq: pgvector embedding similarity > 0.85 AND
             ikkalasining score oxirgi 14 kunda tushgan

[ ] Worker: har kuni cannibalization tekshirish
    → Alert yaratish: "Mahsulot A va B bir-birining sotuvini kamaytirmoqda"
```

---

#### FEATURE 22 — Dead Stock Predictor

```
[ ] GET /api/v1/products/:id/dead-stock-risk
    → Oxirgi 21 kunlik snapshot tahlil
    Risk darajalari:
      HIGH:   weekly_bought ketma-ket 3 hafta tushgan AND stok > 500
      MEDIUM: weekly_bought flat AND stok > 200
      LOW:    o'sish trendida

[ ] packages/utils/src/dead-stock.ts
    function predictDeadStockRisk(
      snapshots: WeeklySnapshot[],
      currentStock: number,
    ): 'HIGH' | 'MEDIUM' | 'LOW'
```

---

#### FEATURE 23 — Category Saturation Index

```
[ ] GET /api/v1/discovery/saturation?category_id=...
    → HHI (Herfindahl-Hirschman Index) hisoblash
    HHI = sum(market_share_i ^ 2) * 10000
    
    Interpretatsiya:
      HHI < 1500    → Raqobatli (kirish oson)
      1500-2500     → O'rtacha to'yingan
      HHI > 2500    → Monopollashgan (kirish qiyin)

[ ] packages/utils/src/saturation.ts
    function calculateHHI(marketShares: number[]): number
    function interpretHHI(hhi: number): 'competitive' | 'moderate' | 'concentrated'
```

---

#### FEATURE 24 — Flash Sale Detector

```
[ ] Worker job: apps/worker/src/jobs/flash-sale.job.ts
    → Har 1 soatda sku_snapshots tekshirish
    → Narx ≥ 20% tushgan → flash_sale_events jadvaliga yozish
    → alert_events yaratish

[ ] Prisma model: flash_sale_events
    id, product_id, sku_id, old_price, new_price,
    discount_pct, detected_at, ended_at

[ ] GET /api/v1/alerts/flash-sales?hours=24
    → Oxirgi N soatdagi flash sale'lar
```

---

#### FEATURE 25 — New Product Early Signal

```
[ ] GET /api/v1/discovery/early-signals
    Mezonlar:
      feedback_quantity < 50 (yangi mahsulot)
      AND weekly_bought_growth > 50% (o'sish tez)
      AND score > 3.5

[ ] Worker: har 6 soatda early signal tekshirish
    → Topilsa: account'ga notification
```

---

#### FEATURE 26 — Stock Cliff Alert

```
[ ] Worker: har 2 soatda tracked raqiblarning stokini tekshirish
    → Raqib stoki < 10% → "Raqib stoksiz qolmoqda" alert

[ ] GET /api/v1/alerts/stock-cliffs
    → Stok ko'paytirish imkoniyatini bildiruvchi alertlar
```

---

#### FEATURE 27 — Ranking Position Tracker

```
[ ] Prisma model: ranking_snapshots
    id, product_id, category_id, position, total_products,
    snapshot_at

[ ] Worker: har 12 soatda kategoriya'dan mahsulot pozitsiyasini olish
[ ] GET /api/v1/products/:id/ranking-history
    → Pozitsiya o'zgarishi grafigi uchun data
```

---

#### FEATURE 28 — Product Launch Checklist

```
[ ] GET /api/v1/tools/launch-checklist?product_id=...
    Tekshiruvlar:
      ✓ Score > 4.0 (trend isbotlangan)
      ✓ Raqiblar soni < 20 (past raqobat)
      ✓ Seasonal calendar (mavsum mos keladi)
      ✓ Margin > 30% (foyda yetarli)
      ✓ FBO imkoniyati (tezkor yetkazish)
      ✓ Sourcing manbasi topilgan (import variant)

[ ] Response: { score: 6/6, items: [{check, status, recommendation}] }
```

---

#### FEATURE 29 — A/B Price Testing

```
[ ] Prisma model: ab_price_tests
    id, account_id, product_id, variant_a_price, variant_b_price,
    start_date, end_date, status, winner_variant,
    variant_a_orders, variant_b_orders, confidence_pct

[ ] POST /api/v1/tools/ab-price-test      → test yaratish
[ ] GET  /api/v1/tools/ab-price-test/:id  → natija (t-test)
[ ] packages/utils/src/statistics.ts
    function tTest(groupA: number[], groupB: number[]): TTestResult
```

---

#### FEATURE 30 — Replenishment Planner

```
[ ] GET /api/v1/products/:id/replenishment
    → Joriy stok + weekly_bought trend → qachon stok tugashini hisoblash
    → Output: { days_remaining, reorder_date, suggested_quantity }
    Formula: days_remaining = current_stock / avg_daily_sales

[ ] Worker: har kuni replenishment check
    → days_remaining < 14 → "Stok 14 kunda tugaydi" alert
```

---

### 🔵 v4.0 FEATURES (31–43) — Backend

---

#### FEATURE 31 — Uzum Ads ROI Tracker

```
[ ] Prisma models:
    ads_campaigns: id, account_id, product_id, name,
                   daily_budget_uzs, start_date, end_date, status
    ads_daily_spend: id, campaign_id, date, spend_uzs, impressions,
                     clicks, orders_from_ads

[ ] POST /api/v1/ads/campaigns
[ ] POST /api/v1/ads/campaigns/:id/daily-spend  → kunlik xarajat kiritish
[ ] GET  /api/v1/ads/campaigns/:id/roi
    → { total_spend, total_revenue, roi_pct, cpa, roas }
    Formula: ROAS = revenue / spend; ROI = (revenue - spend) / spend * 100
```

---

#### FEATURE 32 — Telegram Bot (grammY)

```
[ ] apps/bot/ to'liq implementatsiya

[ ] pnpm add grammy @grammyjs/conversations @grammyjs/menu

[ ] Komandalar:
    /start     → xush kelibsiz + menyju
    /balance   → balans va status
    /top       → oxirgi discovery top-5
    /track [url] → mahsulot URL → kuzatuvga qo'shish
    /alerts    → oxirgi 10 ta alert
    /help      → barcha komandalar

[ ] Inline notifications (WebSocket o'rniga):
    score_spike, flash_sale, dead_stock, stock_cliff

[ ] Mini App URL: https://t.me/[botname]/app
    → Web app sifatida React frontendni ochish

[ ] Cron: har kuni 08:00 (O'zbekiston vaqti)
    → "Bugungi trendlar" → top-5 weekly_bought o'sgan mahsulotlar
```

---

#### FEATURE 33 — Team Collaboration

```
[ ] Prisma models:
    team_members: id, account_id, user_id, role
                  (OWNER | ADMIN | ANALYST | VIEWER)
    team_invitations: id, account_id, email, role,
                      token, expires_at, accepted_at

[ ] POST /api/v1/team/invite           → email invite yuborish
[ ] POST /api/v1/team/accept/:token    → invite qabul qilish
[ ] GET  /api/v1/team/members          → a'zolar ro'yxati
[ ] PATCH /api/v1/team/members/:id     → rol o'zgartirish
[ ] DELETE /api/v1/team/members/:id    → a'zoni chiqarish

[ ] RBAC update:
    VIEWER: faqat GET
    ANALYST: GET + export
    ADMIN: barcha (billing va team bundan mustasno)
    OWNER: hamma narsa
```

---

#### FEATURE 34 — Custom Report Builder + PDF

```
[ ] pnpm add --filter api puppeteer

[ ] POST /api/v1/reports/generate
    Body: { type: 'market_share' | 'trend_report' | 'competitor_analysis',
            category_id?, date_range, format: 'pdf' | 'xlsx' }
    → BullMQ → report-queue → Puppeteer → PDF buffer
    → Response: { download_url, expires_at }

[ ] apps/worker/src/processors/report.processor.ts
    → HTML template render → Puppeteer → PDF

[ ] apps/api/src/reports/templates/
    market-share.html   → Handlebars template
    trend-report.html
```

---

#### FEATURE 35 — Market Share PDF

```
[ ] Worker cron: har oyning 1-sida
    → Barcha kategoriyalar uchun HHI hisoblash
    → Top-10 shop market share hisoblash
    → Puppeteer → PDF → S3 yoki local storage
    → Account'ga "Oylik hisobot tayyor" notification

[ ] GET /api/v1/reports/market-share/latest → download link
```

---

#### FEATURE 36 — Watchlist Sharing

```
[ ] Prisma model: shared_watchlists
    id, account_id, name, product_ids, is_public,
    share_token, view_count, created_at

[ ] POST /api/v1/watchlists          → yaratish
[ ] GET  /api/v1/watchlists/:token/public
    → Auth shart emas
    → Top-5 ko'rsatish, qolganlari blur
    → "Ro'yxatdan o'ting → to'liq ko'ring" CTA

[ ] GET /api/v1/watchlists/my        → o'z watchlistlarim
```

---

#### FEATURE 37 — Historical Data Archive

```
[ ] pg_partman extension:
    product_snapshots → oylar bo'yicha partition
    CREATE TABLE product_snapshots_2026_02 PARTITION OF product_snapshots
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

[ ] apps/worker/src/jobs/archive.job.ts
    → Har oyning oxirida: eski partitionni S3 ga export (CSV.gz)
    → DB'dan o'chirmasdan, "archived" flag qo'yish

[ ] GET /api/v1/products/:id/snapshots?from=2024-01&to=2025-12
    → Archive'dan + DB'dan merge qilib qaytarish
```

---

#### FEATURE 38 — Collective Intelligence

```
[ ] Prisma model: product_watch_aggregate
    id, product_id, watcher_count, updated_at

[ ] GET /api/v1/products/:id (mavjud) ga qo'shish:
    { ..., watching_count: 127, social_proof: "127 sotuvchi kuzatyapti" }

[ ] Anonym aggregate (privacy):
    Faqat COUNT ko'rsatiladi, kim kuzatayotgani ko'rsatilmaydi

[ ] Worker: har soatda product_watch_aggregate yangilash
```

---

#### FEATURE 39 — Algorithm Reverse Engineering

```
[ ] GET /api/v1/discovery/algorithm-factors
    Talab: 10,000+ snapshot bo'lishi kerak
    
    Tahlil qilinadigan faktorlar:
      - weekly_bought weight (0.0-1.0)
      - rating weight
      - FBO bonus
      - feedback_quantity weight
      - recency bonus (yangi mahsulot)
    
    Metod: Multiple linear regression
      target: uzum_rank
      features: [weekly_bought, rating, feedback_count, age_days, is_fbo]
    
[ ] packages/utils/src/regression.ts
    function multipleLinearRegression(
      X: number[][], y: number[]
    ): { weights: number[]; r_squared: number }

[ ] Natija yangilanishi: har hafta (yetarli data to'planganda)
```

---

#### FEATURE 40 — Xitoy/Yevropa Sourcing (FIXES_AND_ROADMAP.md da to'liq bor)

```
[ ] FIXES_AND_ROADMAP.md → QISM 2 bo'yicha to'liq implement qilish
[ ] Sprint 2 da boshlanadi
```

---

## 🔵 BUG FIXES (Sprint 0 — BIRINCHI BAJARILADIGAN)

```
[ ] BUG 1: apps/api/src/uzum/uzum.service.ts
    const stockType = (sku.stockType as 'FBO' | 'FBS') ?? 'FBS';

[ ] BUG 2: packages/types/src/index.ts
    export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'USER';

[ ] BUG 3: apps/bot/ placeholder yaratish (Dockerfile bilan)

[ ] BUG 4: apps/worker/src/processors/uzum-scraper.ts
    rOrdersAmount: number | null — interface'ga qo'shish

[ ] BUG 5: apps/api/src/uzum/uzum.client.ts — undici proxy
[ ] BUG 6: Discovery pagination — REST orqali
```

---

## 🚀 CLAUDE CLI ISHLATISH

```bash
# Bug fix sprinti:
cat CLAUDE.md CLAUDE_BEKZOD.md FIXES_AND_ROADMAP.md | claude \
  "Bug 1 ni tuzat. apps/api/src/uzum/uzum.service.ts faylini ko'rsat va to'g'rilab ber"

# Yangi feature:
cat CLAUDE.md CLAUDE_BEKZOD.md | claude \
  "Feature 01 Competitor Price Tracker ni implement qil. \
   apps/api/src/competitor/ papkasini yaratishim kerak. \
   Barcha fayllarni (module, service, controller, dto) yoz"

# Worker job:
cat CLAUDE.md CLAUDE_BEKZOD.md apps/worker/src/main.ts | claude \
  "Feature 24 Flash Sale Detector uchun worker job yaratishim kerak. \
   apps/worker/src/jobs/flash-sale.job.ts faylini yoz"

# Prisma migration:
cat CLAUDE.md CLAUDE_BEKZOD.md apps/api/prisma/schema.prisma | claude \
  "Feature 06 Referral tizimi uchun referrals jadvalini schemaga qo'sh. \
   Migration nomini ham ayt"
```

---

## ⚠️ BEKZOD UCHUN XAVFLI ZONALAR

```
❌ apps/web/ papkasiga TEGINMA — bu Sardorniki
❌ prisma migrate reset — ma'lumotlar yo'qoladi!
❌ main branch'ga to'g'ridan push — PR orqali
❌ .env faylni commit qilma — .gitignore da bo'lishi kerak
❌ console.log → Logger ishlatish
❌ any type → TypeScript typelari yoz
```

---

*CLAUDE_BEKZOD.md | Backend Engineer | 2026-02-23*
