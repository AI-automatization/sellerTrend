# SARDOR — Ochiq Vazifalar
# Fayllar: apps/desktop/, apps/landing/, apps/bot/, apps/extension/
# Yangilangan: 2026-03-08
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding
#
# ZONE TUZATISH (2026-03-08): apps/bot/ va apps/extension/ Sardor zonasiga qo'shildi
# Chrome Extension tasklar (T-216..T-233) endi SARDOR da
# Telegram Bot fayllar endi SARDOR da

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

# CHROME EXTENSION — 18 TASK (T-216..T-233)

> Phase 1 (T-208..T-211) va Phase 2 (T-212..T-215) ✅ DONE → Done.md
> apps/extension/ — Sardor zonasi (CLAUDE.md, 2026-03-08 dan)

## Phase 3 — Popup Dashboard (P1) ~1.5h

~~### T-216 | P1 | FRONTEND | Extension popup "Tez Tahlil" modal | 1.5h~~ ✅ DONE (2026-03-08)

---

## Phase 4 — Category + Advanced (P1) ~5h — TAHLIL JARAYONIDA

~~### T-217~~ ✅ DONE (2026-03-13) → Done.md

~~### T-218~~ ✅ DONE (2026-03-13) → Done.md

~~### T-219~~ ✅ DONE (2026-03-13) → Done.md

---

## Phase 5 — Competitor + Price Tracking (P2) ~4.5h — TAHLIL JARAYONIDA

> ~~T-220~~ ✅ DONE (2026-03-13) → Done.md

> ~~T-221~~ ✅ DONE (2026-03-13) → Done.md

> ~~T-222~~ ✅ DONE (2026-03-13) → Done.md

---

## SEARCH BUG

> ~~T-441~~ ✅ DONE (2026-03-14) — impit proxyUrl + x-iid header fix
> Tafsil: Tasks.md da

---

> ~~T-442~~ ✅ DONE (2026-03-14) → Done.md — KPI "O'rta Score" → "Ko'tarilayotgan", "Salomatlik" → "Tushayotgan"

---

## BUGS & CRITICAL FIXES

> ~~T-433~~ ✅ DONE (2026-03-14) → Done.md — SW timeout fix (AbortSignal)
> ~~T-434~~ ✅ DONE (2026-03-14) → Done.md — CategoryFilter sendToBackground fix
> ~~T-435~~ ✅ DONE (2026-03-14) → Done.md — toFixed/toLocaleString null crash fix
> ~~T-436~~ ✅ DONE (2026-03-14) → Done.md — TrackedList flat format fix

> ~~T-437~~ ✅ DONE (2026-03-14) → Done.md — Web dashboard ProductsTable overflow-y fix

> ~~T-438~~ ✅ DONE (2026-03-14) → Done.md — Search page button + Enter qo'shildi

---

> ~~T-440~~ ✅ DONE (2026-03-14) → Done.md — Search limit 24 → 100 ga oshirildi

---

> ~~T-439~~ ✅ DONE (2026-03-14) → Done.md — photos { key } fix, DB fallback photoUrl

### T-443 | P1 | FULLSTACK | Search — Infinite Scroll (YouTube uslubi) | 2h

**Manba:** user-feedback (2026-03-14)
**Mas'ul:** pending[Sardor]

**Muammo:** Hozir search bir marta so'rov yuboradi, limit bilan cheklangan. Ko'p product bo'lsa hammasi ko'rinmaydi.

**Yechim:**

**Backend (`apps/api`):**
- `searchProducts(query, limit, offset)` — `offset` parametri qo'shish
- Cache key: `search:${query}:${limit}:${offset}`
- `search-query.dto.ts` ga `offset?: number = 0` qo'shish
- `uzumClient.searchProducts(query, limit, offset)` — `pagination.offset` ni uzatish
- DB fallback da ham `skip: offset` qo'shish

**Frontend (`apps/web`):**
- `SearchPage.tsx` — `offset` state, `hasMore` flag, `loadMore()` funksiya
- `IntersectionObserver` — sahifa pastiga yetganda `loadMore()` chaqiriladi
- Yangi natijalar mavjud natijalar ga `append` (replace emas)
- Loading spinner — pastda, yangi batch kelayotganda
- `productsApi.searchProducts(q, limit=24, offset)` — offset parametri

**Fayllar:**
- `apps/api/src/products/products.service.ts` — `searchProducts` offset
- `apps/api/src/products/dto/search-query.dto.ts` — offset field
- `apps/api/src/products/products.controller.ts` — offset pass
- `apps/api/src/uzum/uzum.client.ts` — pagination.offset
- `apps/web/src/pages/SearchPage.tsx` — IntersectionObserver + append
- `apps/web/src/api/products.ts` — offset param

**Muhim:**
- Birinchi qidiruvda offset=0, limit=24
- Scroll pastga → offset+=24, yangi batch keladi
- Uzum GraphQL `pagination: { offset, limit }` ni qo'llab-quvvatlaydi ✅
- Agar natija `limit` dan kam kelsa → `hasMore = false`

---

> ~~T-430~~ ✅ DONE (2026-03-11) → Done.md — UzumCard track button qaytarildi (commit 724caf1)

> ~~T-427~~ ✅ DONE (2026-03-09) → Done.md — Modal auto-close fix (Escape + loading backdrop)

> ~~T-428~~ ✅ DONE (2026-03-13) → Done.md


> T-429 → **Bekzod ga o'tkazildi** (2026-03-11) — Tasks-Bekzod.md da

---

## Phase 6 — AI + Hotkeys (P2) ~2.5h

~~### T-224~~ ✅ DONE (2026-03-13) → Done.md

---

### T-223 | P2 | FRONTEND | Extension — AI recommendations (Claude) | 1.5h

**Manba:** yangi-feature
**Topilgan joyda:** `apps/extension/src/components/AIRecommendations.tsx`
**Mas'ul:** pending[Sardor]

**Tahlil:**
Mahsulot tahlilida AI ko'rsatmalari — Claude API orqali.
Modal'da: "💡 AI Ko'rsatma" section

AI'dan:
- Mahsulot tavsiyalari (narxi, reyting, raqobat)
- Yaxshilash bo'yicha maslahatlar
- Risk analiz (qoshimcha tafsirlar)

**Yechim:**
1. `AIRecommendations.tsx` — YANGI component
   - Prompt: product score, price, competitors, weekly_bought → analysis
   - Streaming yoki regular response
   - Markdown formatting
2. `QuickAnalysisModal.tsx` — Integrate in analysis tab (collapse/expand)
3. Rate limiting: localStorage key + 1-hour cache
4. Backend: `/api/v1/ai/analyze-product` endpoint (future)

**Fayllar:**
- `apps/extension/src/components/AIRecommendations.tsx` — YANGI
- `apps/extension/src/components/QuickAnalysisModal.tsx` — Integrate
- `apps/extension/src/lib/api.ts` — `getAIRecommendations()` (future)

**Bog'liqlik:** T-220 DONE

---


---

| Faza | Tasklar | Vaqt | Holat |
|------|---------|------|-------|
| 3. Popup Dashboard (P1) | ~~T-216~~ | ~1.5h | ✅ DONE (2026-03-08) |
| 4. Category + Advanced (P1) | T-217, T-218, T-219 | ~5h | 🔍 TAHLIL — pending[Sardor] (2026-03-09) |
| 5. Competitor + Narx (P2) | T-220, T-221, T-222 | ~4.5h | 🔍 TAHLIL — pending[Sardor] (2026-03-09) |
| 6. AI + Hotkeys (P2) | T-223..T-224 | ~2.5h | pending[Sardor] — **T-223** |
| 7. i18n + Testing (P2) | T-225..T-227 | ~4.5h | ⬜ |
| 8. Build + Publish (P1) | T-228..T-229 | ~3h | ⬜ |
| 9. Security + Polish (P1) | T-230..T-233 | ~3.5h | ⬜ |

---

# ~~TELEGRAM BOT — BUGS & FIXES~~ ✅ DONE (2026-03-08)

> ~~T-426~~ ✅ DONE → Done.md
> Bot fixes: domain env, health check Prisma, /top type safe, startup logs

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
| ~~Telegram Bot P2~~ (~~T-426~~) | ✅ DONE |
| **Chrome Extension** (T-216..T-233) | **18 task, ~35h** |
| **Platforma P2** (T-382) | **1 task, ~4 fix** |
| ~~Desktop P0 (T-315..T-319)~~ | ✅ DONE |
| ~~Desktop P1 (T-320..T-327)~~ | ✅ DONE |
| Desktop P2 (T-328) | 10 |
| Landing Manual (M-001..M-004) | 4 |
| **Landing UX Audit P0** (T-401..T-402) | **2 task** |
| **Landing UX Audit P1** (T-403..T-404) | **2 task** |
| **Landing UX Audit P2** (T-405..T-406) | **2 task** |
| **JAMI task ochiq** | **~50+** |
| **JAMI bug/fix ochiq** | **~60+** |
|  |  |
| ~~Web Audit~~ (T-361..T-370) | → **Bekzod** (2026-03-06) |
| ~~T-377, T-380, T-381~~ (web app) | → **Bekzod** (2026-03-06) |
| ~~T-379~~ (Design system) | ✅ DONE (Bekzod, T-379) |

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
*Tasks-Sardor.md | VENTRA | 2026-03-08 (zone tuzatish: bot/extension → Sardor)*
