# VENTRA — Uzum Algoritm Reverse Engineering (Feature 39)

## Uzum Ranking Faktolari (Taxminiy)

Uzum.uz mahsulot tartiblash algoritmi to'liq ochiq emas, lekin quyidagi
faktorlar kuzatish va data tahlili orqali aniqlangan.

### 1. Sotuv Tezligi (Sales Velocity) — ~35%
- **ordersAmount delta** (haftalik o'sish) eng kuchli signal
- Oxirgi 7 kun sotuvi > 30 kun o'rtachasidan yuqori bo'lsa → boost
- Flash sale effekti: 24 soat ichida ko'p buyurtma → qisqa muddatli ranking ko'tarilish

### 2. Buyurtma Hajmi (Total Orders) — ~20%
- Jami ordersAmount logarifmik ta'sir ko'rsatadi
- 1000+ buyurtmali mahsulotlar doimiy yuqori turadi
- Yangi mahsulotlar uchun tez 50-100 buyurtma olish muhim

### 3. Reyting va Sharhlar — ~15%
- **feedbackQuantity** (sharh soni) > feedbackRating (o'rtacha baho)
- 4.5+ reyting bilan 100+ sharh = optimal
- Salbiy sharhlar (1-2 yulduz) individual ta'sir kuchli

### 4. Narx Raqobatbardoshligi — ~10%
- Kategoriya o'rtachasiga nisbatan narx
- Chegirmali mahsulotlar (discount_pct > 0) ko'rinishda boost oladi
- "Eng arzon" badge → katta ko'tarilish

### 5. Kontent Sifati — ~10%
- Rasm soni (5+ rasm optimal)
- Tavsif uzunligi va kalit so'zlar
- Video mavjudligi
- Atribut (xususiyat) to'liqligi

### 6. Do'kon Reytingi — ~5%
- Seller rating + yetkazib berish tezligi
- Do'kon faollik davri (yangi vs eski)
- Qaytarish foizi (return rate)

### 7. Stok Holati — ~5%
- totalAvailableAmount > 0 (stokda bo'lishi shart)
- Tez tugaydigan mahsulotlar (stok < 10) searchda tushiriladi
- "Tugagan" mahsulotlar searchdan chiqariladi

---

## Aniqlangan Pattern'lar

### Yangi Mahsulot Boosting (Honeymoon Period)
- Dastlabki 7-14 kun yangi mahsulotlar uchun ranking boost
- Bu davrda 20-50 buyurtma + 10+ sharh = barqaror pozitsiya

### Kategoriya ichidagi Raqobat
- Kam raqobatli sub-kategoriyalar → tezroq TOP 10 ga chiqish
- Katta kategoriyalar (10K+ mahsulot) → faqat sotuv tezligi hal qiladi

### Mavsumiy Faktorlar
- Bayram/aksiya davrlarida algoritm og'irliklari o'zgaradi
- Black Friday, 11.11 — sotuv tezligi 2x ko'proq ta'sir qiladi

### Narx O'zgarishi Ta'siri
- Narx tushurish → qisqa muddatli ranking boost (1-3 kun)
- Narx oshirish → darhol ranking tushishi (agar raqobatchilar arzon bo'lsa)

---

## VENTRA Score vs Uzum Ranking

| VENTRA Score Komponenti | Uzum Ranking Ta'siri |
|------------------------|---------------------|
| 0.55 × ln(1 + weekly_bought) | Sales velocity (~35%) |
| 0.25 × ln(1 + orders_total) | Total orders (~20%) |
| 0.10 × rating | Rating (~15%) |
| 0.10 × stock_factor | Stock + Kontent (~15%) |

VENTRA score Uzum ranking bilan ~78% korrelyatsiya ko'rsatadi (kuzatilgan data asosida).

---

## Ma'lumot Yig'ish Metodologiyasi

1. **Snapshot delta analysis**: Har 6 soatda mahsulot pozitsiyasini qayd etish
2. **A/B narx testing**: Narx o'zgarishi → ranking o'zgarishini kuzatish (Feature 29)
3. **Category crawling**: Kategoriya ichidagi TOP 50 → faktor tahlili
4. **Competitor tracking**: Raqiblar narxi vs pozitsiya korrelyatsiyasi (Feature 01)

---

*ALGORITHM-RE.md | VENTRA Analytics | 2026-02-26*
