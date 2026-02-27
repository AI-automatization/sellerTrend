# VENTRA — DATA ACCURACY BUGLAR
# Yangilangan: 2026-02-27
# Manba: Uzum.uz sahifa tahlili + kod audit

---

## Uzum.uz dan olinadigan MA'LUMOTLAR XARITASI

```
Uzum sahifada ko'rinadi          Uzum REST API qaytaradi         Bizda (DB/kod)
─────────────────────────        ─────────────────────────       ─────────────────────
"533 человека купили"            ❌ YO'Q (API da mavjud emas)    weekly_bought (snapshot delta)
"38 600 сум" (narx)              ✅ purchasePrice                 min_sell_price ✅
"Можно купить 5 шт"             ✅ sku.availableAmount            ❌ XATO: stok deb ishlatilgan
Ombor stoki (ko'rinmaydi)       ✅ totalAvailableAmount           ❌ DB da YO'Q
"4.7 тыс buyurtma"              ✅ ordersAmount                   orders_quantity ✅
"8 894 ta sharh"                 ✅ reviewsAmount                  feedback_quantity ✅
"4.7 ⭐" reyting                 ✅ rating                         rating ✅
Do'kon nomi                      ✅ shop.title                     ❌ shop.name (undefined)
Chegirma narx                    ✅ fullPrice                      min_full_price ✅
Haftalik sotuv raqami            ❌ YO'Q                           ❌ Hisoblash NOANIQ
FBO/FBS turi                     ✅ stockType                      stock_type ✅
```

---

## D-01 | KRITIK | Haftalik sotuv — Uzum ko'rsatadi, biz hisoblaymiz (NOANIQ)

**Manba:** `hato/1.png` — "533 человека купили на этой неделе"

**Muammo:**
Uzum sahifada HAQIQIY haftalik xaridorlar soni ko'rsatiladi: **"533 человека купили на этой неделе"**.
Lekin Uzum REST API (`/api/v2/product/{id}`) bu raqamni QAYTARMAYDI.

Bizning sistema `weekly_bought` ni snapshot delta bilan hisoblaydi:
```
weekly_bought = (bugungi ordersAmount - 7 kun oldingi ordersAmount) * 7 / kunlar_farqi
```

**Muammo nima:**
- Snapshot har 6 soatda olinadi → 1 kun ichida 4 ta snapshot
- Agar snapshot yo'q bo'lsa (server o'chgan, API xato) → weekly_bought = 0 yoki null
- Bu HAQIQIY raqam emas, TAXMINIY hisob
- Uzum'dagi "533" bilan bizning hisob FARQ qilishi mumkin

**Yechim variantlari:**
1. **DOM scraping** — Playwright bilan sahifadan "XXX человека купили" matnini parse qilish
   - `packages/utils/src/index.ts:17-26` da `parseWeeklyBought()` funksiya ALLAQACHON bor (lekin ishlatilmayapti)
   - Regex: `/(\d[\d\s]*)\s*(человек|kishi|нафар)/i`
2. **Uzum API monitoring** — API response'da yangi field paydo bo'lishini kuzatish
3. **Hozirgi holat** — snapshot delta bilan davom etish (yagona variant)

**Fayllar:**
- `packages/utils/src/index.ts:17-26` — `parseWeeklyBought()` DEAD CODE (ishlatilmaydi)
- `packages/utils/src/index.ts:78-133` — `calcWeeklyBought()` hozirgi hisoblash
- `apps/api/src/products/products.service.ts:47-50` — weekly_bought hisoblash
- `apps/api/src/signals/signals.service.ts:32-40` — signal uchun ishlatiladi

---

## D-02 | KRITIK | `availableAmount` = buyurtma limiti, stok EMAS

**Manba:** `hato/1.png` — "Можно купить 5 шт"

**Muammo:**
Uzum API dagi `sku.availableAmount = 5` bu **bir xaridda max 5 ta olish limiti**.
Bu **ombor stoki EMAS**. Haqiqiy stok `totalAvailableAmount` da (masalan, 2659).

Kodda `availableAmount` to'g'ri ishlatilgan joylar:
- `reanalysis.processor.ts:90-91` — faqat `is_available` boolean uchun ✅

Kodda XATO ishlatilgan joy:
- Stock cliff detection (`signals.service.ts:186`) — `totalAvailableAmount` yo'q, heuristic ishlatadi
- Frontend'da "Stok: 2,255 dona" ko'rsatiladi — bu `totalAvailableAmount`, to'g'ri

**Fayllar:**
- `apps/worker/src/processors/uzum-scraper.ts:153` — API dan olinadi
- `apps/api/src/signals/signals.service.ts:186` — comment: "total_available_amount not in schema yet"

---

## D-03 | YUQORI | `totalAvailableAmount` DB schema'da YO'Q — stock cliff noaniq

**Muammo:**
Uzum API `totalAvailableAmount` qaytaradi (haqiqiy ombor stoki).
Lekin Prisma schema'da bu field **YO'Q** — DB ga saqlanmaydi.

Stock cliff detection (`signals.service.ts`) heuristic ishlatadi:
```typescript
// total_available_amount not in schema yet — rely on orders_quantity heuristic
const estimatedStock = Number(orders_quantity) * 0.1;
```

Bu 10x NOANIQ — 45,000 buyurtmali mahsulot uchun estimated = 4,500 dona, haqiqiy = 2,255 dona.

**Yechim:**
1. Prisma schema'ga `total_available_amount Int?` field qo'shish
2. `reanalysis.processor.ts` va `import.processor.ts` da saqlashni qo'shish
3. `signals.service.ts` da haqiqiy stockni ishlatish

**Fayllar:**
- `apps/api/prisma/schema.prisma` — Product model
- `apps/worker/src/processors/reanalysis.processor.ts:77-132`
- `apps/worker/src/processors/import.processor.ts:75-130`
- `apps/api/src/signals/signals.service.ts:186`

---

## D-04 | YUQORI | `shop.name` undefined — `shop.title` bo'lishi kerak

**Muammo:**
Uzum API `shop.title` qaytaradi (masalan, "World of stationery").
Kod `shop.name` o'qiydi → doim `undefined`.

**Fayl:** `apps/api/src/products/products.service.ts:158`
**Fix:** `shop.name` → `shop.title`

---

## D-05 | O'RTA | `feedbackQuantity` vs `reviewsAmount` — 2 ta processor xato

**Muammo:**
Uzum REST API `reviewsAmount` field qaytaradi.
Lekin 2 ta processor `feedbackQuantity` deb o'qishga harakat qiladi:

| Fayl | O'qiydi | API qaytaradi | Natija |
|------|---------|---------------|--------|
| `reanalysis.processor.ts:75` | `detail.reviewsAmount` | `reviewsAmount` ✅ | Ishlaydi |
| `import.processor.ts:75` | `detail.reviewsAmount` | `reviewsAmount` ✅ | Ishlaydi |
| `uzum-scraper.ts:194` | `p.reviewsAmount ?? p.feedbackQuantity` | `reviewsAmount` | Tartib noto'g'ri |

**Haqiqiy muammo:** `uzum-scraper.ts:194` da fallback tartibi noto'g'ri:
```typescript
// Hozir:
reviewsAmount: p.reviewsAmount ?? p.feedbackQuantity ?? 0
// To'g'ri: (chunki ba'zi endpoint'lar feedbackQuantity ishlatadi)
reviewsAmount: p.feedbackQuantity ?? p.reviewsAmount ?? 0
```

**Fayllar:**
- `apps/worker/src/processors/uzum-scraper.ts:194`
- `apps/worker/src/processors/reanalysis.processor.ts:75`
- `apps/worker/src/processors/import.processor.ts:75`

---

## D-06 | O'RTA | 3 ta `fetchProductDetail` nusxasi — DRY buzilgan

**Muammo:**
Bir xil Uzum API chaqiruvi 3 ta faylda alohida yozilgan:

| Fayl | Type mapping | To'g'rimi? |
|------|-------------|------------|
| `uzum-scraper.ts:163-201` | Canonical, to'g'ri | ✅ |
| `import.processor.ts:18-25` | Raw API, mapping yo'q | ⚠️ |
| `reanalysis.processor.ts:32-43` | Raw API, mapping yo'q | ⚠️ |

Raw versiyalar field mapping qilmaydi → D-04, D-05 kabi buglar kelib chiqadi.

**Yechim:** Bitta `fetchProductDetail` funksiya — `uzum-scraper.ts` dan import qilish.

---

## D-07 | O'RTA | `parseWeeklyBought()` DEAD CODE — o'chirish kerak

**Muammo:**
`packages/utils/src/index.ts:17-26` da `parseWeeklyBought()` funksiya bor.
Uzum API dan `actions.text` field OLIB TASHLANGAN — bu funksiya hech qachon ishga tushmaydi.
Faqat test faylda ishlatiladi.

**Yechim:** Funksiya va testini O'CHIRISH.

**Fayllar:**
- `packages/utils/src/index.ts:17-26`
- `packages/utils/src/__tests__/scoring.test.ts`

---

## D-08 | PAST | `rOrdersAmount` — rounded total, faqat display

**Holat:** TO'G'RI ISHLATILGAN ✅

Uzum API `rOrdersAmount` qaytaradi — bu ROUNDED jami buyurtma (masalan, "4.7 тыс" = 4700).
Kod buni hisoblashda ISHLATMAYDI, faqat display uchun.

**Tasdiqlangan:** `uzum-scraper.ts:151-152` — comment mavjud, hisoblashda foydalanilmaydi.

---

## D-09 | PAST | Narx fieldlari — to'g'ri mapping

**Holat:** TO'G'RI ISHLATILGAN ✅

| Uzum API | DB field | Izoh |
|----------|----------|------|
| `purchasePrice` | `min_sell_price` | Sotish narxi (SUM) |
| `fullPrice` | `min_full_price` | Chegirmasiz narx |

---

## XULOSA

| # | Bug | Severity | Holat |
|---|-----|----------|-------|
| D-01 | Haftalik sotuv Uzum da bor, API da yo'q | KRITIK | Yechim yo'q (API bermaydi) |
| D-02 | `availableAmount` ≠ stok | KRITIK | Kodda to'g'ri, UI da tushunarli qilish kerak |
| D-03 | `totalAvailableAmount` DB da yo'q | YUQORI | Prisma migration kerak |
| D-04 | `shop.name` → `shop.title` | YUQORI | 1 qator fix |
| D-05 | `feedbackQuantity` fallback tartibi | O'RTA | Tartib almashtirish |
| D-06 | 3x `fetchProductDetail` DRY | O'RTA | Refactoring kerak |
| D-07 | `parseWeeklyBought` dead code | O'RTA | O'chirish |
| D-08 | `rOrdersAmount` display only | ✅ TO'G'RI | — |
| D-09 | Narx fieldlari | ✅ TO'G'RI | — |

---

*bugs.md | VENTRA Analytics Platform | 2026-02-27*
