# SARDOR — Vazifalar
# Fayllar: apps/web/, apps/desktop/, apps/extension/, apps/landing/
# Yangilangan: 2026-02-27
# Oxirgi audit: 2026-02-27 (kod tekshiruvi)

---

# ✅ AUDIT NATIJASI

| Task | Holat | Izoh |
|------|-------|------|
| T-206 | ✅ BUG EMAS | Kod tekshiruvida ziddiyat topilmadi — ternary logika to'g'ri |

**Tasdiqlanganlar:**
- T-084: RegisterPage — `setTokens`/`queryClient.clear()` qo'shildi ✅
- T-085 + T-086: `setTracked(true)` try ichiga ko'chirildi ✅
- T-193: AI JSON artifact filter yo'q ❌ (Bekzod T-193a kerak)
- T-194: `uz-UZ` → manual MONTHS format ✅
- T-195: Texnik jargon → "AI prognoz" ✅
- T-205: Formula → sodda tushuntirish ✅
- T-188-T-192: PWA to'liq o'chirildi ✅
- T-163: AdminPage 2001 → 447 qator (komponentlarga ajratildi) ✅

---

# BIRINCHI QILISH TARTIBI (Bekzodga bog'liq EMAS)

| # | Task | Nima | Holat |
|---|------|------|-------|
| ~~1~~ | ~~E-001 + E-002~~ | ~~Desktop .env + proxy~~ | ✅ |
| 2 | T-234 | Desktop login to'liq fix (production build ham) | OCHIQ |
| ~~3~~ | ~~T-205~~ | ~~Footer scoring formula~~ | ✅ |
| ~~4~~ | ~~T-195~~ | ~~Texnik jargon~~ | ✅ |
| ~~5~~ | ~~T-194~~ | ~~Chart X-axis "M02 27"~~ | ✅ |
| ~~6~~ | ~~T-203~~ | ~~ML Prognoz KPI labels~~ | ✅ |
| ~~7~~ | ~~T-204~~ | ~~Qora to'rtburchak render~~ | ✅ |
| ~~8~~ | ~~T-084~~ | ~~RegisterPage auth store~~ | ✅ |
| ~~9~~ | ~~T-085+086~~ | ~~tracked=true bug~~ | ✅ |
| ~~10~~ | ~~T-197~~ | ~~Score chart zigzag~~ | ✅ |
| ~~11~~ | ~~T-198~~ | ~~Haftalik sotuvlar chart~~ | ✅ |
| ~~12~~ | ~~T-200~~ | ~~"confidence" → o'zbekcha~~ | ✅ |
| 13 | T-201 | Raqiblar bo'sh holat UX | OCHIQ |
| 14 | T-202 | ProductPage seksiya tartibi | OCHIQ |
| ~~15~~ | ~~T-188...T-192~~ | ~~PWA to'liq o'chirish~~ | ✅ |
| ~~16~~ | ~~T-097~~ | ~~WebSocket dev proxy~~ | ✅ |
| 17 | T-158 | AdminPage 30+ any type | OCHIQ |
| 18 | T-164 (qolgan) | i18n hardcoded matn | QISMAN ✅ |
| 19 | L-001...L-024 | Landing page (24 ta) | OCHIQ |
| 20 | T-208...T-233 | Chrome Extension (26 ta) | OCHIQ |

**Izoh:** 19 tadan 14 tasi BAJARILDI. Qolgan: T-201, T-202, T-158, T-164, landing, extension.

---

# QO'LDA QILINADIGAN ISHLAR (.env + config)

### E-001 | `apps/desktop/.env` fayl YARATISH — login ishlamaydi | 5min
**Muammo:** Desktop app da login xatosi. `VITE_API_URL` env variable yo'q.
**Fayl yaratish:** `apps/desktop/.env`
```env
VITE_API_URL=http://localhost:3000
```

### E-002 | `electron.vite.config.ts` ga proxy qo'shish — dev mode login | 10min
**Fayl:** `apps/desktop/electron.vite.config.ts` — renderer.server bo'limiga:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api/v1': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

---

# DESKTOP APP

## P0 — KRITIK

### T-234 | Login ishlamaydi — VITE_API_URL yo'q, URL `app://api/v1` bo'ladi | 30min
**Root cause:** Desktop Electron app production mode da `app://./index.html` dan yuklaydi. `VITE_API_URL` env variable yo'q → `base.ts:5` da `''` qaytadi → Axios `app://api/v1/auth/login` ga request yuboradi → FAIL.
**Fayllar:**
- `apps/web/src/api/base.ts:5` — `import.meta.env.VITE_API_URL ?? ''`
- `apps/desktop/electron.vite.config.ts:25-43` — proxy yo'q
- `apps/desktop/src/main/window.ts:74-78` — `app://` protocol
**Fix (3 qadam):**
1. `apps/desktop/.env` yaratish: `VITE_API_URL=http://localhost:3000` (E-001)
2. `electron.vite.config.ts` renderer.server ga proxy qo'shish (E-002)
3. Production build uchun: `apps/desktop/package.json` scripts ni yangilash
4. Yoki: Electron main process da IPC proxy yaratish

---

# WEB APP — FRONTEND BUGLAR

## P0 — ✅ BAJARILDI (5/6) — T-193b Bekzod kutmoqda

### ✅ T-084 | RegisterPage auth store bypass — DONE
### ✅ T-085 | AnalyzePage tracked=true — DONE
### ✅ T-086 | ProductPage tracked=true — DONE
### T-193b | AI tahlili raw JSON — FRONTEND filter | Bekzod T-193a kerak
### ✅ T-194 | Chart X-axis "M02 27" — DONE (manual MONTHS + ru-RU)
### ✅ T-195 | Texnik jargon — DONE ("AI prognoz")

---

## P1 — ✅ ASOSAN BAJARILDI (8/11)

### ✅ T-097 | WebSocket dev proxy — DONE (`/ws` proxy qo'shildi)

### T-196b | AI tahlilida "Bu mening mahsulotim" toggle (FRONTEND) | Bekzod kerak
### ✅ T-197 | Score tarixi chart zigzag — DONE (kunlik aggregate)
### ✅ T-198 | Haftalik sotuvlar chart — DONE (filter + tooltip)
### T-199b | Trend badge text — qisman DONE (frontend changePct), Bekzod kerak
### ✅ T-200 | "confidence"/"snapshot" → o'zbekcha — DONE
### ✅ T-201 | Raqiblar/Global Bozor UX — DONE (loadError state, loading text)
### T-202 | ProductPage overall UX — sotuvchi uchun soddalash | 1h (OCHIQ)
### ✅ T-203 | ML Prognoz KPI labels — DONE
### ✅ T-204 | Qora to'rtburchak — DONE (`<Cell>`)
### ✅ T-205 | Footer formula — DONE (sodda tushuntirish)

### T-237b | ProductPage da mahsulot rasmi ko'rsatish (FRONTEND qismi) | 30min
`ProductPage.tsx` — title yonida/ustida rasm + `DashboardPage.tsx` — thumbnail.
**Eslatma:** T-237a (backend: API + Prisma) AVVAL bajarilishi kerak (Bekzod).

---

# PWA O'CHIRISH

## P1 — MUHIM

### ✅ T-188 | Service Worker — DONE (o'chirildi + unregister script)
### ✅ T-189 | manifest.json + PWA meta — DONE (o'chirildi)
### ✅ T-190 | PWA ikonalar — DONE (icon-512, icon-maskable o'chirildi)
### ✅ T-191 | useNativeNotification.ts — DONE (o'chirildi)
### ✅ T-192 | dist/ artifact — DONE (tozalandi)

---

# FRONTEND P3 — ✅ BAJARILDI (32/32)

Barcha P3 buglar tuzatildi. Batafsil: `docs/Done.md`
### T-156 | DashboardPage sparkline useMemo yo'q | 5min
### T-157 | DashboardPage CSV export empty catch | 5min
### T-158 | AdminPage 30+ any type | 30min
### T-159 | ProductPage any — mlForecast, trendAnalysis | 10min
### T-160 | ProductPage effect ikki marta trigger | 10min
### T-161 | ProductPage hardcoded USD rate 12900 | 10min — T-134 bilan birga
### T-162 | SignalsPage any[] barcha tab'larda | 15min
### T-163 | AdminPage 900+ qator (400 limit) | 1h — komponentlarga bo'lish
### T-164 | i18n — 7 ta sahifada hardcoded Uzbek matn | 30min

---

# CHROME EXTENSION

## Faza 1 — PROJECT SETUP + AUTH (P0)

### T-208 | Monorepo scaffold + Manifest V3 + build pipeline | 2h
`apps/extension/` papka — React 19, Vite, Tailwind v4, @crxjs/vite-plugin.
Manifest V3, papka strukturasi, turbo.json ga qo'shish.

### T-209 | API client + chrome.storage JWT boshqaruvi | 1.5h
`VentraApiClient` class, auto-refresh, chrome.storage.local wrapper.

### T-210 | Background Service Worker (alarm, badge, messaging) | 2h
Token refresh alarm, signal check, badge, popup↔content↔background messaging.

### T-211 | Popup Login UI + autentifikatsiya holati | 1.5h
Login forma, PopupDashboard, auth state management. 380x520px popup.

## Faza 2 — CONTENT SCRIPT: UZUM.UZ OVERLAY (P0)

### T-212 | Content Script — uzum.uz mahsulot sahifasida VENTRA score overlay | 3h
Shadow DOM, ProductOverlay panel, SPA navigation kuzatuv, minimize/expand.

### T-213 | Content Script — katalog/qidiruv sahifalarida inline score badge | 2.5h
Product card badge inject, batch score, IntersectionObserver, MutationObserver.

## Faza 3 — POPUP DASHBOARD (P1)

### T-215 | Popup Dashboard (tracked products, signals, quick analyze) | 3h
3 tab: Bosh (tez tahlil, KPI), Mahsulotlar (ro'yxat, sort), Signallar (yangiliklar).

### T-216 | Popup "Tez Tahlil" funksiyasi | 1.5h
URL input + joriy tab avtomatik + tahlil natija kartochka + track/to'liq tahlil.

## Faza 4 — CATEGORY SCANNER + ADVANCED (P1)

### T-217 | Kategoriya sahifasida "Top 10 mahsulot" floating widget | 2h
Score bo'yicha top 10 widget, kategoriya sahifasi aniqlash, yig'ish/ochish.

### T-218 | Notifications sistema (chrome.notifications + badge) | 1.5h
Signal templates, chrome.notifications, badge logika, "Bezovta qilmaslik" rejimi.

### T-219 | Options (Sozlamalar) sahifasi | 1.5h
API URL, notification preferences, display settings, cache tozalash.

## Faza 5 — COMPETITOR FEATURES + NARX (P2)

### T-220 | Raqiblar narx taqqoslash overlay | 2h
CompetitorOverlay, narx farqi foizda, kuzatishga olish.

### T-221 | Narx tarix grafigi (mini chart) overlay da | 1.5h
30 kunlik narx grafik, uPlot/Canvas, hover tooltip, trend line.

### T-222 | Context Menu integration (o'ng tugma menu) | 1h
uzum.uz da o'ng tugma → tahlil, kuzatish, taqqoslash.

## Faza 6 — ADVANCED ANALYTICS + AI (P2)

### T-223 | AI tahlil natijasini overlay da ko'rsatish | 1.5h
AiInsight component, typing animation, usage limit.

### T-224 | Keyboard shortcuts (hotkeys) | 1h
Alt+V popup, Alt+A tahlil, Alt+T track, Alt+O overlay toggle.

## Faza 7 — I18N, TESTING, POLISH (P2)

### T-225 | i18n (uz, ru, en) | 1.5h
`_locales/`, `chrome.i18n.getMessage()`, barcha UI matnlar.

### T-226 | Unit testlar (Vitest + Testing Library) | 2h
chrome API mock, component testlar, coverage >70%.

### T-227 | Performance optimization + bundle size | 1h
Bundle target: BG <50KB, Content <100KB, Popup <150KB. Tree shaking, lazy loading.

## Faza 8 — BUILD, PUBLISH (P1)

### T-228 | Production build pipeline + Chrome Web Store publish | 2h
CI pipeline, .zip build, Chrome Web Store API, versiya boshqarish.

### T-229 | Edge/Firefox adaptatsiya | 1h
Edge: to'g'ridan, Firefox: Manifest V2 + webextension-polyfill.

## Faza 9 — SECURITY + FINAL (P1)

### T-230 | Security audit + CSP + token xavfsizligi | 1h
CSP, chrome.storage.local, Shadow DOM, DOMPurify, HTTPS only.

### T-231 | Onboarding flow (birinchi marta ochganda) | 1h
4 bosqichli wizard, login, qanday ishlaydi, shortcutlar.

### T-232 | Extension icon set (16/48/128 + active/inactive) | 30min
VENTRA logotipi ikonkalar, notification ikonkalar.

### T-233 | Error handling + offline mode + graceful degradation | 1h

---

# LANDING PAGE

## QO'LDA QILINADIGAN ISHLAR

### M-001 | Dashboard screenshot'lar tayyorlash | 30min
Real dashboard dan 4 ta professional screenshot → `apps/landing/src/assets/screenshots/`

### M-002 | Desktop installer build qilish | 20min
`pnpm run dist:win` + `pnpm run dist:mac` → GitHub Releases ga yuklash.

### M-003 | Testimonial ma'lumotlari to'plash | 1h
3-4 ta real/realistic testimonial: ism, do'kon, fikr, rasm.

### M-004 | Domain va hosting sozlash | 30min
Landing: `ventra.uz`, App: `app.ventra.uz`, DNS, SSL.

## L-P0 | KRITIK — Loyiha setup + Sections

### L-001 | apps/landing/ monorepo package yaratish | 30min
### L-002 | Navbar component | 30min
### L-003 | Hero Section | 1h
### L-004 | Pain Points Section | 30min
### L-005 | Features Section (10 ta feature) | 45min
### L-006 | Dashboard Preview Section | 45min
### L-007 | Stats Section (raqamlar) | 20min
### L-008 | Pricing Section | 45min
### L-009 | Testimonials Section | 30min
### L-010 | FAQ Section | 20min
### L-011 | CTA Section (final) | 20min
### L-012 | Footer Section | 20min
### L-013 | Download Banner (floating) | 20min

## L-P1 | MUHIM — Animatsiya va polish

### L-014 | Framer Motion scroll animatsiyalar | 30min
### L-015 | Responsive dizayn (mobile + tablet) | 45min
### L-016 | SEO va Meta taglar | 20min
### L-017 | Performance optimizatsiya | 20min
### L-018 | Dark/Light tema | 15min

## L-P2 | O'RTA — Qo'shimcha

### L-019 | Email collection form | 20min
### L-020 | Analytics integration | 15min
### L-021 | Blog/Content section (optional) | 1h
### L-022 | Multi-language (uz/ru) | 30min
### L-023 | Docker + Nginx config | 20min
### L-024 | CI/CD — Landing deploy | 15min

---

# BIRGALIKDAGI TASKLAR (Bekzod AVVAL, Sardor KEYIN)

| Task | Bekzod (AVVAL) | Sardor (KEYIN) |
|------|----------------|----------------|
| T-193 | T-193a: ai.service.ts markdown tozalash | T-193b: ProductPage filter |
| T-196 | T-196: AI prompt yaxshilash | T-196b: "Mening mahsulotim" toggle |
| T-199 | T-199a: forecastEnsemble trend formula | T-199b: Frontend trend text |
| T-237 | T-237a: API + Prisma image_url | T-237b: ProductPage/Dashboard rasm |
| T-214 | T-214: batch-quick-score endpoint | T-213: Content script badge |

---

## XULOSA

| Prioritet | Jami | Bajarildi | Qoldi |
|-----------|------|-----------|-------|
| Web P0 (kritik) | 6 | 5 | 1 (T-193b Bekzod) |
| Web P1 (muhim) | 13 | 10 | 3 (T-196b, T-202, T-237b) |
| PWA o'chirish | 5 | 5 | 0 |
| Web P3 (past) | 32 | 32 | 0 |
| .env/config (manual) | 2 | 1 | 1 |
| Desktop (P0) | 1 | 0 | 1 (T-234) |
| Chrome Extension | 26 | 0 | 26 |
| Landing (manual) | 4 | 0 | 4 |
| Landing (dev) | 24 | 0 | 24 |
| **JAMI** | **113** | **53** | **60** |

**Web app deyarli tayyor** — 52/56 task bajarildi (93%).
Qolganlar: T-193b, T-196b, T-202, T-237b (3 tasi Bekzod dependent).

---
*Tasks-Sardor.md | VENTRA | 2026-02-27*
