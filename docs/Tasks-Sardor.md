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

### T-217 | P1 | FRONTEND | Extension — Category filter sidebar | 1.5h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida (2026-03-09)**

### T-218 | P1 | FRONTEND | Extension — Advanced filters | 1.5h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida**

### T-219 | P1 | FRONTEND | Extension — Category trends & insights | 2h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida**

---

## Phase 5 — Competitor + Price Tracking (P2) ~4.5h — TAHLIL JARAYONIDA

### T-220 | P2 | FRONTEND | Extension — Competitor analysis tab | 1.5h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida (2026-03-09)**

### T-221 | P2 | FRONTEND | Extension — Price history chart | 1.5h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida**

### T-222 | P2 | FRONTEND | Extension — Favorites & notes | 1.5h
**Mas'ul:** pending[Sardor] — **Tahlil jarayonida**

---

## BUGS & CRITICAL FIXES

> ~~T-427~~ ✅ DONE (2026-03-09) → Done.md — Modal auto-close fix (Escape + loading backdrop)

### T-428 | P0 | FRONTEND | Extension — VENTRA bazasida yo'q mahsulotda modal yopilib qoladi | 30min
**Mas'ul:** pending[Sardor] — **Fix tayyor, tekshiruv kutilmoqda (2026-03-10)**

**Muammo:** VENTRA bazasida kuzatilmagan mahsulot sahifasida extension icon bosilganda modal ochiladi va yopilib ketadi. Kuzatuvga qo'shilgan mahsulotda esa ishlaydi.

**Sabab:** `quick-score` background handler VENTRA API 404 qaytarsa `success: false` yuboradi. Modal error ko'rsatib qolishi kerak edi, lekin yopilib ketmoqda — bu T-427 bilan bog'liq bo'lishi mumkin yoki uzum fallback bo'lmagan eski buildda.

**Fix (2026-03-10):** `uzum-api.ts` qo'shildi — VENTRA da ma'lumot bo'lmasa `api.uzum.uz/api/v2/product/{id}` dan narx/reyting/buyurtmalar ko'rsatadi. UzumCard content script overlay sifatida ko'rsatiladi (popup-independent).

**Fayllar:**
- `apps/extension/src/lib/uzum-api.ts` — YANGI
- `apps/extension/src/background/messages/quick-score.ts` — parallel fetch
- `apps/extension/src/components/QuickAnalysisModal.tsx` — uzumData render
- `apps/extension/src/components/UzumCard.tsx` — YANGI content script overlay
- `apps/extension/src/contents/product-page.tsx` — UzumCard integratsiyasi


> T-429 → **Bekzod ga o'tkazildi** (2026-03-11) — Tasks-Bekzod.md da

---

## Phase 6 — AI + Hotkeys (P2) ~2.5h

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

### T-224 | P2 | FRONTEND | Extension — Hotkeys & shortcuts | 1h

**Manba:** yangi-feature
**Topilgan joyda:** `apps/extension/src/lib/hotkeys.ts`
**Mas'ul:** pending[Sardor]

**Tahlil:**
Extension'da hotkey'lar:
- `Ctrl+Shift+V` — Open/close popup
- `Ctrl+Shift+T` — Toggle quick analysis modal
- `Ctrl+Shift+S` — Save to favorites (product page'da)
- `Ctrl+Shift+N` — Open notes editor

Content script orqali keyboard events.

**Yechim:**
1. `hotkeys.ts` — YANGI helper
   - Register hotkeys
   - Global listeners (content script)
2. `contents/product-page.tsx` — Add hotkey listeners
3. `popup.tsx` — Hotkey hints (small tooltips)
4. Settings page (future): customizable hotkeys

**Fayllar:**
- `apps/extension/src/lib/hotkeys.ts` — YANGI
- `apps/extension/src/contents/product-page.tsx` — UPDATED
- `apps/extension/src/popup.tsx` — UPDATED (hints)

**Bog'liqlik:** T-217 DONE

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
