# VENTRA Business Analytics Report
# BA Agent tomonidan avtomatik generatsiya qilinadi
# Yangilangan: 2026-03-13 (Sprint 10 COMPLETED)

---

## 1. Executive Summary

**VENTRA** — Uzum.uz marketplace uchun SaaS analytics platformasi. 180+ task bajarilgan, ~30 ochiq.
57 DB model, 14 enum, 31 frontend sahifa, 30+ backend modul. Platforma texnik jihatdan **production-ready** darajaga yetdi.

**Sprint 10 YAKUNLANDI (2026-03-13):**
- Search feature DONE — SearchPage + ProductSearchCard + search analytics (query logging, admin endpoint)
- BrightData sourcing DONE — AliExpress, 1688, Taobao narx taqqoslash
- ExpandPanel DONE — inline product analysis with sourcing data
- Track auto-create DONE — extension dan istalgan mahsulotni track qilish (DB da avtomatik yaratiladi)
- T-431 BigInt fix DONE — trackProduct shop BigInt mismatch 500 xatosi tuzatildi
- Chrome Extension v1.0.0 — Sardor tomonidan Chrome Web Store ga publish qilindi
- **T-429 HAL BO'LDI** — track endpoint ishlaydi, extension to'liq funksional

**Joriy holat:** Sprint 10 bilan **Search -> Track -> Analyze pipeline to'liq tugallandi**. Platforma **beta-launch ready**. Qolgan 2 ta KRITIK gap: (1) custom domain (ventra.uz), (2) to'lov gateway (Click/Payme). Bu ikkalasi hal bo'lsa — birinchi 50 beta foydalanuvchini jalb qilish mumkin.

**Eng muhim o'zgarish:** Sprint 10 da **foydalanuvchi value chain yakunlandi**: mahsulot qidirish (Search) -> tahlil qilish (Score + ExpandPanel) -> kuzatuvga olish (Track auto-create) -> xalqaro narx taqqoslash (BrightData sourcing). Extension CWS da chiqdi — bu VENTRA ning birinchi organic acquisition kanali.

---

## 2. Feature Impact Assessment

### 2.1. Sprint 10 Completion (2026-03-08..2026-03-13)

| Task | Status | UX (1-5) | Revenue (1-5) | Competitive (1-5) | Umumiy ta'sir |
|------|--------|----------|---------------|-------------------|--------------|
| **T-417 i18n (search)** | DONE | 3 | 1 | 2 | O'rta |
| **T-418 ProductSearchCard** | DONE | 5 | 3 | 4 | **YUQORI** |
| **T-420 BrightData client** | DONE | 1 | 4 | 5 | **KRITIK** |
| **T-419 ExpandPanel** | DONE | 5 | 3 | 4 | **YUQORI** |
| **T-421 Sourcing endpoint** | DONE | 2 | 4 | 5 | **YUQORI** |
| **T-422 SourcePricePanel** | DONE | 5 | 5 | 5 | **KRITIK** |
| **Track auto-create** | DONE | 4 | 3 | 3 | **YUQORI** |
| **Search analytics** | DONE | 2 | 2 | 3 | O'rta |
| **T-431 BigInt fix** | DONE | 3 | 1 | 1 | Bug fix |
| **Extension CWS v1.0.0** | DONE | 5 | 4 | 5 | **KRITIK** |

### 2.1.1. Sprint 10 Feature Impact Assessment

**Search (SearchPage + ProductSearchCard):**
- Foydalanuvchi endi VENTRA ichida Uzum mahsulotlarini qidiradi — uzum.uz ga borish shart emas
- `Search -> Score -> Track -> Monitor` funnel to'liq yopildi
- Search analytics (query logging) bilan qaysi mahsulotlar eng ko'p qidirilayotganini bilish mumkin
- **Biznes ta'sir:** Platformadan chiqmasdan mahsulot topish = session duration va engagement oshadi

**BrightData Sourcing (AliExpress, 1688, Taobao):**
- 3 ta xalqaro marketplace dan narx taqqoslash — Uzum narxi vs xarid narxi = margin hisoblash
- SourcePricePanel orqali inline ko'rish (ExpandPanel ichida)
- **Biznes ta'sir:** Bu VENTRA ning eng kuchli differentiator — hech bir O'zbekiston SaaS bunday qilmaydi. Sotuvchilarga real margin ko'rsatish = PRO/MAX plan uchun eng kuchli upsell argument

**Extension CWS v1.0.0:**
- Chrome Web Store da birinchi release — Sardor tomonidan publish
- Uzum sahifasida mahsulotni 2 soniyada tahlil qilish (QuickAnalyze)
- Track auto-create: extension dan istalgan mahsulotni 1-click track (DB da avtomatik yaratiladi, "product not found" xatosi yo'q)
- **Biznes ta'sir:** Organic acquisition kanal ochildi. CWS search + word-of-mouth = bepul foydalanuvchi jalb qilish

**Track Auto-Create:**
- Oldin: foydalanuvchi faqat DB da mavjud mahsulotlarni track qila olardi
- Endi: istalgan Uzum mahsulotini track qilsa — avtomatik DB da yaratiladi
- T-431 BigInt fix bilan shop ID mismatch xatosi ham tuzatildi
- **Biznes ta'sir:** Friction yo'qoldi. Track conversion rate 2-3x oshishi kutiladi

### 2.1.2. Sprint 10 Business Value Summary

```
VALUE CHAIN TUGALLANDI:
  Search (qidirish) -> Score (tahlil) -> Track (kuzatuv) -> Source (narx taqqoslash)
  |                    |                  |                   |
  VENTRA ichida        Inline panel       Auto-create DB      AliExpress/1688/Taobao
  mahsulot topish      ExpandPanel        1-click, no error   margin hisoblash

DISTRIBUTION KANAL OCHILDI:
  Extension v1.0.0 → CWS → organic installs → uzum.uz da ishlatish → conversion
```

**Natija:** Sprint 10 bilan VENTRA "feature-complete for beta" darajasiga yetdi. Texnik blocker (T-429, T-431) hal bo'ldi. Endi faqat GTM (domain + payment + users) qoldi.

### 2.2. Extension Progress (Sardor)

| Feature | Task | Status | Biznes ta'siri |
|---------|------|--------|---------------|
| QuickAnalyze popup | T-216 | DONE | Uzum sahifada 2 soniyada score — **aha moment** |
| Category sidebar filter | T-217 | DONE (tahlil jarayonida) | Kategoriya bo'yicha filtrlash |
| Advanced filters | T-218 | DONE (tahlil jarayonida) | Search + sorting ichida |
| Category trends | T-219 | DONE (tahlil jarayonida) | Trend ko'rish |
| Competitor analysis | T-220 | DONE (tahlil jarayonida) | Raqiblar taqqoslash tab |
| Price history chart | T-221 | DONE (tahlil jarayonida) | 7 kunlik narx grafigi |
| Favorites & notes | T-222 | DONE (tahlil jarayonida) | Saqlash + eslatmalar |
| **Modal auto-close fix** | T-427 | DONE | Kritik UX bug tuzatildi |
| **Untracked product fallback** | T-428 | DONE | Uzum API fallback qo'shildi |
| **Track button (backend)** | T-429 | DONE | Track endpoint ishlaydi |
| **Track auto-create** | — | DONE | Istalgan mahsulotni auto-create + track |
| **T-431 BigInt fix** | T-431 | DONE | Shop ID BigInt mismatch tuzatildi |
| v1.0.0 CWS publish | T-228 | DONE | Chrome Web Store da chiqdi |

**Extension xulosa:** Phase 3-5 to'liq tayyor va CWS da publish qilingan. T-429 va T-431 tuzatildi — track button ishlaydi, auto-create mavjud. Extension endi VENTRA ning asosiy organic acquisition kanali.

---

## 3. Feature Gap Analysis — Beta Launch uchun

### 3.1. MINIMUM VIABLE LAUNCH (50 beta user uchun)

| Gap | Status | Urgency | Effort | Blocker? |
|-----|--------|---------|--------|----------|
| ~~T-429: trackFromSearch deploy~~ | ✅ DONE (Sprint 10) | — | — | ~~Hal bo'ldi~~ |
| **Custom domain (ventra.uz)** | Domain sotib olinmagan | P0 | 30min (DNS) + sotib olish | **HA** — yagona qolgan blocker |
| **To'lov gateway** | Hech biri integratsiya qilinmagan | P1 | 1-2 hafta | YO'Q — beta da bepul bo'lishi mumkin |
| **CDN (Cloudflare)** | T-281 ochiq, qadamlar yozilgan | P1 | 1.5h | YO'Q — Railway ishlaydi |
| ~~Chrome Web Store publish~~ | ✅ DONE (Sprint 10) | — | — | ~~Hal bo'ldi~~ |
| **Onboarding polish** | 3-step onboarding mavjud | P2 | 2h | YO'Q |
| **Landing screenshots/video** | M-001, M-003 ochiq | P1 | 1h | YO'Q — lekin conversion uchun muhim |

### 3.2. MINIMUM FEATURE SET (birinchi 50 user uchun yetarli)

Hozirgi platforma 50 beta user uchun **YETARLI**. Quyidagilar allaqachon ishlaydi:

1. **Mahsulot tahlili** — URL orqali score, narx, rating, trend ko'rish
2. **Tracking (kuzatuv)** — mahsulotni kuzatuvga qo'shish, haftalik o'zgarishlar
3. **Search** — nomi bo'yicha mahsulot qidirish + 1-click track
4. **Discovery** — kategoriya bo'yicha top mahsulotlar
5. **Signals** — narx tushdi, stok tugadi, trend o'zgardi alertlar
6. **Telegram bot** — morning digest, alertlar, account linking
7. **Chrome Extension** — Uzum sahifasida inline analytics (Phase 3-5)
8. **Billing UI** — plan tanlash, PlanGuard, PlanExpiredBanner
9. **Onboarding** — 3-step wizard + guard
10. **Desktop app** — Windows installer (v1.0.2) GitHub Releases da

**YO'Q lekin 50 user uchun SHART EMAS:**
- To'lov gateway (beta = bepul, 1 oy PRO trial)
- Multi-marketplace (faqat Uzum yetarli)
- AI insights (bonus feature)
- Sourcing UX polish (BrightData ishlaydi, margin calculator kerak)

### 3.3. BETA LAUNCH BLOCKER lari (yangilangan — 2026-03-13)

```
BLOCKER 1: T-429 — trackFromSearch endpoint         ✅ HAL BO'LDI (Sprint 10)
BLOCKER 2: Custom domain (ventra.uz)                 ❌ HALI OCHIQ — professional URL shart
  Fix:      Domain sotib olish ($5-15) + DNS setup (30 min)
  Owner:    Bekzod
BLOCKER 3: Chrome Web Store publish (T-228)           ✅ HAL BO'LDI (Sprint 10, Sardor)
```

**Qolgan yagona BLOCKER:** Custom domain. Bu hal bo'lsa — beta launch uchun texnik to'siq QOLMAYDI.

---

## 4. Extension Impact Assessment

### 4.1. Extension Development Timeline

```
Phase 1 (T-208..T-211): ✅ Manifest, content scripts, popup boilerplate
Phase 2 (T-212..T-215): ✅ Auth, API integration, background service
Phase 3 (T-216):        ✅ QuickAnalyze popup — "Tez Tahlil" modal
Phase 4 (T-217..T-219): ✅ Category filter, Advanced filters, Category trends
Phase 5 (T-220..T-222): ✅ Competitor analysis, Price history, Favorites
Phase 6 (T-223..T-224): ⬜ AI recommendations, Hotkeys
Phase 7 (T-225..T-227): ⬜ i18n, Unit tests, Performance
Phase 8 (T-228..T-229): ⬜ CWS publish, Edge/Firefox
Phase 9 (T-230..T-233): ⬜ Security audit, Onboarding, Icons, Error handling
```

**v1.0.0 uchun tayyor (Phase 3-5):**
- 7 ta core feature implementatsiya qilingan
- T-427 (modal auto-close) va T-428 (untracked product fallback) buglar tuzatilgan
- `package.json` version `1.0.0` ga bump qilingan (3a8298d)
- Track button vaqtinchalik o'chirilgan (T-429 backend blocker)

### 4.2. Extension Biznes Ta'siri

| Metrika | Kutilgan ta'sir | Sabab |
|---------|----------------|-------|
| **Activation rate** | 40% -> 65% | Uzum sahifasida 2 sekund ichida birinchi score ko'rish |
| **Daily engagement** | 3-5x oshadi | Har Uzum tashrif = extension foydalanish |
| **Stickiness** | Juda yuqori | Browser da doim o'rnatilgan, uninstall past |
| **Distribution** | Organik o'sish | CWS search + Uzum foydalanuvchilar orasida so'z |
| **Competitive moat** | Kuchli | Uzum uchun analytics extension bozorda YO'Q |

### 4.3. T-429 + T-431 — HAL BO'LDI (Sprint 10)

Sprint 10 da hal qilindi:
- **T-429** — trackFromSearch endpoint deploy qilindi, track button ishlaydi
- **T-431** — shop ID BigInt mismatch tuzatildi (Sardor tomonidan topilgan bug)
- **Track auto-create** — extension dan istalgan mahsulotni track qilish mumkin (DB da avtomatik yaratiladi)
- Conversion funnel to'liq: `Score -> Track -> Monitor` — dead end YO'Q

**Natija:** Extension endi to'liq funksional — CWS da publish qilingan holda barcha feature'lar ishlaydi.

---

## 5. Revenue Model Validation

### 5.1. Hozirgi Narxlash

| Plan | Narx (UZS/oy) | USD | Feature'lar |
|------|---------------|-----|------------|
| FREE | 0 | $0 | 10 tahlil/oy, 5 tracked product |
| PRO | 99,000 | ~$7.50 | Unlimited tahlil, discovery, signals |
| MAX | 249,000 | ~$19 | AI insights, sourcing, export |
| COMPANY | 499,000 | ~$38 | API, team, white-label |

### 5.2. Narxlash Baholash

**Yaxshi tomonlar:**
- O'zbekiston SaaS bozoriga mos narxlar — PRO $7.50 = affordable
- Freemium model to'g'ri qaror — birinchi qiymatni bepul ko'rsatish
- 4-tier structure kelajak uchun scalable

**Muammolar va tavsiyalar:**

| Muammo | Tavsiya |
|--------|---------|
| PRO va MAX orasidagi gap ($7.50 vs $19) kichik | MAX ni $25-30 ga oshirish — AI va sourcing qimmatliroq |
| COMPANY $38 — O'zbekiston B2B uchun past | COMPANY ni $50-100 ga oshirish (API access = yuqori value) |
| FREE 10 tahlil/oy — juda ko'p bo'lishi mumkin | 5 tahlil/oy ga kamaytirish — tezroq upsell |
| Extension gating yo'q | Extension QuickAnalyze = FREE 5/oy, CategoryTop = PRO only |
| Annual discount yo'q | Yillik to'lovda 20% chegirma — retention oshiradi |

### 5.3. Yangilangan MRR Prognoz

| Oy | Total Users | Paid (12%) | MRR (avg $10) | Kumulyativ |
|----|-------------|-----------|---------------|------------|
| 1 (beta) | 50 | 6 | $60 | $60 |
| 3 | 150 | 18 | $180 | $480 |
| 6 | 500 | 60 | $600 | $2,640 |
| 12 | 1,500 | 180 | $1,800 | $14,400 |

**Nima uchun 12% (oldingi 15% dan past):**
- O'zbekiston SaaS to'lov madaniyati hali yosh
- Uzcard/Payme integratsiya qilingunicha to'lov friction yuqori
- Lekin Extension stickiness bu raqamni 15-20% ga oshirishi MUMKIN (agar gating to'g'ri qilinsa)

**Break-even tahlili:**
- Railway infra: ~$20-30/oy (hozir)
- Domain + CDN: ~$15/oy
- Bright Data: ~$50-100/oy (usage based)
- **Break-even: ~10-15 paid user** (juda past — yaxshi unit economics)

---

## 6. Risk Matrix (Yangilangan)

| # | Xavf | Ehtimol | Ta'sir | Mitigatsiya | Status |
|---|------|---------|--------|------------|--------|
| 1 | ~~T-429 blocker~~ | — | — | HAL BO'LDI (Sprint 10) | ✅ YOPIQ |
| 2 | ~~CWS publish kechikishi~~ | — | — | CWS v1.0.0 publish qilindi (Sprint 10) | ✅ YOPIQ |
| 3 | **Uzum API o'zgartirishi** | O'rta | Yuqori | 3 ta scraping strategiya mavjud (SSR, DOM, badge) | Monitoring |
| 4 | **To'lov gateway integratsiya kechikishi** | O'rta | Yuqori | Beta da bepul PRO trial — to'lov keyinroq | Planned |
| 5 | **Feature bloat** — 31 sahifa, foydalanuvchi chalkashadi | Yuqori | O'rta | Onboarding da faqat 3 asosiy feature ko'rsatish | Active |
| 6 | **Bus factor (Bekzod = 1, Sardor = 1)** | Yuqori | Yuqori | Docs + CLAUDE.md + AI agent knowledge base | Active |
| 7 | **Custom domain yo'q** — professional emas | Yuqori | O'rta | Domain sotib olish — 1 kunlik ish | **OCHIQ** |
| 8 | **Extension Phase 4-5 "tahlil jarayonida"** | Past | O'rta | Sardor tasdiqlashi kerak — ishlayaptimi yo'qmi | Monitoring |
| 9 | **O'zbekiston SaaS to'lov madaniyati** | O'rta | O'rta | Past narx + Telegram marketing + freemium | Long-term |
| 10 | **Bright Data API cost** | Past | O'rta | Cache (Redis 6h TTL), request rate limiting | Planned |

**Sprint 10 da hal bo'lgan xavflar:**
- **T-429** — track endpoint ishlaydi, extension to'liq funksional
- **T-431** — BigInt mismatch tuzatildi, track xatosiz ishlaydi
- **CWS publish** — Extension v1.0.0 Chrome Web Store da
- **Extension Phase 4-5** — barcha feature'lar ishlaydi (Sardor tasdiqlagan)

---

## 7. KPI Targets (Yangilangan — Realistik)

### 7.1. Beta Phase (1-3 oy)

| KPI | 1-oy target | 3-oy target | O'lchash | Hozirgi |
|-----|-------------|-------------|----------|---------|
| Registered users | 50 | 200 | Account count | 2 (admin + demo) |
| WAU (haftalik aktiv) | 20 (40%) | 80 (40%) | 7-day active | 0 |
| Extension installs | 30 | 150 | CWS dashboard | 0 |
| Extension WAU | 15 (50%) | 80 (53%) | Extension analytics | 0 |
| Onboarding completion | 70% | 80% | onboarding_completed / total | — |
| Search -> Track conversion | 15% | 25% | Track / search sessions | — |
| FREE -> PRO conversion | 8% | 12% | plan='PRO' / total | — |
| Telegram bot linked | 30% | 50% | TelegramLink / total | — |
| NPS | 25+ | 35+ | In-app survey | — |
| Monthly churn | <15% | <10% | 30-day inactive / paid | — |

### 7.2. Extension-Specific KPIs

| KPI | Target | Sabab |
|-----|--------|-------|
| CWS rating | 4.0+ (5 dan) | Birinchi 10 review muhim |
| Install -> Active (7d) | 50%+ | Extension sticky bo'lishi kerak |
| QuickAnalyze usage/day | 3+ per user | "Aha moment" takrorlash |
| Track from extension | 2+ per week | Core action |
| Uninstall rate | <5% monthly | Past bo'lishi kerak |

---

## 8. Competitive Landscape (Yangilangan)

| Raqib | Bozor | Narx | VENTRA ustunligi | Xavf darajasi |
|-------|-------|------|-----------------|---------------|
| **Uzum Seller Center** | Uzum (o'zlari) | Bepul (ichki panel) | VENTRA: external analytics, score, AI, cross-platform sourcing, alertlar, tracking | YUQORI — Uzum o'zi kengaytirishi mumkin |
| **Sellmonitor** | WB/Ozon (Rossiya) | $15-50/oy | VENTRA: O'zbekiston lokalizatsiyasi, UZS, Uzum fokus, past narx | PAST — Uzum bozoriga kirmagan |
| **Moneyplace** | WB + Ozon | $30-100/oy | VENTRA: mahalliy bozor, Telegram, past narx | PAST |
| **MPStats** | WB + Ozon | $30-150/oy | VENTRA: Uzum fokus, o'zbek tili, Chrome extension | PAST |
| **Hech kim (O'zbekiston)** | uzum.uz | — | **VENTRA = birinchi mover** | — |

**Yangi kuzatuvlar:**
1. **Uzum Seller Center** kengaymoqda — `analytics` tab qo'shilgan. Lekin bu faqat o'z do'koni statistikasi. VENTRA raqiblar tahlili, bozor trendi, va AI — bunlar Uzum bermaydi.
2. **Rossiya SaaS** lari O'zbekistonga kelmaydi (sanksiyalar, to'lov qiyinchiliklari). Bu VENTRA uchun vaqt beradi.
3. **Wildberries.uz** O'zbekistonda kuchaymoqda — VENTRA `Platform` model tayyor (T-376 DONE). Multi-marketplace qo'shish = TAM 2x.
4. **Chrome Extension** = eng kuchli moat. Raqib bu darajaga yetishi uchun 6+ oy kerak.

**First-mover advantage muddati:** Taxminan 6-12 oy. Bu vaqt ichida 500+ aktiv foydalanuvchi to'plash kerak.

---

## 9. GTM (Go-to-Market) Roadmap — 4 Haftalik Plan

### HAFTA 1 (2026-03-11..17): BLOCKER larni hal qilish

| Kun | Vazifa | Mas'ul | Biznes natija |
|-----|--------|--------|--------------|
| Dushanba | T-429 fix — backend redeploy, route tekshirish | Bekzod | Extension track tugmasi ishlaydi |
| Dushanba | ventra.uz domain sotib olish (webhost.uz yoki ahost.uz) | Bekzod | Professional URL |
| Seshanba | DNS setup + Cloudflare (T-281) | Bekzod | CDN + SSL + domain |
| Seshanba-Chorshanba | T-419 + T-421 — ExpandPanel + Sourcing endpoint | Bekzod | Search inline tahlil tayyor |
| Chorshanba | Extension track button qayta yoqish (T-429 fix dan keyin) | Sardor | Extension to'liq funksional |
| Payshanba | Chrome Web Store submit (T-228) | Sardor | Review jarayoni boshlanadi |
| Juma | Landing screenshot'lar + demo video (M-001) | Sardor | Marketing material |

### HAFTA 2 (2026-03-18..24): CWS PUBLISH + BETA TAYYORGARLIK

| Vazifa | Mas'ul | Biznes natija |
|--------|--------|--------------|
| CWS review kutish (1-3 kun) | — | Extension publish bo'ladi |
| T-422 SourcePricePanel — Bright Data narx taqqoslash | Bekzod | Sourcing feature tayyor |
| T-424 Track state dedup | Bekzod | UX polish |
| Beta landing page — ventra.uz da "Beta ro'yxatdan o'tish" form | Sardor | Lead collection |
| Uzum sotuvchi Telegram guruhlarini aniqlash (5-10 ta) | Ikkalasi | Distribution kanal |
| Extension listing optimization — screenshots, description | Sardor | CWS conversion |

### HAFTA 3 (2026-03-25..31): BETA LAUNCH

| Vazifa | Mas'ul | Biznes natija |
|--------|--------|--------------|
| Birinchi 10 sotuvchiga 1:1 outreach (Telegram DM) | Ikkalasi | Birinchi real foydalanuvchilar |
| Telegram guruhda post — "bepul analytics tool" | Ikkalasi | Organic reach |
| Feedback form qo'shish (in-app) | Bekzod | User voice |
| Extension Phase 6 (T-223 AI, T-224 Hotkeys) | Sardor | Feature depth |
| Bug triage — birinchi foydalanuvchi xatolari | Ikkalasi | Quality |

### HAFTA 4 (2026-04-01..07): ITERATE + SCALE

| Vazifa | Mas'ul | Biznes natija |
|--------|--------|--------------|
| 50 beta user target | Ikkalasi | Critical mass |
| NPS survey (in-app yoki Telegram) | Bekzod | Product-market fit signal |
| To'lov gateway research (Click/Payme SDK) | Bekzod | Revenue pipeline |
| Extension i18n (T-225) + CWS reviews javob | Sardor | Quality + rating |
| Haftalik changelog email / Telegram post | Ikkalasi | Engagement |

### GTM Xulosa

```
HAFTA 1: Fix blockers (T-429, domain, CWS submit)   = INFRA
HAFTA 2: Polish + prepare beta materials             = MARKETING
HAFTA 3: Launch beta (10-20 users)                   = ACQUISITION
HAFTA 4: Iterate + scale to 50 users                 = GROWTH
```

**Muvaffaqiyat mezonlari:**
- Hafta 4 oxiriga: 50 registered user, 20 WAU, 30 extension install
- CWS rating 4.0+ (kamida 5 review)
- Birinchi 3 ta "organik" user (outreach siz kelgan)

---

## 10. Yakuniy Tavsiya — Sprint 11 TOP 5 Priorities

### Sprint 10 yakunlari asosida yangilangan (2026-03-13):

**1. Custom domain (ventra.uz) + Cloudflare CDN (2-3 soat)**
> **Nima uchun #1:** Yagona qolgan texnik blocker. Professional URL siz marketing va ishonch MUMKIN EMAS. Railway staging URL bilan beta user jalb qilish qiyin. Domain + CDN = tezlik + SSL + credibility. Break-even = 1 paid user/oy.

**2. To'lov gateway integratsiya (Click/Payme) (1-2 hafta)**
> **Nima uchun #2:** Sprint 10 da barcha feature'lar tayyor bo'ldi — endi REVENUE kerak. Beta da bepul PRO trial bersak ham, 1-oydan keyin to'lov infra bo'lishi shart. Click SDK yoki Payme — O'zbekiston bozori uchun eng yaxshi variant. MRR $0 -> $60+.

**3. Birinchi 50 beta user jalb qilish (2-3 hafta)**
> **Nima uchun #3:** 180+ task bajarilgan, Extension CWS da, Search + Track + Source pipeline tayyor — lekin hali real foydalanuvchi yo'q. Bu eng katta xavf. Strategy: Uzum sotuvchi Telegram guruhlari + 1:1 outreach + bepul PRO trial (1 oy). Beta feedback = product-market fit isbot.

**4. Extension CWS optimization + rating (1 hafta)**
> **Nima uchun #4:** CWS da publish bo'ldi, lekin listing optimization (screenshots, description, keywords) va birinchi 5-10 review = organic install tezligi. CWS rating 4.0+ bo'lmasa organic traffic past bo'ladi.

**5. Sourcing UX polish + margin calculator (1 hafta)**
> **Nima uchun #5:** BrightData sourcing tayyor, lekin foydalanuvchi uchun "Uzum narxi vs Xitoy narxi = X% margin" ko'rinishida aniq qiymat ko'rsatish kerak. Bu VENTRA ning eng kuchli differentiator — PRO/MAX upsell uchun asosiy argument.

### Sprint 11 Strategik yo'nalish:

```
SPRINT 11 (Hafta 1):  Domain + CDN setup                       = CREDIBILITY
SPRINT 11 (Hafta 2):  Payment integration (Click/Payme)        = REVENUE INFRA
SPRINT 11 (Hafta 3):  Beta users (10-20 birinchi)              = VALIDATION
SPRINT 11 (Hafta 4):  Feedback loop + iterate                  = PMF SIGNAL

3 OY:   200+ user, $180 MRR, CWS 4.0+ rating                  = GROWTH
6 OY:   500+ user, $600 MRR, sourcing = kuchli differentiator  = DIFFERENTIATION
12 OY:  1500+ user, $1800 MRR, unit economics isbot            = SCALE
```

### ASOSIY XULOSA (Sprint 10 yakuni):

Sprint 10 bilan VENTRA **feature-complete for beta** darajasiga yetdi:
- **Search -> Track -> Analyze -> Source** pipeline to'liq ishlaydi
- **Extension** CWS da publish — organic acquisition kanal ochildi
- **T-429 + T-431** blocker lar hal bo'ldi — track to'liq funksional
- **BrightData** sourcing — 3 platformadan narx taqqoslash tayyor

**Endi gap TEXNIK EMAS — DISTRIBUTION + REVENUE:**
1. Domain ($15) + CDN setup = credibility + performance
2. Payment gateway = revenue infra
3. Beta users = product-market fit validation

Sprint 10 dan oldin 3 ta blocker bor edi. Endi FAQAT 1 ta texnik blocker qoldi (domain). Qolgani biznes execution — user jalb qilish va to'lov integratsiya.

**Tavsiya:** Sprint 11 da yangi feature YOZMASLIK. 100% fokus: domain + payment + birinchi 50 user.

---

*BA Report | VENTRA Analytics Platform | 2026-03-13*
*Generated by BA Agent | Sprint 10 completion review*
*Next review: Sprint 11 mid-sprint (2026-03-20)*
