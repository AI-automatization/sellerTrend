# SARDOR — Vazifalar
# Fayllar: apps/web/, apps/desktop/, apps/extension/, apps/landing/
# Yangilangan: 2026-02-27

---

# BIRINCHI QILISH TARTIBI (Bekzodga bog'liq EMAS)

| # | Task | Nima | Vaqt |
|---|------|------|------|
| 1 | E-001 + E-002 | Desktop .env yaratish + proxy qo'shish | 15min |
| 2 | T-234 | Desktop login to'liq fix (production build ham) | 30min |
| 3 | T-205 | Footer da raw scoring formula O'CHIRISH | 10min |
| 4 | T-195 | Texnik jargon (WMA, MAE, RMSE) o'chirish | 10min |
| 5 | T-194 | Chart X-axis "M02 27" takrorlanadi — formatter | 30min |
| 6 | T-203 | ML Prognoz KPI box labelsiz — label qo'shish | 20min |
| 7 | T-204 | Qora to'rtburchak render bug fix | 15min |
| 8 | T-206 | Raqiblar "50 ta" + "topilmadi" ziddiyat | 10min |
| 9 | T-084 | RegisterPage auth store bypass | 20min |
| 10 | T-085 + T-086 | AnalyzePage + ProductPage tracked=true bug | 20min |
| 11 | T-197 | Score chart zigzag — kunlik aggregate | 20min |
| 12 | T-198 | Haftalik sotuvlar chart fix | 20min |
| 13 | T-200 | "confidence", "snapshot" → o'zbekcha | 10min |
| 14 | T-201 | Raqiblar bo'sh holat UX | 15min |
| 15 | T-202 | ProductPage seksiya tartibi qayta ko'rish | 1h |
| 16 | T-188...T-192 | PWA to'liq o'chirish (5 ta task) | 45min |
| 17 | T-097 | WebSocket dev proxy | 15min |
| 18 | T-114...T-164 | P3 buglar (32 ta) | ~6h |
| 19 | L-001...L-024 | Landing page (24 ta) | ~10h |
| 20 | T-208...T-233 | Chrome Extension (26 ta) | ~35h |

**Izoh:** 1-16 gacha MUSTAQIL — Bekzodni kutish shart emas.
17+ dan keyin Bekzod bog'liq tasklar (T-193b, T-196b, T-199b, T-237b) ham tayyor bo'ladi.

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

## P0 — KRITIK

### T-084 | RegisterPage auth store bypass | 20min
`apps/web/src/pages/RegisterPage.tsx:30-31` — `useAuthStore.setTokens()` va `queryClient.clear()` chaqirmaydi. Zustand state yangilanmaydi.
**Fix:** LoginPage bilan bir xil pattern ishlatish.

### T-085 | AnalyzePage tracked=true API xatosida ham o'rnatiladi | 10min
`apps/web/src/pages/AnalyzePage.tsx:94-102`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-086 | ProductPage tracked=true API xatosida ham o'rnatiladi | 10min
`apps/web/src/pages/ProductPage.tsx:261-265`
**Fix:** `setTracked(true)` ni try bloki ichiga ko'chirish.

### T-193b | AI tahlili raw JSON — FRONTEND filter | 15min
`ProductPage.tsx:736` — Har bir bullet'dan qolgan JSON artifact tozalash:
`.filter(b => b && b.length > 3 && !b.match(/^[\[\]{}"\`]+$/))`
**Eslatma:** T-193a (backend) AVVAL bajarilishi kerak (Bekzod).

### T-194 | Chart X-axis "M02 27" takrorlanadi — sanalar o'qib bo'lmaydi | 30min
**Fayllar:**
- `ProductPage.tsx:645,649` — `toLocaleDateString('uz-UZ', ...)` → custom formatter
- `ScoreChart.tsx:32` — X-axis raw ISO string
- `ProductPage.tsx:716` — Haftalik sotuvlar raw `date`
**Fix:** `uz-UZ` → `ru-RU` yoki custom formatter + bir kunda 1+ snapshot bo'lsa VAQTNI ko'rsatish.

### T-195 | "Ensemble: WMA + Holt's..." texnik jargon o'chirish | 10min
`ProductPage.tsx:697-699`
**Fix:** O'chirish yoki: `AI bashorat · XX% ishonchlilik`

---

## P1 — MUHIM

### T-097 | WebSocket dev proxy yo'q | 15min
`apps/web/vite.config.ts`
**Fix:** `/ws` proxy qo'shish (ws: true).

### T-196b | AI tahlilida "Bu mening mahsulotim" toggle (FRONTEND) | 15min
ProductPage'da "Bu mening mahsulotim" / "Bu raqib mahsuloti" toggle qo'shish.
AI prompt'ga bu kontekstni yuborish.
**Eslatma:** T-196 (backend prompt) AVVAL bajarilishi kerak (Bekzod).

### T-197 | Score tarixi chart — bir kunda ko'p snapshot zigzag | 20min
`ScoreChart.tsx` + `ProductPage.tsx:706-726`
**Fix:** Snapshotlarni KUN bo'yicha aggregate — har kunning OXIRGI score'ini olish.

### T-198 | Haftalik sotuvlar chart — noto'g'ri data | 20min
`ProductPage.tsx:716-725`
**Fix:** KUN bo'yicha aggregate + `dataKey="weekly_bought"` + Y-axis label: "dona/hafta"

### T-199b | "7 kunlik bashorat" trend badge — FRONTEND text | 10min
"Barqaror" → "O'sish kutilmoqda" / "Pasayish kutilmoqda" — foiz bilan.
**Eslatma:** T-199a (backend formula) AVVAL bajarilishi kerak (Bekzod).

### T-200 | ML Prognoz — "confidence", "snapshot" texnik so'zlar | 10min
`ProductPage.tsx:614-630`
**Fix:** "confidence" → "darajasi", "snapshot" → "tahlil", score badge tushunarliroq.

### T-201 | Raqiblar Narx Kuzatuvi + Global Bozor — loading/bo'sh | 15min
`ProductPage.tsx` — tegishli useEffect va API call'lar.
**Fix:** Timeout, bo'sh data xabar, toast.error, foydalanilmasa seksiyani yashirish.

### T-202 | ProductPage overall UX — sotuvchi uchun soddalash | 1h
Seksiya tartibi qayta ko'rish: Asosiy → AI tahlili → Haftalik → Bashorat → Raqiblar → Texnik.

### T-203 | ML Prognoz 4 ta KPI box labelsiz — 2.94, 81, 74%, 58 nima? | 20min
`ProductPage.tsx:586-640`
**Fix:** Har box ga label, contradictory badge larni tuzatish, score ranglar.

### T-204 | "7 kunlik sotuv dinamikasi" da qora to'rtburchak (render bug) | 15min
`ProductPage.tsx` — weekly trend cards
**Fix:** Image/SVG fallback, onError handler, CSS tekshirish.

### T-205 | Footer da raw scoring formula ko'rinadi | 10min
`ProductPage.tsx` — page footer
**Fix:** Bu qatorni TO'LIQ O'CHIRISH.

### T-206 | Raqiblar — "50 ta kuzatilmoqda" + "topilmadi" bir vaqtda | 10min
`ProductPage.tsx` — competitors section
**Fix:** Dinamik raqam + holatga qarab xabar.

### T-237b | ProductPage da mahsulot rasmi ko'rsatish (FRONTEND qismi) | 30min
`ProductPage.tsx` — title yonida/ustida rasm + `DashboardPage.tsx` — thumbnail.
**Eslatma:** T-237a (backend: API + Prisma) AVVAL bajarilishi kerak (Bekzod).

---

# PWA O'CHIRISH

## P1 — MUHIM

### T-188 | Service Worker o'chirish + unregister script | 20min
`apps/web/public/sw.js` O'CHIRISH + `apps/web/index.html:26-32` SW registration O'CHIRISH.
Unregister script qo'shish (bir necha hafta qoladi).

### T-189 | manifest.json va PWA meta taglar o'chirish | 10min
`apps/web/public/manifest.json` O'CHIRISH + index.html meta taglar O'CHIRISH.
`theme-color` va `favicon.svg` QOLADI.

### T-190 | PWA-only ikonalar o'chirish | 5min
O'chirish: `icon-512.svg`, `icon-maskable.svg`, `apple-touch-icon.svg`.
QOLADI: `favicon.svg`.

### T-191 | useNativeNotification.ts dead code o'chirish | 5min
`apps/web/src/hooks/useNativeNotification.ts` O'CHIRISH (21 qator, hech qayerda import qilinmagan).

### T-192 | dist/manifest.json build artifact tozalash | 5min
`rm -rf apps/web/dist` — build qayta ishlatganda avtomatik ketadi.

---

# FRONTEND P3 — PAST

### T-114 | admin.ts dead code sendNotification | 5min
### T-115 | authStore email field JWT da yo'q | 10min — T-096 bilan birga
### T-116 | DashboardPage getTracked .catch() yo'q | 10min
### T-117 | DashboardPage scoreColor(0) gray | 5min
### T-118 | AdminPage deposits useEffect dependency yo'q | 5min
### T-119 | ProductPage Recharts rect → Cell | 10min
### T-120 | SourcingPage refreshRates() catch yo'q | 5min
### T-121 | SourcingPage stale closure xavfi | 10min
### T-122 | AdminPage void setActiveTab dead no-op | 5min
### T-123 | AdminPage useEffect stale activeTab | 10min
### T-124 | ProductPage loadData useEffect dependency yo'q | 10min
### T-125 | ProductPage extSearched reset bo'lmaydi | 10min
### T-126 | ConsultationPage timezone muammo | 15min
### T-127 | ConsultationPage 3 ta empty catch | 10min
### T-128 | DiscoveryPage 2 ta empty catch | 10min
### T-129 | ReferralPage empty catch | 5min
### T-130 | ApiKeysPage 3 ta empty catch | 10min
### T-131 | FeedbackPage 4 ta empty catch | 10min
### T-151 | useCallback(fn, [fn]) foydasiz | 5min
### T-152 | any type api fayllarida 6 ta | 10min
### T-153 | ErrorBoundary console.error env check yo'q | 5min
### T-154 | getTokenPayload return type tor | 10min
### T-155 | isAuthenticated() token expiry tekshirmaydi | 15min
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

| Prioritet | Tasklar |
|-----------|---------|
| .env/config (manual) | 2 |
| Desktop (P0) | 1 |
| Web P0 (kritik) | 6 |
| Web P1 (muhim) | 14 |
| PWA o'chirish | 5 |
| Web P3 (past) | 32 |
| Chrome Extension | 26 |
| Landing (manual) | 4 |
| Landing (dev) | 24 |
| **JAMI** | **114** |

---
*Tasks-Sardor.md | VENTRA | 2026-02-27*
