# SARDOR — Ochiq Vazifalar
# Fayllar: apps/desktop/, apps/landing/
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding
#
# ESLATMA: apps/web/ va apps/extension/ — BEKZOD ZONASI (CLAUDE.md)
# Web Audit tasklar (T-361..T-370, T-377, T-380, T-381) → Tasks-Bekzod.md ga ko'chirildi
# Chrome Extension tasklar (T-216..T-233) → Tasks-Bekzod.md ga ko'chirildi

---

# DESKTOP APP AUDIT — T-315..T-328

> Manba: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P0 — KRITIK (5 ta)

> ~~T-315..T-319~~ ✅ DONE (2026-03-06) → Done.md

## P1 — MUHIM (8 ta)

> ~~T-320..T-327~~ ✅ DONE (2026-03-06) → Done.md

## P2 — O'RTA (batch)

> ~~T-328~~ ✅ DONE (2026-03-06, i18n qismi → T-399) → Done.md

### T-400 | P1 | FRONTEND | Landing dizayn — T-382 komponentlari VENTRA uslubiga moslashtirish | 1h | pending[Sardor]

Manba: foydalanuvchi sharhi (2026-03-06)

**Muammo:** T-382 da qo'shilgan 4 ta komponent (`CookieBanner`, `VideoDemoSection`, `PrivacyPage`, `TermsPage`) VENTRA dizayn tizimidan farq qiladi:
- `mesh-blob` animatsiyali background yo'q
- `glass-card`, `gradient-text`, `glow-btn` ishlatilmagan
- `useAnalytics` o'rniga `window.plausible` to'g'ridan ishlatilgan
- `plausible.d.ts` redundant — `useAnalytics.ts` allaqachon declare qilgan

**Yechim:** Barcha 4 ta komponentni VENTRA dizayn tizimiga (CTASection/HeroSection uslubiga) moslashtirish.

**Fayllar:**
- `apps/landing/src/components/CookieBanner.tsx`
- `apps/landing/src/sections/VideoDemoSection.tsx`
- `apps/landing/src/pages/PrivacyPage.tsx`
- `apps/landing/src/pages/TermsPage.tsx`
- `apps/landing/src/lib/plausible.d.ts` → o'chirish (redundant)

---

### T-399 | P2 | FRONTEND | Desktop tray menu i18n (uz/ru/en) | 30min

Manba: T-328 dan ajratildi (2026-03-06)

**Muammo:** Tray menu labellar inglizcha hardcoded: `Show Window`, `Hide Window`, `Quit VENTRA`.

**Yechim:** `app.getLocale()` bilan til aniqlab, `uz`/`ru`/`en` labellarga ko'chirish.

**Fayllar:** `apps/desktop/src/main/tray.ts`

---


# PLATFORMA AUDIT — UX/DESIGN/ONBOARDING (T-377..T-384)

> Manba: DEEP-PLATFORM-AUDIT-2026-03-04.md + Analysis-Onboarding-Multimarketplace.md

> ~~T-382~~ ✅ DONE (2026-03-06) → Done.md
**Sabab va yechim:**
1. **Privacy Policy + Terms of Service pages yo'q** — Footer'da link bor, sahifa yo'q. O'zbekiston Shaxsiy Ma'lumotlar Qonuni (2019) talabi
2. **Cookie consent banner yo'q** — legal requirement
3. **Plausible analytics commented out** — enable qilish + CTA click tracking, scroll depth, conversion o'lchash
4. **Video demo yo'q** — pricing'dan oldin 90 sek Loom yoki placeholder section

---

---

# LANDING MANUAL (4 task)

| # | Nima | Vaqt | Holat |
|---|------|------|-------|
| M-001 | Dashboard screenshot'lar | 30min | ⬜ |
| M-002 | Desktop installer build | 20min | ⬜ |
| M-003 | Testimonial ma'lumotlari | 1h | ⬜ |
| M-004 | Domain va hosting | 30min | ⬜ |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| **Platforma P2** (T-382) | **1 task, ~4 fix** |
| ~~Desktop P0 (T-315..T-319)~~ | ✅ DONE |
| ~~Desktop P1 (T-320..T-327)~~ | ✅ DONE |
| Desktop P2 (T-328) | 10 |
| Landing Manual (M-001..M-004) | 4 |
| **JAMI task ochiq** | **~15** |
| **JAMI bug/fix ochiq** | **~14** |
|  |  |
| ~~Web Audit~~ (T-361..T-370) | → **Bekzod**ga ko'chirildi |
| ~~T-377, T-380, T-381~~ (web app) | → **Bekzod**ga ko'chirildi |
| ~~T-379~~ (Design system) | ✅ DONE (Bekzod, T-379) |
| ~~Chrome Extension~~ (T-216..T-233) | → **Bekzod**ga ko'chirildi |

---

# BAJARILDI → Done.md

**Desktop Audit P0+P1 (13 ta):** T-315..T-327 (2026-03-06)
**Extension Phase 1-2 (8 ta):** T-208..T-215
**Desktop (1 ta):** T-234
**Landing Dev (24 ta):** L-001..L-024
**Landing Audit (14 ta):** T-329..T-342
**Web App (8 ta):** T-202, T-264, T-266, T-257, T-188..T-192
**i18n Audit (9 ta):** T-271..T-279
**Sprint Frontend (8 ta):** T-237b, T-260, T-261, T-257, T-206, T-284..T-289
**Bekzod Dependent (3 ta):** T-193b, T-196b, T-199b

---
*Tasks-Sardor.md | VENTRA | 2026-03-04 (zone tuzatish: web/extension → Bekzod)*
