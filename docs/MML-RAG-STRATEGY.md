# MML + AI + RAG Strategiyasi — VENTRA Analytics Platform

**Sana:** 2026-03-06
**Mualliflar:** Bekzod + Claude CLI
**Holat:** Reja / Roadmap

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

### Hozirgi AI/ML infra

- **Anthropic Claude Haiku** — attribute extraction, trend explanation, sentiment (ai.service.ts)
- **pgvector** — PostgreSQL 16 da yoqilgan, lekin **embedding hali saqlanmaydi** (comment holatda)
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
  model_name    String   @db.VarChar(50)  // 'prophet', 'xgboost', 'lstm'
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
  created_at  DateTime @default(now()) @db.Timestamptz
  @@index([account_id, created_at])
  @@map("chat_messages")
}
```

---

## 2. ML Model Strategiyasi

### Model 1: Sotuv Prognozi (Sales Forecast)

**Maqsad:** Har bir product uchun kunlik, haftalik, oylik, yillik sotuvlarni bashorat qilish.

**Kiruvchi ma'lumotlar (features):**
- `weekly_bought` seriyasi (7/14/30/90 kun)
- `rating` o'zgarishi (delta)
- `feedback_quantity` o'sish tezligi
- `sell_price` o'zgarishlari
- `total_available_amount` (stok darajasi)
- `category_id` (kategoriya ta'siri)
- `day_of_week` (hafta kuni)
- `season_encoding` (mavsumiylik)

**Chiqish:** Keyingi 7/30/90 kun uchun `weekly_bought` prognozi + ishonch intervali (upper/lower)

**Algoritmlar (bosqichma-bosqich):**

| Faza | Algoritm | Afzalligi | Kamchiligi |
|------|----------|-----------|------------|
| Faza 1 | **Facebook Prophet** | Mavsumiylikni ajratadi, tez ishga tushadi | Oddiy, cross-product o'rganmaydi |
| Faza 2 | **XGBoost** | Jadval ma'lumotlari bilan kuchli, boshqa productlardan o'rganadi | Feature engineering kerak |
| Faza 3 | **LSTM** | Murakkab patternlarni topadi | Ko'p data kerak (60+ snapshot), GPU |

**Training data:**
- `product_snapshots` JOIN `sku_snapshots`
- Minimum: 30 snapshot (30 kun) — kamida 1 oy data bo'lgan productlar
- 30 kundan kam bo'lsa → hozirgi ensemble forecasting (fallback)

**Baholash metrikalari:**
- **MAE** — o'rtacha xatolik (masalan: 15 ta sotuv farq)
- **MAPE** — foizli xatolik (kutilgan: 20-30% — bozor ma'lumotlari shovqinli)
- **RMSE** — katta xatolarni ko'proq jazolaydigan metrika
- Cross-validation: 7 kunlik siljuvchi oyna

### Model 2: Trend Aniqlash (Trend Classification)

**Maqsad:** Har product uchun: "o'smoqda", "tusmoqda", "barqaror" aniqlash.

**Feature engineering:**
```
MA7  = 7 kunlik o'rtacha (score, weekly_bought)
MA14 = 14 kunlik o'rtacha
MA30 = 30 kunlik o'rtacha

momentum    = (MA7 - MA14) / MA14      // qisqa muddatli harakat yo'nalishi
acceleration = momentum_t - momentum_{t-7}  // tezlanish yoki sekinlashuv
```

**Klasslar:**
- `rising` — momentum > 0.1 (o'sish)
- `falling` — momentum < -0.1 (tushish)
- `stable` — orada (barqaror)

**Algoritm:** XGBoost classifier + kategoriya darajasidagi feature'lar

**Hozirgi holatdan farqi:** `forecastEnsemble()` rule-based — ML model uni almashtiradi, lekin fallback sifatida saqlanadi.

### Model 3: Narx Prognozi (Price Prediction)

**Kirish:** `sku_snapshots` dan narx seriyasi, raqobatchilar narxlari, chegirma tarixi, mavsumiy data
**Algoritm:** Prophet + tashqi regressorlar (raqobatchi narxi, mavsumiy dummy)
**Chiqish:** 7/30 kun uchun narx oralig'i
**Kutilgan xatolik:** 5-10% MAPE

### Model 4: Risk Baholash

**Hozirgi:** `predictDeadStock()` qoida asosida ishlaydi (packages/utils)

**ML yaxshilash:** Tarixda sotuvlari 0 ga tushgan productlar ustida XGBoost train qilish:
- Score traektoriyasi (tushish tezligi)
- `weekly_bought` kamayish tezligi
- `feedback_quantity` to'xtab qolishi
- Stok kamayish tezligi
- Kategoriya to'yinganlik indeksi

**Chiqish:** `risk_score` 0-1, `risk_level`: low/medium/high/critical

### Model 5: Kategoriya Intelligence

**Yangi data kerak:** `CategoryMetricSnapshot` kunlik aggregation
**Feature'lar:** product_count o'sish tezligi, seller_count o'sishi, avg_price trendi, total_orders o'sishi
**Klassifikatsiya:** `growing` (o'smoqda), `saturating` (to'yinmoqda), `declining` (tushmoqda), `emerging` (yangi paydo bo'lmoqda)
**Amalga oshirish:** Batch job kundalik hisoblab, `category_metric_snapshots` ga saqlaydi

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
  |-- User kontekst: kuzatilayotgan productlar, faollik tarixi
     |
     v
[3. Kontekst yig'ish — max 4K token]
  -> Ma'lumotlar ixcham jadval ko'rinishida
  -> ML prognozlar ham qo'shiladi (agar mavjud)
     |
     v
[4. LLM javob — Claude Sonnet/Haiku]
  -> System prompt: Uzum bozor tahlilchisi, O'zbek tilida
  -> Streaming SSE orqali real-time javob
     |
     v
[5. Saqlash + log]
  -> ChatMessage jadvaliga saqlash
  -> AiUsageLog yangilash (token sarfi)
```

### Embedding strategiyasi

| Parametr | Qiymat |
|----------|--------|
| **Model** | `text-embedding-3-small` (OpenAI) yoki Anthropic Embeddings — 1536 dimension |
| **Nima embed qilinadi** | Product title + category_path + badges (bir product = bir embedding) |
| **Yangilash** | Kunlik BullMQ job — faqat yangi/o'zgargan productlar |
| **Indeks** | `HNSW` (100K dan kam product uchun tezroq) |

```sql
-- pgvector indeks
CREATE INDEX ON product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### RAG uchun SQL shablonlar

```sql
-- Product tahlili konteksti
SELECT p.title, ps.score, ps.weekly_bought, ps.orders_quantity,
       ps.rating, ss.sell_price, ss.discount_percent
FROM product_snapshots ps
JOIN products p ON p.id = ps.product_id
LEFT JOIN sku_snapshots ss ON ss.sku_id = (
  SELECT id FROM skus WHERE product_id = p.id LIMIT 1
)
WHERE ps.product_id = $1
ORDER BY ps.snapshot_at DESC LIMIT 14;

-- Kategoriya intelligence konteksti
SELECT cms.product_count, cms.seller_count, cms.avg_score,
       cms.avg_weekly_sold, cms.total_orders
FROM category_metric_snapshots cms
WHERE cms.category_id = $1
ORDER BY cms.snapshot_at DESC LIMIT 30;
```

### AI Assistant use case'lari

| Savol | Intent | Retrieval | Javob |
|-------|--------|-----------|-------|
| "Bu product yaxshimi?" | product_analysis | snapshot + trend + competitor | Score, haftalik sotuv, risk, maslahat |
| "Kosmetika da nima trend?" | category_trend | category_winners + metrics | O'suvchi/tushuvchi productlar, raqobat |
| "Narx tushirsammi?" | price_advice | narx tarixi + raqobatchilar + elastiklik | Prognoz, raqobatchi narxi, maslahat |
| "Nima sotishim kerak?" | recommendation | user nishasi + top products + risk | Personallashtirilgan tavsiyalar |

### Yaratiladigan fayllar

| Fayl | Vazifasi |
|------|---------|
| `apps/api/src/ai/rag.service.ts` | RAG orchestration: intent -> retrieve -> generate |
| `apps/api/src/ai/embedding.service.ts` | Embedding yaratish + pgvector upsert |
| `apps/api/src/ai/chat.controller.ts` | SSE streaming chat endpoint |
| `apps/worker/src/processors/embedding.processor.ts` | Batch embedding job |
| `apps/worker/src/jobs/embedding.job.ts` | Kunlik cron embedding yangilash |

---

## 4. Texnik Arxitektura

### Tizim sxemasi

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
|  +----------+  +----------+  +-----------+                |
|  | Prophet  |  | XGBoost  |  | LSTM      |                |
|  | (Faza 1) |  | (Faza 2) |  | (Faza 3)  |                |
|  +----------+  +----------+  +-----------+                |
|                                                           |
|  Endpointlar:                                             |
|  POST /predict/sales    -> {product_id, horizon}          |
|  POST /predict/price    -> {product_id, horizon}          |
|  POST /predict/trend    -> {product_id}                   |
|  POST /predict/risk     -> {product_id}                   |
|  POST /batch/retrain    -> modelni qayta train qilish     |
|  GET  /health                                             |
+-----------------------------------------------------------+
                       |
                       v
+-----------------------------------------------------------+
|                    BullMQ Worker (Node.js)                 |
|                                                           |
|  Yangi queue'lar:                                         |
|  +--------------------+  +---------------------+          |
|  | ml-prediction-queue|  | embedding-queue      |         |
|  | Kunlik prognoz     |  | Kunlik embedding     |         |
|  +--------------------+  +---------------------+          |
|                                                           |
|  +--------------------+                                   |
|  | category-agg-queue |                                   |
|  | Kunlik kat. metrik |                                   |
|  +--------------------+                                   |
+-----------------------------------------------------------+
```

### Data Pipeline (kunlik cron tartibi)

```
03:00 UTC — Category Aggregation Job
  -> Har aktiv kategoriya uchun CategoryMetricSnapshot INSERT

04:00 UTC — Feature Engineering + Model Retrain (faqat haftada 1 marta)
  -> Moving averages, momentum, delta features hisoblash
  -> Python service ga POST /batch/retrain

05:00 UTC — Batch Prediction Job
  -> Har tracked product uchun POST /predict/sales
  -> Natija: MlPrediction jadvaliga + Redis cache (TTL 24h)

06:00 UTC — Embedding Sync Job
  -> Yangi/o'zgargan productlar uchun embedding yaratish
  -> product_embeddings ga upsert (pgvector)
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
  depends_on:
    - postgres
```

---

## 5. Bosqichma-bosqich Reja (Roadmap)

### Faza 1 (2 hafta): Feature Engineering + Asosiy Prognoz

**1-hafta:**
- [ ] Prisma migration: `CategoryMetricSnapshot`, `MlPrediction` jadvallar
- [ ] `category-aggregation.processor.ts` — kunlik kategoriya metrikalari
- [ ] `category-aggregation.job.ts` — cron `0 3 * * *`
- [ ] Python ML service scaffold: `apps/ml/` FastAPI + Prophet
- [ ] `POST /predict/sales` endpoint — Prophet model
- [ ] Docker setup

**2-hafta:**
- [ ] `predictions.service.ts` — ML service chaqirish, Redis cache
- [ ] `predictions.controller.ts` — frontend uchun API
- [ ] BullMQ: `ml-prediction-queue` processor + kunlik batch job
- [ ] `forecastEnsemble()` ni ML prognoz bilan almashtirish (fallback saqlanadi)
- [ ] Frontend: prognoz grafiklari ProductPage da
- [ ] Test: MAE/MAPE hisoblash, ensemble bilan solishtirish

### Faza 2 (2 hafta): RAG Pipeline + AI Assistant

**3-hafta:**
- [ ] Prisma migration: `ProductEmbedding`, `ChatMessage` jadvallar
- [ ] pgvector HNSW indeks yaratish
- [ ] `embedding.service.ts` — embedding yaratish
- [ ] `embedding.processor.ts` — batch embedding job
- [ ] Embedding API integratsiya (Anthropic/OpenAI)

**4-hafta:**
- [ ] `rag.service.ts` — intent classification + retrieval + generation
- [ ] `chat.controller.ts` — SSE streaming chat endpoint
- [ ] Frontend: Chat widget component (streaming javob)
- [ ] System prompt — Uzum bozor tahlilchisi, O'zbek tilida
- [ ] ChatMessage saqlash + suhbat tarixi
- [ ] Test: kontekst relevantligi, javob sifati

### Faza 3 (2 hafta): Kuchli ML + Kategoriya Intelligence

**5-hafta:**
- [ ] XGBoost model — trend classification (Python service)
- [ ] XGBoost model — sales prediction (Prophet bilan ensemble)
- [ ] Kategoriya intelligence endpoint: growing/saturating/declining
- [ ] `category-intelligence.service.ts`
- [ ] Frontend: Kategoriya intelligence dashboard

**6-hafta:**
- [ ] LSTM/Transformer tajriba (60+ snapshot bo'lgan productlar uchun)
- [ ] A/B model solishtirish framework
- [ ] Model versiyalash + metrikalar kuzatish
- [ ] Auto-retrain: MAPE > 30% bo'lganda qayta train

### Faza 4 (2 hafta): Risk Model + Narx Prognoz + Integratsiya

**7-hafta:**
- [ ] ML-based risk model (`predictDeadStock` o'rniga)
- [ ] Narx prognoz modeli (Prophet + raqobatchi regressorlar)
- [ ] `POST /predict/risk` va `POST /predict/price` endpointlar
- [ ] Dashboard integratsiya: risk alertlar, narx prognozlari
- [ ] Telegram bot: ML-based kunlik digest

**8-hafta:**
- [ ] End-to-end testing va calibration
- [ ] Model monitoring: prognoz aniqligi dashboard
- [ ] Performance optimizatsiya: batch inference, Redis caching
- [ ] Dokumentatsiya: model cards, API docs
- [ ] Production deploy (Railway)

---

## 6. Risklar va Cheklovlar

### Ma'lumot hajmi

| Holat | Minimum | Hozirgi | Yetarlimi? |
|-------|---------|---------|-----------|
| Prophet training | 30 snapshot (30 kun) | Fevral 2026 dan beri | Ha (1+ oy) |
| XGBoost training | 1000+ product x 30 kun | ~1000 tracked product | Chegarada |
| LSTM training | 60+ snapshot per product | Ko'pchilik < 30 | Hali yo'q (Faza 3 da) |

**Cold start muammosi:** Yangi productlar uchun 0 snapshot. Yechim: kategoriya darajasidagi model prior sifatida ishlatiladi, product-specific data to'plangach blendlanadi.

### Model drift

Uzum bozori o'zgaruvchan (mavsumiy aksiyalar, yangi sotuvchilar). Yechim:
- Haftalik retrain cron
- MAPE monitoring — 30% dan oshsa alert
- Mavsumiy regressorlar (Ramadan, Yangi yil, Navro'z)

### Hisoblash narxi

| Operatsiya | Vaqt | Narx |
|-----------|------|------|
| Prophet 1 product | ~2 soniya | CPU only |
| 1000 product batch | ~33 daqiqa | CPU only |
| XGBoost 1000 product | ~2 daqiqa | CPU only |
| LSTM | GPU kerak | Railway GPU addon |

### AI API narxi (oylik taxmin)

| Xizmat | Hajm | Narx |
|--------|------|------|
| Claude Haiku (RAG chat) | ~3000 so'rov/oy | ~$30 |
| Embedding API | 1000 product | ~$1 |
| Claude (trend tahlil) | ~1000 so'rov/oy | ~$5 |
| **Jami** | | **~$36/oy** |

### Aniqlik kutishlari

| Model | Kutilgan MAPE | Izoh |
|-------|--------------|------|
| Haftalik sotuv | 20-30% | Bozor shovqinli, yo'nalish aniqlash uchun yetarli |
| Narx prognoz | 5-10% | Narxlar barqarorroq |
| Trend classification | 75%+ accuracy | 3 klass: rising/falling/stable |
| Risk assessment | 80%+ AUC | Ikkilik: risk bor/yo'q |

### pgvector cheklovlar

- IVFFlat indeks katta o'zgarishlardan keyin qayta train qilish kerak
- 100K dan kam product uchun **HNSW** tezroq va aniqroq
- Migration: `CREATE INDEX USING hnsw ... WITH (m=16, ef_construction=64)`

---

## Muhim fayllar xaritasi

| Fayl | Vazifasi |
|------|---------|
| `apps/api/prisma/schema.prisma` | Asosiy schema — yangi jadvallar qo'shiladi |
| `apps/api/src/ai/ai.service.ts` | Hozirgi AI — RAG service yoniga qo'shiladi |
| `packages/utils/src/index.ts` | Hozirgi forecasting — ML model fallback sifatida saqlanadi |
| `apps/worker/src/processors/weekly-scrape.processor.ts` | Asosiy data yig'ish — ML training data manba |
| `docs/Onboarding-scenario.md` | Biznes talablar — 6 ta tahlil yo'nalishi |

---

*MML-RAG-STRATEGY.md | VENTRA Analytics Platform | 2026-03-06*
