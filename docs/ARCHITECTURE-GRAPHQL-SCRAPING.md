# VENTRA — GraphQL Scraping Architecture v2
# Sana: 2026-03-20
# Muallif: Bekzod + Claude recon session
# Mas'ul: Ziyoda (implementation)

---

## 1. MUAMMO — Hozirgi scraping tizimi cheklovlari

Hozirgi tizim **faqat REST API + Playwright DOM** ga tayanadi:
- `GET api.uzum.uz/api/v2/product/{id}` — mahsulot detalari (ISHLAYDI)
- `GET api.uzum.uz/api/v2/main/search/product?categoryId=...` — discovery (TEZ-TEZ 500 XATO)
- Playwright DOM scraper — `weekly_bought` banner (SEKIN, 1 concurrency)

**Asosiy muammolar:**
1. Discovery service tez-tez 500 qaytaradi → kategoriya bo'yicha mahsulot topish ishlamaydi
2. Playwright discovery sekin (max 200 mahsulot, 20s timeout, Chromium kerak)
3. Nasiya ma'lumotlari chala (faqat 2 davr, 1 SKU)
4. Shop ma'lumotlari alohida so'rov talab qiladi
5. Uzum Card narxlari, chegirma tiplari, isBestPrice — umuman olinmaydi

---

## 2. YECHIM — Uzum GraphQL API

### 2.1 Token olish

Uzum saytiga kirganida brauzer avtomatik **guest JWT token** oladi:

```
POST https://id.uzum.uz/api/auth/token → 204
```

Token joylari:
- Cookie: `access_token=eyJ...`
- localStorage: `auth_sdk_access_token`

**Token xususiyatlari:**
- Login shart emas — guest token avtomatik
- Muddati: ~6 soat (exp field JWT ichida)
- Aud: `["uzum_apps", "market/web"]`
- Algoritm: EdDSA

### 2.2 GraphQL endpoint

```
POST https://graphql.uzum.uz/

Headers (MAJBURIY):
  Content-Type: application/json
  Authorization: Bearer {access_token}
  Accept-Language: ru-RU
  apollographql-client-name: web-customers
  apollographql-client-version: 1.63.2
  x-iid: {installId}  (ixtiyoriy)
```

### 2.3 Token yangilash strategiyasi

```
1. Worker start → Chromium headless → uzum.uz → token olish
2. Token in-memory cache (5 soat TTL)
3. Har so'rov oldin → token expired? → yangilash
4. Yangilash: Chromium → uzum.uz → yangi token → cache
5. Fallback: agar Chromium fail → REST API ga qaytish
```

---

## 3. MAVJUD GRAPHQL QUERYLAR

Introspection orqali **45 ta query** topildi. Bizga keraklilari:

### 3.1 makeSearch — Kategoriya/Qidiruv (DISCOVERY O'RNIGA)

```graphql
query getMakeSearch($queryInput: MakeSearchQueryInput!) {
  makeSearch(query: $queryInput) {
    total
    items {
      catalogCard {
        __typename
        ... on SkuGroupCard {
          productId
          title
          ordersQuantity
          feedbackQuantity
          minFullPrice
          minSellPrice
          rating
          badges { id text textColor backgroundColor __typename }
          buyingOptions {
            isBestPrice
            deliveryOptions { shortDate stockType textDeliveryWithDate }
          }
          discount {
            discountPrice
            discountAmount
            paymentOptionKey
            sellDiscountPercent
          }
          discountInfo { text textColor backgroundColor }
        }
      }
    }
    facets { filter { id title type } buckets { filterValue { id name } total } }
    category { id title parent { id title } }
  }
}
```

**Variables:**
```json
{
  "queryInput": {
    "text": "iphone",           // yoki bo'sh qoldirish
    "showAdultContent": "NONE",  // STRING, boolean emas!
    "filters": [],
    "sort": "BY_RELEVANCE_DESC", // BY_ORDERS_DESC, BY_PRICE_ASC, etc.
    "pagination": { "offset": 0, "limit": 48 },
    "correctQuery": true,
    "getFastCategories": true,
    "fastCategoriesLimit": 11,
    "getPromotionItems": false,
    "getFastFacets": false,
    "fastFacetsLimit": 0
  }
}
```

**Sinov natijasi:** "iphone" → 482 ta mahsulot, pagination bilan hammasi olinadi.

**Hozirgi muammoni qanday yechadi:**
- REST discovery 500 xato → GraphQL **barqaror ishlaydi**
- Playwright max 200 → GraphQL **48 tadan, cheksiz pagination**
- DOM scraper 20s timeout → GraphQL **<1s response**

### 3.2 productPage — Mahsulot detalari (REST O'RNIGA)

```graphql
query productPage($id: Int!) {
  productPage(id: $id) {
    product {
      id title shortDescription
      ordersQuantity rating feedbackQuantity feedbackPhotosCount
      minFullPrice minSellPrice isBlockedOrArchived
      localizableTitle { titleRu titleUz }
      category { id title parent { id title parent { id title } } }
      shop {
        id title rating ordersQuantity feedbackQuantity official url
      }
      badges { id text textColor backgroundColor __typename }
      skuList {
        id fullPrice sellPrice availableAmount
        discountBadge { text }
        stock { type }
        paymentOptions { paymentPerMonth period }
        characteristicValues { id title value }
      }
      characteristics { title values { id title value } }
      photos { key link(trans: PRODUCT_540) { high low } }
    }
    installmentWidget {
      calculationsPairs {
        skuId
        isDefault
        calculations { month text paymentPerMonth }
      }
    }
  }
}
```

**Sinov natijasi (productId: 1983388):**
- `ordersQuantity: 200`
- `rating: 4.8`
- `feedbackQuantity: 42`
- `shop: { title: "Macintosh_uz", rating: 4.9, ordersQuantity: 638 }`
- `category: { title: "Смартфоны Apple iPhone (iOS)", parent: { title: "Смартфоны" } }`
- `skuList: 30 ta` — har birida fullPrice, sellPrice, availableAmount, stock.type
- `installmentWidget: 30 SKU × 4 davr` (3, 6, 12, 24 oy)

**Hozirgi REST bilan taqqoslash:**

| Field | REST API | GraphQL productPage |
|-------|----------|---------------------|
| ordersQuantity | `ordersAmount` | `ordersQuantity` |
| totalAvailableAmount | BOR | **YO'Q** — REST kerak |
| titleRu / titleUz | `localizableTitle.ru/.uz` | `localizableTitle { titleRu titleUz }` |
| category chain | Manual nested parse | Tayyor nested — `parent { parent }` |
| shop details | Alohida so'rov | **1 so'rovda** |
| sku.sellPrice | `purchasePrice` | `sellPrice` |
| sku.stock.type | `stock.type` | `stock { type }` |
| installment | 2 davr, 1 SKU | **4 davr × barcha SKU** |
| photos | Manual URL build | `link(trans: PRODUCT_540) { high }` |

### 3.3 getSuggestions — Marketplace TOP mahsulotlar

```graphql
query Suggestions($input: GetSuggestionsInput!, $limit: Int!) {
  getSuggestions(query: $input) {
    blocks {
      ... on RecommendedSuggestionsBlock {
        content {
          content {
            productId title ordersQuantity feedbackQuantity rating
            minFullPrice minSellPrice
            discount { discountPrice discountAmount paymentOptionKey sellDiscountPercent }
            discountInfo { text backgroundColor }
            badges { id text __typename }
            buyingOptions {
              isBestPrice isSingleSku defaultSkuId
              deliveryOptions { shortDate stockType }
            }
          }
        }
      }
      ... on TextSuggestionsBlock { values }
      ... on CategorySuggestionsBlock { categories { id title } }
      ... on ShopSuggestionsBlock { shops { id title } }
    }
  }
}
```

**Bo'sh query natijasi:** Uzumning **TOP-45 eng ommabop mahsulotlari** + Uzum Card narxlari.

**YANGI fieldlar (hozir scrape qilinmaydi):**
- `discount.discountPrice` — Uzum Card bilan haqiqiy narx
- `discount.discountAmount` — % chegirma (Uzum Card)
- `discount.sellDiscountPercent` — Sotuvchi tomoni %
- `buyingOptions.isBestPrice` — Eng arzon sotuvchi belgisi
- `deliveryOptions.stockType` — FBO/FBS/**DBS** (yangi tur!)
- `deliveryOptions.shortDate` — "Завтра", "25 марта"

### 3.4 similarProducts — Raqobatchi mahsulotlar (YANGI)

```graphql
query similarProducts($productId: Int!, $limit: Int!) {
  similarProducts(productId: $productId, limit: $limit) {
    blocks {
      ... on ProductRecommendationBlock {
        products {
          ... on SkuGroupCard {
            productId title ordersQuantity minSellPrice rating
          }
        }
      }
    }
  }
}
```

**Foyda:** Har bir tracked mahsulot uchun avtomatik raqobatchi ro'yxati.

### 3.5 category — Kategoriya daraxti

```graphql
query category($id: Int!) {
  category(id: $id) {
    id title
    parent { id title parent { id title } }
  }
}
```

### 3.6 Boshqa foydali querylar

| Query | Args | Maqsad |
|-------|------|--------|
| `skuCard(id)` | SKU ID | Per-SKU batafsil narx/stok |
| `skuAlternativeCards(id, page, size)` | SKU ID | Boshqa sotuvchilardan narx |
| `bundles(productIds)` | Product IDs | Komplekt mahsulotlar |
| `getPromotionShelf(query)` | Query | Aksiya mahsulotlari |
| `globalSearchProducts(input)` | Input | Global qidiruv (makeSearch dan farqli) |

---

## 4. YANGI SCRAPING ARXITEKTURA

### 4.1 Umumiy flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKEN MANAGER                             │
│  Chromium headless → uzum.uz → JWT → in-memory cache (5h)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ token
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  ┌───────────┐     ┌───────────┐     ┌───────────────┐
  │ DISCOVERY │     │  PRODUCT  │     │  MARKETPLACE   │
  │  GraphQL  │     │  DETAIL   │     │  INTELLIGENCE  │
  │ makeSearch│     │ productPg │     │ getSuggestions │
  │           │     │ + REST    │     │ similarProds   │
  └─────┬─────┘     └─────┬─────┘     └───────┬───────┘
        │                 │                    │
        ▼                 ▼                    ▼
  ┌─────────────────────────────────────────────────┐
  │               DATABASE (Prisma)                  │
  │  Products, Snapshots, Skus, Shops, Categories    │
  └─────────────────────────────────────────────────┘
```

### 4.2 Layer tafsiloti

**Layer 1: Token Manager**
- Worker startup da Chromium → uzum.uz → JWT token
- In-memory cache, 5 soat TTL
- Auto-refresh: token expired → yangi Chromium session
- Fallback: Chromium fail → REST-only mode

**Layer 2: Discovery (GraphQL makeSearch)**
- Playwright DOM scraper O'RNIGA
- 48 mahsulot/sahifa, pagination bilan barcha mahsulotlar
- Sort: BY_ORDERS_DESC, BY_RELEVANCE_DESC
- Filters: categoryId, narx range, etc.
- Natija: product ID lar ro'yxati + qisqa ma'lumot

**Layer 3: Product Detail (GraphQL + REST hybrid)**
- GraphQL `productPage` — 14 key + shop + badges + installment
- REST `/api/v2/product/{id}` — faqat `totalAvailableAmount` uchun (GraphQL da yo'q)
- Parallel: GraphQL va REST bir vaqtda so'rov yuboriladi
- Merge: ikkalasining natijasi birlashtiriladi

**Layer 4: weekly_bought (Playwright — O'ZGARMAYDI)**
- GraphQL da ham `weekly_bought` YO'Q
- Playwright DOM banner scraping davom etadi
- 4 strategiya: SSR regex → HTML regex → DOM TreeWalker → Badge img

**Layer 5: Marketplace Intelligence (GraphQL — YANGI)**
- `getSuggestions` → TOP-45 mahsulotlar monitoring
- `similarProducts` → competitor tahlil
- `installmentWidget` → nasiya foiz tahlili
- Kuniga 1-2 marta ishga tushadi

### 4.3 GraphQL vs REST — qayerda nima ishlatiladi

| Ma'lumot | Manba | Sabab |
|----------|-------|-------|
| Discovery (search/category) | **GraphQL makeSearch** | REST 500 xato beradi |
| Product detail (14 key) | **GraphQL productPage** | 1 so'rovda hammasi |
| totalAvailableAmount | **REST** | GraphQL da yo'q |
| weekly_bought | **Playwright DOM** | Hech qayerda API yo'q |
| Shop details | **GraphQL productPage** | Alohida so'rov shart emas |
| Installment (nasiya) | **GraphQL installmentWidget** | 4 davr × barcha SKU |
| TOP mahsulotlar | **GraphQL getSuggestions** | Yangi imkoniyat |
| Competitor tahlil | **GraphQL similarProducts** | Yangi imkoniyat |

### 4.4 Qolayotgan cheklovlar

| Cheklov | Tushuntirish | Yechim |
|---------|-------------|--------|
| `totalAvailableAmount` | GraphQL Product da yo'q | REST parallel so'rov |
| `weekly_bought` | Hech qayerda API yo'q | Playwright DOM (avvalgidek) |
| Token expiry | JWT ~6 soat | Auto-refresh via Chromium |
| Rate limit | Noma'lum (hali block qilinmagan) | Jitter + backoff |

---

## 5. IMPLEMENTATION KETMA-KETLIGI

Quyidagi tasklar **Ziyoda** tomonidan **ketma-ket** bajariladi:

```
BATCH 1: Infra (T-432, T-433)
  T-432: GraphQL client + token manager
  T-433: makeSearch discovery

BATCH 2: Product (T-434, T-435)
  T-434: productPage product detail
  T-435: REST totalAvailableAmount hybrid

BATCH 3: Intelligence (T-436, T-437, T-438)
  T-436: installmentWidget nasiya
  T-437: getSuggestions top monitoring
  T-438: similarProducts competitor

BATCH 4: Migration (T-439)
  T-439: Discovery processor migration (Playwright → GraphQL)
```

---

## 6. TEXNIK QARORLAR

### 6.1 GraphQL client tanlovi
- **Oddiy fetch** (node-fetch yoki built-in) — Apollo client shart emas
- Query lar string template sifatida saqlanadi
- Response typing: TypeScript interface lar `packages/types/` da

### 6.2 Token saqlash
- In-memory (worker process ichida) — DB ga yozish shart emas
- `TokenManager` class — singleton, auto-refresh
- `getToken()` — expired bo'lsa yangilaydi, cached bo'lsa qaytaradi

### 6.3 Error handling
- GraphQL 401 → token refresh → retry (1 marta)
- GraphQL 400 → log error, skip (query xatosi)
- GraphQL 429 → exponential backoff (rate limit)
- GraphQL 5xx → fallback REST API ga

### 6.4 Monitoring
- `graphql_requests_total` counter
- `graphql_errors_total` counter (by error type)
- `graphql_latency_ms` histogram
- `token_refreshes_total` counter
- MetricsService ga qo'shiladi

---

*ARCHITECTURE-GRAPHQL-SCRAPING.md | VENTRA Analytics Platform | 2026-03-20*
