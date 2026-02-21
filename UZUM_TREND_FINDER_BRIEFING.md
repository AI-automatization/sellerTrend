# UZUM TREND FINDER — TO'LIQ LOYIHA TAVSIFI (Claude CLI uchun)

> Bu hujjat Claude CLI ga loyihani to'liq tushuntirish va davom ettirish uchun tayyorlangan.
> Barcha muhim qarorlar, arxitektura, schema, API tuzilmasi va keyingi qadamlar shu yerda.

---

## 1. LOYIHA MOHIYATI

**Uzum Trend Finder** — O'zbekistonning eng katta marketplace'i bo'lgan [uzum.uz](https://uzum.uz) platformasi uchun **SaaS analitika tizimi**.

Maqsad: Sotuvchilar va tadbirkorlar uchun qaysi mahsulotlar tez sotilayotganini, qaysi kategoriyalar "issiq" ekanligini real vaqtda ko'rsatadigan dashboard yaratish.

**Biznes modeli:** Kunlik obuna to'lovi (`daily_fee`) — admin tomonidan dinamik o'rnatiladi (default 50,000 сум/kun). Balance yetmasa → `PAYMENT_DUE` status, 402 xato, data bloklanadi.

---

## 2. TEXNIK STACK

```
Backend:   NestJS + TypeScript + Prisma + PostgreSQL
Queue:     BullMQ + Redis
Frontend:  React (Vite) + Tailwind CSS + Recharts
Bot:       Telegram (grammY library)
AI:        Anthropic Claude API
Auth:      JWT + RBAC (multi-tenant)
Monorepo:  apps/api | apps/worker | apps/web
```

---

## 3. UZUM API — GRAPHQL ENDPOINT TAHLILI

### 3.1 Asosiy endpoint
```
POST https://graphql.uzum.uz/
Content-Type: application/json
```

### 3.2 Kategoriya listing (makeSearch query)
Uzum'dan real response olindi va tahlil qilindi. Response strukturasi:

```typescript
// makeSearch query response
interface MakeSearchResponse {
  data: {
    makeSearch: {
      items: Item[];
      total: number;
      facets: Facet[];
      fastCategories: CategoryEntry[];
    }
  }
}

interface Item {
  catalogCard: {
    __typename: "SkuGroupCard";
    id: number;           // skuGroupId (listing ID)
    productId: number;    // asosiy product ID
    ordersQuantity: number; // KUMULYATIV buyurtmalar soni ← asosiy metric
    feedbackQuantity: number;
    rating: number;       // 4.7 - 5.0
    minSellPrice: number; // сум (tiyin EMAS)
    minFullPrice: number;
    title: string;
    discount: {
      discountPrice: number;      // Uzum card narxi
      fullDiscountPercent: number; // umumiy chegirma %
      sellDiscountPercent: number; // qo'shimcha chegirma %
      paymentOptionKey: string;   // "uzum-card"
    };
    buyingOptions: {
      defaultSkuId: number;
      isBestPrice: boolean;
      isSingleSku: boolean;
      deliveryOptions: {
        stockType: "FBO" | "FBS"; // FBO=omborda, FBS=sotuvchida
        shortDate: string;        // "Завтра"
      }
    };
    badges: Badge[];
    photos: Photo[];
    characteristicValues: any[];
  };
}
```

### 3.3 MUHIM: weekly_bought field
`makeSearch` response'da **weekly_bought yo'q** — u faqat **product detail page** (`productPage` query)da keladi. Bu field `actions.text` ichida matn sifatida keladi: `"1234 кишиlar bu haftada sotib oldi"` kabi.

**Parser strategiyasi:**
```typescript
function parseWeeklyBought(actionsText: string): number | null {
  // Ru: "X человек купили на этой неделе"
  // Uz: "X kishi bu hafta sotib oldi"
  const match = actionsText.match(/(\d[\d\s]*)\s*(человек|kishi|нафар)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/\s/g, ''));
}
```

**Fallback:** `ordersQuantity` delta (snapshot farqi orqali)

---

## 4. DATABASE SCHEMA (12 jadval)

```sql
-- AUTH / BILLING
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE | PAYMENT_DUE | SUSPENDED
  balance BIGINT DEFAULT 0,            -- сум, tiyin emas
  daily_fee BIGINT,                    -- NULL = global default ishlatiladi
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'USER',     -- SUPER_ADMIN | ADMIN | USER
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  type VARCHAR(50) NOT NULL,           -- CHARGE | DEPOSIT | REFUND
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,        -- DAILY_FEE_CHANGED | STATUS_CHANGED
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SYSTEM SETTINGS
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,        -- "daily_fee_default"
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO system_settings VALUES ('daily_fee_default', '50000');

-- UZUM DATA
CREATE TABLE shops (
  id BIGINT PRIMARY KEY,               -- Uzum shop ID
  title VARCHAR(500),
  rating DECIMAL(3,2),
  orders_quantity BIGINT,
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY,               -- productId (Uzum)
  sku_group_id BIGINT,                 -- skuGroupId (listing)
  shop_id BIGINT REFERENCES shops(id),
  title TEXT NOT NULL,
  category_id BIGINT,
  rating DECIMAL(3,2),
  feedback_quantity INT DEFAULT 0,
  orders_quantity BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skus (
  id BIGINT PRIMARY KEY,               -- defaultSkuId (Uzum)
  product_id BIGINT REFERENCES products(id),
  min_sell_price BIGINT,
  min_full_price BIGINT,
  stock_type VARCHAR(10),              -- FBO | FBS
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT REFERENCES products(id),
  orders_quantity BIGINT,
  weekly_bought INT,                   -- NULL = parse qilinmadi
  rating DECIMAL(3,2),
  feedback_quantity INT,
  score DECIMAL(8,4),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sku_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id BIGINT REFERENCES skus(id),
  sell_price BIGINT,
  full_price BIGINT,
  discount_percent INT,
  stock_type VARCHAR(10),
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISCOVERY
CREATE TABLE category_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  category_id BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING | RUNNING | DONE | FAILED
  total_products INT,
  processed INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE category_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES category_runs(id),
  product_id BIGINT REFERENCES products(id),
  score DECIMAL(8,4),
  rank INT,
  weekly_bought INT,
  orders_quantity BIGINT,
  sell_price BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  product_id BIGINT REFERENCES products(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, product_id)
);

-- ALERTS
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  product_id BIGINT REFERENCES products(id),
  rule_type VARCHAR(50) NOT NULL,      -- PRICE_DROP | STOCK_LOW | SCORE_SPIKE
  threshold DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id),
  product_id BIGINT REFERENCES products(id),
  message TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI TABLES
CREATE TABLE product_ai_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT REFERENCES products(id) UNIQUE,
  brand VARCHAR(255),
  model VARCHAR(255),
  type VARCHAR(255),
  color VARCHAR(255),
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_ai_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT REFERENCES products(id),
  snapshot_id UUID REFERENCES product_snapshots(id),
  explanation TEXT,                    -- "Nima uchun hot" — 2-4 bullet
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. SCORING ALGORITMI

```typescript
// Momentum-first formula
function calculateScore(product: {
  weekly_bought: number | null;
  orders_quantity: number;
  rating: number;
  supply_pressure: number; // stock_type FBO=1, FBS=0.5
}): number {
  const wb = product.weekly_bought ?? 0;
  const oq = product.orders_quantity;
  
  return (
    0.55 * Math.log(1 + wb) +
    0.25 * Math.log(1 + oq) +
    0.10 * product.rating +
    0.10 * product.supply_pressure
  );
}
```

**Real misol (Svetocopy A4):**
```
weekly_bought = ? (detail page kerak)
orders_quantity = 26,500
rating = 4.9
supply_pressure = 1.0 (FBO)

score = 0.55*log(1+0) + 0.25*log(26501) + 0.10*4.9 + 0.10*1.0
      = 0 + 0.25*10.185 + 0.49 + 0.10
      = 0 + 2.546 + 0.59 = 3.136 (weekly_bought yo'q holda)
```

---

## 6. BILLING TIZIMI

### 6.1 Kunlik charge (cron 00:00)
```typescript
// apps/worker/src/jobs/billing.job.ts
async function dailyChargeCron() {
  const defaultFee = await getSystemSetting('daily_fee_default'); // "50000"
  
  const accounts = await prisma.account.findMany({
    where: { status: 'ACTIVE' }
  });
  
  for (const account of accounts) {
    const fee = account.daily_fee ?? BigInt(defaultFee);
    
    if (account.balance >= fee) {
      // Yechib ol
      await prisma.$transaction([
        prisma.account.update({
          where: { id: account.id },
          data: { balance: { decrement: fee } }
        }),
        prisma.transaction.create({
          data: {
            account_id: account.id,
            type: 'CHARGE',
            amount: fee,
            balance_before: account.balance,
            balance_after: account.balance - fee,
            description: `Daily fee charge: ${new Date().toISOString().split('T')[0]}`
          }
        })
      ]);
    } else {
      // PAYMENT_DUE ga o'tkazib qo'y
      await prisma.account.update({
        where: { id: account.id },
        data: { status: 'PAYMENT_DUE' }
      });
    }
  }
}
```

### 6.2 402 Middleware
```typescript
// apps/api/src/middleware/billing.middleware.ts
export function billingGuard(): NestMiddleware {
  return async (req, res, next) => {
    const account = req.user?.account;
    
    if (account?.status === 'PAYMENT_DUE') {
      return res.status(402).json({
        error: 'PAYMENT_DUE',
        message: 'Balansingiz yetarli emas. Hisobni to\'ldiring.',
        balance: account.balance
      });
    }
    
    next();
  };
}
```

### 6.3 Dynamic daily_fee
```typescript
// Admin: global fee o'zgartirish
async updateGlobalDailyFee(newFee: number, adminUserId: string) {
  const oldValue = await getSystemSetting('daily_fee_default');
  
  await prisma.$transaction([
    prisma.systemSetting.update({
      where: { key: 'daily_fee_default' },
      data: { value: String(newFee) }
    }),
    prisma.auditEvent.create({
      data: {
        user_id: adminUserId,
        action: 'GLOBAL_FEE_CHANGED',
        old_value: { fee: oldValue },
        new_value: { fee: String(newFee) }
      }
    })
  ]);
}

// Admin: per-account fee o'zgartirish
async updateAccountDailyFee(accountId: string, newFee: number | null) {
  // NULL = global defaultga qaytarish
  await prisma.account.update({
    where: { id: accountId },
    data: { daily_fee: newFee }
  });
}
```

---

## 7. UZUM HARVESTER (NestJS Service)

```typescript
// apps/api/src/uzum/uzum.client.ts
@Injectable()
export class UzumClient {
  private readonly baseUrl = 'https://graphql.uzum.uz/';
  
  // Category listing pagination
  async fetchCategoryListing(categoryId: number, page: number = 0): Promise<Item[]> {
    const payload = {
      operationName: "makeSearch",
      query: MAKE_SEARCH_QUERY, // GraphQL query
      variables: {
        queryInput: {
          categoryId,
          pagination: { offset: page * 48, limit: 48 },
          showAdultContent: "HIDE",
          filters: [],
          sort: "BY_RELEVANCE_DESC"
        }
      }
    };
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
        'Origin': 'https://uzum.uz',
        'Referer': 'https://uzum.uz/',
      },
      body: JSON.stringify(payload)
    });
    
    // 403/429 handling
    if (response.status === 429) {
      await sleep(5000);
      return this.fetchCategoryListing(categoryId, page); // retry
    }
    
    const data = await response.json();
    return data.data.makeSearch.items;
  }
  
  // Product detail (weekly_bought uchun)
  async fetchProductDetail(productId: number): Promise<ProductDetail> {
    const payload = {
      operationName: "productPage",
      query: PRODUCT_PAGE_QUERY,
      variables: { productId }
    };
    // ...
  }
}
```

**Rate limiting:** 1-2 req/sec. Proxy rotation MVP dan boshlab.

---

## 8. CLAUDE AI INTEGRATSIYASI

### 8.1 Foydalanish holatlari (3 ta)

**1. Attribute extraction (bir marta, cache):**
```typescript
const prompt = `
Mahsulot nomi: "${product.title}"
Quyidagi JSON formatida qaytaring (boshqa hech narsa yozmang):
{
  "brand": "...",
  "model": "...",
  "type": "...",
  "color": "...",
  "volume_ml": null
}
`;
```

**2. Winner explanation (snapshot o'zgarganida):**
```typescript
const prompt = `
Mahsulot: ${title}
Score: ${score}
Weekly bought: ${weekly_bought}
Orders total: ${orders_quantity}
Discount: ${discount_percent}%

Nima uchun bu mahsulot "hot" ekanligini 2-4 ta qisqa bulletda tushuntir.
Faqat JSON massiv qaytir: ["...", "...", "..."]
`;
```

**3. Duplicate clustering: pgvector ishlatiladi (Claude EMAS)**
```sql
-- Embedding saqlash
ALTER TABLE products ADD COLUMN embedding vector(1536);
-- Similarity search
SELECT * FROM products
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

### 8.2 Cost control
- Attribute extraction: bir marta, `product_ai_attributes` ga cache
- Explanation: `snapshot_id` bo'yicha cache — har snapshot uchun bir marta
- Clustering: pgvector (Claude API xarajati yo'q)

---

## 9. FAZA REJASI

### Faza 1 (1.5 oy) — MVP
- [x] Monorepo setup (apps/api, apps/worker, apps/web)
- [ ] Auth: JWT login/register, RBAC middleware
- [ ] Uzum GraphQL client (makeSearch + productPage)
- [ ] URL Analyze flow: URL → product/sku/shop upsert → snapshot → score
- [ ] Basic client dashboard: mahsulot ko'rish, score, narx
- [ ] Billing: daily charge cron, 402 middleware

### Faza 2 (1 oy)
- [ ] Admin panel: accounts list, daily_fee inline edit, audit log
- [ ] Balance top-up flow
- [ ] Paused banner (402 state uchun UI)

### Faza 3 (1 oy)
- [ ] Category Discovery flow: pagination, shortlist, queue jobs
- [ ] Winners leaderboard
- [ ] Telegram alerts (grammY)

### Faza 4
- [ ] Claude AI (attribute + explanation)
- [ ] pgvector clustering
- [ ] Advanced features (7-day forecast, anomaly detector)

---

## 10. MULTI-TENANT SECURITY (KUN 1 DAN)

```typescript
// Prisma middleware — account_id auto-scoping
prisma.$use(async (params, next) => {
  const accountScopedModels = [
    'tracked_products', 'category_runs', 'alert_rules', 'alert_events'
  ];
  
  if (accountScopedModels.includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        account_id: currentAccountId // request contextdan
      };
    }
  }
  
  return next(params);
});
```

**Alternativa:** PostgreSQL Row Level Security (RLS) — yanada kuchli.

---

## 11. CATEGORY DISCOVERY FLOW

```
Trigger (6h/12h/daily cron yoki manual)
     ↓
category_runs jadvalga yoz (PENDING)
     ↓
BullMQ queue ga job qo'sh
     ↓
Worker: makeSearch pagination loop (48 ta/page)
     ↓
Har mahsulot uchun: productPage query → weekly_bought
     ↓
Score hisoblash
     ↓
Top-N (masalan top 20) → category_winners ga saqlash
     ↓
run status = DONE
     ↓
(optional) Telegram xabar yuborish
```

---

## 12. REAL RESPONSE DAN OLINGAN MUHIM MA'LUMOTLAR

Uzum `makeSearch` response tahlilidan aniqlandi:

1. **Narxlar сум hisobida** (tiyin emas) — 46,990 = 46,990 сум
2. **`ordersQuantity` kumulyativ** — bu delta tracking uchun asosiy signal
3. **`feedbackQuantity`** eng ko'p: Svetocopy A4 — 40,065 review (platforma lideri)
4. **Badge turlari:**
   - `UzumInstallmentTitleBadge` — muddatli to'lov (oylik narx ko'rsatiladi)
   - `BottomTextBadge` — "ГАРАНТИЯ НИЗКОЙ ЦЕНЫ" (price guarantee)
   - `BottomIconTextBadge` — "ОРИГИНАЛ" (verified)
5. **`isBestPrice: true`** — Uzum bu mahsulotni eng arzon sifatida belgilagan
6. **`stockType: "FBO"`** — barcha ko'rilgan mahsulotlar FBO (Uzum omborida)
7. **`total: 3381`** — bu qidiruvda jami mahsulot soni (pagination uchun)

---

## 13. DIRECTORY STRUCTURE

```
uzum-trend-finder/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # JWT, guards, decorators
│   │   │   ├── billing/        # daily_fee, transactions, gating
│   │   │   ├── uzum/           # GraphQL client, normalizer
│   │   │   ├── products/       # CRUD, snapshots
│   │   │   ├── discovery/      # category runs, winners
│   │   │   ├── alerts/         # rules, events
│   │   │   ├── ai/             # Claude integration
│   │   │   └── admin/          # admin endpoints
│   │   └── prisma/
│   │       └── schema.prisma
│   ├── worker/                 # BullMQ workers
│   │   └── src/
│   │       ├── jobs/
│   │       │   ├── billing.job.ts
│   │       │   ├── discovery.job.ts
│   │       │   └── snapshot.job.ts
│   │       └── processors/
│   └── web/                    # React frontend
│       └── src/
│           ├── pages/
│           │   ├── Dashboard/
│           │   ├── Discovery/
│           │   ├── Product/
│           │   ├── Alerts/
│           │   ├── Billing/
│           │   └── Admin/
│           └── components/
├── packages/
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities (scoring, parser)
├── docker-compose.yml          # postgres + redis
└── .env.example
```

---

## 14. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/uzum_trend_finder"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret"
JWT_EXPIRES_IN="7d"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Telegram
TELEGRAM_BOT_TOKEN="..."

# Proxy (residential, muhim!)
PROXY_URL="http://user:pass@proxy-host:port"

# App
PORT=3000
NODE_ENV="development"
```

---

## 15. NAVBATDAGI QADAMLAR (HOZIR)

**Eng birinchi bajarilishi kerak:**

1. `pnpm init` → monorepo setup (turbo.json)
2. `apps/api` — NestJS + Prisma init
3. `prisma/schema.prisma` — barcha 12 jadval
4. `apps/worker` — BullMQ setup
5. `apps/web` — Vite + React + Tailwind

**Birinchi ishlaydigan feature:**
URL Analyze → `https://uzum.uz/product/12345` → backend → Uzum API → score → dashboard

---

## 16. RISKLAR VA YECHIMLAR

| Risk | Muammo | Yechim |
|------|--------|--------|
| Uzum blocking | 403/429, IP ban | Residential proxy rotation (MVP dan) |
| weekly_bought parsing | Matn o'zgarishi → score=0 | Test suite + fallback + monitoring |
| Claude xarajati | 3 call × 500 mahsulot | Caching + pgvector clustering |
| Scope explosion | 12 EPIC juda ko'p | Faza 1-4 bo'lib chiqarish |
| Multi-tenant leak | account_id filtering | Prisma middleware yoki PostgreSQL RLS |

---

## 17. SCORING MISOLLARI (Real data)

| Mahsulot | orders_qty | weekly_bought | score (wb=0) |
|---------|-----------|---------------|-------------|
| Svetocopy A4 | 26,500 | ? | 3.14+ |
| Мука MAKFA | 9,000 | ? | 2.95+ |
| Влажные салфетки Esty | 3,500 | ? | 2.52+ |
| Туалетная бумага Esty | 7,500 | ? | 2.87+ |
| Fairy Яблоко 450мл | 6,500 | ? | 2.82+ |

*weekly_bought detail page dan olinadi — u bilan score 2-3x oshadi*

---

## XULOSA

Bu loyiha **Uzum marketplace'i uchun eng birinchi professional trend analytics SaaS** bo'ladi. Arxitektura production-ready, biznes logikasi to'g'ri o'ylangan. Asosiy muvaffaqiyat omillari:

1. **Faza bo'yicha release** — MVP birinchi, feature keyinroq
2. **Proxy infratuzilmasi** — MVP dan boshlab, keyin emas
3. **Multi-tenant scoping** — kun 1 dan, keyin retrofit qilish mumkin emas
4. **Claude xarajat nazorati** — pgvector clustering, aggressive caching
5. **weekly_bought monitoring** — parser buzilsa alert bo'lishi kerak

---
*Hujjat tayyorlangan: 2026-02-22 | Versiya: 1.0*
