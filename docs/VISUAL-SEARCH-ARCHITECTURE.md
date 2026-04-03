# VENTRA — Visual Image Search Architecture
## Uzum mahsulot rasmi bo'yicha 13 platformada qidiruv
**Versiya:** 1.0  
**Sana:** 2026-03-23

---

## MUAMMO VA MAQSAD

**Hozirgi holat:** Sourcing faqat matn bo'yicha ishlaydi — mahsulot nomidan CN/EN query yaratib platformalarda qidiradi. Natijalar ko'pincha noto'g'ri kategoriyadan chiqadi, tarjima xatolari bo'ladi.

**Maqsad:** Foydalanuvchi Uzum mahsulotini kuzatuvga qo'shganida, o'sha mahsulotning **rasmi** asosida 13 ta platformada vizual qidiruv o'tkazish. Rasm bo'yicha qidirish matn qidiruvisidan aniqroq — til barriyeri yo'q, kategoriya xatosi kamroq.

**Qidiruv strategiyasi:** SerpAPI (Bing Visual Search) → rasm bo'yicha o'xshash mahsulotlar → Claude AI moslik baholash

---

## A DAN B GACHA: TO'LIQ OQlM

```
A ── Foydalanuvchi mahsulotni kuzatuvga qo'shadi
          │
          ▼
[1] Uzum API → mahsulotning birinchi rasmi URL olinadi
    (images.uzum.uz/{key}/t_product_540_high.jpg)
          │
          ▼
[2] Rasm URL products jadvaliga saqlanadi
    (primary_image_url yangi ustun)
          │
          ▼
[3] BullMQ: visual-sourcing-search navbatga job qo'shiladi
    Payload: { productId, productTitle, imageUrl, platforms[] }
          │
          ▼
[4] Worker: SerpAPI Bing Visual Search
    imageUrl → vizual o'xshash mahsulotlar ro'yhati
    (title, url, thumbnail, source domain)
          │
          ├── Natija platformaga tegishli bo'lsa → to'g'ridan ishlatish
          │   (masalan, aliexpress.com linki kelsa — qo'shimcha qidiruv shart emas)
          │
          └── Natija yetarli bo'lmagan platformalar → platform-specific qidiruv
                    │
                    ▼
[5] Parallel platform qidiruvlari (Promise.allSettled)
    13 ta platforma parallel ishlaydi, biri xato qilsa qolganlar davom etadi
          │
          ▼
[6] Claude Haiku: rasm + matn moslik baholash
    Uzum rasmi + har bir natijaning rasmi → combined_score (0.0–1.0)
          │
          ▼
[7] Cargo hisoblash (top-5 natija uchun, mavjud CargoService)
          │
          ▼
[8] ROI bo'yicha tartiblash → DB saqlash (ExternalSearchResult)
          │
          ▼
B ── UI: ProductPage → Sourcing tab → natijalar ko'rsatiladi
```

---

## 13 PLATFORMA: INTEGRATSIYA STRATEGIYASI

### Qidiruv usullari

| Usul | Tezlik | Ishonchlilik | Narx |
|------|--------|-------------|------|
| SerpAPI Bing Visual | Tez | Yuqori | ~$0.005/qidiruv |
| SerpAPI (matn engine) | Tez | Yuqori | ~$0.005/qidiruv |
| Direct API (ochiq) | Tez | Yuqori | Bepul |
| Playwright (scrape) | Sekin | O'rta | Server xarajati |

---

### MAVJUD PLATFORMALAR (minimal o'zgartirish)

| Platforma | Usul | O'zgartirish | Holat |
|-----------|------|-------------|-------|
| 1688.com | SerpAPI (mavjud) | Bing Visual CN query bilan to'ldirish | ✅ |
| Taobao | SerpAPI (mavjud) | Xuddi 1688 kabi | ✅ |
| Alibaba | SerpAPI (mavjud) | EN query bilan | ✅ |
| AliExpress | Affiliate API (client bor) | Worker pipeline'ga ulash — 1-2 soat | ⚠️ |
| Amazon.de | SerpAPI (mavjud) | Yo'q | ✅ |
| Banggood | Playwright (mavjud) | Yo'q | ✅ |

---

### YANGI PLATFORMALAR

**Wildberries**
- Usul: Direct ochiq API — token kerak emas
- Valyuta: RUB → USD (CBU kursidan, allaqachon mavjud)
- Murakkablik: Past

**Ozon**
- Usul: Playwright + JSON intercept (Shopee bilan bir xil pattern)
- Valyuta: RUB → USD
- Murakkablik: O'rta

**eBay**
- Usul: SerpAPI — mavjud funksiyaga faqat engine parametr qo'shish
- Valyuta: USD (to'g'ridan)
- Murakkablik: Juda past (30 daqiqa)

**Trendyol**
- Usul: Playwright + JSON intercept
- Valyuta: TRY → USD (CBU da mavjud)
- Murakkablik: O'rta

**Hepsiburada**
- Usul: Playwright + JSON intercept (Trendyol bilan o'xshash)
- Valyuta: TRY → USD
- Murakkablik: O'rta

**Amazon US**
- Usul: SerpAPI — Amazon.de mavjud, faqat engine o'zgaradi
- Valyuta: USD
- Murakkablik: Juda past (30 daqiqa)

**Temu**
- Holat: O'zbekistonda bloklangan (2025-mart), ro'yxatdan o'tish jarayoni davom etyapti
- Qaror: `is_active=false` + `TEMU_ENABLED=false` flag — holat aniqlanganida yoqiladi
- Murakkablik: Yuqori (kuchli anti-bot)

**Pinduoduo**
- Qaror: Bing Visual natijalarini passiv ushlash — to'liq scraper keyingi sprint
- Murakkablik: Yuqori (juda kuchli anti-bot)

---

## BING VISUAL SEARCH QANDAY ISHLAYDI

1. Uzum rasmi URL SerpAPI'ga beriladi
2. Bing vizual jihatdan o'xshash mahsulotlarni topadi
3. Natijada: title, url, thumbnail, source domain keladi

**Asosiy foyda:** Bing natijalarida ko'pincha 1688, AliExpress, Amazon linklari bo'ladi — bu holda o'sha platform uchun alohida qidiruv kerak emas, to'g'ridan natijani ishlatish mumkin.

**Fallback:** Bing natija bermagan platformalar uchun — o'sha platformaga alohida matn qidiruvi (AI tomonidan yaratilgan CN/EN query bilan, mavjud mexanizm).

---

## AI RASM SOLISHTIRISH (MOSLIK BAHOLASH)

**Hozirgi scoring:** Claude Haiku → uzumTitle + natijalar nomlari → match_score

**Yangi scoring:** Claude Haiku (vision) → uzumTitle + uzumRasmi + natijalar title+rasm → combined_score

**Natija formulasi:**
```
combined_score = 0.6 × visual_score + 0.4 × text_score
```

Foydalanuvchiga ko'rsatiladigan ma'lumotlar:
- Narx (USD va mahalliy valyutada)
- Moslik foizi (combined_score × 100%)
- Platform bayrog'i 🇨🇳🇷🇺🇹🇷🇺🇸
- Minimal buyurtma miqdori (MOQ)
- Yetkazib berish muddati

---

## DB O'ZGARISHLARI

**`products` jadvali — yangi ustunlar:**
- `primary_image_url` — Uzum'dan olingan birinchi rasm URL (540px versiya)
- `images_json` — barcha rasmlar (kelajak uchun)

**`external_search_jobs` jadvali — yangi ustunlar:**
- `search_type` — "text" yoki "visual"
- `source_image_url` — qidiruvda ishlatilgan Uzum rasm URL

**`external_search_results` jadvali — yangi ustun:**
- `visual_match_score` — AI rasm solishtirish natijasi (0.000–1.000)

**`external_platforms` jadvali — yangi yozuvlar (seed):**
wildberries, ozon, ebay, trendyol, hepsiburada, amazon_us, temu (is_active=false), pinduoduo (is_active=false)

---

## VALYUTA KURSLARI

CBU API allaqachon integratsiya qilingan. Yangi valyutalar:
- **RUB** (Wildberries, Ozon) — CBU da mavjud ✅
- **TRY** (Trendyol, Hepsiburada) — CBU da mavjud ✅

Alohida ish kerak emas.

---

## SPRINT PLANI

### Sprint 1 — Asos (3 kun)
Maqsad: DB tayyorlash, Uzum rasmlarini olish, queue yaratish

- `schema.prisma`: yangi ustunlar + migration
- `uzum.client.ts`: `fetchProductDetail()` da photos maydonini normalizatsiya
- `products.service.ts`: `track()` da rasm URL saqlash
- `visual-sourcing.queue.ts`: yangi BullMQ queue
- `seed.ts`: 8 ta yangi platforma

### Sprint 2 — Bing Visual + oson platformalar (4 kun)
Maqsad: vizual qidiruv ishlaydi, 4 ta yangi platforma tayyor

- `visual-sourcing.processor.ts`: asosiy pipeline skeleti
- SerpAPI Bing Visual Search integratsiyasi
- Wildberries: direct API
- eBay va Amazon US: SerpAPI (30 daqiqadan)
- AliExpress: mavjud client'ni worker'ga ulash

### Sprint 3 — Playwright platformalar + AI scoring (4 kun)
Maqsad: Ozon, Trendyol, Hepsiburada tayyor; AI vizual scoring ishlaydi

- Ozon: Playwright + JSON intercept
- Trendyol: Playwright + JSON intercept
- Hepsiburada: Playwright + JSON intercept
- Claude Haiku vision scoring
- combined_score hisoblash

### Sprint 4 — Frontend + polish (3 kun)
Maqsad: UI yangilanadi, foydalanuvchi ko'radi

- ProductPage: visual sourcing job polling
- SourcingPage: platform bayrog'i, moslik foizi, yangi ustunlar
- Admin panel: platform on/off toggle
- Temu: TEMU_ENABLED flag mexanizmi

---

## XAVFLAR VA QARORLAR

| Xavf | Ehtimollik | Qaror |
|------|-----------|-------|
| Uzum rasmi CDN dan yuklanmasa | Past | images.uzum.uz ochiq CDN |
| Bing Visual noto'g'ri natija bersa | O'rta | AI scoring filtrdan o'tkazadi, past combined_score yashiriladi |
| WB / Ozon IP blok qilsa | O'rta | PROXY_URL mavjud (Playwright allaqachon ishlatadi) |
| Trendyol / Hepsiburada anti-bot | O'rta | Slow scroll, user-agent rotation, DOM fallback |
| Playwright timeout | O'rta | Promise.allSettled — biri xato qilsa qolganlar to'xtamaydi |
| AI vision narxi | O'rta | Faqat top-10 uchun scoring, Haiku modeli (eng arzon) |
| Temu holati noaniq | Yuqori | is_active=false — xavfsiz, kerak bo'lganda yoqiladi |
| Pinduoduo anti-bot | Yuqori | Bing Visual passiv — to'liq scraper keyinroq |

---

## MUHIM ARXITEKTURA QARORLARI

**Nima uchun Bing Visual (SerpAPI)?**
Google Lens/Shopping olib tashlandi. Bing Visual SerpAPI da mavjud, `SERPAPI_API_KEY` allaqachon bor, qo'shimcha kalit kerak emas.

**Nima uchun rasm + matn kombinatsiyasi?**
Faqat rasm: ba'zi platformalar rasmlarni o'zgartiradi (watermark, fon). Faqat matn: til muammolari. Kombinatsiya ikkalasining kuchli tomonlarini oladi.

**Nima uchun Promise.allSettled?**
13 ta platformadan biri ishlamasa qolgan 12 tasi to'xtamasligi kerak. Mavjud pipeline ham shu pattern'da — izchillik.

**Nima uchun Temu va Pinduoduo is_active=false?**
Temu bloklangan, Pinduoduo anti-bot kuchli. Riskli platformalarni o'chiriq boshlash — barqarorlik va vaqt tejash.

**Nima uchun cargo faqat top-5 uchun?**
100+ natija uchun cargo hisoblash sekin va qimmat. Eng yuqori combined_score li 5 ta natija uchun yetarli.

---

*VENTRA Visual Search Architecture | 2026-03-23*
