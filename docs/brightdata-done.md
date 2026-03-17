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
