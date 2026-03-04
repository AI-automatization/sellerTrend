# VENTRA BOG‘LANGAN TAHLIL TIZIMI (TO‘G‘RI VARIANT)

Ventra tahlil tizimi 6 ta bo‘limdan alohida xulosa chiqarmaydi.
Aksincha, 6 bo‘limdagi signallar bir-biri bilan bog‘lanadi va yakunda
sotuvchiga aniq qaror chiqarib beriladi.

Natija har doim quyidagicha bo‘ladi:
- KIRISH (olib kelib sotish mumkin)
- KUZATISH (hali erta, signal kutish kerak)
- QOCHISH (risk yuqori)


---

## 0) Asosiy tamoyil: signal → tasdiqlash → qaror

Har bir tavsiya 3 bosqichdan o‘tadi:

1) Signal bor (masalan talab oshyapti)
2) Tasdiqlash bor (masalan sharhlar oshyapti + sotuvchilar qiziqyapti)
3) Qaror (kirish/kuzatish/qochish)

Agar signal tasdiqlanmasa, “KUZATISH”ga tushadi.
Agar signalga qarshi kuchli risk bo‘lsa, “QOCHISH”ga tushadi.


---

## 1) Kategoriya filtri (bozorga kirish joyi)

(!) Avval kategoriya tanlanadi, chunki noto‘g‘ri kategoriyada eng zo‘r mahsulot ham ishlamasligi mumkin.

Kategoriya holati:
- Tez o‘smoqda  → +2 ball
- Barqaror      → +1 ball
- Sekinlashmoqda → 0 ball
- O‘layapti      → -2 ball

Qo‘shimcha:
- Kategoriya bo‘sh (raqobat kam) → +2 ball
- Kategoriya to‘lyapti (raqobat tez kiryapti) → -1 ball

Natija:
- 3+ ball → kategoriya “YAXSHI”
- 1–2 ball → kategoriya “O‘RTACHA”
- 0 va past → kategoriya “YOMON”


---

## 2) Mahsulot tanlash (kategoriya ichida)

(!) Kategoriya “YAXSHI” yoki “O‘RTACHA” bo‘lsa, mahsulot tanlanadi.

Mahsulot trend signali:
- Haftalik sotuv o‘sishi kuchli → +2 ball
- Sharhlar o‘sishi kuchli       → +1 ball
- Sotuvchi qiziqishi (ko‘p ko‘rilgan/tahlil qilingan) → +1 ball

Agar trend balli 3+ bo‘lsa → mahsulot “TREND”


---

## 3) Risk tekshirish (qarorni buzadigan narsa)

(!) Trend bo‘lsa ham risk bo‘lsa, kirish mumkin emas.

Risklar:
- Narx urushi boshlangan → -2 ball
- Raqobat tez oshyapti   → -1 ball
- Talab pasaymoqda       → -2 ball
- Mavsum tugayapti        → -1 ball

Natija:
- Risk -3 va past → mahsulot “XAVFLI”


---

## 4) Yakuniy qaror chiqarish (KIRISH/KUZATISH/QOCHISH)

Qaror qoidasi:

### KIRISH
- Kategoriya “YAXSHI”
- Mahsulot “TREND”
- Risk “XAVFLI” emas

### KUZATISH
- Kategoriya “O‘RTACHA”
  yoki
- Trend signal bor, lekin tasdiqlash yetarli emas
  yoki
- Risk -1..-2 (chegara holat)

### QOCHISH
- Kategoriya “YOMON”
  yoki
- Risk “XAVFLI”
  yoki
- Talab pasaymoqda + narx urushi birga kelgan


---

## 5) Ishonch darajasi (aniqlik)

Har bir qarorga ishonch qo‘yiladi:

- Yuqori: 3+ mustaqil signal tasdiqlagan
- O‘rtacha: 2 ta signal tasdiqlagan
- Past: 1 ta signal yoki ma’lumot yetarli emas


---

## 6) AI (LLM) vazifasi (endilikda to‘g‘ri)

LLM endi “signallarni sanab bermaydi”.
LLM ning vazifasi:

- yakuniy qarorni izohlash
- 2–3 ta eng muhim sababni sodda qilib aytish
- risklarni tushuntirish
- 1 haftalik harakat rejasini berish

LLM hech qachon “qaror qoidasi”ni buzmaydi.
Qaror avval Decision Engine tomonidan chiqadi.
LLM faqat izoh beradi.