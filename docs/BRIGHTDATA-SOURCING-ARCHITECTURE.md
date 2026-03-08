# Bright Data + VENTRA Sourcing — Arxitektura Hisoboti

**Sana:** 2026-03-08
**Muallif:** Bekzod (Claude AI yordamida)
**Maqsad:** Uzum mahsulotini tahlil qilganda, Bright Data orqali tashqi platformalardan mos mahsulotlarni topib, card ko'rinishida ko'rsatish

---

## 1. BRIGHT DATA TEXNIK MA'LUMOTLAR

### 1.1 Servis turlari

Bright Data 3 xil scraping servis taklif qiladi:

| Servis | Qanday ishlaydi | Narx | VENTRA uchun |
|--------|-----------------|------|--------------|
| **Web Scraper API** | Tayyor scraper, structured JSON qaytaradi | $2.5–3.5/1K req | **Asosiy variant** |
| **Scraping Browser** | Playwright-ga o'xshash browser, o'zing boshqarasan | $8.4/GB traffic | Murakkab saytlar uchun |
| **Datasets (Marketplace)** | Tayyor dataset sotib olish (bulk) | $0.001/record | Bulk analitika uchun |

**VENTRA uchun tanlov: Web Scraper API** — tayyor structured JSON, parser yozish shart emas.

### 1.2 Qo'llab-quvvatlaydigan platformalar

| Platforma | Dataset ID formati | Search | Product Detail | Narx/1K req |
|-----------|-------------------|--------|----------------|-------------|
| **AliExpress** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $2.5 |
| **1688** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $3.0 |
| **Taobao** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $3.0 |
| **Tmall** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $3.0 |
| **Amazon** | `gd_l...` | ✅ keyword search | ✅ URL/ASIN | $2.5 |
| **Shein** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $3.0 |
| **Alibaba** | `gd_l...` | ✅ keyword search | ✅ URL orqali | $2.5 |
| **Pinduoduo** | `gd_l...` | ⚠️ limited | ✅ URL orqali | $3.5 |

### 1.3 API Endpoint'lar

#### Authentication
```
Authorization: Bearer <BRIGHTDATA_API_KEY>
API Key: brightdata.com → Settings → API Tokens
```

#### Sinxron so'rov (real-time, <30s)
```
POST https://api.brightdata.com/datasets/v3/trigger?dataset_id={ID}&format=json&type=discover&discover_by=keyword

Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
[
  { "keyword": "bluetooth earbuds", "country": "US", "limit": 20 }
]

Response: JSON array of products
```

#### Asinxron so'rov (katta hajm, webhook)
```
POST https://api.brightdata.com/datasets/v3/trigger?dataset_id={ID}&notify=https://your-api.com/webhook

Body:
[
  { "keyword": "bluetooth earbuds" }
]

Response:
{ "snapshot_id": "snap_xxx" }

Webhook callback:
POST https://your-api.com/webhook
{ "snapshot_id": "snap_xxx", "status": "ready", "download_url": "..." }
```

#### Natijalarni olish
```
GET https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json

Response: NDJSON (har qator = 1 product)
```

### 1.4 Response fieldlari (AliExpress misol)

```json
{
  "title": "Wireless Bluetooth Earbuds TWS",
  "url": "https://aliexpress.com/item/100500.html",
  "image": "https://ae01.alicdn.com/...",
  "price": 12.99,
  "original_price": 25.99,
  "currency": "USD",
  "seller_name": "TechStore Official",
  "seller_id": "2301923",
  "seller_rating": 4.8,
  "reviews_count": 1523,
  "orders_count": 8500,
  "shipping_cost": 0,
  "shipping_days": "15-25",
  "category": "Electronics > Earphones",
  "brand": "No Brand",
  "sku_options": [...],
  "description": "...",
  "rating": 4.7
}
```

### 1.5 Narxlar va bepul boshlash

| | |
|---|---|
| **Free trial** | 100 record, kredit karta KERAK EMAS |
| **Pay-as-you-go** | $1/1K record dan (dataset), $2.5/1K (scraper API) |
| **Minimum deposit** | $10 |
| **Bonus** | Matched deposit — $500 gacha 100% bonus |
| **Billing** | Prepaid balance, auto-top-up optional |

#### VENTRA uchun oylik xarajat prognozi

| Foydalanuvchilar | Search req/oy | Detail req/oy | Jami req | Narx/oy |
|------------------|---------------|---------------|----------|---------|
| 10 (beta) | 6,000 | 3,000 | 9,000 | **~$25** |
| 50 | 30,000 | 15,000 | 45,000 | **~$125** |
| 100 | 60,000 | 30,000 | 90,000 | **~$250** |
| 500 | 300,000 | 150,000 | 450,000 | **~$1,250** |

### 1.6 Rate Limits

| Limit | Qiymat |
|-------|--------|
| Parallel requests | 100 (default) |
| Requests per second | 20 |
| Max results per search | 500 |
| Timeout (sync) | 30 seconds |
| Timeout (async) | 10 minutes |

---

## 2. MAVJUD SOURCING ARXITEKTURASI (Hozirgi holat)

### 2.1 Umumiy oqim

```
User → AnalyzePage (Uzum URL kiritadi)
  → Backend: products.service.analyzeProduct()
    → Uzum API: /api/v2/product/{id}
    → Score hisoblash
    → ProductSnapshot yaratish
  → Frontend: natijani ko'rsatish (score, narx, trend)

User → SourcingPage → "Start Search"
  → Backend: sourcing.service.createSearchJob()
    → BullMQ: sourcing-search queue
  → Worker: sourcing.processor.ts
    ├─ AI query generation (Claude Haiku)
    ├─ SerpAPI: 1688, Taobao, Alibaba search
    ├─ Playwright: Banggood, Shopee scrape
    ├─ AI match scoring (Claude Haiku)
    ├─ Cargo calculation
    └─ Final ranking
  → Frontend: natijalar card ko'rinishida
```

### 2.2 Muammolar

| # | Muammo | Ta'siri |
|---|--------|---------|
| 1 | SerpAPI faqat SEARCH natija beradi, product detail yo'q | Narx/stok noaniq |
| 2 | Playwright scraper'lar sekin (8-10s per site) | UX yomon |
| 3 | SerpAPI qimmat (90K req = ~$900/oy) | Business model zarar |
| 4 | Anti-bot bloklash xavfi (Playwright) | Ishonchsiz |
| 5 | Tmall, Pinduoduo, Shein qo'llab-quvvatlanmaydi | Kam qamrov |
| 6 | AnalyzePage va SourcingPage alohida — foydalanuvchi 2 joyda ishlaydi | UX uzilgan |

### 2.3 Mavjud DB Schema (Sourcing)

```
ExternalPlatform     → Platform ro'yxati (code, name, country, api_type)
ExternalSearchJob    → Search vazifasi (product_id, query, status, platforms[])
ExternalSearchResult → Natijalar (title, price, url, image, ai_match_score, rank)
CargoCalculation     → Xarajat hisob-kitobi (landed_cost, margin, roi)
CargoProvider        → Kargo yo'llari (rate_per_kg, delivery_days)
CurrencyRate         → Valyuta kurslari (USD, CNY, EUR → UZS)
```

---

## 3. YANGI ARXITEKTURA: Bright Data Integratsiyasi

### 3.1 Umumiy konsept

```
┌─────────────────────────────────────────────────────────┐
│                    FOYDALANUVCHI                         │
│                                                         │
│  1. Uzum mahsulot URL kiritadi                          │
│  2. "Tahlil" tugmasi                                    │
│  3. Uzum mahsulot ma'lumotlari ko'rinadi                │
│  4. Avtomatik: tashqi platformalardan mos               │
│     mahsulotlar qidiriladi                              │
│  5. Natijalar CARD ko'rinishida, platforma logosi bilan │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Yangi oqim (AnalyzePage + Sourcing birlashtirish)

```
                        AnalyzePage
                            │
                    Uzum URL kiritiladi
                            │
                ┌───────────┴───────────┐
                │                       │
        Uzum API call            Bright Data call
        (mavjud flow)            (YANGI)
                │                       │
        Product data              AI Query Gen
        Score, trend              (Claude Haiku)
                │                       │
                │              ┌────────┼────────┐
                │              │        │        │
                │           1688    AliExpress  Taobao
                │          search    search    search
                │              │        │        │
                │              └────────┼────────┘
                │                       │
                │               Bright Data API
                │               (parallel, async)
                │                       │
                │                AI Match Scoring
                │               (Claude Haiku)
                │                       │
                │              Cargo Calculation
                │              (mavjud service)
                │                       │
                └───────────┬───────────┘
                            │
                    BIRLASHTIRILGAN NATIJA
                            │
            ┌───────────────┼───────────────┐
            │               │               │
      Uzum Product     Sourcing Cards    Cargo Summary
      (score, trend)   (platform logo,   (landed cost,
                        narx, seller)     margin, ROI)
```

### 3.3 Backend arxitektura

#### Yangi fayl: `apps/api/src/sourcing/platforms/brightdata.client.ts`

```typescript
// Bright Data Web Scraper API client
// Vazifasi: Tashqi platformalardan mahsulot qidirish

interface BrightDataConfig {
  apiKey: string;                          // BRIGHTDATA_API_KEY env
  baseUrl: string;                         // https://api.brightdata.com
  datasets: {
    aliexpress_search: string;             // gd_l... (dataset_id)
    aliexpress_detail: string;
    taobao_search: string;
    taobao_detail: string;
    one688_search: string;                 // 1688
    one688_detail: string;
    tmall_search: string;
    shein_search: string;
    alibaba_search: string;
  };
}

interface BrightDataProduct {
  title: string;
  url: string;
  image: string;
  price: number;
  original_price?: number;
  currency: string;
  seller_name?: string;
  seller_rating?: number;
  reviews_count?: number;
  orders_count?: number;
  shipping_cost?: number;
  shipping_days?: string;
  category?: string;
  platform: string;                        // "aliexpress" | "1688" | "taobao" | ...
}

// Metodlar:
// searchByKeyword(platform, keyword, limit) → BrightDataProduct[]
// getProductDetail(platform, url) → BrightDataProduct
// searchMultiPlatform(keyword, platforms[], limit) → Map<platform, BrightDataProduct[]>
```

#### Yangilangan: `sourcing.processor.ts`

```
Hozirgi pipeline:
  1. AI Query Gen → 2. SerpAPI → 3. Playwright → 4. AI Score → 5. Cargo → 6. Rank

Yangi pipeline:
  1. AI Query Gen (o'zgarishsiz)
  2. Bright Data parallel search (SerpAPI O'RNIGA)
     ├─ AliExpress search
     ├─ 1688 search
     ├─ Taobao search
     ├─ (optional) Tmall, Shein, Alibaba
     └─ Barchasi parallel, async mode
  3. AI Match Scoring (o'zgarishsiz)
  4. Cargo Calculation (o'zgarishsiz)
  5. Final Ranking (o'zgarishsiz)

Playwright scraper'lar: O'CHIRILADI (Banggood, Shopee)
  → Bright Data hammani qamraydi, Playwright kerak emas
```

#### Yangilangan: `sourcing.service.ts`

```typescript
// Yangi metod: analyzeWithSourcing()
// AnalyzePage dan chaqiriladi — Uzum tahlili + sourcing BIR JOYDA

async analyzeWithSourcing(productId: bigint, accountId: string) {
  // 1. Uzum product data olish (mavjud)
  const product = await this.productsService.analyzeProduct(productId, accountId);

  // 2. Sourcing job yaratish (Bright Data orqali)
  const job = await this.createSearchJob({
    product_id: productId,
    product_title: product.title,
    platforms: ['aliexpress', '1688', 'taobao'],  // default
    account_id: accountId,
    sell_price_uzs: product.sellPrice,             // cargo calc uchun
  });

  return { product, jobId: job.id };
}
```

#### Yangi endpoint

```
POST /products/analyze-full
Body: { url: "https://uzum.uz/ru/product/...", platforms?: string[] }
Response: { product: {...}, sourcing_job_id: "..." }

→ Frontend product data ni darhol ko'rsatadi
→ Sourcing job ni poll qiladi (mavjud flow)
→ Natijalar kelganda card'lar paydo bo'ladi
```

### 3.4 Frontend arxitektura

#### AnalyzePage yangi tuzilishi

```
┌──────────────────────────────────────────────────────────┐
│  AnalyzePage                                             │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  URL Input + "Tahlil" button                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Uzum Product Card (mavjud)                         │ │
│  │  ┌─────────┐ Title, Price, Score, Trend             │ │
│  │  │  Image  │ Rating, Orders, Weekly Bought          │ │
│  │  │         │ Category, Seller                       │ │
│  │  └─────────┘                                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  "Manba narxlar" bo'limi (YANGI)                    │ │
│  │                                                     │ │
│  │  Filter: [All] [AliExpress] [1688] [Taobao] [...]   │ │
│  │  Sort:   [Narx ↑] [ROI ↓] [Match ↓] [Rating ↓]    │ │
│  │                                                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │ │
│  │  │ 🟠 1688  │ │ 🔴 Ali   │ │ 🟡 Taobao│            │ │
│  │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │            │ │
│  │  │ │ Img  │ │ │ │ Img  │ │ │ │ Img  │ │            │ │
│  │  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │            │ │
│  │  │ Title    │ │ Title    │ │ Title    │            │ │
│  │  │ ¥45.00   │ │ $12.99   │ │ ¥38.00   │            │ │
│  │  │ Match:92%│ │ Match:87%│ │ Match:79%│            │ │
│  │  │ ────────── │ │ ────────── │ │ ────────── │            │ │
│  │  │ Landed:  │ │ Landed:  │ │ Landed:  │            │ │
│  │  │ $18.50   │ │ $16.20   │ │ $17.80   │            │ │
│  │  │ Margin:  │ │ Margin:  │ │ Margin:  │            │ │
│  │  │ +42%     │ │ +51%     │ │ +45%     │            │ │
│  │  │ ROI:+72% │ │ ROI:+88% │ │ ROI:+78% │            │ │
│  │  │ [Ko'rish]│ │ [Ko'rish]│ │ [Ko'rish]│            │ │
│  │  └──────────┘ └──────────┘ └──────────┘            │ │
│  │                                                     │ │
│  │  Loading... (agar hali natija kelmagan bo'lsa)      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Cargo Summary (eng yaxshi variant)                 │ │
│  │  Eng arzon: AliExpress $12.99 → Landed $16.20      │ │
│  │  Eng yuqori ROI: AliExpress → +88%                 │ │
│  │  Uzum narx: 185,000 UZS → Margin: +51%             │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Yangi component: `SourcingCard.tsx`

```
┌─────────────────────────────┐
│ [Platform Logo] Platform    │  ← Rang va logo platforma bo'yicha
│ ┌───────────────────────┐   │
│ │      Product Image    │   │
│ └───────────────────────┘   │
│ Product Title (max 2 line)  │
│                             │
│ Price: $12.99 (was $25.99)  │  ← Original narx chizilgan
│ Seller: StoreName ⭐4.8     │
│ Orders: 8,500 | Reviews: 1K│
│ Shipping: 15-25 days        │
│                             │
│ ──── Xarajat tahlili ────── │
│ Landed cost: $16.20         │
│ Uzum price:  185,000 UZS    │
│ Margin:      +51%     🟢   │  ← Rang: yashil>30%, sariq>10%, qizil<10%
│ ROI:         +88%     🟢   │
│                             │
│ AI Match: 87% ████████░░    │  ← Progress bar
│                             │
│ [Saytda ko'rish ↗]         │  ← External link
└─────────────────────────────┘
```

#### Platform identifikatsiya (rang + logo)

```typescript
const PLATFORM_BRANDING = {
  aliexpress: {
    name: 'AliExpress',
    color: '#E43225',       // qizil
    bgColor: '#FEF2F2',
    logo: '/icons/aliexpress.svg',
    flag: '🇨🇳',
  },
  '1688': {
    name: '1688.com',
    color: '#FF6A00',       // to'q sariq
    bgColor: '#FFF7ED',
    logo: '/icons/1688.svg',
    flag: '🇨🇳',
  },
  taobao: {
    name: 'Taobao',
    color: '#FF5000',       // sariq-qizil
    bgColor: '#FFF4ED',
    logo: '/icons/taobao.svg',
    flag: '🇨🇳',
  },
  tmall: {
    name: 'Tmall',
    color: '#D4131D',       // qizil
    bgColor: '#FEF2F2',
    logo: '/icons/tmall.svg',
    flag: '🇨🇳',
  },
  shein: {
    name: 'SHEIN',
    color: '#222222',       // qora
    bgColor: '#F9FAFB',
    logo: '/icons/shein.svg',
    flag: '🌍',
  },
  alibaba: {
    name: 'Alibaba',
    color: '#FF6A13',       // to'q sariq
    bgColor: '#FFF7ED',
    logo: '/icons/alibaba.svg',
    flag: '🇨🇳',
  },
};
```

### 3.5 Data Flow (to'liq)

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│ Frontend │───→│ API      │───→│ BullMQ Queue │───→│ Worker   │
│ Analyze  │    │ /analyze │    │ sourcing-    │    │ sourcing │
│ Page     │    │ -full    │    │ search       │    │ processor│
└──────────┘    └──────────┘    └──────────────┘    └──────────┘
     │               │                                    │
     │          Uzum API call                             │
     │          (real-time)                               │
     │               │                                    │
     │←── product ───┘                              ┌─────┴──────┐
     │    data                                      │ AI Query   │
     │                                              │ Generation │
     │                                              └─────┬──────┘
     │                                                    │
     │                                              ┌─────┴──────────┐
     │                                              │ Bright Data    │
     │                                              │ API calls      │
     │                                              │ (parallel)     │
     │                                              │                │
     │                                              │ ┌─ AliExpress  │
     │                                              │ ├─ 1688        │
     │                                              │ ├─ Taobao      │
     │                                              │ └─ (others)    │
     │                                              └─────┬──────────┘
     │                                                    │
     │                                              ┌─────┴──────┐
     │                                              │ AI Match   │
     │                                              │ Scoring    │
     │                                              └─────┬──────┘
     │                                                    │
     │                                              ┌─────┴──────┐
     │                                              │ Cargo Calc │
     │                                              │ + Ranking  │
     │                                              └─────┬──────┘
     │                                                    │
     │                                              Save to DB:
     │                                              ExternalSearchResult
     │                                              CargoCalculation
     │                                                    │
     │←─── poll GET /sourcing/jobs/:id ──────────────────┘
     │     (3s interval)
     │
     ▼
  Render Cards
  (SourcingCard components)
```

### 3.6 DB Schema o'zgarishlar

```prisma
// ExternalPlatform ga yangi yozuvlar qo'shiladi:
// tmall, shein (hozirda yo'q)

// ExternalPlatform.api_type ga yangi qiymat:
// "brightdata" (hozirda: "serpapi", "affiliate", "playwright")

// Yangi table kerak EMAS — mavjud schema yetarli
// ExternalSearchResult allaqachon barcha kerakli fieldlarga ega
```

### 3.7 Environment variables

```env
# Yangi (Bright Data)
BRIGHTDATA_API_KEY=           # API token from brightdata.com/cp/setting
BRIGHTDATA_WEBHOOK_URL=       # https://api.ventra.uz/sourcing/webhook (production)

# Dataset ID lar (Bright Data dashboard dan olinadi)
BD_ALIEXPRESS_SEARCH=gd_l...
BD_ALIEXPRESS_DETAIL=gd_l...
BD_1688_SEARCH=gd_l...
BD_1688_DETAIL=gd_l...
BD_TAOBAO_SEARCH=gd_l...
BD_TAOBAO_DETAIL=gd_l...

# Mavjud (saqlanadi, fallback sifatida)
SERPAPI_API_KEY=              # SerpAPI — faqat Google Shopping uchun saqlanishi mumkin
```

---

## 4. MIGRATION REJASI (SerpAPI → Bright Data)

### Bosqich 1: Bright Data client yaratish (1 kun)
```
Fayllar:
  + apps/api/src/sourcing/platforms/brightdata.client.ts
  + apps/api/src/sourcing/platforms/brightdata.types.ts

Vazifa:
  - BrightDataClient class
  - searchByKeyword(platform, keyword, limit)
  - getProductDetail(platform, url)
  - searchMultiPlatform(keyword, platforms[])
  - Webhook handler (async natijalar uchun)
  - Error handling + retry logic
```

### Bosqich 2: Worker processor yangilash (1 kun)
```
Fayllar:
  ~ apps/worker/src/processors/sourcing.processor.ts

Vazifa:
  - SerpAPI call larni Bright Data call ga almashtirish
  - Playwright scraper (Banggood, Shopee) o'chirish
  - Bright Data response ni ExternalSearchResult formatiga map qilish
  - Async mode qo'shish (webhook orqali)
```

### Bosqich 3: Analyze + Sourcing birlashtirish (1 kun)
```
Fayllar:
  ~ apps/api/src/products/products.controller.ts (yangi endpoint)
  ~ apps/api/src/sourcing/sourcing.service.ts (analyzeWithSourcing)
  ~ apps/web/src/pages/AnalyzePage.tsx (sourcing cards qo'shish)
  + apps/web/src/components/sourcing/SourcingCard.tsx (yangi card component)
  + apps/web/src/components/sourcing/PlatformBadge.tsx

Vazifa:
  - POST /products/analyze-full endpoint
  - AnalyzePage da sourcing natijalarni ko'rsatish
  - Platform logo + rang bilan card design
  - Filter va sort funksiyalari
```

### Bosqich 4: Webhook + DB seed (0.5 kun)
```
Fayllar:
  ~ apps/api/src/sourcing/sourcing.controller.ts (webhook endpoint)
  ~ apps/api/prisma/seed.ts (yangi platformalar)

Vazifa:
  - POST /sourcing/webhook — Bright Data callback
  - ExternalPlatform ga tmall, shein, alibaba qo'shish
  - api_type = "brightdata" bilan
```

### Bosqich 5: Test + cleanup (0.5 kun)
```
Vazifa:
  - Free trial (100 record) bilan test
  - SerpAPI fallback logic (agar Bright Data down bo'lsa)
  - Playwright scraper fayllarini arxivlash/o'chirish
  - .env.example yangilash
```

---

## 5. TEXNIK QARORLAR

### 5.1 Sync vs Async mode

| Holat | Mode | Sabab |
|-------|------|-------|
| 1 platforma, < 20 natija | **Sync** | Tezkor, 5-15s |
| 3+ platforma, parallel | **Async + Webhook** | Parallel, 15-30s jami |
| Product detail (1 URL) | **Sync** | 3-5s |

**VENTRA uchun:** Default **Async** — 3 platforma parallel qidiriladi, webhook orqali natija keladi.

### 5.2 Caching strategiya

```
Search natijalar: 24 soat cache (Redis)
  Key: brightdata:search:{platform}:{keyword_hash}
  TTL: 86400s

Product detail: 7 kun cache (Redis)
  Key: brightdata:detail:{platform}:{url_hash}
  TTL: 604800s

Sabab: Narx tez o'zgarmaydi, API chaqiruvlarni kamaytirish
```

### 5.3 Error handling

```
Bright Data xatoliklari:
  401 → API key noto'g'ri → log + alert admin
  402 → Balance tugagan → log + alert admin + SerpAPI fallback
  429 → Rate limit → exponential backoff (5s, 15s, 45s)
  500 → Server error → retry 3 marta
  Timeout → 30s → retry 1 marta

Fallback tartibi:
  1. Bright Data (primary)
  2. SerpAPI (fallback — faqat 1688, Taobao)
  3. Playwright (last resort — faqat oddiy saytlar)
```

### 5.4 Platform tanlash logikasi

```typescript
// User tanlashi mumkin, lekin default:
function getDefaultPlatforms(productCategory: string): string[] {
  // Elektronika, gadget → AliExpress + 1688
  // Kiyim, aksessuar → 1688 + Taobao + Shein
  // Kosmetika → Taobao + Tmall + 1688
  // Uy-ro'zg'or → 1688 + AliExpress
  // Default: AliExpress + 1688 + Taobao
  return ['aliexpress', '1688', 'taobao'];
}
```

---

## 6. XULOSA VA TAVSIYALAR

### Afzalliklar (Bright Data vs hozirgi SerpAPI+Playwright)

| Mezon | Hozirgi | Bright Data bilan |
|-------|---------|-------------------|
| Platformalar soni | 5 (3 SerpAPI + 2 Playwright) | **8+** |
| Product detail | ❌ yo'q (faqat search) | ✅ to'liq |
| Narx/oy (100 user) | ~$900 (SerpAPI) + server (Playwright) | **~$250** |
| Ishonchlilik | ⚠️ Anti-bot bloklash | ✅ Bright Data hal qiladi |
| Tezlik | 15-30s (Playwright) | **5-15s** (API) |
| Maintenance | Parser yozish/yangilash kerak | ❌ kerak emas |

### Xavflar

| # | Xavf | Yechim |
|---|------|--------|
| 1 | Bright Data narxi oshishi | SerpAPI fallback saqlash |
| 2 | API down bo'lishi | Multi-provider fallback |
| 3 | Dataset ID o'zgarishi | Config orqali boshqarish (.env) |
| 4 | 100 user dan ko'p bo'lsa narx oshadi | Cache + rate limiting |

### Darhol qilinadigan ishlar

1. **brightdata.com** da ro'yxatdan o'tish (free trial)
2. AliExpress, 1688, Taobao uchun **dataset_id** larni olish
3. `brightdata.client.ts` yozish va 100 bepul record bilan test
4. AnalyzePage + SourcingCard integratsiya

---

## 7. KEYWORD SEARCH — Uzum qidiruv integratsiyasi

### 7.1 Konsept

URL tahlildan TASHQARI, foydalanuvchi mahsulot **nomi** bo'yicha qidiradi:
- Uzum search API dan natijalar card ko'rinishida ko'rinadi
- Bitta card ni "Tahlil" qilsa — to'liq score + Bright Data sourcing ochiladi

Bu **sourcing discovery** — foydalanuvchi "nima sotish kerak?" degan savolga javob oladi.

### 7.2 Uzum Search API

Uzum da tayyor endpoint mavjud (allaqachon `uzum.client.ts` da ishlatiladi):

```
GET https://api.uzum.uz/api/v2/main/search/product
  ?text={keyword}
  &size=24
  &page=0
  &sort=ORDER_COUNT_DESC
  &showAdultContent=HIDE

Response:
{
  payload: {
    products: [
      {
        id: 123456,
        productId: 123456,
        title: "TWS Wireless Naushnik Pro",
        sellPrice: 185000,        // UZS
        minSellPrice: 165000,     // chegirmali narx
        rating: 4.7,
        ordersQuantity: 8500,
        ordersAmount: 8500
      },
      ...
    ]
  }
}
```

### 7.3 Yangi sahifa: SearchPage

```
┌────────────────────────────────────────────────────────────────┐
│  VENTRA — Mahsulot qidirish                                   │
│                                                                │
│  ┌──────────────────────────────────────────┐ ┌─────────────┐ │
│  │  bluetooth naushnik                      │ │   Qidirish  │ │
│  └──────────────────────────────────────────┘ └─────────────┘ │
│                                                                │
│  48 ta natija topildi         Sort: [Sotilganlar] [Narx] [..] │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │           │
│  │ │          │ │ │ │          │ │ │ │          │ │           │
│  │ │   IMG    │ │ │ │   IMG    │ │ │ │   IMG    │ │           │
│  │ │          │ │ │ │          │ │ │ │          │ │           │
│  │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │           │
│  │              │ │              │ │              │           │
│  │ TWS Wireless │ │ Pro Max Bass │ │ Sport Earbu  │           │
│  │ Naushnik Pro │ │ Naushnik     │ │ ds Bluetooth │           │
│  │              │ │              │ │              │           │
│  │ 185,000 UZS  │ │ 249,000 UZS  │ │  89,000 UZS  │           │
│  │ ~~220,000~~  │ │              │ │ ~~120,000~~  │           │
│  │              │ │              │ │              │           │
│  │ ⭐ 4.7       │ │ ⭐ 4.5       │ │ ⭐ 4.2       │           │
│  │ 📦 8,500 ta  │ │ 📦 3,200 ta  │ │ 📦 1,100 ta  │           │
│  │              │ │              │ │              │           │
│  │ [Tahlil ➜]  │ │ [Tahlil ➜]  │ │ [Tahlil ➜]  │           │
│  │ [Uzum ↗]    │ │ [Uzum ↗]    │ │ [Uzum ↗]    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │     ...      │ │     ...      │ │     ...      │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                │
│  [1] [2] [3] ... [15]  ← Pagination                           │
└────────────────────────────────────────────────────────────────┘
```

### 7.4 ProductSearchCard komponenti

```
┌────────────────────────────┐
│ ┌────────────────────────┐ │
│ │                        │ │
│ │      Product Image     │ │  ← Uzum dan kelgan rasm
│ │      (aspect 1:1)      │ │     lazy load + placeholder
│ │                        │ │
│ └────────────────────────┘ │
│                            │
│ TWS Wireless Naushnik Pro  │  ← title, max 2 qator, truncate
│                            │
│ 185,000 UZS                │  ← sellPrice (asosiy narx)
│ ~~220,000 UZS~~  -16%     │  ← fullPrice (chizilgan) + chegirma %
│                            │
│ ⭐ 4.7  │  📦 8,500 ta     │  ← rating + ordersQuantity
│                            │
│ ┌────────────────────────┐ │
│ │     📊 Tahlil qilish    │ │  ← primary button
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │     🔗 Uzum da ko'rish  │ │  ← ghost/outline button, external link
│ └────────────────────────┘ │
└────────────────────────────┘
```

### 7.5 "Tahlil" bosilganda — Expand / Modal

User card dagi "Tahlil" tugmasini bosganda 2 variant:

**Variant A: Inline Expand (tavsiya etiladi)**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Card 1      │ │  Card 2      │ │  Card 3      │
│  (oddiy)     │ │  (oddiy)     │ │  (oddiy)     │
└──────────────┘ └──────────────┘ └──────────────┘

User "Card 2" ni "Tahlil" qiladi → pastda expand bo'ladi:

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Card 1      │ │  Card 2      │ │  Card 3      │
│  (oddiy)     │ │  SELECTED ✓  │ │  (oddiy)     │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
┌───────────────────────┴────────────────────────────────┐
│  TAHLIL NATIJASI (expand panel)                        │
│                                                        │
│  ┌─── UZUM TAHLILI ─────────┐ ┌─ MANBA NARXLAR ─────┐│
│  │                          │ │                      ││
│  │ Score: 8.2    [grafik]   │ │ Loading...           ││
│  │ Weekly bought: 340 ↑12%  │ │                      ││
│  │ Stok: 2,659 ta          │ │ 🟠 1688              ││
│  │ Seller: TechStore ⭐4.8   │ │   ¥45 → Margin +72% ││
│  │ FBO | 14 kunlik trend    │ │                      ││
│  │                          │ │ 🔴 AliExpress        ││
│  │ AI tahlil:               │ │   $12.99 → M. +51%  ││
│  │ • Yuqori talab           │ │                      ││
│  │ • Stok yetarli           │ │ 🟡 Taobao            ││
│  │ • Raqobat o'rtacha       │ │   ¥38 → Margin +68% ││
│  │                          │ │                      ││
│  │ [Kuzatishga +]           │ │ [Barchasini ko'rish] ││
│  └──────────────────────────┘ └──────────────────────┘│
└────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Card 4      │ │  Card 5      │ │  Card 6      │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Variant B: Modal dialog**
- Card bosilganda modal ochiladi
- Ichida xuddi shu layout (Uzum tahlili + Manba narxlar)
- Fon dim bo'ladi

**Tavsiya: Variant A (Inline Expand)** — UX uzluksiz, sahifa konteksti saqlanadi.

### 7.6 Data Flow

```
1. User "bluetooth naushnik" yozadi → [Qidirish]

2. Frontend:
   GET /api/products/search?q=bluetooth+naushnik&size=24&page=0

3. Backend (products.controller.ts):
   → UzumClient.searchProducts("bluetooth naushnik", 24, 0)
   → Uzum API: /api/v2/main/search/product?text=...
   → Response: { products: [...], total: 743 }
   → Har product uchun photo URL olish:
     product rasm = https://images.uzum.uz/product/{id}/original.jpg
     yoki product detail dan (agar kerak bo'lsa)

4. Frontend: Grid card'lar ko'rsatadi

5. User bitta card da "Tahlil" bosadi

6. Frontend parallel:
   ├─ POST /api/uzum/analyze  → { product_id }
   │   → Uzum product detail (score, weekly_bought, stok, AI)
   │   → Natija: darhol ko'rsatiladi (1-2s)
   │
   └─ POST /api/sourcing/jobs → { product_id, product_title }
       → BullMQ job yaratiladi
       → Worker: Bright Data search (AliExpress, 1688, Taobao)
       → Frontend: poll GET /sourcing/jobs/:id (3s interval)
       → Natijalar kelganda: manba narx card'lar ko'rinadi

7. Expand panel da ikkalasi yonma-yon:
   Chap: Uzum tahlili (score, trend, stok)
   O'ng: Manba narxlar (Bright Data natijalar, margin, ROI)
```

### 7.7 Kerakli o'zgarishlar

#### Backend

| Fayl | O'zgarish |
|------|-----------|
| `uzum.client.ts` | + `searchProducts(keyword, size, page)` — yangi public metod |
| `products.controller.ts` | + `GET /products/search?q=...&size=24&page=0` endpoint |
| `products.service.ts` | + `searchProducts(q, size, page, accountId)` metod |

```typescript
// uzum.client.ts — yangi metod
async searchProducts(
  keyword: string,
  size = 24,
  page = 0,
): Promise<{ products: UzumSearchProduct[]; total: number }> {
  const url =
    `${REST_BASE}/main/search/product` +
    `?text=${encodeURIComponent(keyword)}` +
    `&size=${size}&page=${page}` +
    `&sort=ORDER_COUNT_DESC&showAdultContent=HIDE`;

  const res = await fetchWithTimeout(url, {
    headers: HEADERS,
    dispatcher: proxyDispatcher,
  });

  if (!res.ok) return { products: [], total: 0 };

  const data = (await res.json()) as UzumApiResponse;
  const products =
    data?.payload?.products ?? data?.products ?? data?.data?.products ?? [];
  const total = data?.data?.total ?? data?.total ?? products.length;

  return { products, total };
}
```

```typescript
// products.controller.ts — yangi endpoint
@Get('search')
@UseGuards(JwtAuthGuard, BillingGuard)
async searchProducts(
  @Query('q') query: string,
  @Query('size') size = '24',
  @Query('page') page = '0',
  @Req() req: AuthRequest,
) {
  return this.productsService.searchProducts(
    query,
    parseInt(size, 10),
    parseInt(page, 10),
    req.user.account_id,
  );
}
```

#### Frontend

| Fayl | O'zgarish |
|------|-----------|
| + `pages/SearchPage.tsx` | Yangi sahifa — search input + product grid |
| + `components/search/ProductSearchCard.tsx` | Uzum mahsulot card komponenti |
| + `components/search/SearchExpandPanel.tsx` | Tahlil natijasi expand panel |
| + `components/search/SourcePriceCard.tsx` | Manba narx mini card |
| `api/client.ts` | + `searchProducts(q, size, page)` API call |
| `App.tsx` | + `/search` route |
| `Layout.tsx` | + Sidebar da "Qidirish" link |
| `i18n/*.ts` | + search sahifa uchun tarjimalar |

```typescript
// api/client.ts
export const productsApi = {
  // ... mavjud
  searchProducts: (q: string, size = 24, page = 0) =>
    api.get('/products/search', { params: { q, size, page } }),
};
```

### 7.8 Rasm olish strategiyasi

Uzum search API da rasm URL qaytmaydi. Rasmni olish uchun:

**Variant 1: Uzum CDN pattern (tezkor, API call kerak emas)**
```
https://images.uzum.uz/product/{productId}/original.jpg
yoki
https://images.uzum.uz/{productId}/1/t_product_540_high.jpg
```

**Variant 2: Product detail API (aniq, lekin sekin)**
```
Har product uchun GET /api/v2/product/{id} → photos[0]
Muammo: 24 ta card = 24 ta API call — juda sekin
```

**Variant 3: Lazy detail fetch (tavsiya)**
```
1. Avval card'larni rasmsiz ko'rsatish (placeholder)
2. Visible card'lar uchun product detail batch fetch
3. Rasm kelganda card yangilanadi (IntersectionObserver)
```

**Tavsiya: Variant 1** — Uzum CDN pattern sinab ko'rish, ishlamasa Variant 3.

### 7.9 Pagination

```typescript
// Frontend pagination component
// DaisyUI join buttons

<div className="join">
  {Array.from({ length: Math.ceil(total / size) }, (_, i) => (
    <button
      key={i}
      className={`join-item btn btn-sm ${page === i ? 'btn-active' : ''}`}
      onClick={() => setPage(i)}
    >
      {i + 1}
    </button>
  ))}
</div>
```

### 7.10 Search UX detallari

| Element | Detayl |
|---------|--------|
| Debounce | 500ms (har harf bosilganda qidirmaslik) |
| Min uzunlik | 2 ta harf (1 ta harfda qidirmaydi) |
| Loading | Skeleton card'lar (Uzum ga o'xshash placeholder) |
| Bo'sh natija | "Natija topilmadi" xabar + taklif |
| Xato | Toast notification + retry button |
| Sort | Buyurtma (default), Narx (arzon→qimmat), Narx (qimmat→arzon), Reyting |
| Grid | Desktop: 4 ustun, Tablet: 3, Mobile: 2 |
| Card hover | Shadow + scale(1.02) transition |
| Keyboard | Enter = qidirish, Esc = tozalash |

---

## 8. SAHIFALAR XARITASI (yangilangan)

```
VENTRA App
├── /dashboard          — Kuzatilayotgan mahsulotlar (mavjud)
├── /analyze            — URL bo'yicha tahlil (mavjud, Bright Data qo'shiladi)
├── /search             — YANGI: Keyword qidiruv + Uzum card'lar
│   └── expand panel    — Tahlil + Manba narxlar (Bright Data)
├── /sourcing           — Sourcing tools (mavjud, Bright Data ga o'tkaziladi)
│   ├── Calculator      — Cargo kalkulyator
│   ├── Import Analysis — To'liq pipeline
│   └── History         — Tarix
├── /discovery          — Kategoriya discovery (mavjud)
└── /admin              — Admin panel (mavjud)
```

### User Journey

```
Yangi foydalanuvchi:
  1. /search → "naushnik" yozadi
  2. Uzum card'lar ko'radi — qaysi biri ko'p sotiladi
  3. Eng ko'p sotilgan card da "Tahlil" bosadi
  4. Score, trend, stok ko'radi (chap panel)
  5. Xitoydan qancha turadi ko'radi (o'ng panel — Bright Data)
  6. Margin +72% — "Bu mahsulotni sotaman!"
  7. "Kuzatishga qo'shish" bosadi → /dashboard ga qo'shiladi
  8. Har hafta trend kuzatadi

Tajribali foydalanuvchi:
  1. /analyze → Uzum URL kiritadi (aniq mahsulot)
  2. To'liq tahlil + sourcing natijalar
  3. /sourcing → Cargo kalkulyator bilan aniq xarajat hisoblaydi
```

---

## 9. KUZATUVGA QO'SHISH — Har card da tracking button

### 9.1 Card da "Kuzatish" tugmasi

Har bir ProductSearchCard da **2 ta asosiy tugma** bo'lishi kerak:

```
┌────────────────────────────┐
│ ┌────────────────────────┐ │
│ │      Product Image     │ │
│ └────────────────────────┘ │
│                            │
│ TWS Wireless Naushnik Pro  │
│ 185,000 UZS  ~~220,000~~  │
│ ⭐ 4.7  |  8,500 ta        │
│                            │
│ ┌────────────────────────┐ │
│ │     Tahlil qilish      │ │  ← expand panel ochadi
│ └────────────────────────┘ │
│ ┌──────────┐ ┌───────────┐ │
│ │ + Kuzatish│ │ Uzum da   │ │  ← tracking + external link
│ └──────────┘ └───────────┘ │
│                            │
│  ✓ Kuzatilmoqda            │  ← bosilgandan keyin (yashil)
└────────────────────────────┘
```

### 9.2 Tracking oqimi

```
User "Kuzatish" bosadi (hech qanday tahlilsiz, tezkor)
         │
         ▼
Frontend: POST /api/products/track-from-search
Body: { product_id: 123456 }
         │
         ▼
Backend (products.service.ts):
  1. Uzum API dan product detail olish
  2. Product upsert (DB da bo'lmasa yaratish)
  3. ProductSnapshot yaratish (score hisoblash)
  4. TrackedProduct yaratish (account_id bilan bog'lash)
  5. weekly-scrape job enqueue (fire-and-forget)
         │
         ▼
Frontend: Button holati "✓ Kuzatilmoqda" ga o'zgaradi
         │
         ▼
/dashboard sahifada mahsulot paydo bo'ladi
```

### 9.3 State boshqaruv (Frontend)

```typescript
// SearchPage.tsx da tracking state
const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());

// Sahifa yuklanganda: allaqachon kuzatilgan mahsulotlarni olish
useEffect(() => {
  productsApi.getTrackedIds().then(res => {
    setTrackedIds(new Set(res.data));
  });
}, []);

// Track button handler
async function handleTrack(productId: number) {
  await productsApi.trackFromSearch(productId);
  setTrackedIds(prev => new Set(prev).add(productId));
}
```

```typescript
// ProductSearchCard.tsx
<button
  onClick={() => onTrack(product.id)}
  disabled={isTracked}
  className={isTracked ? 'btn btn-sm btn-success' : 'btn btn-sm btn-outline'}
>
  {isTracked ? '✓ Kuzatilmoqda' : '+ Kuzatish'}
</button>
```

### 9.4 Backend endpoint

```typescript
// products.controller.ts
@Post('track-from-search')
@UseGuards(JwtAuthGuard, BillingGuard)
async trackFromSearch(
  @Body('product_id') productId: number,
  @Req() req: AuthRequest,
) {
  // 1. Product detail fetch + upsert + snapshot
  await this.productsService.analyzeProduct(BigInt(productId), req.user.account_id);
  // 2. Track
  await this.productsService.track(String(productId), req.user.account_id);
  return { tracked: true };
}

// Allaqachon kuzatilgan ID lar
@Get('tracked-ids')
@UseGuards(JwtAuthGuard)
async getTrackedIds(@Req() req: AuthRequest) {
  return this.productsService.getTrackedProductIds(req.user.account_id);
}
```

---

## 10. RAG FLOW — Ma'lumotlar oqimi arxitekturasi

### 10.1 To'liq RAG (Retrieve-Augment-Generate) diagramma

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VENTRA RAG FLOW                                 │
│                                                                         │
│  ┌─────────┐      ┌─────────┐      ┌──────────┐      ┌──────────────┐ │
│  │  USER   │─────→│ FRONTEND│─────→│  API     │─────→│   WORKER     │ │
│  │ Input   │      │ React   │      │  NestJS  │      │   BullMQ     │ │
│  └─────────┘      └─────────┘      └──────────┘      └──────────────┘ │
│       │                │                 │                    │         │
│       │           ┌────┴────┐      ┌─────┴──────┐     ┌──────┴───────┐│
│       │           │ Search  │      │ Uzum API   │     │ Bright Data  ││
│       │           │ Analyze │      │ CBU API    │     │ Claude AI    ││
│       │           │ Source  │      │ SerpAPI    │     │ Playwright   ││
│       │           └─────────┘      └────────────┘     └──────────────┘│
│       │                                  │                    │        │
│       │                            ┌─────┴────────────────────┘        │
│       │                            │                                   │
│       │                     ┌──────┴──────┐                            │
│       │                     │  DATABASE   │                            │
│       │                     │  PostgreSQL │                            │
│       │                     │  + Redis    │                            │
│       │                     └─────────────┘                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Ma'lumotlar bazasiga yozilish oqimlari

```
OQIM 1: SEARCH (Uzum qidiruv)
═══════════════════════════════
User: "naushnik" → Qidirish
  │
  ├─→ Uzum API: /api/v2/main/search/product?text=naushnik
  │   Response: UzumSearchProduct[] (id, title, price, rating, orders)
  │
  ├─→ DB ga YOZMAYDI (faqat ko'rsatish)
  │   Sabab: Qidiruv natijasi vaqtinchalik, DB da saqlab bo'lmaydi
  │   Faqat Redis cache: uzum:search:{hash} TTL=1h
  │
  └─→ Frontend: Card grid ko'rsatadi


OQIM 2: TRACK (Kuzatishga qo'shish)
═════════════════════════════════════
User: Card da "Kuzatish" bosadi
  │
  ├─→ Uzum API: /api/v2/product/{id}  (to'liq detail)
  │
  ├─→ DB YOZISH:
  │   ┌─────────────────────────────────────────────────┐
  │   │ 1. Shop UPSERT                                  │
  │   │    → shops table (id, title, rating, orders)     │
  │   │                                                  │
  │   │ 2. Product UPSERT                               │
  │   │    → products table (id, title, shop_id,         │
  │   │       sell_price, full_price, category_path,     │
  │   │       photo_urls, badges, title_uz)              │
  │   │                                                  │
  │   │ 3. ProductSnapshot INSERT                        │
  │   │    → product_snapshots table (product_id,        │
  │   │       orders_quantity, rating, feedback_quantity, │
  │   │       score, weekly_bought, sell_price,           │
  │   │       total_available_amount, snapshot_at)        │
  │   │                                                  │
  │   │ 4. TrackedProduct INSERT                         │
  │   │    → tracked_products table (account_id,         │
  │   │       product_id, added_at)                      │
  │   │                                                  │
  │   │ 5. SkuSnapshot INSERT (per SKU)                  │
  │   │    → sku_snapshots table (product_id, sku_id,    │
  │   │       sell_price, full_price, available_amount,   │
  │   │       stock_type, discount_badge)                 │
  │   └─────────────────────────────────────────────────┘
  │
  ├─→ BullMQ: weekly-scrape-queue (fire-and-forget)
  │   Worker → Playwright → weekly_bought banner scrape
  │   → ProductSnapshot UPDATE (weekly_bought_source='scraped')
  │
  └─→ Frontend: "✓ Kuzatilmoqda" + /dashboard da paydo bo'ladi


OQIM 3: ANALYZE (Tahlil qilish — expand panel)
═══════════════════════════════════════════════
User: Card da "Tahlil" bosadi
  │
  ├─→ [PARALLEL A] Uzum Product Detail
  │   → Uzum API: /api/v2/product/{id}
  │   → DB YOZISH: Product + ProductSnapshot + SkuSnapshot (OQIM 2 bilan bir xil)
  │   → Score hisoblash: 0.55*ln(1+wb) + 0.25*ln(1+orders) + 0.10*rating + 0.10*supply
  │   → AI explanation (Claude Haiku, optional)
  │   → Response → Frontend chap panel
  │
  ├─→ [PARALLEL B] Sourcing Job (Bright Data)
  │   → BullMQ: sourcing-search queue
  │   → Worker pipeline:
  │     │
  │     ├─ 1. AI Query Generation (Claude Haiku)
  │     │     Input:  "TWS Wireless Naushnik Pro"
  │     │     Output: { cn: "TWS蓝牙耳机", en: "TWS Bluetooth Earbuds" }
  │     │
  │     ├─ 2. Bright Data Parallel Search
  │     │     ┌── AliExpress: keyword=en_query, limit=10
  │     │     ├── 1688:       keyword=cn_query, limit=10
  │     │     └── Taobao:     keyword=cn_query, limit=10
  │     │
  │     │     DB YOZISH:
  │     │     ┌─────────────────────────────────────────┐
  │     │     │ ExternalSearchResult INSERT (per natija) │
  │     │     │   → job_id, platform_id, title,          │
  │     │     │     price_usd, currency, url, image_url, │
  │     │     │     seller_name, seller_rating,           │
  │     │     │     min_order_qty, shipping_days          │
  │     │     └─────────────────────────────────────────┘
  │     │
  │     ├─ 3. AI Match Scoring (Claude Haiku batch)
  │     │     → ExternalSearchResult UPDATE: ai_match_score, ai_notes
  │     │
  │     ├─ 4. Cargo Calculation (ai_match_score >= 0.5)
  │     │     ┌─────────────────────────────────────────┐
  │     │     │ CurrencyRate SELECT (USD, CNY, EUR)      │
  │     │     │ CargoProvider SELECT (cheapest)           │
  │     │     │                                          │
  │     │     │ Formula:                                  │
  │     │     │   cargo = weight * rate_per_kg             │
  │     │     │   customs = (cost+cargo) * 0.10           │
  │     │     │   vat = (cost+cargo+customs) * 0.12       │
  │     │     │   landed = cost + cargo + customs + vat   │
  │     │     │   margin = (uzum_price - landed) / uzum   │
  │     │     │                                          │
  │     │     │ CargoCalculation INSERT                   │
  │     │     │   → landed_cost_usd, landed_cost_uzs,    │
  │     │     │     gross_margin, roi, cargo_cost_usd     │
  │     │     └─────────────────────────────────────────┘
  │     │
  │     └─ 5. Final Ranking
  │           rank_score = 0.40*ROI + 0.25*match + 0.20*(1/days) + 0.15*rating
  │           → ExternalSearchResult UPDATE: rank
  │
  │   → ExternalSearchJob UPDATE: status=DONE
  │
  └─→ Frontend: poll → o'ng panel da manba narx card'lar


OQIM 4: WEEKLY CRON (Avtomatik yangilash)
═════════════════════════════════════════
Cron: */15 * * * * (har 15 daqiqada)
  │
  ├─→ TrackedProduct lar SELECT (next_scrape_at <= now)
  │
  ├─→ Har biri uchun:
  │   → Uzum API: product detail
  │   → ProductSnapshot INSERT (yangi score)
  │   → Playwright: weekly_bought banner scrape
  │   → ProductSnapshot UPDATE (weekly_bought_source='scraped')
  │
  └─→ TrackedProduct UPDATE: next_scrape_at = now + 7 days
```

### 10.3 Database Entity Relationship

```
┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐
│   Account    │────→│  TrackedProduct    │←────│    Product      │
│              │     │  (account_id,      │     │  (id, title,    │
│  id          │     │   product_id)      │     │   shop_id,      │
│  email       │     └────────────────────┘     │   sell_price)   │
│  plan        │                                │                 │
└──────┬───────┘                                └────────┬────────┘
       │                                                 │
       │     ┌──────────────────────────┐                │
       │     │   ProductSnapshot       │←───────────────┘
       │     │   (product_id,          │
       │     │    score, orders,       │
       │     │    weekly_bought,       │
       │     │    rating, snapshot_at) │
       │     └──────────────────────────┘
       │
       │     ┌──────────────────────────┐     ┌──────────────────┐
       ├────→│  ExternalSearchJob      │────→│ ExternalSearch   │
       │     │  (account_id,           │     │ Result           │
       │     │   product_id,           │     │ (job_id,         │
       │     │   query, status)        │     │  platform_id,    │
       │     └──────────────────────────┘     │  title, price,   │
       │                                      │  ai_match_score, │
       │                                      │  rank)           │
       │                                      └────────┬─────────┘
       │                                               │
       │     ┌──────────────────────────┐              │
       └────→│  CargoCalculation       │←─────────────┘
             │  (account_id,           │
             │   result_id,            │
             │   landed_cost_usd,      │
             │   gross_margin, roi)     │
             └──────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ ExternalPlatform │     │  CargoProvider   │
│ (code, name,     │     │  (name, origin,  │
│  api_type)       │     │   rate_per_kg)   │
└──────────────────┘     └──────────────────┘

┌──────────────────┐
│  CurrencyRate    │
│  (from, to, rate)│
└──────────────────┘

┌──────────────────┐
│  Shop            │
│  (id, title,     │
│   rating, orders)│
└──────────────────┘
```

### 10.4 Redis cache xaritasi

```
Redis Keys:

SEARCH CACHE:
  uzum:search:{keyword_hash}          → Uzum search natijalar, TTL=1h
  brightdata:search:{platform}:{hash} → Bright Data search, TTL=24h
  brightdata:detail:{platform}:{hash} → Bright Data detail, TTL=7d

JOB STATUS:
  bull:sourcing-search:{jobId}        → BullMQ job (auto-managed)
  bull:weekly-scrape:{jobId}          → Weekly scrape job

SESSION:
  session:{userId}                    → Auth session, TTL=24h

RATE LIMIT:
  ratelimit:{accountId}:search       → Search req counter, TTL=1min
  ratelimit:{accountId}:analyze      → Analyze req counter, TTL=1min
```

### 10.5 API Rate Limiting (VENTRA internal)

```
Foydalanuvchi plan bo'yicha limit:

| Endpoint           | FREE plan | PRO plan  | BUSINESS plan |
|--------------------|-----------|-----------|---------------|
| /products/search   | 10/soat   | 100/soat  | unlimited     |
| /uzum/analyze      | 5/soat    | 50/soat   | unlimited     |
| /sourcing/jobs     | 2/soat    | 20/soat   | unlimited     |
| /products/track    | 5/kun     | 50/kun    | 500/kun       |

Sabab: Bright Data har request uchun pul oladi — boshqaruv kerak
```

### 10.6 To'liq data lifecycle

```
YARATISH (Create):
  Search → faqat cache
  Track  → Product + Snapshot + TrackedProduct
  Analyze → Product + Snapshot + ExternalSearchJob + Results + CargoCalc

YANGILASH (Update):
  Weekly cron → yangi Snapshot (score trend)
  Weekly scrape → weekly_bought (Playwright)
  Currency refresh → CurrencyRate (CBU API, 1x/kun)

O'CHIRISH (Delete):
  User untrack → TrackedProduct DELETE (Product, Snapshot saqlanadi)
  Job cleanup → ExternalSearchResult DELETE (1h TTL completed, 24h failed)
  Old snapshots → ProductSnapshot DELETE (90 kundan eski)

AGGREGATE (Read):
  Dashboard → TrackedProduct JOIN Product JOIN latest Snapshot
  Score history → ProductSnapshot WHERE product_id ORDER BY snapshot_at
  Sourcing results → ExternalSearchResult JOIN CargoCalculation WHERE job_id
```

---

*Hisobot tugadi | 2026-03-08 | VENTRA Analytics Platform*
