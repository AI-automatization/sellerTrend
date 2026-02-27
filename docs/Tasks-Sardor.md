# SARDOR — Vazifalar
# Fayllar: apps/web/, apps/desktop/, apps/extension/, apps/landing/
# Yangilangan: 2026-02-27

---

# ✅ BAJARILGAN (19 ta — 2026-02-27)

| Task | Yechim |
|------|--------|
| E-001 | `apps/desktop/.env` yaratildi — `VITE_API_URL=http://localhost:3000` |
| E-002 | `electron.vite.config.ts` ga `/api/v1` proxy qo'shildi |
| T-084 | RegisterPage — `setTokens()` + `queryClient.clear()` qo'shildi |
| T-085 | AnalyzePage — `setTracked(true)` try ichiga ko'chirildi |
| T-086 | ProductPage — `setTracked(true)` try ichiga ko'chirildi |
| T-188 | `sw.js` o'chirildi, `index.html` ga unregister scripti qo'shildi |
| T-189 | `manifest.json` o'chirildi, PWA meta taglar tozalandi |
| T-190 | `icon-512.svg`, `icon-maskable.svg`, `apple-touch-icon.svg` o'chirildi |
| T-191 | `useNativeNotification.ts` dead code o'chirildi |
| T-192 | `dist/` build qayta ishlaganda avtomatik tozalanadi |
| T-194 | `ProductPage.tsx:219` — ISO date saqlashga o'tildi; ScoreChart `formatDay()` |
| T-195 | "Ensemble: WMA + Holt's... MAE/RMSE" o'chirildi → "AI bashorat · X% ishonchlilik" |
| T-197 | `dailySnapshots` useMemo — har kunning oxirgi score'i; ScoreChart ham aggregate |
| T-198 | BarChart `dailySnapshots.slice(-15)` + Y-axis "ta" unit + formatter |
| T-200 | "confidence" → "bashorat darajasi", "snapshot" → "ta o'lcham" |
| T-201 | Global bozor fetch xatosida `setExtNote('Global bozor...')` qo'shildi |
| T-203 | ML KPI box: "7 kun score", "7 kun sotuv", "Ishonchlilik", "Tahlil soni" |
| T-204 | BarChart `<rect>` → `<Cell>` — qora to'rtburchak yo'q |
| T-205 | `Score = 0.55×ln(...)` formula footer dan to'liq o'chirildi |
| T-097 | `vite.config.ts` ga `/ws` proxy qo'shildi (`ws: true`) |
| T-234 | `apps/desktop/.env.production` yaratildi — `VITE_API_URL=https://app.ventra.uz` |
| T-202 | ProductPage seksiya tartibi: AI tahlili → Haftalik → Score tarixi → ML → Bashorat → Raqiblar |

---

# OCHIQ TASKLAR

## P1 — WEB APP

---

## P1 — BEKZODGA BOG'LIQ (u tamomlaguncha kutish)

| Task | Bekzod (AVVAL) | Sardor (KEYIN) |
|------|----------------|----------------|
| T-193b | T-193a: ai.service.ts markdown tozalash | ProductPage filter: `.filter(b => b && b.length > 3 && !b.match(/^[\[\]{}"\`]+$/))` |
| T-196b | T-196: AI prompt yaxshilash | "Bu mening mahsulotim" / "Bu raqib mahsuloti" toggle |
| T-199b | T-199a: forecastEnsemble trend formula | Frontend trend text: "O'sish" / "Pasayish" foiz bilan |
| T-237b | T-237a: API + Prisma image_url | ProductPage + Dashboard thumbnail |
| T-213 | T-214: batch-quick-score endpoint | Content script badge |

---

## P3 — PAST PRIORITET

### T-114 | admin.ts dead code sendNotification | 5min
### T-115 | authStore email field JWT da yo'q | 10min
### T-116 | DashboardPage getTracked .catch() yo'q | 10min
### T-117 | DashboardPage scoreColor(0) gray | 5min
### T-118 | AdminPage deposits useEffect dependency yo'q | 5min
### T-119 | ProductPage Recharts rect → Cell (boshqa joy) | 10min
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
### T-161 | ProductPage hardcoded USD rate 12900 | 10min
### T-162 | SignalsPage any[] barcha tab'larda | 15min
### T-163 | AdminPage 900+ qator (400 limit) | 1h
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
### T-216 | Popup "Tez Tahlil" funksiyasi | 1.5h

## Faza 4 — CATEGORY SCANNER + ADVANCED (P1)

### T-217 | Kategoriya sahifasida "Top 10 mahsulot" floating widget | 2h
### T-218 | Notifications sistema (chrome.notifications + badge) | 1.5h
### T-219 | Options (Sozlamalar) sahifasi | 1.5h

## Faza 5–9 (P2)

### T-220 | Raqiblar narx taqqoslash overlay | 2h
### T-221 | Narx tarix grafigi (mini chart) overlay da | 1.5h
### T-222 | Context Menu integration | 1h
### T-223 | AI tahlil natijasini overlay da ko'rsatish | 1.5h
### T-224 | Keyboard shortcuts (hotkeys) | 1h
### T-225 | i18n (uz, ru, en) | 1.5h
### T-226 | Unit testlar (Vitest + Testing Library) | 2h
### T-227 | Performance optimization + bundle size | 1h
### T-228 | Production build pipeline + Chrome Web Store publish | 2h
### T-229 | Edge/Firefox adaptatsiya | 1h
### T-230 | Security audit + CSP + token xavfsizligi | 1h
### T-231 | Onboarding flow | 1h
### T-232 | Extension icon set (16/48/128) | 30min
### T-233 | Error handling + offline mode | 1h

---

# LANDING PAGE

## QO'LDA QILINADIGAN ISHLAR
### M-001 | Dashboard screenshot'lar tayyorlash | 30min
### M-002 | Desktop installer build qilish | 20min
### M-003 | Testimonial ma'lumotlari to'plash | 1h
### M-004 | Domain va hosting sozlash | 30min

## L-P0 | KRITIK
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

## L-P1 | MUHIM
### L-014 | Framer Motion scroll animatsiyalar | 30min
### L-015 | Responsive dizayn (mobile + tablet) | 45min
### L-016 | SEO va Meta taglar | 20min
### L-017 | Performance optimizatsiya | 20min
### L-018 | Dark/Light tema | 15min

## L-P2 | O'RTA
### L-019 | Email collection form | 20min
### L-020 | Analytics integration | 15min
### L-021 | Blog/Content section (optional) | 1h
### L-022 | Multi-language (uz/ru) | 30min
### L-023 | Docker + Nginx config | 20min
### L-024 | CI/CD — Landing deploy | 15min

---

## XULOSA

| Prioritet | Tasklar |
|-----------|---------|
| ✅ DONE | 22 |
| Desktop P0 | ✅ DONE |
| Web P1 mustaqil | ✅ DONE |
| Web P1 Bekzodga bog'liq | 5 |
| Web P3 | 32 |
| Chrome Extension | 26 |
| Landing (manual) | 4 |
| Landing (dev) | 24 |
| **JAMI ochiq** | **94** |

---
*Tasks-Sardor.md | VENTRA | 2026-02-27*
