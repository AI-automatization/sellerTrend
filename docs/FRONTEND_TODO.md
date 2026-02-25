# VENTRA — FRONTEND TO'LIQ ISHLAR RO'YXATI
# Claude CLI uchun: Sardor (Frontend Engineer)
# Sana: 2026-02-26
# Stack: React 19 + TypeScript + Tailwind v4 + DaisyUI v5 + Recharts + React Router v7
# Status yangilangan: 2026-02-26
# Umumiy holat: 35/43 feature DONE (81%) | 8 ta TODO qoldi

---

## 📌 UMUMIY QOIDALAR

- **Fayl joylashuvi:** `apps/web/src/` — faqat shu papkada ishla
- **Backend tegma:** `apps/api/`, `apps/worker/`, `apps/bot/` — Bekzod zonasi
- **Shared fayllar:** `packages/types/`, `packages/utils/` — Bekzod bilan kelishib
- **Design system:** DaisyUI v5 semantic tokenlar, `night` theme, VENTRA branding
- **Fontlar:** Inter (UI) + Space Grotesk (h1-h6, brand)
- **Ranglar:** bg-0 `#0B0F1A`, bg-1 `#121826`, bg-2 `#1A2233`, accent `#4C7DFF`
- **Iconlar:** Custom SVG components — `apps/web/src/components/icons.tsx` (Heroicons outline style)
- **I18n:** 3 til (uz, ru, en) — `apps/web/src/i18n/translations.ts`
- **TypeScript:** `any` TAQIQLANGAN, barcha props uchun interface yoz
- **Komponent:** 400+ qator = bo'l. Logika = custom hook. Render = komponent
- **API client:** `apps/web/src/api/client.ts` — barcha endpoint lar shu yerda

---

## 🔴 SPRINT 0 — BUG FIXES (ENG BIRINCHI BAJARILADI) — 3/4 DONE

### S-0.1: nginx.conf yaratish ✅ DONE
```
Fayl: apps/web/nginx.conf
Nima: Production uchun Nginx konfiguratsiya
Tarkib:
  - SPA fallback: try_files $uri $uri/ /index.html
  - Gzip compression (text/html, application/javascript, text/css, application/json)
  - Cache headers: static assets (js, css, images) → max-age=1y
  - Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
  - API proxy: /api/ → http://api:3000/api/
  - WebSocket proxy: /socket.io/ → http://api:3000/socket.io/ (Upgrade, Connection headers)
  - Listen: port 80
  - Server name: _
```

### S-0.2: Dockerfile yaratish ✅ DONE
```
Fayl: apps/web/Dockerfile
Nima: Multi-stage Docker build
Tarkib:
  Stage 1 (build):
    - FROM node:20-alpine AS builder
    - WORKDIR /app
    - pnpm install --frozen-lockfile
    - pnpm --filter web build
  Stage 2 (serve):
    - FROM nginx:alpine
    - COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
    - COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
    - EXPOSE 80
    - CMD ["nginx", "-g", "daemon off;"]
```

### S-0.3: DashboardPage yaxshilash ✅ DONE
```
Fayl: apps/web/src/pages/DashboardPage.tsx
Nima qilish:
  1. PAYMENT_DUE banner yaxshilash:
     - Hozirgi: oddiy alert
     - Kerak: Sticky top banner, btn-error, "To'lov qilish" tugmasi → /billing
     - Balans ko'rsatish: "Balans: 2,500 so'm (1 kunga yetadi)"
     - Dismiss tugmasi (localStorage da 24 soat saqlash)
  
  2. Empty state (hech qanday mahsulot kuzatilmayotganda):
     - Katta illustration yoki emoji (📊)
     - "Hali mahsulot qo'shmadingiz"
     - "URL tahlil qiling" → btn-primary → /analyze sahifasiga o'tkazish
     - "Discovery boshlang" → btn-outline → /discovery sahifasiga

  3. font-heading class qo'shish h1, h2 ga
```

### S-0.4: Skeleton komponentlar yaratish ❌ TODO
```
Fayllar:
  apps/web/src/components/ui/SkeletonCard.tsx
  apps/web/src/components/ui/SkeletonTable.tsx
  apps/web/src/components/ui/SkeletonStat.tsx

SkeletonCard:
  - DaisyUI card skeleton: bg-base-200 animate-pulse
  - 3 ta line placeholder (h-4 rounded bg-base-300)
  - 1 ta image placeholder (h-32 rounded bg-base-300)
  - Props: { lines?: number; hasImage?: boolean; className?: string }

SkeletonTable:
  - thead: 4-5 ta column placeholder
  - tbody: 5 ta row, har biri animate-pulse
  - Props: { rows?: number; columns?: number; className?: string }

SkeletonStat:
  - DaisyUI stat skeleton
  - Title placeholder (h-3 w-24)
  - Value placeholder (h-8 w-32)
  - Desc placeholder (h-3 w-20)
  - Props: { className?: string }

Har bir sahifada loading=true bo'lganda skeleton ishlatish kerak (hozir faqat <span className="loading" /> bor)
```

---

## 🟢 v1.0 FEATURES (01-10) — FRONTEND — 8/10 DONE

---

### FEATURE 01 — Competitor Price Tracker UI ❌ TODO
```
API (Bekzod dan): GET /api/v1/competitor/products/:id/prices

Fayllar:
  [ ] apps/web/src/pages/ProductPage.tsx — "Raqiblar narxi" tab qo'shish
  [ ] apps/web/src/components/competitor/CompetitorPriceTable.tsx
  [ ] apps/web/src/components/competitor/PriceComparisonChart.tsx
  [ ] apps/web/src/api/client.ts — competitorApi endpointlar

CompetitorPriceTable.tsx:
  Interface:
    interface CompetitorPrice {
      readonly competitor_id: string;
      readonly product_title: string;
      readonly current_price: number;       // so'm
      readonly price_diff: number;          // % farq (biznikiga nisbatan)
      readonly price_change_7d: number;     // 7 kunlik o'zgarish %
      readonly shop_name: string;
      readonly last_updated: string;
    }
  Ustunlar: # | Mahsulot | Do'kon | Narx | Farq (%) | O'zgarish (7 kun)
  Rang logikasi:
    price_diff < 0 → text-success (biz arzonmiz)
    price_diff > 0 → text-error (biz qimmotmiz)
  DaisyUI: table table-zebra table-sm
  Responsive: overflow-x-auto

PriceComparisonChart.tsx:
  Recharts BarChart
  X-o'q: raqib nomlari
  Y-o'q: narx (so'm)
  Bizning narx: primary rang bar
  Raqiblar: base-300 rang bar
  Tooltip: narx + farq %
  Props: { data: CompetitorPrice[]; ourPrice: number }

API client qo'shimchalar:
  competitorApi = {
    getPrices: (productId: string) => api.get(`/competitor/products/${productId}/prices`),
    trackCompetitor: (productId: string, competitorIds: string[]) =>
      api.post(`/competitor/products/${productId}/track`, { competitor_ids: competitorIds }),
  }
```

### FEATURE 02 — Seasonal Trend Calendar UI ✅ DONE
```
API: GET /api/v1/tools/seasonal-calendar

Fayllar:
  [ ] apps/web/src/pages/SeasonalCalendarPage.tsx
  [ ] apps/web/src/components/seasonal/HeatmapGrid.tsx
  [ ] apps/web/src/components/seasonal/UpcomingEventsWidget.tsx

Route: /tools/seasonal-calendar (App.tsx ga qo'shish)
Sidebar: "Asboblar" guruhida

SeasonalCalendarPage.tsx:
  12 oylik heatmap grid
  Har bir hujayra: oy nomi + event nomlari + boost koeffitsienti
  Rang: 
    boost > 1.5 → bg-error/20 (qizil = yuqori demand)
    boost 1.0-1.5 → bg-warning/20 (sariq = o'rtacha)
    boost < 1.0 → bg-info/20 (ko'k = past demand)

HeatmapGrid.tsx:
  Interface:
    interface MonthlyData {
      readonly month: number;          // 1-12
      readonly month_name: string;     // "Yanvar"
      readonly events: SeasonalEvent[];
      readonly boost_coefficient: number;
    }
    interface SeasonalEvent {
      readonly name: string;           // "8-Mart", "Ramazon", "Navro'z"
      readonly start_date: string;
      readonly end_date: string;
      readonly boost: number;
    }
  Props: { data: MonthlyData[]; onMonthClick: (month: number) => void }
  Layout: grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3

UpcomingEventsWidget.tsx (DashboardPage pastki qismiga):
  "Kelasi 30 kun" — yaqinlashayotgan sezonal eventlar
  Masalan: "8-mart 12 kunda" + countdown
  Props: { events: SeasonalEvent[] }
```

### FEATURE 03 — Shop Intelligence Dashboard UI ✅ DONE
```
API: GET /api/v1/shops/:shopId

Fayllar:
  [ ] apps/web/src/pages/ShopDetailPage.tsx
  [ ] apps/web/src/components/shop/TrustScoreGauge.tsx
  [ ] apps/web/src/components/shop/ShopGrowthChart.tsx
  [ ] apps/web/src/components/shop/TopProductsList.tsx

Route: /shops/:shopId (App.tsx ga qo'shish — mavjud ShopsPage dan navigate)

ShopDetailPage.tsx:
  Shop header: nomi, Uzum dagi link, registratsiya sanasi
  3 stat karta: Trust Score | Jami mahsulotlar | O'rtacha score
  Tabs: "O'sish" | "Top mahsulotlar" | "Raqiblar"

TrustScoreGauge.tsx:
  SVG arc gauge (0-100) yoki Recharts RadialBarChart
  Rang: 
    score > 80 → success
    score 50-80 → warning
    score < 50 → error
  Markazda: katta raqam
  Props: { score: number; maxScore?: number }

ShopGrowthChart.tsx:
  Recharts LineChart
  30 kunlik orders_quantity o'zgarishi
  X-o'q: sana | Y-o'q: buyurtmalar
  Trend line qo'shish (yashil = o'syapti, qizil = tushyapti)
  Props: { data: { date: string; orders: number }[] }

TopProductsList.tsx:
  Top-5 mahsulot: rasm (kichik), nom, score, haftalik sotuv
  Rang: score > 7 yashil, 4-7 sariq, < 4 qizil
  Props: { products: ShopProduct[] }

AnalyzePage o'zgarish: 
  URL yuborilganda shop link chiqarish → /shops/:shopId ga navigate
```

### FEATURE 04 — Niche Finder UI ⭐ ✅ DONE
```
API: GET /api/v1/discovery/niches

Fayllar:
  [ ] apps/web/src/pages/NichePage.tsx
  [ ] apps/web/src/components/niche/NicheScoreCard.tsx
  [ ] apps/web/src/components/niche/NicheFilterPanel.tsx

Route: /discovery/niches (App.tsx ga qo'shish)
Sidebar: "Discovery" ostida sub-link

NichePage.tsx:
  Header: "Niche Topuvchi" + tavsif
  Filter panel (yuqorida)
  Niche score kartalar grid

NicheScoreCard.tsx:
  Interface:
    interface NicheData {
      readonly category_id: number;
      readonly category_name: string;
      readonly niche_score: number;       // 0.0 - 1.0
      readonly demand_score: number;
      readonly supply_score: number;      // past = yaxshi
      readonly growth_rate: number;       // %
      readonly avg_margin: number;        // %
      readonly top_product_count: number;
      readonly avg_reviews: number;
    }
  Rang:
    niche_score > 0.7 → border-success bg-success/5 (yaxshi niche!)
    niche_score 0.4-0.7 → border-warning bg-warning/5
    niche_score < 0.4 → border-base-300 (standart)
  Ko'rsatuvchilar (ichida): demand, supply, growth, margin — mini progress bar bilan
  "Batafsil" tugmasi → discovery run boshlash
  Props: { data: NicheData; onClick: () => void }

NicheFilterPanel.tsx:
  Filterlar:
    - Minimum niche score: range slider (0.0 - 1.0)
    - Kategoriya: select dropdown
    - Minimum margin: input (%)
  Props: { filters: NicheFilters; onChange: (f: NicheFilters) => void }
```

### FEATURE 05 — CSV/Excel Import & Export UI ✅ DONE
```
API: 
  POST /api/v1/export/csv (download)
  POST /api/v1/export/excel (download)
  POST /api/v1/import/csv (upload)

Fayllar:
  [ ] apps/web/src/components/export/ExportButton.tsx
  [ ] apps/web/src/components/import/ImportModal.tsx
  [ ] apps/web/src/hooks/useExport.ts

ExportButton.tsx:
  DaisyUI dropdown: "Yuklab olish" → CSV | Excel (.xlsx)
  Loading state: loading spinner
  Blob download: window.URL.createObjectURL + a.click()
  Props: { endpoint: string; filename: string; filters?: Record<string, any> }

ImportModal.tsx:
  DaisyUI modal
  File drag-and-drop zona (border-dashed)
  Qabul qilingan formatlar: .csv, .xlsx
  Preview: birinchi 5 qator jadval
  Mapping: ustun nomlari → tizim fieldlari
  "Import boshlash" tugmasi
  Progress bar
  Natija: "45 mahsulot import qilindi, 3 ta xato"

useExport.ts:
  Hook: { exportCsv, exportExcel, isExporting }
  Blob download logikasi

DashboardPage, DiscoveryPage, ShopsPage larda ExportButton qo'shish
```

### FEATURE 06 — Referral UI (MAVJUD — yaxshilash kerak) ✅ DONE
```
Fayl: apps/web/src/pages/ReferralPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] Referal link copy tugmasi — "Nusxalandi!" toast bilan
  [ ] Referal statistika: nechta odam taklif qilindi, nechtasi ro'yxatdan o'tdi
  [ ] Reward tarix jadvali: sana, email (masked), bonus kunlar
  [ ] Social share tugmalari: Telegram, WhatsApp (pre-filled message)
  [ ] Empty state: "Hali hech kimni taklif qilmadingiz"
```

### FEATURE 07 — API Keys UI (MAVJUD — yaxshilash kerak) ✅ DONE
```
Fayl: apps/web/src/pages/ApiKeysPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] API key yaratish: modal bilan, nom kiritish
  [ ] Key ko'rsatish: faqat yaratilgan paytda to'liq ko'rsatish (keyin mask)
  [ ] Usage statistika: har bir key uchun request/soat, request/kun
  [ ] Rate limit ko'rsatish: "450/1000 bugungi request"
  [ ] Delete tugmasi: confirm modal bilan
  [ ] API documentation link: https://docs.ventra.uz/api
  [ ] Code snippet: cURL, JavaScript, Python misollari (DaisyUI mockup tab)
```

### FEATURE 08 — Public Leaderboard UI (MAVJUD — yaxshilash kerak) ✅ DONE
```
Fayl: apps/web/src/pages/LeaderboardPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] SEO meta taglar:
      apps/web/src/utils/seo.ts
      function setMetaTags(title: string, description: string, ogImage?: string)
      LeaderboardPage da: "Uzum Top Mahsulotlar — VENTRA"
  
  [ ] Top-5 to'liq ko'rsatish (auth shart emas):
      Rank badge: #1 🥇, #2 🥈, #3 🥉
      Score, weekly_bought, kategoriya
  
  [ ] 6-20 blur effekti (auth kerak):
      Tailwind: filter blur-sm pointer-events-none
      CTA overlay: "Bepul ro'yxatdan o'ting → to'liq ko'ring"
      Link → /register
  
  [ ] Kategoriya filter (auth shart emas):
      Select dropdown: barcha kategoriyalar
      Default: "Barchasi"
```

### FEATURE 09 — Profit Calculator UI (MAVJUD — yaxshilash kerak) ✅ DONE
```
Fayl: apps/web/src/pages/ProfitCalculatorPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] Input panel (chap / yuqori mobile da):
      - Sotuv narxi (so'm) — input
      - Xarid narxi ($) — input
      - USD/UZS kurs (auto CBU API dan, o'zgartirilishi mumkin) — input
      - Uzum komissiya % (5-15) — range slider
      - FBO xarajati (so'm, optional) — input
      - Reklama xarajati (so'm, optional) — input
      - Miqdor — input
      
  [ ] Natija panel (o'ng / pastki mobile da):
      - Sof foyda: katta yashil raqam (text-2xl font-bold text-success)
      - Margin %: rang ko'rsatgich
        < 15% → text-error
        15-30% → text-warning
        > 30% → text-success
      - ROI %
      - Breakeven miqdori
      
  [ ] Breakeven Chart:
      Recharts AreaChart
      X-o'q: miqdor (0 dan 1000 gacha)
      Y-o'q: sof foyda (so'm)
      Breakeven nuqtasi: vertikal qizil dashed chiziq
      Fill: foyda zonasi yashil, zarar zonasi qizil/10
      
  [ ] "Manba qo'shish" tugmasi → /sourcing sahifasiga redirect
      (Sourcing natijasi → kalkulator avtomatik to'ldiriladi, URL params orqali)
```

### FEATURE 10 — Browser Extension Landing Page ❌ TODO
```
Fayllar:
  [ ] apps/web/src/pages/ExtensionPage.tsx
  [ ] apps/web/src/components/extension/InstallSteps.tsx

Route: /extension (App.tsx ga qo'shish)
Sidebar: "Asboblar" guruhida

ExtensionPage.tsx:
  Hero section:
    - Extension screenshot (katta)
    - "Chrome uchun o'rnatish" → btn-primary → Chrome Web Store havolasi
    - "Firefox uchun o'rnatish" → btn-outline → Firefox Add-ons havolasi
  
  "Qanday ishlaydi" section:
    3 qadam: 1) O'rnating, 2) Uzum ga kiring, 3) Score ko'ring
    Har bir qadam: icon + title + desc + screenshot
    CSS animation: fade-in on scroll

InstallSteps.tsx:
  Props: { steps: { icon: string; title: string; desc: string }[] }
  Layout: grid grid-cols-1 md:grid-cols-3 gap-6

ProductPage ga qo'shimcha:
  "Chrome da ochish" tugmasi → uzum.uz/product/... ni yangi tabda ochadi
```

---

## 🟢 v2.0 FEATURES (11-20) — FRONTEND — 9/10 DONE

---

### FEATURE 11 — Trend Prediction UI ✅ DONE
```
API: GET /api/v1/products/:id/prediction

Fayllar:
  [ ] apps/web/src/components/product/PredictionChart.tsx
  [ ] apps/web/src/components/product/PredictionBadge.tsx

ProductPage da qo'shish: "Bashorat" tab yoki mavjud chart ga prediction qo'shish

PredictionChart.tsx:
  Recharts ComposedChart:
    - AreaChart: haqiqiy ma'lumotlar (solid, primary rang)
    - LineChart: bashorat (dashed, warning rang)
    - ReferenceArea: confidence interval (warning/10)
  X-o'q: sana (oxirgi 30 kun + kelasi 7 kun)
  Y-o'q: weekly_bought
  Tooltip: "Bashorat: ~340 ±25"
  Props: { 
    actual: { date: string; value: number }[];
    predicted: { date: string; value: number; upper: number; lower: number }[];
  }

PredictionBadge.tsx:
  O'sish bashorati → badge badge-success: "📈 +12% kutilmoqda"
  Tushish bashorati → badge badge-error: "📉 -8% kutilmoqda"
  Flat → badge badge-warning: "➡️ Barqaror"
  Props: { prediction_trend: 'up' | 'down' | 'flat'; change_pct: number }
```

### FEATURE 12 — Auto Description Generator UI (MAVJUD — yaxshilash) ✅ DONE
```
Fayl: apps/web/src/pages/AiDescriptionPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] Til tanlash: O'zbekcha | Ruscha | Ikkalasi
  [ ] Uslub tanlash: Professional | Qisqa | Kreativ | SEO-optimized
  [ ] Kalit so'zlar kiritish (optional): comma-separated
  [ ] Natija: 2 ta card (UZ va RU) yon-yonma (lg:) yoki ustma-ust (mobile)
  [ ] Har bir card: "Nusxalash" tugmasi + "Qayta yozish" tugmasi
  [ ] Character counter: "324/1000 belgi"
  [ ] History: oxirgi 5 ta yaratilgan description (localStorage)
```

### FEATURE 13 — Review Sentiment Analysis UI ✅ DONE
```
API: GET /api/v1/products/:id/sentiment

Fayllar:
  [ ] apps/web/src/components/product/SentimentChart.tsx
  [ ] apps/web/src/components/product/SentimentKeywords.tsx

ProductPage da qo'shish: "Reviewlar tahlili" tab

SentimentChart.tsx:
  Recharts PieChart:
    Ijobiy: success rang
    Salbiy: error rang
    Neytral: base-300 rang
  O'rtada: umumiy sentiment score
  Props: { positive: number; negative: number; neutral: number }

SentimentKeywords.tsx:
  2 ustun:
    ✅ Kuchli tomonlar: ["sifatli", "tez yetkazish", "arzon"] — badge badge-success badge-outline
    ❌ Zaif tomonlar: ["qadoq yomon", "rangi boshqa"] — badge badge-error badge-outline
  Props: { strengths: string[]; weaknesses: string[] }
```

### FEATURE 14 — White-label UI (Admin tomoni) ❌ TODO
```
Fayllar:
  [ ] apps/web/src/pages/admin/WhiteLabelTab.tsx (AdminPage ichida)

AdminPage da yangi tab: "White Label"
  Tarkib:
    - Kompaniya nomi input
    - Logo upload (image preview)
    - Primary rang tanlash (color picker yoki preset rang lar)
    - Custom domain input
    - Preview: mini dashboard mockup yangi ranglar bilan
    - "Saqlash" tugmasi
  Faqat SUPER_ADMIN ko'radi
```

### FEATURE 15 — Konsultatsiya Marketplace UI (MAVJUD — yaxshilash) ✅ DONE
```
Fayl: apps/web/src/pages/ConsultationPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] Konsultant profil kartasi:
      Avatar, ism, mutaxassislik, rating (yulduzlar), narx (so'm/soat)
      "Bog'lanish" tugmasi → booking modal
  [ ] Booking modal:
      Sana tanlash (DaisyUI calendar yoki oddiy input type="date")
      Vaqt tanlash
      Mavzu yozish
      "Bron qilish" → POST /consultations
  [ ] "Mening konsultatsiyalarim" tab:
      Status: PENDING → sariq, CONFIRMED → ko'k, COMPLETED → yashil
      Rate tugmasi (COMPLETED bo'lganda): 1-5 yulduz + review text
```

### FEATURE 16 — PWA (Progressive Web App) ✅ DONE
```
Fayllar:
  [ ] apps/web/public/manifest.json
  [ ] apps/web/public/sw.js — yangilash (mavjud ventra-v2 → yaxshilash)
  [ ] apps/web/public/icon-192.png
  [ ] apps/web/public/icon-512.png
  [ ] apps/web/public/offline.html

manifest.json:
  {
    "name": "VENTRA — Analytics Platform",
    "short_name": "VENTRA",
    "description": "Uzum marketplace trend analitikasi",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0B0F1A",
    "theme_color": "#4C7DFF",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }

sw.js yaxshilash:
  - Static assets caching (JS, CSS, fonts)
  - API requests: network-first (cache fallback faqat offline da)
  - Offline page: /offline.html
  - Background sync: pending actions queue
  
offline.html:
  VENTRA logo + "Internet aloqasi yo'q" xabar
  "Qayta urinish" tugmasi → location.reload()
```

### FEATURE 17 — WebSocket Real-time UI ✅ DONE
```
Fayllar:
  [ ] apps/web/src/hooks/useRealtime.ts (MAVJUD — yaxshilash)
  [ ] apps/web/src/components/ui/Toast.tsx
  [ ] apps/web/src/hooks/useToast.ts

useRealtime.ts yaxshilash:
  JWT token → socket.io auth
  Rooms: account:{accountId}
  Events:
    score_update    → DashboardPage dagi score ni yangilash (re-render)
    discovery_done  → DiscoveryPage polling to'xtatish + success toast
    alert_triggered → Toast notification (warning)
    balance_low     → Dashboard da warning banner ko'rsatish

Toast.tsx:
  DaisyUI toast + alert
  Auto-dismiss: 4 sekund
  Types: success (alert-success) | warning (alert-warning) | error (alert-error) | info (alert-info)
  Stack: bir vaqtda max 3 ta (bottom-right)
  Animatsiya: slide-in, fade-out
  Props: { message: string; type: ToastType; duration?: number }

useToast.ts:
  Hook: { showToast, toasts }
  Context: ToastProvider (App.tsx da o'rash)
  Queue boshqaruv: 3 dan ortiq bo'lsa eng eskisini olib tashlash
```

### FEATURE 18 — Multi-language i18n (MAVJUD — to'ldirish) ✅ DONE
```
Fayl: apps/web/src/i18n/translations.ts (mavjud)

Qo'shimcha kerak:
  [ ] Barcha sahifalar uchun tarjima kalitlari to'ldirish
  [ ] Settings/Profile sahifasida til tanlash:
      3 ta tugma: 🇺🇿 O'zbek | 🇷🇺 Русский | 🇬🇧 English
      Active: btn-primary, boshqa: btn-ghost
      localStorage: 'ventra_lang'
  [ ] Sana formatlash: uz → "26-fevral", ru → "26 февраля", en → "Feb 26"
  [ ] Son formatlash: uz → "46 990 so'm", ru → "46 990 сум"
  [ ] Hali tarjima qilinmagan sahifalar:
      - SeasonalCalendarPage
      - NichePage
      - ShopDetailPage
      - ExtensionPage
      - ProfitCalculatorPage (to'liq)
```

### FEATURE 19 — Demand-Supply Gap UI ✅ DONE
```
API: GET /api/v1/discovery/gaps

Fayllar:
  [ ] apps/web/src/pages/GapsPage.tsx
  [ ] apps/web/src/components/gap/GapScoreCard.tsx

Route: /discovery/gaps (App.tsx ga qo'shish)
DiscoveryPage dan link: "Gap Topuvchi" tugmasi

GapsPage.tsx:
  Header: "Bozor Imkoniyatlari" + tavsif
  Filter: kategoriya select + minimum gap_score slider
  Kartalar grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
  Sort: gap_score bo'yicha (yuqoridan)

GapScoreCard.tsx:
  Interface:
    interface GapData {
      readonly category_name: string;
      readonly gap_score: number;       // 0.0 - 1.0
      readonly avg_weekly_demand: number;
      readonly seller_count: number;
      readonly growth_rate: number;
    }
  Rang:
    gap_score > 0.7 → border-success bg-success/5 → "Bozor bo'sh!"
    gap_score 0.4-0.7 → border-warning bg-warning/5 → "O'rtacha imkoniyat"
    gap_score < 0.4 → border-base-300 → "To'yingan"
  Ko'rsatuvchilar:
    Talab: "Haftalik o'rtacha 340 ta sotuv"
    Taklif: "Atigi 8 ta sotuvchi"
  "Discovery boshlash" tugmasi → GET /api/v1/discovery/run?category_id=...
  Props: { data: GapData; onDiscovery: () => void }

DashboardPage widget:
  [ ] Pastki qismda: "Yangi imkoniyatlar (3)" 
      Top-3 gap ni mini card sifatida ko'rsatish
      "Barchasini ko'rish" → /discovery/gaps
```

### FEATURE 20 — Price Elasticity Calculator UI (MAVJUD — yaxshilash) ✅ DONE
```
Fayl: apps/web/src/pages/ElasticityPage.tsx (mavjud)

Yaxshilash kerak:
  [ ] ProductPage da "Narx elastikligi" tab qo'shish

  [ ] ElasticityChart.tsx:
      Recharts ScatterChart
      X-o'q: narx (so'm)
      Y-o'q: weekly_bought
      Har bir nuqta: bitta snapshot (tooltip da sana)
      Regression chiziq: to'q primary rang
      Optimal narx nuqtasi: yashil vertikal dashed chiziq
      
  [ ] Tavsiya bloki:
      "Narxni 5% oshirsangiz → sotuv 12% kamayadi"
      "Optimal narx: 45,000-48,000 so'm"
      Elastik/Inelatik badge:
        ELASTIC → badge-warning: "Narxga sezgir"
        INELASTIC → badge-info: "Narxga chidamli"
      
  [ ] Slider: "Narxni simulyatsiya qiling" 
      ±30% range slider → real-time revenue prediction
```

---

## 🟢 v3.0 FEATURES (21-30) — FRONTEND (Signals sahifasida) — 10/10 DONE ✅

> Barchasi SignalsPage.tsx tab lari ichida amalga oshiriladi

---

### FEATURE 21 — Cannibalization Alert UI ✅ DONE
```
Tab: 'cannibalization' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/CannibalizationCard.tsx

CannibalizationCard.tsx:
  Interface:
    interface CannibalizationAlert {
      readonly product_a_id: string;
      readonly product_a_title: string;
      readonly product_b_id: string;
      readonly product_b_title: string;
      readonly correlation: number;      // 0.0 - 1.0
      readonly impact: 'HIGH' | 'MEDIUM' | 'LOW';
    }
  Ko'rsatish:
    2 ta mini-card (A va B mahsulotlar) yon-yonma
    O'rtada: "🔀 Correlation: 87%"
    Impact badge: HIGH → error, MEDIUM → warning, LOW → info
    "AI Tavsiya" tugmasi → Claude dan differensiatsiya tavsiyasi
    "Dismiss" tugmasi → PATCH status → DISMISSED
  Props: { alert: CannibalizationAlert; onDismiss: () => void }
```

### FEATURE 22 — Dead Stock Predictor UI ✅ DONE
```
Tab: 'dead-stock' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/DeadStockCard.tsx

DeadStockCard.tsx:
  Risk darajalari:
    HIGH   → 🔴 alert alert-error: "Stok qolib ketish xavfi!"
    MEDIUM → 🟡 alert alert-warning: "Diqqat — sotuv tezligi sekinlashmoqda"
    LOW    → 🟢 oddiy card
  Ko'rsatuvchilar:
    Risk score: 0-100 (progress bar, rangli)
    Sotuv trendi: oxirgi 3 hafta mini sparkline
    Narx o'zgarishi: 14 kunlik %
    Tavsiyalar ro'yxati (array dan)
  ProductPage da ham: "Stok xavfi" banner (agar HIGH bo'lsa)
  Props: { risk: DeadStockAnalysis }
```

### FEATURE 23 — Category Saturation Index UI ✅ DONE
```
Tab: 'saturation' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/SaturationGauge.tsx
  [ ] apps/web/src/components/signals/MarketSharePie.tsx

SaturationGauge.tsx:
  SVG gauge yoki Recharts RadialBarChart
  0-100 (yashil = ochiq bozor, qizil = to'yingan)
  HHI ko'rsatish: "HHI: 1,250 — Raqobatli bozor"
  Interpretatsiya:
    < 1500 → "Raqobatli (kirish oson)" yashil
    1500-2500 → "O'rtacha to'yingan" sariq
    > 2500 → "Monopollashgan (kirish qiyin)" qizil
  Props: { saturationScore: number; hhi: number }

MarketSharePie.tsx:
  Recharts PieChart: top-5 shop bozor ulushi
  Legend: shop nomi + %
  Tooltip: buyurtmalar soni
  Props: { shops: { name: string; share: number }[] }

Kategoriya tanlash: Select dropdown → API chaqirish
```

### FEATURE 24 — Flash Sale Detector UI ✅ DONE
```
Tab: 'flash-sales' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/FlashSaleCard.tsx

FlashSaleCard.tsx:
  ⚡ "Flash Sale aniqlandi!"
  Mahsulot nomi + rasm (kichik)
  Narx o'zgarishi: "46,990 → 23,495 so'm (-50%)" 
  Oldingi narx: line-through text-base-content/50
  Yangi narx: text-error font-bold text-xl
  Aniqlangan vaqt: "2 soat oldin"
  Turi badge: FLASH_SALE | DISCOUNT | CLEARANCE
  "Mahsulotni ko'rish" tugmasi → ProductPage
  Props: { flashSale: FlashSaleEvent }
```

### FEATURE 25 — New Product Early Signal UI ✅ DONE
```
Tab: 'early-signals' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/EarlySignalCard.tsx

EarlySignalCard.tsx:
  🌱 "Yangi trending mahsulot!"
  Mahsulot nomi
  Ko'rsatuvchilar:
    Feedback: "24 ta review (yangi)"
    O'sish: "+85% haftalik" (text-success)
    Score: 4.2
    Velocity: "kuniga 12 ta sotuv"
  "Kuzatuvga olish" tugmasi → POST /products/:id/track
  Props: { signal: EarlySignalData }
```

### FEATURE 26 — Stock Cliff Alert UI ✅ DONE
```
Tab: 'stock-cliffs' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/StockCliffCard.tsx

StockCliffCard.tsx:
  📦 "Raqib stokdan chiqmoqda!"
  Raqib mahsuloti: nomi + stok qoldi %
  Progress bar: to'liq → bo'sh (qizil gradient)
  "Siz taklif qilishingiz mumkin" highlight:
    Agar bizning o'xshash mahsulotimiz tracked bo'lsa → yashil banner
  Props: { cliff: StockCliffAlert }
```

### FEATURE 27 — Ranking Position Tracker UI ✅ DONE
```
Tab: 'ranking' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/RankingChart.tsx

ProductPage da "Pozitsiya" tab:
  RankingChart.tsx:
    Recharts AreaChart
    X-o'q: sana (oxirgi 30 kun)
    Y-o'q: pozitsiya (TESKARI: 1 = yuqori, Y-o'q reversed)
    Fill: primary/10
    Line: primary
    Tooltip: "12-fevral: #5 o'rin"
    Props: { data: { date: string; rank: number }[] }

DashboardPage da mini-widget:
  [ ] "Pozitsiya o'zgarishlari" card:
      "📈 3 pozitsiya ko'tarildi!" → text-success
      "📉 5 pozitsiya tushdi!" → text-error
      Faqat top-3 o'zgarish ko'rsatish
```

### FEATURE 28 — Product Launch Checklist UI ✅ DONE
```
Tab: 'checklist' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/ChecklistView.tsx
  [ ] apps/web/src/components/signals/ChecklistItem.tsx

ChecklistView.tsx:
  Mahsulot tanlash: select dropdown (tracked products dan)
  Progress bar: "6 dan 4 tasi tayyor" → animated CSS transition
  Rang: 
    100% → bg-success
    50-99% → bg-warning
    < 50% → bg-error

ChecklistItem.tsx:
  Har bir item:
    Icon (✓ yashil / ✗ qizil / ⚠ sariq)
    Title: "Kamida 5 ta rasm"
    Status: PASS | FAIL | WARNING
    Tavsiya: "3 ta rasm qo'shing"
  Props: { item: ChecklistItemData }

"Hisobot saqlash" tugmasi → PDF download (API orqali)
```

### FEATURE 29 — A/B Price Testing UI ✅ DONE
```
Tab: 'price-test' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/PriceTestForm.tsx
  [ ] apps/web/src/components/signals/PriceTestResults.tsx

PriceTestForm.tsx:
  Mahsulot tanlash: select dropdown
  Variant A narxi: input (so'm)
  Variant B narxi: input (so'm)
  Test davomiyligi: 7 | 14 | 30 kun (radio)
  "Test boshlash" tugmasi → POST /signals/price-tests

PriceTestResults.tsx:
  Mavjud testlar ro'yxati
  Har bir test: 2 ustunli taqqoslama card
    | Variant A | Variant B |
    | 46,990 so'm | 42,990 so'm |
    | 120 sotuv | 145 sotuv |
    | Revenue: X | Revenue: Y |
  StatisticalSignificanceBadge:
    p < 0.05 → badge-success: "✓ Statistik ahamiyatli"
    p ≥ 0.05 → badge-warning: "⚠ Ko'proq ma'lumot kerak"
  Winner: yashil border bilan ajratiladi
  Props: { test: PriceTestData }
```

### FEATURE 30 — Replenishment Planner UI ✅ DONE
```
Tab: 'replenishment' (SignalsPage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/signals/DaysRemainingCounter.tsx
  [ ] apps/web/src/components/signals/ReplenishmentTable.tsx

DaysRemainingCounter.tsx:
  Katta raqam: "14 kun" (text-4xl font-bold)
  Progress bar:
    > 30 kun → bg-success
    14-30 kun → bg-warning
    < 14 kun → bg-error
  "Buyurtma berish sanasi: 1-mart"
  Props: { daysRemaining: number; reorderDate: string }

ReplenishmentTable.tsx:
  Jadval: Mahsulot | Qoldiq | Kunlik sotuv | Qolgan kunlar | Status
  Status: CRITICAL (qizil), HIGH (sariq), LOW (yashil)
  Sort: eng kam qolgan birinchi

ProductPage da: "Stok rejalashtirish" bloki (agar tracked bo'lsa)
DashboardPage widget: "Stok eslatmalar" — days_remaining < 14 bo'lganlar
```

---

## 🟢 v4.0 FEATURES (31-43) — FRONTEND (Enterprise sahifasida) — 8/10 DONE

> Barchasi EnterprisePage.tsx tab lari ichida amalga oshiriladi

---

### FEATURE 31 — Uzum Ads ROI Tracker UI ✅ DONE
```
Tab: 'ads' (EnterprisePage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/enterprise/CampaignCard.tsx
  [ ] apps/web/src/components/enterprise/CampaignForm.tsx
  [ ] apps/web/src/components/enterprise/RoiChart.tsx

CampaignCard.tsx:
  Campaign nomi + mahsulot + kunlik byudjet
  ROAS ko'rsatuvchi: katta raqam
    ROAS > 3x → text-success: "Foydali"
    ROAS 1-3x → text-warning: "Breakeven"
    ROAS < 1x → text-error: "Zarar"
  Mini trend chart: kunlik ROAS sparkline
  "Batafsil" / "Tahrirlash" / "O'chirish" tugmalari

CampaignForm.tsx (modal):
  Campaign nomi: input
  Mahsulot tanlash: select (tracked products)
  Kunlik byudjet: input (so'm)
  Boshlanish sanasi: date input
  "Yaratish" → POST /ads/campaigns

RoiChart.tsx:
  Recharts ComposedChart:
    BarChart: kunlik xarajat (qizil)
    LineChart: kunlik daromad (yashil)
    AreaChart: kumulyativ ROI
  Props: { dailyData: AdsDailyData[] }
```

### FEATURE 33 — Team Collaboration UI ✅ DONE
```
Tab: 'team' (EnterprisePage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/enterprise/TeamMembersList.tsx
  [ ] apps/web/src/components/enterprise/InviteModal.tsx

TeamMembersList.tsx:
  Jadval: Avatar | Email | Rol | Status | Amallar
  Rollar: OWNER (qizil badge), ADMIN (ko'k), ANALYST (yashil), VIEWER (kulrang)
  Amallar: Rolni o'zgartirish dropdown, Olib tashlash tugmasi
  Props: { members: TeamMember[] }

InviteModal.tsx:
  Email input
  Rol tanlash: select (ADMIN | ANALYST | VIEWER)
  "Taklif yuborish" → POST /team/invite
  Pending invites ro'yxati: email + status + "Bekor qilish" tugmasi
```

### FEATURE 34 — Custom Report Builder UI ✅ DONE
```
Tab: 'reports' (EnterprisePage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/enterprise/ReportBuilder.tsx
  [ ] apps/web/src/components/enterprise/ReportList.tsx

ReportBuilder.tsx (modal yoki alohida sahifa):
  Report nomi: input
  Report turi: select (SALES | COMPETITOR | MARKET | CUSTOM)
  Ustunlar tanlash: checkbox list (product_title, price, score, weekly_bought, etc.)
  Filterlar: kategoriya, sana oralig'i, minimum score
  Jadval: select (monthly | weekly | daily)
  "Preview" tugmasi → jadval ko'rsatish
  "PDF yuklab olish" → GET /reports/:id/generate

ReportList.tsx:
  Mavjud hisobotlar jadval
  Har biri: nomi, turi, oxirgi generate sana, amallar
  "Generate" tugmasi
  "O'chirish" tugmasi (confirm modal)
```

### FEATURE 35 — Market Share PDF UI ✅ DONE
```
Reports tab ichida → "Bozor ulushi" sub-section

Fayllar:
  [ ] apps/web/src/components/enterprise/MarketShareReport.tsx

MarketShareReport.tsx:
  Kategoriya tanlash: select dropdown
  "PDF yaratish" tugmasi → GET /reports/market-share?category_id=...
  PDF preview (iframe yoki yangi tab)
  Blob download
```

### FEATURE 36 — Watchlist Sharing UI ✅ DONE
```
Tab: 'watchlist' (EnterprisePage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/enterprise/WatchlistCard.tsx
  [ ] apps/web/src/components/enterprise/WatchlistShareModal.tsx

WatchlistCard.tsx:
  Watchlist nomi + mahsulotlar soni
  Mini mahsulotlar ro'yxati (birinchi 3 ta)
  "Ulashish" tugmasi → share modal
  "O'chirish" tugmasi

WatchlistShareModal.tsx:
  Public link generate: POST /watchlists/:id/share → token
  Link copy tugmasi: "https://ventra.uz/shared/watchlist/TOKEN"
  QR code (optional)
  "Link olib tashlash" tugmasi

Public watchlist sahifa (auth kerak emas):
  [ ] apps/web/src/pages/SharedWatchlistPage.tsx
  Route: /shared/watchlist/:token
  Blur effekti: score va ba'zi ma'lumotlar blurred
  CTA: "To'liq ma'lumot uchun ro'yxatdan o'ting" → /register
```

### FEATURE 38 — Collective Intelligence UI ✅ DONE
```
Tab: 'community' (EnterprisePage da — MAVJUD tab, content yaxshilash)

Fayllar:
  [ ] apps/web/src/components/enterprise/InsightCard.tsx
  [ ] apps/web/src/components/enterprise/InsightForm.tsx

InsightCard.tsx:
  Muallif avatar + nomi
  Insight title + content (2 qator max, "Ko'proq" link)
  Kategoriya badge
  Vote: 👍/👎 tugmalar + overall score
  Sana
  Props: { insight: CommunityInsight }

InsightForm.tsx (modal):
  Title: input
  Content: textarea
  Kategoriya: select
  "Yuborish" → POST /community/insights

Filtering: kategoriya filter + sort (top/new)
"127 sotuvchi kuzatyapti" social proof counters
```

### FEATURE 40 — Xitoy/Yevropa Narx Taqqoslash UI (SourcingPage da) ✅ DONE
```
Fayl: apps/web/src/pages/SourcingPage.tsx (MAVJUD — yaxshilash)

Qo'shimchalar:
  [ ] Sourcing natija kartasida: "🇨🇳 Xitoy" va "🇩🇪 Yevropa" tab/filter
  [ ] Taqqoslash jadvali:
      | Ko'rsatuvchi | 🇨🇳 1688.com | 🌍 Amazon.de |
      | Narx (dona) | $0.85 | €2.10 |
      | MOQ | 50 ta | 1 ta |
      | Yetkazish | 18 kun | 14 kun |
      | Gross margin | 69.7% ✅ | -20.2% ❌ |
      
  [ ] Eng yaxshi variant highlight: yashil border + "💡 Tavsiya" badge
  [ ] "Kalkulator ochish" tugmasi → ProfitCalculatorPage (pre-filled)
```

### FEATURE 41 — Cargo Calculator UI ✅ DONE
```
API: POST /api/v1/sourcing/compare, GET /api/v1/cargo/providers

Fayllar:
  [ ] apps/web/src/pages/CargoCalculatorPage.tsx
  [ ] apps/web/src/components/sourcing/CargoBreakdownCard.tsx
  [ ] apps/web/src/components/sourcing/ProviderComparisonTable.tsx

Route: /tools/cargo-calculator (App.tsx ga qo'shish)
Sidebar: "Asboblar" guruhida

CargoCalculatorPage.tsx:
  Input panel:
    Mahsulot tanlash (yoki manual input)
    Manba: Xitoy | Yevropa (toggle)
    Xarid narxi ($): input
    Og'irligi (kg): input
    O'lchamlar (sm): 3 ta input (L x W x H)
    Buyurtma miqdori: input
    Uzum da sotish narxi (so'm): input
  
  Natija panel:
    CargoBreakdownCard — provider bo'yicha
    ProviderComparisonTable — barcha providerlar

CargoBreakdownCard.tsx:
  Provider nomi + transit kunlari
  Xarajatlar breakdown:
    Mahsulot: $X
    Kargo: $X
    Bojxona (10%): $X
    QQS (12%): $X
    JAMI tannarx: $X (katta raqam)
  Gross margin: % + rang (yashil/qizil)
  ROI: %
  Verdict badge: HIGHLY_PROFITABLE | PROFITABLE | BORDERLINE | NOT_PROFITABLE
  Props: { breakdown: CargoBreakdown }

ProviderComparisonTable.tsx:
  Jadval: Provider | Narx/kg | Transit | Tannarx | Margin | Verdict
  Eng yaxshi variant: yashil row highlight
  Sort: margin bo'yicha
```

---

## 🔵 LAYOUT / SIDEBAR O'ZGARISHLAR

### Sidebar yangilash (Layout.tsx) ✅ DONE
```
Fayl: apps/web/src/components/Layout.tsx

Yangi guruhlar:

=== ASOSIY ===
  Dashboard         📊    /
  URL Tahlil        🔍    /analyze
  Discovery         📈    /discovery
  Sourcing          🌍    /sourcing

=== MAHSULOT ===
  Do'konlar         🏪    /shops
  Signallar         🔔    /signals
  Leaderboard       🏆    /leaderboard

=== ASBOBLAR ===
  Kalkulyator       🧮    /calculator
  Cargo Kalkulyator 📦    /tools/cargo-calculator   ← YANGI
  Elastiklik        📉    /elasticity
  AI Tavsif         ✨    /ai-description
  Konsultatsiya     💬    /consultation
  Sezonal Kalendar  📅    /tools/seasonal-calendar  ← YANGI
  Extension         🔌    /extension                ← YANGI

=== BIZNES ===
  Enterprise        🏢    /enterprise
  Referal           👥    /referral
  API Kalitlar      🔑    /api-keys
  Feedback          📝    /feedback                 ← YANGI

=== ADMIN ===  (faqat SUPER_ADMIN)
  Admin Panel       🛡️    /admin

Guruh nomlari: text-[10px] uppercase tracking-wider font-bold text-base-content/40
Yangi linklar orasida: divider (border-t border-base-300/30)
```

### Notification Bell (Layout.tsx navbar da) ✅ DONE
```
Fayllar:
  [ ] apps/web/src/components/ui/NotificationBell.tsx
  [ ] apps/web/src/hooks/useNotifications.ts

NotificationBell.tsx:
  Navbar o'ng tomonida (profil oldida)
  Bell icon + badge (o'qilmagan soni, qizil nuqta)
  Click → dropdown: oxirgi 5 ta notification
  Har bir notification: icon + message + vaqt
  "Barchasini ko'rish" link
  "Barchasini o'qilgan deb belgilash" tugmasi
  Props: { }

useNotifications.ts:
  Hook: { notifications, unreadCount, markAsRead, markAllAsRead }
  Polling: 30 sekunda interval (GET /notifications/my)
  WebSocket orqali ham yangilanishi mumkin
```

### App.tsx yangi route lar ✅ DONE (asosiy route lar)
```
Fayl: apps/web/src/App.tsx

Qo'shilishi kerak:
  [ ] /tools/seasonal-calendar → SeasonalCalendarPage
  [ ] /tools/cargo-calculator → CargoCalculatorPage
  [ ] /tools/launch-checklist → LaunchChecklistPage
  [ ] /discovery/niches → NichePage
  [ ] /discovery/gaps → GapsPage
  [ ] /shops/:shopId → ShopDetailPage
  [ ] /extension → ExtensionPage
  [ ] /feedback → FeedbackPage
  [ ] /shared/watchlist/:token → SharedWatchlistPage (public, auth kerak emas)
```

---

## 🟣 YANGI SAHIFALAR (hali yaratilmagan)

| # | Sahifa | Route | Prioritet | Status |
|---|--------|-------|-----------|--------|
| 1 | FeedbackPage.tsx | /feedback | YUQORI | ✅ DONE |
| 2 | SeasonalCalendarPage.tsx | /tools/seasonal-calendar | O'RTA | ✅ DONE (DiscoveryPage ichida) |
| 3 | NichePage.tsx | /discovery/niches | YUQORI | ✅ DONE (DiscoveryPage ichida) |
| 4 | GapsPage.tsx | /discovery/gaps | O'RTA | ✅ DONE (DiscoveryPage ichida) |
| 5 | ShopDetailPage.tsx | /shops/:shopId | YUQORI | ✅ DONE (ShopsPage) |
| 6 | CargoCalculatorPage.tsx | /tools/cargo-calculator | O'RTA | ✅ DONE (SourcingPage ichida) |
| 7 | ExtensionPage.tsx | /extension | PAST | ❌ TODO |
| 8 | SharedWatchlistPage.tsx | /shared/watchlist/:token | PAST | ❌ TODO |

---

## 🟣 FeedbackPage.tsx — TO'LIQ SPEC ✅ DONE

```
Fayl: apps/web/src/pages/FeedbackPage.tsx
Route: /feedback
API: POST /feedback, GET /feedback/my, GET /feedback/:id, POST /feedback/:id/messages

Sahifa tarkibi:
  1. Header: "Fikr-mulohaza" + "Yangi ticket" tugmasi
  
  2. Ticket yaratish modal:
     Mavzu: input (max 200 belgi)
     Turi: select — BUG | FEATURE | QUESTION | OTHER
     Prioritet: select — LOW | MEDIUM | HIGH
     Xabar: textarea
     "Yuborish" tugmasi
  
  3. Mening ticketlarim jadvali:
     Ustunlar: # | Mavzu | Tur | Prioritet | Status | Sana
     Status badge ranglari:
       OPEN → badge-info
       IN_PROGRESS → badge-warning
       RESOLVED → badge-success
       CLOSED → badge-neutral
     Click → ticket detail
  
  4. Ticket detail (modal yoki alohida sahifa):
     Chat ko'rinishi: xabarlar ro'yxati
     Foydalanuvchi xabarlari: o'ng tomonda (chat-end)
     Admin xabarlari: chap tomonda (chat-start) + "Admin" badge
     Pastda: yangi xabar textarea + "Yuborish" tugmasi
     Status ko'rsatish (yuqorida)

API client qo'shimchalar (client.ts da):
  feedbackApi = {
    create: (data: { subject: string; type: string; priority: string; message: string }) =>
      api.post('/feedback', data),
    myTickets: () => api.get('/feedback/my'),
    getTicket: (id: string) => api.get(`/feedback/${id}`),
    sendMessage: (id: string, content: string) =>
      api.post(`/feedback/${id}/messages`, { content }),
  }
```

---

## 📊 PRIORITET TARTIBI (ISHNI SHU TARTIBDA BOSHLASH)

```
BIRINCHI:
  1. Sprint 0: S-0.1 (nginx), S-0.2 (Dockerfile), S-0.3 (Dashboard), S-0.4 (Skeletons)
  2. Layout.tsx sidebar yangilash (5 guruh)
  3. App.tsx yangi route lar
  4. FeedbackPage.tsx
  5. NotificationBell.tsx

IKKINCHI (v1.0):
  6. Feature 04: NichePage + NicheScoreCard
  7. Feature 03: ShopDetailPage + TrustScoreGauge
  8. Feature 01: CompetitorPriceTable + PriceComparisonChart
  9. Feature 02: SeasonalCalendarPage + HeatmapGrid
  10. Feature 09: ProfitCalculator yaxshilash
  11. Feature 05: ExportButton + ImportModal
  12. Feature 08: Leaderboard yaxshilash (SEO + blur)
  13. Feature 06: Referral yaxshilash
  14. Feature 07: API Keys yaxshilash
  15. Feature 10: ExtensionPage

UCHINCHI (v2.0):
  16. Feature 11: PredictionChart
  17. Feature 17: Toast system + WebSocket yaxshilash
  18. Feature 13: SentimentChart
  19. Feature 19: GapsPage
  20. Feature 20: Elasticity yaxshilash
  21. Feature 18: I18n to'ldirish
  22. Feature 12: AI Description yaxshilash
  23. Feature 15: Konsultatsiya yaxshilash
  24. Feature 16: PWA manifest + icons
  25. Feature 14: White-label admin tab

TO'RTINCHI (v3.0 — SignalsPage yaxshilash):
  26-35. Features 21-30 komponentlari (CannibalizationCard → ReplenishmentTable)

BESHINCHI (v4.0 — EnterprisePage yaxshilash):
  36. Feature 31: CampaignCard + RoiChart
  37. Feature 33: TeamMembersList + InviteModal
  38. Feature 34: ReportBuilder
  39. Feature 36: WatchlistCard + ShareModal
  40. Feature 38: InsightCard + InsightForm
  41. Feature 41: CargoCalculatorPage
  42. Feature 40: Sourcing taqqoslash jadval
  43. Feature 35: MarketShareReport
```

---

## 🛠️ TEXNIK QARZLAR (technical debt)

```
[ ] Barcha sahifalarda Skeleton komponentlari qo'llash (loading=true)
[ ] Error boundary: React ErrorBoundary wrapper
[ ] React.lazy + Suspense: sahifalar lazy loading (bundle size kamaytirish)
[x] Axios interceptor: 401 → auto redirect /login ✅ DONE
[x] Axios interceptor: 402 → PAYMENT_DUE banner ko'rsatish ✅ DONE
[ ] useDebounce hook: search input larga qo'llash
[ ] Accessibility: barcha interactive elementlarda aria-label
[ ] Accessibility: keyboard navigation (Tab, Enter, Escape)
[ ] Performance: React.memo() katta jadvallar va chartlar uchun
[ ] Performance: useMemo/useCallback kerakli joylarda
[ ] Mobile UX: barcha sahifalarda touch-friendly tugmalar (min 44x44px)
[ ] Testing: Playwright test larni yangi sahifalar uchun qo'shish
[ ] Storybook (optional): UI komponentlar uchun
```

---

*FRONTEND_TODO.md | VENTRA Analytics Platform | 2026-02-26*
*Claude CLI uchun: `cat FRONTEND_TODO.md | claude "Sprint 0 dan boshla"`*
