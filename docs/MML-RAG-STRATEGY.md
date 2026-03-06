# MML + AI + RAG Strategiyasi — VENTRA Analytics Platform

**Sana:** 2026-03-06 (yangilangan)
**Mualliflar:** Bekzod + Claude CLI
**Holat:** Reja / Roadmap
**Scale target:** 10K → 100K+ product, 1 yillik data, kundalik scrape

---

## 1. Ma'lumotlar Bazasi Tahlili

### Hozirgi ML uchun muhim jadvallar

| Jadval | Muhim ustunlar | Yig'ilish chastotasi |
|--------|---------------|---------------------|
| `product_snapshots` | orders_quantity, weekly_bought, rating, feedback_quantity, score, snapshot_at | ~1/kun har product |
| `sku_snapshots` | sell_price, full_price, discount_percent, stock_type | ~1/kun har SKU |
| `competitor_price_snapshots` | sell_price, full_price, discount_pct | cron bo'yicha |
| `category_winners` | score, rank, weekly_bought, orders_quantity, sell_price | har discovery run |
| `products` | category_id, category_path, badges, total_available_amount | scrape paytida |
| `shops` | rating, orders_quantity | import paytida |
| `user_activities` | action, details | har user harakati |
| `seasonal_trends` | season_name, season_start, season_end, avg_score_boost | qo'lda kiritilgan |

### Scale hisob-kitobi

```
10K product:   10,000 × 365 = 3,650,000 snapshot/yil    (~500 MB)
100K product: 100,000 × 365 = 36,500,000 snapshot/yil   (~5 GB)
+ sku_snapshots: ~2x ko'paytirish (har product ~2 SKU)
```

### Hozirgi AI/ML infra

- **Anthropic Claude Haiku** — attribute extraction, trend explanation, sentiment (ai.service.ts)
- **pgvector** — PostgreSQL 16 da yoqilgan, lekin **embedding hali saqlanmaydi**
- **Ensemble forecasting** — WMA + Holt's + Linear Regression (packages/utils)
- **Rule-based** — dead stock predictor, saturation calculator, flash sale detection, stock cliff alert

### Ma'lumot bo'shliqlari (ML uchun etishmaydi)

| # | Nima etishmaydi | Nima uchun kerak | Yechim |
|---|----------------|-----------------|--------|
| 1 | Sharh/review **matni** yo'q | Sentiment analysis, RAG kontekst | Review text scrape qo'shish |
| 2 | Kategoriya-level **aggregation jadvali** yo'q | Kategoriya trend, raqobat o'sishi | `CategoryMetricSnapshot` yaratish |
| 3 | Kategoriya bo'yicha **seller count** kuzatilmaydi | Raqobat intensivligi | Discovery run da seller count saqlash |
| 4 | Product **description text** saqlanmaydi | RAG embedding | Scrape paytida description olish |
| 5 | Snapshot tarixi **cheklangan** | ML training uchun 30+ kun kerak | Backfill mexanizmi |
| 6 | Embedding column **comment** holatda | pgvector search | Alohida `ProductEmbedding` jadvali |

### Yangi jadvallar (Prisma migration kerak)

```prisma
// 1. Kategoriya kunlik metrikalari — trend va raqobat tahlili uchun
model CategoryMetricSnapshot {
  id              String   @id @default(uuid())
  category_id     BigInt
  product_count   Int            // nechta product bor
  seller_count    Int            // nechta sotuvchi bor
  avg_score       Decimal  @db.Decimal(8,4)
  avg_weekly_sold Float
  total_orders    BigInt
  avg_price       BigInt         // o'rtacha narx (so'm)
  snapshot_at     DateTime @default(now()) @db.Timestamptz
  @@index([category_id, snapshot_at])
  @@map("category_metric_snapshots")
}

// 2. ML prognoz natijalari cache — tez foydalanish uchun
model MlPrediction {
  id            String   @id @default(uuid())
  product_id    BigInt
  model_name    String   @db.VarChar(50)  // 'lightgbm', 'neuralprophet', 'chronos'
  metric        String   @db.VarChar(30)  // 'weekly_bought', 'price', 'score'
  horizon_days  Int                       // necha kun oldinga
  predictions   Json     // [{date, value, lower, upper}]
  mae           Float?   // o'rtacha xatolik
  mape          Float?   // foizli xatolik
  created_at    DateTime @default(now()) @db.Timestamptz
  @@index([product_id, model_name, metric])
  @@map("ml_predictions")
}

// 3. RAG embedding — product ma'lumotlari uchun vektor
model ProductEmbedding {
  id          String   @id @default(uuid())
  product_id  BigInt   @unique
  content     String   @db.Text          // embed qilingan matn
  embedding   Unsupported("vector(1536)")
  updated_at  DateTime @default(now()) @db.Timestamptz
  @@map("product_embeddings")
}

// 4. RAG chat tarixi — foydalanuvchi suhbatlari
model ChatMessage {
  id          String   @id @default(uuid())
  account_id  String
  role        String   @db.VarChar(20)  // 'user' | 'assistant'
  content     String   @db.Text
  context     Json?    // retrieval natijasi (product IDs, scores)
  tokens_used Int?
  feedback    String?  @db.VarChar(10)  // 'up' | 'down' | null
  created_at  DateTime @default(now()) @db.Timestamptz
  @@index([account_id, created_at])
  @@map("chat_messages")
}

// 5. ML audit log — prognoz vs real solishtirish
model MlAuditLog {
  id             String   @id @default(uuid())
  product_id     BigInt
  model_name     String   @db.VarChar(50)
  metric         String   @db.VarChar(30)
  predicted_value Float
  actual_value    Float
  error_abs       Float    // |predicted - actual|
  error_pct       Float    // foizli xato
  prediction_date DateTime @db.Timestamptz // qachon prognoz qilingan
  actual_date     DateTime @db.Timestamptz // real data sanasi
  created_at      DateTime @default(now()) @db.Timestamptz
  @@index([model_name, created_at])
  @@index([product_id, created_at])
  @@map("ml_audit_logs")
}
```

---

## 2. ML Model Strategiyasi

### Nega bu texnologiyalar tanlandi

| Eski tanlov | Muammo | Yangi tanlov | Sabab |
|-------------|--------|-------------|-------|
| Facebook Prophet | Meta development to'xtatgan, 10K+ da har product alohida = 5+ soat | **NeuralProphet** | Prophet evolyutsiyasi, PyTorch, batch training, 10x tez |
| XGBoost | Feature engineering kerak, lekin jadval data da kuchli | **LightGBM** | 2-5x tez, kam memory, katta dataset da yaxshiroq |
| LSTM | Eskirgan (2014), vanishing gradient, 60+ data point kerak | **PatchTST / TiDE** | Transformer-based, kam data bilan ishlaydi, 2023-2024 |
| — | Yangi productlar uchun yechim yo'q | **Chronos** (Amazon) | Zero-shot prognoz, train shart emas |

### Scale bo'yicha model tanlash

| Scale | Asosiy model | Mavsumiylik | Yangi product fallback |
|-------|-------------|-------------|----------------------|
| **1K product** | LightGBM global | NeuralProphet (50 kat.) | Chronos zero-shot |
| **10K product** | LightGBM global (2 min train) | NeuralProphet (100 kat.) | Chronos zero-shot |
| **100K product** | LightGBM global (15-20 min) | NeuralProphet (200 kat.) | Chronos zero-shot |

### TIER arxitekturasi

```
TIER 1 — Asosiy (kundalik, barcha productlar):
  LightGBM global model
  ├─ Train: haftada 1x
  │   10K:  3.65M row → ~2 daqiqa
  │   100K: 36.5M row → ~15-20 daqiqa
  ├─ Inference: 10K = ~10s, 100K = ~30s
  ├─ Feature: narx, kategoriya, badge, mavsum, seller_count, trend
  └─ Output: 7/14/30 kunlik sotish prognozi

TIER 2 — Mavsumiylik (haftalik, kategoriya-level):
  NeuralProphet kategoriya-level
  ├─ 10K:  ~100 kategoriya = 100 model → ~5 daqiqa
  │  100K: ~200 kategoriya = 200 model → ~15 daqiqa
  ├─ Train: haftada 1x
  ├─ Mavsumiy regressorlar: Ramadan, Navro'z, Yangi yil, Black Friday
  └─ Output: mavsumiy trend, bayram effekti, yillik sikllar

TIER 3 — Fallback (yangi productlar, < 30 kun data):
  Chronos zero-shot (Amazon, pretrained)
  ├─ Train kerak EMAS — pretrained model
  ├─ Yangi product qo'shilganda darhol prognoz
  ├─ 30+ kun data yig'ilgach → TIER 1 ga o'tadi
  └─ 100K da faqat yangi productlar uchun = tez

TIER 4 — Eksperimental (3+ oy data bo'lganda):
  PatchTST / TiDE (Transformer-based)
  ├─ 90+ snapshot bo'lgan productlar uchun
  ├─ Murakkab patternlar: hafta ichidagi sikllar, tashqi omillar
  ├─ GPU optional (lekin tezroq)
  └─ LightGBM bilan ensemble — ikkalasi birgalikda yaxshiroq
```

### Model 1: Sotuv Prognozi (Sales Forecast) — LightGBM

**Maqsad:** Har product uchun kunlik, haftalik, oylik sotuvlarni bashorat qilish.

**Kiruvchi ma'lumotlar (features):**
- `weekly_bought` seriyasi (7/14/30/90 kun lag)
- `rating` o'zgarishi (delta)
- `feedback_quantity` o'sish tezligi
- `sell_price` o'zgarishlari
- `total_available_amount` (stok darajasi)
- `category_id` (kategoriya embedding)
- `day_of_week`, `month` (vaqt xususiyatlari)
- `season_encoding` (mavsumiylik)
- `seller_count` (kategoriya raqobat darajasi)
- `discount_percent` (chegirma ta'siri)

**Chiqish:** Keyingi 7/30/90 kun uchun `weekly_bought` prognozi + ishonch intervali (upper/lower)

**Nega LightGBM?**
- **Global model** — 1 ta model BARCHA productlardan o'rganadi (cross-learning)
- Har product uchun alohida model KERAK EMAS (Prophet dan farq)
- 36.5M row ustida train — **15-20 daqiqa** (Prophet 100K da 28 soat!)
- Inference: 100K product — **30 soniya**
- Feature importance — qaysi omil eng ko'p ta'sir qilganini ko'rsatadi

### Model 2: Trend Aniqlash (Trend Classification) — LightGBM Classifier

**Feature engineering:**
```
MA7  = 7 kunlik o'rtacha (score, weekly_bought)
MA14 = 14 kunlik o'rtacha
MA30 = 30 kunlik o'rtacha

momentum     = (MA7 - MA14) / MA14       // qisqa muddatli harakat
acceleration = momentum_t - momentum_{t-7} // tezlanish
volume_ratio = weekly_bought / MA30         // hajm anomaliyasi
```

**Klasslar:** `rising` | `falling` | `stable`
**LightGBM classifier** — bitta model 100K product uchun ishlaydi.

### Model 3: Narx Prognozi — NeuralProphet

**Kirish:** `sku_snapshots` narx seriyasi + raqobatchi narxlari + mavsumiy data
**Nega NeuralProphet?** Narx — vaqt seriyasi + tashqi omillar (raqobatchi, mavsumiy).
NeuralProphet buni `add_future_regressor()` bilan qiladi.
**Chiqish:** 7/30 kun uchun narx oralig'i
**Kutilgan xatolik:** 5-10% MAPE

### Model 4: Risk Baholash — LightGBM Classifier

**Hozirgi:** `predictDeadStock()` qoida asosida ishlaydi (packages/utils)

**ML yaxshilash:** Tarixda sotuvlari 0 ga tushgan productlar ustida LightGBM train:
- Score traektoriyasi (tushish tezligi)
- `weekly_bought` kamayish tezligi
- `feedback_quantity` to'xtab qolishi
- Stok kamayish tezligi
- Kategoriya to'yinganlik indeksi

**Chiqish:** `risk_score` 0-1, `risk_level`: low/medium/high/critical

### Model 5: Kategoriya Intelligence — NeuralProphet + LightGBM

**Yangi data kerak:** `CategoryMetricSnapshot` kunlik aggregation
**Feature'lar:** product_count o'sish tezligi, seller_count o'sishi, avg_price trendi, total_orders o'sishi
**Klassifikatsiya:** `growing` | `saturating` | `declining` | `emerging`

---

## 3. RAG Flow Arxitekturasi

### Ishlash sxemasi

```
Foydalanuvchi savoli
     |
     v
[1. Savolni tushunish — Claude Haiku]
  -> intent aniqlash: product_analysis | category_trend | price_advice | recommendation
  -> entity ajratish: product ID lar, kategoriya nomlari, metrikalar
     |
     v
[2. Kontekst olish — pgvector + SQL]
  |-- Semantik: product_embeddings dan pgvector cosine qidiruv
  |-- Tuzilgan SQL: intent ga qarab
  |   |-- product_analysis -> oxirgi snapshotlar, trend, raqobatchilar
  |   |-- category_trend   -> category_metric_snapshots, category_winners
  |   |-- price_advice     -> narx tarixi, raqobatchilar narxlari, elastiklik
  |   |-- recommendation   -> top productlar, early signals, risk
  |-- ML prognoz: MlPrediction jadvalidan (agar mavjud)
  |-- User kontekst: kuzatilayotgan productlar, faollik tarixi
     |
     v
[3. Kontekst yig'ish — max 4K token]
  -> Ma'lumotlar ixcham jadval ko'rinishida
  -> ML prognozlar + confidence ham qo'shiladi
     |
     v
[4. LLM javob — Claude Sonnet/Haiku]
  -> System prompt: Uzum bozor tahlilchisi, O'zbek tilida
  -> Streaming SSE orqali real-time javob
     |
     v
[5. Saqlash + Feedback]
  -> ChatMessage jadvaliga saqlash (feedback: up/down)
  -> AiUsageLog yangilash (token sarfi)
```

### Embedding strategiyasi

| Parametr | 10K | 100K |
|----------|-----|------|
| **Model** | `text-embedding-3-small` (OpenAI) — 1536 dim | Xuddi shu |
| **Nima embed qilinadi** | Product title + category_path + badges | + description text |
| **Yangilash** | Kunlik BullMQ job | Kunlik, batch 1000 talik |
| **Indeks** | HNSW (10K da tez) | HNSW (100K gacha OK) |
| **Embedding narxi** | ~$1/oy | ~$10/oy |

```sql
-- pgvector HNSW indeks
CREATE INDEX ON product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### AI Assistant use case'lari

| Savol | Intent | Retrieval | Javob |
|-------|--------|-----------|-------|
| "Bu product yaxshimi?" | product_analysis | snapshot + trend + ML prognoz | Score, haftalik sotuv, risk, prognoz |
| "Kosmetika da nima trend?" | category_trend | category_winners + metrics + ML trend | O'suvchi/tushuvchi productlar, raqobat |
| "Narx tushirsammi?" | price_advice | narx tarixi + raqobatchilar + ML narx prognoz | Prognoz, raqobatchi narxi, maslahat |
| "Nima sotishim kerak?" | recommendation | user nishasi + top products + risk + ML | Personallashtirilgan tavsiyalar |

---

## 4. Texnik Arxitektura

### 10K scale

```
+-----------------------------------------------------------+
|                    NestJS API (Node.js)                    |
|  +----------+  +----------+  +-----------+                |
|  | RAG      |  | AI       |  | Prediction|                |
|  | Service  |  | Service  |  | Controller|                |
|  +----+-----+  +----+-----+  +-----+-----+                |
|       |              |              |                       |
|       v              v              v                       |
|  +------------+ +--------+  +------------+                 |
|  | pgvector   | |Anthropic|  | Redis Cache|                |
|  | (Postgres) | | API     |  | (prognoz)  |                |
|  +------------+ +--------+  +------+-----+                 |
+-----------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------+
|                    Python ML Service                       |
|  FastAPI | Port 8000 | Docker container                   |
|                                                           |
|  +-------------+  +----------+  +-----------+             |
|  | LightGBM    |  |NeuralPro |  | Chronos   |            |
|  | (TIER 1)    |  | (TIER 2) |  | (TIER 3)  |            |
|  +-------------+  +----------+  +-----------+             |
|                                                           |
|  Endpointlar:                                             |
|  POST /predict/sales    -> {product_id, horizon}          |
|  POST /predict/price    -> {product_id, horizon}          |
|  POST /predict/trend    -> {product_id}                   |
|  POST /predict/risk     -> {product_id}                   |
|  POST /batch/predict    -> batch 1000 talik               |
|  POST /batch/retrain    -> modelni qayta train             |
|  GET  /health                                             |
|  GET  /audit/summary    -> model accuracy hisoboti        |
+-----------------------------------------------------------+
```

### 100K scale — qo'shimcha komponentlar

```
                    +---------------------+
                    |   NGINX / Cloudflare |
                    +----------+----------+
                               |
                    +----------v----------+
                    |   NestJS API (x2-3)  |  <- Horizontal scale
                    |   Load Balanced      |
                    +----------+----------+
                               |
          +--------------------+--------------------+
          |                    |                     |
   +------v------+    +-------v-------+    +--------v-------+
   | TimescaleDB  |    | Redis Cluster  |    |  ClickHouse    |
   | (write path) |    | (cache+queue)  |    | (analytics)    |
   | hypertable   |    |                |    | read-only      |
   | compression  |    |                |    | kunlik delta   |
   +------+-------+    +-------+-------+    +--------+-------+
          |                    |                      |
   +------v------+    +-------v-------+    +---------v------+
   | Scrape Pool  |    | ML Service    |    | ETL Pipeline   |
   | 5-10 worker  |    | FastAPI + GPU |    | TimescaleDB -> |
   | proxy rotate |    | (optional)    |    | ClickHouse     |
   +--------------+    +---------------+    +----------------+
```

### 100K da DB arxitektura

```sql
-- TimescaleDB: hypertable — vaqt bo'yicha auto-partition
SELECT create_hypertable('product_snapshots', 'snapshot_at');

-- 30 kundan eski data auto-compress (10x kichik hajm)
ALTER TABLE product_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'product_id'
);
SELECT add_compression_policy('product_snapshots', INTERVAL '30 days');

-- Continuous aggregate — kunlik delta AVTOMATIK hisoblaydi
CREATE MATERIALIZED VIEW daily_sales
WITH (timescaledb.continuous) AS
SELECT product_id,
       time_bucket('1 day', snapshot_at) AS day,
       last(orders_quantity, snapshot_at) - first(orders_quantity, snapshot_at) AS daily_sold,
       last(score, snapshot_at) AS score
FROM product_snapshots
GROUP BY product_id, time_bucket('1 day', snapshot_at);
```

**Nega ClickHouse?** 36.5M row ustida "top 100 o'sgan product" query:
- PostgreSQL: **12-30 soniya**
- ClickHouse: **50-200 millisekund**

### 100K da Scraping arxitektura

```
Hozirgi:  1 worker, 1 req/s = 100K uchun 28 soat ❌

100K uchun:
  5 worker × 5 req/s = 25 req/s
  100,000 / 25 = ~1.1 soat ✅

Kerak:
  ├─ Proxy pool (5-10 IP) — Uzum ban qilmasligi uchun
  ├─ Priority queue — VIP product oldin, past priority keyin
  ├─ Stale detection — 3 kun yangilanmagan = alert
  └─ Redis SETNX lock (T-385 da qilingan) — dublikat scrape yo'q
```

### Data Pipeline (kunlik cron tartibi)

```
02:00 UTC — Scrape batch (5-10 worker, 100K product, ~1 soat)
03:00 UTC — Category Aggregation Job (CategoryMetricSnapshot INSERT)
04:00 UTC — Feature Engineering + Model Retrain (haftada 1x)
             ├─ LightGBM: 36.5M row → ~15-20 min
             ├─ NeuralProphet: 200 kategoriya → ~15 min
             └─ Chronos: retrain yo'q (pretrained)
05:00 UTC — Batch Prediction Job
             ├─ LightGBM inference: 100K product → ~30s
             ├─ NeuralProphet: kategoriya prognoz → ~2 min
             ├─ Natija: MlPrediction jadvalga + Redis cache (TTL 24h)
             └─ ML Audit: kechagi prognoz vs bugungi real → MlAuditLog
06:00 UTC — Embedding Sync (yangi/o'zgargan productlar → pgvector)
06:30 UTC — RAG Audit batch (50 ta sample → LLM-as-Judge)
```

### Docker qo'shimchasi

```yaml
# docker-compose.yml ga qo'shiladi
ml-service:
  build: ./apps/ml
  container_name: ventra_ml
  ports:
    - "8000:8000"
  environment:
    DATABASE_URL: postgresql://uzum:uzum_pass@postgres:5432/uzum_trend_finder
    MODEL_DIR: /app/models
  volumes:
    - ml-models:/app/models    # train qilingan modellar persist
  depends_on:
    - postgres
```

---

## 5. Audit va Monitoring Tizimi

### 5.1. ML Prognoz Audit

**Maqsad:** Prognoz qanchalik to'g'ri ishlayotganini AVTOMATIK tekshirish.

#### Asosiy metrikalar

| Metrika | Formula | Izoh |
|---------|---------|------|
| **MAE** | `\|real - prognoz\|` o'rtachasi | Absolyut xato (masalan: 15 ta sotuv farq) |
| **MAPE** | `\|xato\| / real × 100%` | Foizli xato (masalan: 17.6%) |
| **WAPE** | `sum(\|xatolar\|) / sum(real)` | 100K product bo'yicha bitta raqam |
| **Direction Accuracy** | Yo'nalish to'g'rimi? | "O'sadi" dedi — haqiqatan o'sdimi? |

#### Backtest (model sifatini sinash)

```
365 kunlik data:
  [========= 300 kun TRAIN =========][=== 65 kun TEST ===]

  Model 300 kun dan o'rganadi
  65 kunni PROGNOZ qiladi
  Prognoz vs REAL solishtiriladi → MAPE hisoblanadi

  Sliding window: 7 kunlik qadam bilan 10 marta takrorlanadi
  Natija: "Model 7 kunga 12% xato bilan bashorat qiladi"
```

#### Segment bo'yicha audit

Umumiy MAPE yaxshi bo'lsa ham, segmentlar bo'yicha tekshirish SHART:

```
Kategoriya bo'yicha:
  Elektronika:     MAPE 8%  ✅ (barqaror sotish)
  Kiyim-kechak:    MAPE 35% ❌ (mavsumiy, notekis)
  Oziq-ovqat:      MAPE 12% ✅

Hajm bo'yicha:
  Top seller (1000+ haftalik): MAPE 10% ✅
  O'rta (100-999):             MAPE 18% ⚠️
  Kam (< 100):                 MAPE 45% ❌ (shovqinli data)

Mavsumiy:
  Oddiy kunlar:    MAPE 15% ✅
  Bayram atrofida:  MAPE 40% ❌ (spike/drop)
```

**Kam sotiladigan productlar** uchun prognoz har doim yomon — bu normal.
Foydalanuvchiga **ishonch darajasi** ko'rsatiladi: "Bu prognoz 85% ishonchli" yoki "Bu prognoz taxminiy".

#### Avtomatik monitoring (kundalik)

```
Har kuni 05:00 UTC (Batch Prediction ichida):
  1. Kechagi prognoz olish (MlPrediction jadvaldan)
  2. Bugungi real data olish (product_snapshots)
  3. |prognoz - real| hisoblash → MlAuditLog ga yozish
  4. Alertlar:
     ├─ MAPE > 30% 3 kun ketma-ket → MODEL_DRIFT alert
     ├─ MAPE > 50% 1 kun → PREDICTION_FAILURE alert
     └─ Direction accuracy < 60% → DIRECTION_DRIFT alert
  5. Trigger: MAPE 3 kun > 25% → avtomatik retrain boshlash
```

#### Model solishtirish

```
A/B test framework:
  ├─ LightGBM prognoz → MlPrediction (model_name='lightgbm')
  ├─ NeuralProphet prognoz → MlPrediction (model_name='neuralprophet')
  ├─ Eski ensemble → MlPrediction (model_name='ensemble_legacy')
  └─ Kunlik: MAPE solishtirish → qaysi model yaxshiroq?

Natija: eng yaxshi model har kategoriya uchun avtomatik tanlanadi
  Elektronika → LightGBM (MAPE 8%)
  Kiyim → NeuralProphet (MAPE 22%, mavsumiylikni biladi)
```

### 5.2. LLM (RAG) Audit

**RAG audit qiyinroq** — raqamli metrika bilan to'liq o'lchab bo'lmaydi.
3 ta audit qatlami ishlatiladi:

#### A. Avtomatik — LLM-as-Judge (kundalik)

```
Har kecha 06:30 UTC:
  1. 50 ta tasodifiy RAG javobni ol (ChatMessage jadvaldan)
  2. Har biri uchun DB dan real datani ol
  3. Claude Sonnet tekshiradi (judge prompt):

     "Quyidagi javob DB ma'lumotlariga mosmi?
      Savol: {user_question}
      Javob: {rag_response}
      DB data: {actual_data}

      Tekshir:
      1. Raqamlar to'g'rimi? (factuality)
      2. Trend yo'nalishi to'g'rimi? (direction)
      3. O'ylab to'qilgan ma'lumot bormi? (hallucination)
      4. Javob savolga mosmi? (relevance)

      Natija: PASS / FAIL + sabab"

  4. Natija: 50 dan 47 ta PASS = 94% accuracy
  5. FAIL bo'lganlari loglanadi → prompt yoki retrieval tuzatish uchun
```

**Alert trigger:** Accuracy < 85% → RAG_QUALITY_DEGRADED alert

#### B. Retrieval sifati (haftalik)

```
Savol: "Elektronika kategoriyasida eng yaxshi product?"

Retrieval qaytargan context:
  ├─ Product A (elektronika, score 95)  ✅ relevant
  ├─ Product B (elektronika, score 88)  ✅ relevant
  └─ Product C (kiyim, score 92)        ❌ NOTO'G'RI kategoriya!

Metrikalar:
  Precision@5 = relevant / jami = 2/3 = 66% → yomon
  Recall@5 = topilgan relevant / barcha relevant
  MRR = birinchi relevant natija nechanchida?

Haftalik hisobot:
  ├─ O'rtacha Precision@5 = 87%
  ├─ Eng yomon intent: recommendation (72%)
  └─ Eng yaxshi intent: product_analysis (95%)
```

**Retrieval yomon → LLM qanchalik aqlli bo'lmasin, javob noto'g'ri.**
Shuning uchun avval retrieval auditlanadi, keyin LLM.

#### C. Foydalanuvchi feedback (real-time)

```
Har RAG javob ostida:
  [👍 Foydali]  [👎 Noto'g'ri]

ChatMessage jadvalda saqlanadi: feedback = 'up' | 'down'

Haftalik hisobot:
  ├─ 200 javob, 180 👍 = 90% satisfaction
  ├─ 👎 eng ko'p: "raqam eski" (12), "savol tushunilmadi" (5)
  └─ 👎 ko'p bo'lgan savollar → prompt/retrieval tuzatish

Alert: satisfaction < 80% haftalik → RAG_USER_DISSATISFIED alert
```

### 5.3. Audit dashboard (admin panel)

```
/admin/ml-audit sahifasi:

┌─────────────────────────────────────────────┐
│ ML Model Accuracy           Last 7 days     │
│                                             │
│ LightGBM (sales):    MAPE 14.2% ✅          │
│ NeuralProphet (cat): MAPE 11.8% ✅          │
│ Chronos (new prod):  MAPE 28.5% ⚠️          │
│ Direction accuracy:  78.4%      ✅          │
│                                             │
│ [Retrain Now]  [View Details]               │
├─────────────────────────────────────────────┤
│ RAG Quality                 Last 7 days     │
│                                             │
│ LLM-as-Judge accuracy: 92.4%  ✅            │
│ Retrieval Precision@5: 87.1%  ✅            │
│ User satisfaction:     89.3%  ✅            │
│ Hallucination rate:     2.1%  ✅            │
│                                             │
│ [View Failed Responses]  [Adjust Prompts]   │
├─────────────────────────────────────────────┤
│ Alerts                                      │
│                                             │
│ ⚠️ Kiyim kategoriya MAPE 35% (3 kun)        │
│ ✅ Model retrain triggered 2 soat oldin      │
│ ✅ RAG accuracy 92%+ barqaror                │
└─────────────────────────────────────────────┘
```

### 5.4. Audit xulosa jadvali

| Nima auditlanadi | Qanday | Qachon | Maqbul natija | Alert trigger |
|------------------|--------|--------|---------------|---------------|
| ML prognoz xatosi | MAPE backtest | Har retrain | < 20% | > 30% 3 kun |
| ML model drift | Kunlik real vs prognoz | Har kuni | Drift < 5%/hafta | Drift > 10% |
| ML direction | O'sdi/tushdi to'g'rimi | Har kuni | > 70% | < 60% |
| RAG factuality | LLM-as-Judge + DB | Har kecha 50 sample | > 90% | < 85% |
| RAG retrieval | Precision@5 | Har hafta | > 80% | < 70% |
| RAG hallucination | LLM-as-Judge | Har kecha | < 5% | > 10% |
| User satisfaction | 👍/👎 feedback | Real-time | > 85% | < 80% |

---

## 6. Bosqichma-bosqich Reja (Roadmap)

### Faza 1 (2 hafta): LightGBM + Feature Engineering

**1-hafta:**
- [ ] Prisma migration: `CategoryMetricSnapshot`, `MlPrediction`, `MlAuditLog` jadvallar
- [ ] `category-aggregation.processor.ts` — kunlik kategoriya metrikalari
- [ ] `category-aggregation.job.ts` — cron `0 3 * * *`
- [ ] Python ML service scaffold: `apps/ml/` FastAPI + LightGBM
- [ ] `POST /predict/sales` — LightGBM global model
- [ ] `POST /batch/predict` — batch inference 1000 talik
- [ ] Docker setup + model persistence (volume)

**2-hafta:**
- [ ] `predictions.service.ts` — ML service chaqirish, Redis cache
- [ ] `predictions.controller.ts` — frontend uchun API
- [ ] BullMQ: `ml-prediction-queue` processor + kunlik batch job
- [ ] `forecastEnsemble()` ni ML prognoz bilan almashtirish (fallback saqlanadi)
- [ ] Frontend: prognoz grafiklari ProductPage da
- [ ] Backtest: MAPE hisoblash, ensemble bilan solishtirish
- [ ] ML Audit: kunlik prognoz vs real → `MlAuditLog`

### Faza 2 (2 hafta): RAG Pipeline + AI Assistant

**3-hafta:**
- [ ] Prisma migration: `ProductEmbedding`, `ChatMessage` jadvallar
- [ ] pgvector HNSW indeks yaratish
- [ ] `embedding.service.ts` — embedding yaratish
- [ ] `embedding.processor.ts` — batch embedding job
- [ ] Embedding API integratsiya (OpenAI text-embedding-3-small)

**4-hafta:**
- [ ] `rag.service.ts` — intent classification + retrieval + generation
- [ ] `chat.controller.ts` — SSE streaming chat endpoint
- [ ] Frontend: Chat widget (streaming javob + 👍/👎 feedback)
- [ ] System prompt — Uzum bozor tahlilchisi, O'zbek tilida
- [ ] ChatMessage saqlash + suhbat tarixi
- [ ] RAG Audit: LLM-as-Judge nightly batch (50 sample)
- [ ] Retrieval Precision@5 haftalik hisobot

### Faza 3 (1 hafta): NeuralProphet + Chronos

**5-hafta:**
- [ ] NeuralProphet: kategoriya-level mavsumiy model
- [ ] Chronos: yangi productlar uchun zero-shot fallback
- [ ] `POST /predict/seasonal` endpoint
- [ ] Model tanlov logikasi: data hajmiga qarab TIER 1/2/3
- [ ] Kategoriya intelligence dashboard (growing/saturating/declining)
- [ ] A/B model solishtirish framework

### Faza 4 (1 hafta): Audit Dashboard + Production Hardening

**6-hafta:**
- [ ] Admin panel: `/admin/ml-audit` sahifasi
- [ ] ML metrikalar dashboard: MAPE, direction accuracy, model comparison
- [ ] RAG metrikalar dashboard: factuality, retrieval, satisfaction
- [ ] Alert tizimi: MODEL_DRIFT, RAG_QUALITY_DEGRADED, auto-retrain
- [ ] Auto-retrain trigger: MAPE 3 kun > 25%
- [ ] Performance: batch inference, Redis caching, TimescaleDB (100K uchun)
- [ ] Production deploy (Railway)

---

## 7. 100K Scale Tayyorlik (qo'shimcha qadam)

100K productga o'tishda qo'shiladigan komponentlar:

| Komponent | Narxi/oy | Nima uchun |
|-----------|----------|-----------|
| TimescaleDB (PG extension) | $0 (bepul) | Hypertable, compression, continuous aggregate |
| ClickHouse (managed) | $50-100 | Analytical query 100x tez |
| 5-10 Scrape Worker | $25-50 | 100K product 1.1 soatda |
| Proxy pool (10 IP) | $20-50 | Uzum ban dan himoya |
| ML GPU (optional) | $30-60 | PatchTST/TiDE training |
| NestJS x2-3 instances | $20-40 | API horizontal scale |
| **Jami qo'shimcha** | **~$145-300/oy** | |

### 100K trigger ko'rsatkichlari

```
Qachon 100K infra ga o'tish kerak?
  ├─ Product count > 50K
  ├─ Analytical query > 5 soniya
  ├─ Scrape batch > 4 soat
  ├─ API response p95 > 2 soniya
  └─ DB hajmi > 10 GB
```

---

## 8. Risklar va Cheklovlar

### Ma'lumot hajmi

| Holat | Minimum | Hozirgi | Yetarlimi? |
|-------|---------|---------|-----------|
| LightGBM training | 1000+ product × 30 kun | ~1000 tracked | Chegarada |
| NeuralProphet | 30 snapshot per kategoriya | ~30 kun | Ha |
| Chronos | 0 (zero-shot) | Har doim tayyor | Ha |
| PatchTST (TIER 4) | 90+ snapshot per product | Ko'pchilik < 30 | Hali yo'q |

**Cold start:** Yangi product → Chronos zero-shot → 30 kun keyin LightGBM ga o'tadi.

### Model drift

Uzum bozori o'zgaruvchan (mavsumiy aksiyalar, yangi sotuvchilar). Yechim:
- Haftalik auto-retrain cron
- MAPE monitoring — 25% dan oshsa avtomatik retrain
- Mavsumiy regressorlar (Ramadan, Yangi yil, Navro'z)
- MlAuditLog da trend kuzatish

### Hisoblash narxi

| Operatsiya | 10K | 100K | Resurs |
|-----------|-----|------|--------|
| LightGBM train | ~2 min | ~15-20 min | CPU only |
| LightGBM inference | ~10s | ~30s | CPU only |
| NeuralProphet (100 kat.) | ~5 min | ~15 min | CPU only |
| Chronos (yangi prod) | ~2s per product | ~2s per product | CPU only |
| PatchTST (TIER 4) | GPU recommended | GPU required | GPU |

### AI API narxi (oylik taxmin)

| Xizmat | Hajm | Narx |
|--------|------|------|
| Claude Haiku (RAG chat) | ~3000 so'rov/oy | ~$30 |
| Claude Sonnet (RAG judge) | ~1500 audit/oy | ~$15 |
| Embedding API | 10K-100K product | ~$1-10 |
| Claude (trend tahlil) | ~1000 so'rov/oy | ~$5 |
| **Jami** | | **~$51-60/oy** |

### Aniqlik kutishlari

| Model | Kutilgan MAPE | Izoh |
|-------|--------------|------|
| Haftalik sotuv (LightGBM) | 15-25% | Bozor shovqinli, yo'nalish aniqlash yetarli |
| Narx prognoz (NeuralProphet) | 5-10% | Narxlar barqarorroq |
| Trend classification | 75%+ accuracy | 3 klass: rising/falling/stable |
| Risk assessment | 80%+ AUC | Ikkilik: risk bor/yo'q |
| RAG factuality | 90%+ | LLM-as-Judge metrikasi |
| RAG satisfaction | 85%+ | Foydalanuvchi 👍/👎 |

---

## Muhim fayllar xaritasi

| Fayl | Vazifasi |
|------|---------|
| `apps/api/prisma/schema.prisma` | Asosiy schema — yangi jadvallar qo'shiladi |
| `apps/api/src/ai/ai.service.ts` | Hozirgi AI — RAG service yoniga qo'shiladi |
| `apps/api/src/ai/rag.service.ts` | **YANGI** — RAG orchestration |
| `apps/api/src/ai/embedding.service.ts` | **YANGI** — embedding yaratish |
| `apps/api/src/ai/chat.controller.ts` | **YANGI** — SSE streaming chat |
| `apps/ml/` | **YANGI** — Python FastAPI ML service |
| `apps/ml/models/lightgbm_sales.py` | **YANGI** — LightGBM global model |
| `apps/ml/models/neuralprophet_category.py` | **YANGI** — NeuralProphet mavsumiy |
| `apps/ml/models/chronos_fallback.py` | **YANGI** — Chronos zero-shot |
| `packages/utils/src/index.ts` | Eski forecasting — ML model fallback sifatida saqlanadi |
| `apps/worker/src/processors/weekly-scrape.processor.ts` | Asosiy data yig'ish — ML training data manba |
| `docs/Onboarding-scenario.md` | Biznes talablar — 6 ta tahlil yo'nalishi |

---

*MML-RAG-STRATEGY.md | VENTRA Analytics Platform | 2026-03-06 (v2)*
