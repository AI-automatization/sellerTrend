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

> ~~T-400~~ ✅ DONE (2026-03-06) → Done.md

---

## PLAYWRIGHT AUDIT — 2026-03-06 (Sardor)

Manba: Playwright headless test, localhost:5173 (desktop renderer)

**Natija: Kritik bug topilmadi.**

| Tekshirilgan | Holat |
|---|---|
| Login sahifasi (form, validation, title, overflow) | ✅ PASS |
| Empty form submit — sahifada qolish | ✅ PASS |
| Login (demo@ventra.uz / Demo123!) | ✅ PASS |
| Dashboard render — sidebar, spinner, overflow | ✅ PASS |
| /analyze navigatsiya | ✅ PASS |
| /discovery navigatsiya | ✅ PASS |
| Console errors | ✅ YO'Q |
| Layout overflow (1280px) | ✅ YO'Q |

**False positive tushuntirishlari:**
- Broken images → `onError: display:none` handler mavjud (`ProductsTable.tsx:94`) — handled
- ERR_ABORTED requests → React AbortController cleanup (navigation paytida) — normal
- Signals/leaderboard links not found → collapsible sidebar (expected)

**Screenshotlar:** `screenshots/01-login.png`, `screenshots/02-dashboard.png`

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

# LANDING UX AUDIT — 2026-03-07 (Playwright)

> Manba: Playwright screenshot audit, localhost:5174

## P0 — KRITIK

### T-401 | P0 | FRONTEND | Video demo section — olib tashlash yoki real video | 30min

Manba: Playwright audit (2026-03-07)

**Muammo:** "VENTRA qanday ishlashini ko'ring" section butunlay bo'sh — faqat play tugmasi va `"Demo video tez kunda chiqadi"` matni. Yangi foydalanuvchi "sayt tayyor emas" deb o'ylaydi.

**Yechim:** Video tayyor bo'lmaguncha shu sectionni `display:none` yoki komponentdan olib tashlash. Real video bo'lsa — `<iframe>` yoki `<video>` tag bilan qo'shish.

**Fayllar:** `apps/landing/src/components/VideoDemoSection.tsx` (yoki shu nom bilan fayl)

---

> ~~T-402~~ ✅ DONE (2026-03-07) → Done.md

> ~~T-407~~ ✅ DONE (2026-03-07) → Done.md — GitHub sellerTrend-desktop repo yaratish + README push

> ~~T-408~~ ✅ DONE (2026-03-07) → Done.md — GitHub Releases v1.0.0 yaratish + installer upload

> ~~T-409~~ ✅ DONE (2026-03-07) → Done.md — Landing Hero + DownloadBanner Windows URL ulash

> ~~T-410~~ ✅ DONE (2026-03-07) → Done.md — Desktop oq ekran fix (v1.0.2): loadURL `app://./` bilan BrowserRouter pathname `/` ko'radi

---

## P1 — MUHIM

### T-403 | P1 | FRONTEND | Mobile hero — dashboard screenshot yo'q | 1h

Manba: Playwright audit, 390px viewport (2026-03-07)

**Muammo:** Mobil (390px) da hero sectiondagi dashboard screenshot ko'rinmaydi — faqat matn va tugmalar. Vizual element yo'qligi ishonchni kamaytiradi.

**Yechim:** Mobile da ham screenshot ko'rsatish — kichikroq qilib yoki vertikal joylashtirib. `hidden md:block` klassini tekshirish.

**Fayllar:** `apps/landing/src/components/HeroSection.tsx`

---

> ~~T-404~~ ✅ DONE (2026-03-07) → Done.md

---

## P2 — O'RTA

> ~~T-405~~ ✅ DONE (2026-03-07) → Done.md

---

### T-406 | P2 | FRONTEND | Testimonials — ko'paytirish va real ma'lumot | 1h

Manba: Playwright audit (2026-03-07)

**Muammo:** Faqat 2 ta testimonial, 2-si o'ng tomonda qisman kesib ketgan. Kam soni ishontirmaydi.

**Yechim:** Kamida 4 ta testimonial, slider/carousel bilan. Real foydalanuvchi ma'lumotlari (M-003 bilan birga).

**Fayllar:** `apps/landing/src/components/TestimonialsSection.tsx`

---

# LANDING MANUAL (4 task)

| # | Nima | Vaqt | Holat |
|---|------|------|-------|
| M-001 | Dashboard screenshot'lar | 30min | ⬜ |
| ~~M-002~~ | ~~Desktop installer build~~ | ~~20min~~ | ✅ DONE (2026-03-07) |
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
| **Landing UX Audit P0** (T-401..T-402) | **2 task** |
| **Landing UX Audit P1** (T-403..T-404) | **2 task** |
| **Landing UX Audit P2** (T-405..T-406) | **2 task** |
| **JAMI task ochiq** | **~21** |
| **JAMI bug/fix ochiq** | **~20** |
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
