# VENTRA Sprint Plan
# PM Agent tomonidan avtomatik generatsiya qilinadi
# Yangilangan: 2026-03-13 (Sprint 10 COMPLETED — Sprint 11 Kickoff)

---

## Sprint 10 — COMPLETED (2026-03-08 .. 2026-03-13)

**Sprint #:** 10
**Sana:** 2026-03-08 → 2026-03-13 (6 kun)
**Maqsad:** Search + Bright Data feature to'liq yakunlash + Extension track fix
**Holat:** COMPLETED

### Sprint 10 — Yakuniy Holat

```
BATCH 1 ✅ DONE (commit 48cec40, 2026-03-08):
  T-417 ✅ i18n — search page translations (uz/ru/en)
  T-418 ✅ ProductSearchCard — rasm, narx, rating, track button
  T-420 ✅ BrightData client — Web Scraper API wrapper

BATCH 2 ✅ DONE (commit 67d62c9, 2026-03-11):
  T-419 ✅ ExpandPanel — inline analysis panel
  T-421 ✅ Sourcing search endpoint — controller+service+module

BLOCKER ✅ RESOLVED (commit 9d47b75, 2026-03-11):
  T-429 ✅ Extension track auto-create endpoint fix

BATCH 3 ✅ DONE (commit 9d47b75, 2026-03-11):
  T-422 ✅ Source price panel — SourcePricePanel.tsx
  T-424 ✅ Track state dedup — useTrackedProducts hook

BATCH 4 ✅ DONE (commit 0268999, 2026-03-11):
  T-425 ✅ Search analytics — query logging + admin endpoint

HOTFIX ✅ DONE (commit ee96d92, 2026-03-13):
  T-430 ✅ UzumCard track button restored (Sardor, commit 724caf1)
  T-431 ✅ BigInt mismatch fix — shop.ordersQuantity (Bekzod, commit ee96d92)

DEFERRED → Sprint 11:
  T-423 ⬜ Platform seed data + env config

SARDOR ✅ Extension Sprint 10:
  T-216 ✅ Popup "Tez Tahlil" modal (commit dfa0a43)
  T-427 ✅ Modal auto-close fix (commit 47ad151)
  T-428 ✅ Untracked product uzum.uz fallback
  T-430 ✅ UzumCard track button restore (commit 724caf1)
  CWS v1.0.0 ✅ release build (commit 3a8298d)
  Extension tracked state fixes (commits e16acaf, 7b5b386, ef13464, ee96d92)
```

### Sprint 10 — Yakuniy Natijalar

| Metrika | Qiymat |
|---------|--------|
| Rejalashtirilgan (Bekzod) | 9 task (T-417..T-425) + T-429 blocker + T-431 hotfix |
| Bajarilgan (Bekzod) | 10 task (T-417..T-422, T-424, T-425, T-429, T-431) |
| Deferred (Bekzod) | 1 task (T-423 seed data → Sprint 11) |
| Rejalashtirilgan (Sardor) | Extension focus (T-216, T-427, T-428, T-430, CWS) |
| Bajarilgan (Sardor) | 5 task + 4 extension fix commits |
| **Completion (overall)** | **15/16 = 94%** (T-423 deferred) |
| Plan vaqt (Bekzod) | ~12h |
| Actual vaqt (Bekzod) | ~2h 30min |
| **Velocity** | **4.8x** |

---

## Sprint 10 — Final Retro

### Nima yaxshi ishladi
1. **Batch execution tezkor** — 4 batch + blocker + hotfix 6 kunda tugatildi
2. **Blocker tezkor hal bo'ldi** — T-429 aniqlangan kunida fix qilindi (2026-03-11)
3. **Cross-team collaboration** — Sardor T-430, T-431 ni topdi, Bekzod darhol fix qildi
4. **Extension CWS v1.0.0** — Sardor rejalashtirilmagan katta milestone ni bajardi
5. **Velocity barqaror** — 4.8x (Sprint 8 ning 5.0x dan keyin ikkinchi eng yuqori)

### Nima to'siq bo'ldi
1. **Uncommitted changes** — Batch 2 3 kun uncommitted turdi (2026-03-08..11)
2. **Production deploy gap** — T-429 (trackFromSearch) kodi yozilgan lekin deploy qilinmagan
3. **BigInt edge case** — T-431 production da faqat shop.ordersQuantity BigInt mismatch bilan paydo bo'ldi
4. **Sprint scope shift** — Landing/Desktop/Manual tasklar Sprint 11 ga ko'chdi (to'g'ri qaror)

### Sprint 11 uchun tavsiyalar
1. **Commit tez-tez** — har batch tugaganda darhol commit + push
2. **Production deploy pipeline** — CI/CD avtomatlashtirish kerak (manual deploy xavfli)
3. **BigInt policy** — har yangi Uzum API field ni BigInt() wrap qilish standart qilish
4. **T-431 deploy** — Sprint 11 ning P0 vazifasi (production da fix kerak)

---

## Velocity (oxirgi 6 sprint)

| Sprint | Sana | Tasklar | Plan vaqt | Actual vaqt | Velocity | Completion |
|--------|------|---------|-----------|-------------|----------|------------|
| Sprint 6 (Desktop/Landing audit) | 2026-03-06 | 18 ta | ~16h | ~4h | 4.0x | 100% |
| Sprint 7 (Search Faza 1-2) | 2026-03-08 | 6 ta | 4h 15min | 1h 5min | 3.9x | 100% |
| Sprint 8 (P2 Mega Sprint) | 2026-03-08 | 13 ta | ~30h | ~6h | 5.0x | 100% |
| Sprint 9 (Extension + Security) | 2026-03-08 | 6 ta (4 done) | ~9h 30min | 20min | — | 67% |
| **Sprint 10 (Search+BD+Ext)** | **2026-03-08..13** | **15 ta** | **~12h** | **~2h 30min** | **4.8x** | **94%** |
| **O'rtacha (100% sprintlar)** | | **52 ta** | **~62h** | **~13h 35min** | **4.4x** | **— ** |

### Velocity trendi

```
Sprint 6:  ████████████████████ 100% (18/18)  4.0x  → barqaror
Sprint 7:  ████████████████████ 100% (6/6)    3.9x  → barqaror
Sprint 8:  ████████████████████ 100% (13/13)  5.0x  ↗ tezlashdi
Sprint 9:  █████████████░░░░░░░  67% (4/6)     —    ↘ tushdi
Sprint 10: ███████████████████░  94% (15/16)  4.8x  ↗ qaytdi
```

**11 kunlik statistika (2026-03-02 .. 2026-03-13):**
- Jami bajarilgan tasklar: ~58 ta (Sprint 6-10)
- Sprint 10 eng ko'p task: 15 ta (Bekzod 10 + Sardor 5)
- Velocity o'rtacha: 4.4x (barqaror yuqori)

---

## Joriy Sprint

**Sprint #:** 11
**Sana:** 2026-03-13 (boshlangan)
**Maqsad:** GTM (Go-To-Market) — Production deploy, Domain, CDN, Payment, Extension publish
**Holat:** KICKOFF

**Kontekst:**
- Sprint 10 COMPLETED — Search + Bright Data feature to'liq tayyor
- Extension CWS v1.0.0 build tayyor, track funksiyasi ishlaydi
- T-431 BigInt fix mahalliy tayyor, production deploy kerak
- Landing/Desktop/Manual tasklar ko'chirilgan

---

## Sprint 11 — Task Jadvali

```
P0 — CRITICAL (deploy kerak):
  T-431-deploy ⬜ T-431 BigInt fix → production deploy          Bekzod  15min
  T-178+T-283  ⬜ Domain + SSL (ventra.uz, DNS, Railway SSL)    Bekzod  20min
  T-281        ⬜ Cloudflare CDN — static assets 20ms           Bekzod  1.5h

P1 — HIGH (Sprint 11 asosiy ishlar):
  T-217..T-222 ⬜ Extension Phase 4-5 verify                    Sardor  2h
  T-228        ⬜ Chrome Web Store publish (v1.0.0)              Sardor  2h
  T-426        ⬜ Payment integration (Click/Payme)              Bekzod  4h

P2 — MEDIUM (sprint ichida imkoni bo'lsa):
  T-423        ⬜ Platform seed data + env config                Bekzod  30min
  T-383        ⬜ Landing multi-marketplace section + pricing    Bekzod  3h
  T-399        ⬜ Desktop tray i18n                              Sardor  30min
  M-001..M-004 ⬜ Landing manual tasklar (screenshots, etc.)    Sardor  2h
```

---

## Sprint 11 — Dependency Graph

```
P0 — DEPLOY (birinchi navbat):

  T-431-deploy ⬜ (BigInt fix deploy, 15min)
  dep: T-431 ✅ (fix tayyor, faqat deploy)
       │
       ▼
  T-178+T-283 ⬜ (Domain+SSL, 20min)
  dep: Railway sozlash
       │
       ▼
  T-281 ⬜ (Cloudflare CDN, 1.5h)
  dep: T-178 (domain kerak CDN uchun)


P1 — PARALLEL (P0 tugagandan keyin):

  ┌──────────────────────────────┐    ┌──────────────────────────────┐
  │ BEKZOD                       │    │ SARDOR                       │
  │                              │    │                              │
  │ T-426 ⬜ (Payment, 4h)      │    │ T-217..T-222 ⬜ (Verify, 2h)│
  │ [api: billing/payments/]     │    │ [extension: faza 4-5]        │
  │ dep: —                       │    │ dep: T-429 ✅                │
  │                              │    │      │                       │
  │                              │    │      ▼                       │
  │                              │    │ T-228 ⬜ (CWS publish, 2h)  │
  │                              │    │ dep: T-217..T-222 verify     │
  └──────────────────────────────┘    └──────────────────────────────┘


P2 — PARALLEL (P0/P1 bilan yoki keyin):

  Bekzod:                              Sardor:
  T-423 ⬜ (Seed, 30min) — parallel    T-399 ⬜ (Tray i18n, 30min)
  T-383 ⬜ (Landing, 3h) — parallel    M-001..M-004 ⬜ (Manual, 2h)
```

---

## Developer Yuk Taqsimoti (Sprint 11)

| Developer | P0 | P1 | P2 | Jami plan | Velocity-adjusted (~4x) |
|-----------|----|----|-----|-----------|-------------------------|
| Bekzod | 2h 5min (deploy+domain+CDN) | 4h (payment) | 3h 30min (seed+landing) | ~9h 35min | ~2h 25min |
| Sardor | — | 4h (verify+CWS) | 2h 30min (tray+manual) | ~6h 30min | ~1h 40min |
| **Jami** | **2h 5min** | **8h** | **6h** | **~16h** | **~4h** |

---

## Sprint 11 — Execution Plan

```
VAQT     BEKZOD                                 SARDOR
═══════  ═══════════════════════════════════════ ═══════════════════════════════════
--- P0: DEPLOY (BIRINCHI) ---
+0:00    ┌─ T-431 deploy (production, ~15m)     ┌─ T-217..T-222 verify start
         └─ T-178+T-283 (domain+SSL, ~20m)      │  (extension faza 4-5)
+0:35    ┌─ T-281 (Cloudflare CDN, ~20m)        │
         └─ QA: production health check          │

--- P1: CORE FEATURES (PARALLEL) ---
+1:00    ┌─ T-426 (Payment Click/Payme, ~1h)    ├─ T-217..T-222 verify davom
         │  [billing module + webhook handler]   └─ T-228 (CWS publish, ~30m)
+2:00    └─ T-426 QA + deploy                    └─ CWS review submitted

--- P2: QOLGAN TASKLAR ---
+2:15    ┌─ T-423 (Seed data, ~8m)              ┌─ T-399 (Desktop tray i18n, ~8m)
         └─ T-383 (Landing multi-mkt, ~45m)     └─ M-001..M-004 (Manual, ~30m)

+3:30    FINAL QA: tsc + build + test
+4:00    ✅ Sprint 11 TARGET DONE
```

*Vaqtlar velocity 4x coefficient bilan hisoblangan*

---

## Risk Assessment (Sprint 11)

| # | Risk | Ehtimol | Ta'sir | Mitigation |
|---|------|---------|--------|------------|
| 1 | **Domain DNS propagation** | Past | 24-48h kutish | Cloudflare DNS — tezkor propagation |
| 2 | **Payment API integration** | O'rta | Click/Payme sandbox muammolar | Sandbox muhitda test, production keyin |
| 3 | **CWS review reject** | O'rta | 1-7 kun review + rework | Privacy policy, screenshots tayyor |
| 4 | **Extension Phase 4-5 bugs** | Past | Verify paytida bug topilishi | Fix uchun bufer vaqt mavjud |
| 5 | **BigInt regression** | Past | Boshqa field da ham BigInt muammo | Har yangi Uzum field → BigInt() wrap |

---

## Sprint 11 — Preview (Sprint 12+)

**Sprint 12 maqsad:** Beta Users + Monitoring + Marketing

| Guruh | Tasklar | Mas'ul | Prioritet |
|-------|---------|--------|-----------|
| **Beta Users** | 5-10 Uzum sotuvchini invite (manual) | Ikkalasi | P0 |
| **Monitoring** | T-375 (monitoring crons tekshirish) | Bekzod | P1 |
| **Marketing Agent** | Landing SEO, content, competitor analysis | Agent | P1 |
| **AI Features** | Faza 4 AI tahlil kengaytirish | Bekzod | P2 |

### Marketing Agent tavsiyasi (Sprint 12+)

> **PM eslatma:** Sprint 12 dan boshlab **Marketing Agent** qo'shish tavsiya etiladi.
> GTM fazasida quyidagi vazifalar agent tomonidan bajarilishi mumkin:
>
> 1. **Landing SEO audit** — meta tags, Open Graph, structured data
> 2. **Content generation** — blog postlar, Telegram channel kontenti
> 3. **Competitor messaging analysis** — raqiblar taqqoslash
> 4. **Beta user outreach** — Telegram guruhlar, Uzum sotuvchilar forumi
> 5. **Pricing strategy** — freemium vs trial, competitor pricing tahlili

---

*sprint-plan.md | VENTRA Analytics Platform | 2026-03-13 | PM Agent v5*
