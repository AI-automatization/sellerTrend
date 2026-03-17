# VENTRA — Bright Data Integration: Bajarilgan Vazifalar

---

### T-454 ✅ DONE (2026-03-17, 18a1eb4)

**P1 | WORKER | Bright Data proxy — sourcing.processor.ts (Banggood/Shopee Railway IP fix)**

**Manba:** ai-tahlil
**Bajaruvchi:** Claude-Auto (multi-agent)

**Muammo:**
Railway serverining IP manzili Banggood va Shopee tomonidan bloklanayotgan edi.
`chromium.launch()` to'g'ridan Railway IP bilan ulanardi → scraping ishlamasdi.

**Yechim:**
- `browser-pool.ts` ga `getBrightDataWsEndpoint()` helper qo'shildi
- `isBrightData()` flag qo'shildi
- `getBrowser()` — `BRIGHT_DATA_USERNAME` mavjud bo'lsa `chromium.connectOverCDP()`, aks holda local fallback
- `sourcing.processor.ts` — `runFullPipeline()` Bright Data context / local context alohida
- `.env.example` — `BRIGHT_DATA_USERNAME`, `BRIGHT_DATA_PASSWORD` qo'shildi

**Ta'sir:**
Railway da `BRIGHT_DATA_USERNAME/PASSWORD` env variables qo'shilgach Banggood va Shopee scraping ishlaydi.
Local muhitda env yo'q bo'lsa — eski Playwright fallback saqlanib qolgan.

**Fayllar:**
- `apps/worker/src/browser-pool.ts`
- `apps/worker/src/processors/sourcing.processor.ts`
- `.env.example`

---

### T-455 ✅ DONE (2026-03-17, 18a1eb4)

**P1 | BACKEND | Job caching — sourcing.service.ts (30 daqiqa)**

**Manba:** ai-tahlil
**Bajaruvchi:** Claude-Auto (multi-agent)

**Muammo:**
`ProductPage` ochilgan har safar yangi `ExternalSearchJob` yaratilayotgan edi.
Bir xil mahsulot uchun takroriy API kredit isrofi (Bright Data + SerpAPI).

**Yechim:**
`sourcing.service.ts` — `createSearchJob()` boshida 30 daqiqa cache check qo'shildi.
`DONE/RUNNING/PENDING` statusli oxirgi job mavjud bo'lsa — yangi job yaratmasdan uni qaytaradi.

**Ta'sir:**
Bir foydalanuvchi yoki turli foydalanuvchilar bir xil mahsulotni 30 daqiqa ichida ochmasa —
faqat 1 ta API chaqiruvi. Kredit sarfi kamaydi.

**Fayllar:**
- `apps/api/src/sourcing/sourcing.service.ts`

---

### T-456 ✅ DONE (2026-03-17, 3b5fee6)

**P1 | FRONTEND | ProductPage — quick mode → full pipeline (job + polling)**

**Manba:** ai-tahlil
**Bajaruvchi:** Claude-Auto (multi-agent)

**Muammo:**
`ProductPage.tsx` eski `/sourcing/search` (quick mode) ishlatayotgan edi — faqat 2 platforma,
DB ga saqlanmasdi, 1688/Taobao/Alibaba yo'q edi.

**Yechim:**
- `extNote` state olib tashlandi
- `extJobId`, `extJobStatus` state qo'shildi
- Eski `searchPrices` useEffect → 2 ta yangi: `createJob` + polling (har 3 soniya)
- Reset useEffect yangilandi
- `GlobalPriceComparison` chaqiruvi: `note/productTitle` → `jobStatus`

**Ta'sir:**
5 platforma (1688, Taobao, Alibaba, Banggood, Shopee) natijalar ko'rinadi.
Job cache ishlaydi (T-455 bilan birgalikda).

**Fayllar:**
- `apps/web/src/pages/ProductPage.tsx`

---

### T-457 ✅ DONE (2026-03-17, 0aefc10)

**P2 | FRONTEND | GlobalPriceComparison — yangi pipeline format + status badge**

**Manba:** ai-tahlil
**Bajaruvchi:** Claude-Auto (multi-agent)

**Muammo:**
`GlobalPriceComparison` component eski quick mode formatini (`price` string, `source`, `image`) ko'rar edi.
Yangi pipeline formatida (`price_usd` number, `platform`, `image_url`) natijalar ko'rinmasdi.

**Yechim:**
- Props: `note/productTitle` o'chirildi, `jobStatus` qo'shildi
- `parsePrice`: `price_usd` (number) va `price` (string) ikkalasini qo'llaydi
- `sourceKey`: `item.platform ?? item.source` normallashtirish
- Kartochka: `image_url`, `seller_name`, `url` fallback fieldlar
- Status badge: PENDING/RUNNING → spinner, DONE → natija soni, FAILED → xato
- Sarlavha: "Banggood va Shopee" → "1688, Taobao, Alibaba, Banggood, Shopee"
- Bo'sh holat: `jobStatus` PENDING/RUNNING bo'lsa yashiriladi

**Ta'sir:**
Yangi pipeline natijalarining barchasi to'g'ri ko'rinadi.
Foydalanuvchi job holati (qidirmoqda / tayyor / xato) ni real-time ko'radi.

**Fayllar:**
- `apps/web/src/components/product/GlobalPriceComparison.tsx`

---
