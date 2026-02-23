# CLAUDE_SARDOR.md — SARDOR UCHUN
# React 19 · TypeScript · Tailwind · DaisyUI v5 · Recharts · React Router v7
# Claude CLI bu faylni Sardor ekanligi aniqlanganidan keyin o'qiydi

---

## 👋 SALOM SARDOR!

Sen bu loyihada **Frontend Engineer** sifatida ishlaysan.
Sening zonang: `apps/web/src/` to'liq — pages, components, hooks, api

Backend (`apps/api/`, `apps/worker/`) — Bekzodniki. U yerga teginma.

---

## 🏗️ CLEAN CODE STANDARTLARI (MAJBURIY)

### 1. Komponent Arxitekturasi

```typescript
// ✅ TO'G'RI — har bir komponent o'z papkasida (agar murakkab bo'lsa)
apps/web/src/
  pages/
    SourcingPage/
      index.tsx               // eksport qilinadi: export { SourcingPage }
      SourcingResultCard.tsx  // faqat shu page'da ishlatilsa — ichida
      useSourcingPolling.ts   // page-specific hook — ichida
  components/
    sourcing/
      PlatformBadge.tsx       // ko'p joyda ishlatilsa — components ga
      CargoBreakdownCard.tsx
  hooks/
    useRealtime.ts            // global hooks
    useDebounce.ts

// ❌ NOTO'G'RI — 400+ qator bir faylda
// SourcingPage.tsx ichida 3 ta component + 2 ta hook = NOTO'G'RI
```

### 2. TypeScript — Interface MAJBURIY, `any` YO'Q

```typescript
// ❌ NOTO'G'RI
function ResultCard({ data }: { data: any }) {
  return <div>{data.title}</div>;
}

// ✅ TO'G'RI
interface SourcingResult {
  readonly rank: number;
  readonly platform: PlatformCode;
  readonly title: string;
  readonly price_usd: number;
  readonly ai_match_score: number;   // 0.0 - 1.0
  readonly landed_cost_usd: number;
  readonly margin_percent: number;
  readonly roi_percent: number;
  readonly delivery_days: number;
  readonly seller_rating: number | null;
  readonly url: string;
  readonly image_url: string | null;
}

type PlatformCode = 'alibaba' | 'taobao' | '1688' | 'aliexpress' | 'amazon_de';

function ResultCard({ result }: { result: SourcingResult }) {
  return <div>{result.title}</div>;
}
```

### 3. Custom Hook Pattern

```typescript
// ❌ NOTO'G'RI — barcha state + logic komponent ichida
export function SourcingPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  // ... 50 qator state management ...
  return <div>...</div>;
}

// ✅ TO'G'RI — logika hook'da, komponent faqat render qiladi
// hooks/useSourcingJobs.ts
export function useSourcingJobs() {
  const [jobs, setJobs] = useState<SourcingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sourcingApi.listJobs();
      setJobs(res.data);
    } catch (err: unknown) {
      const message = err instanceof AxiosError
        ? err.response?.data?.message ?? err.message
        : 'Xatolik yuz berdi';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  return { jobs, loading, error, reload: loadJobs };
}

// SourcingPage.tsx — toza, faqat render
export function SourcingPage() {
  const { jobs, loading, error, reload } = useSourcingJobs();
  if (loading) return <LoadingSpinner />;
  if (error)   return <ErrorAlert message={error} onRetry={reload} />;
  return <JobsList jobs={jobs} />;
}
```

### 4. Error Handling — Har Doim Ko'rsatiladi

```typescript
// ❌ NOTO'G'RI — error ye'tiladi
} catch (err) {
  console.error(err);
}

// ✅ TO'G'RI — foydalanuvchi ko'radi
} catch (err: unknown) {
  const message = err instanceof AxiosError
    ? (err.response?.data?.message as string) ?? 'Server xatosi'
    : 'Kutilmagan xato';
  setError(message);
  // yoki toast:
  toast.error(message);
}
```

### 5. Loading State — Har Doim Bo'lishi Kerak

```typescript
// ❌ NOTO'G'RI — loading yo'q
async function handleSubmit() {
  const result = await sourcingApi.startSearch(productId);
  setJobId(result.data.job_id);
}

// ✅ TO'G'RI — loading + disable + error
const [submitting, setSubmitting] = useState(false);

async function handleSubmit() {
  if (submitting) return; // double-click prevention
  setSubmitting(true);
  setError(null);
  try {
    const result = await sourcingApi.startSearch(productId);
    setJobId(result.data.job_id);
  } catch (err: unknown) {
    setError(extractErrorMessage(err));
  } finally {
    setSubmitting(false);
  }
}

// UI:
<button
  onClick={handleSubmit}
  disabled={submitting || !productId}
  className="btn btn-primary"
>
  {submitting
    ? <span className="loading loading-spinner loading-sm" />
    : <SearchIcon className="w-4 h-4" />
  }
  {submitting ? 'Qidirilmoqda...' : 'Qidirish'}
</button>
```

### 6. Polling Pattern — DiscoveryPage dan olish

```typescript
// hooks/usePolling.ts — UNIVERSAL polling hook
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  shouldContinue: (data: T) => boolean,
  intervalMs = 3000,
) {
  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(async () => {
    setIsPolling(true);
    const check = async () => {
      const result = await fetchFn();
      setData(result);
      if (!shouldContinue(result)) {
        stopPolling();
      }
    };
    await check();
    intervalRef.current = setInterval(check, intervalMs);
  }, [fetchFn, shouldContinue, intervalMs]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { data, isPolling, startPolling, stopPolling };
}
```

### 7. API Client — Tipli Response

```typescript
// api/client.ts — har endpoint uchun tip
import type { SourcingJob, SourcingResult } from '../types/sourcing';

export const sourcingApi = {
  startSearch: (productId: string, platforms?: PlatformCode[]) =>
    api.post<{ job_id: string; message: string }>('/sourcing/search', {
      product_id: productId,
      platforms,
    }),

  listJobs: () =>
    api.get<SourcingJob[]>('/sourcing/jobs'),

  getJob: (id: string) =>
    api.get<SourcingJobDetail>('/sourcing/jobs/' + id),

  getPlatforms: () =>
    api.get<ExternalPlatform[]>('/sourcing/platforms'),
};
```

### 8. DaisyUI v5 — To'g'ri Class'lar

```tsx
// ❌ DaisyUI v4 (eski) — ISHLAMAYDI
<div className="card-bordered">
<div className="alert-error">
<button className="btn-primary">

// ✅ DaisyUI v5 — TO'G'RI
<div className="card bg-base-200 shadow-sm">
<div role="alert" className="alert alert-error alert-soft">
<button className="btn btn-primary">

// Ranglar:
text-base-content/50    // 50% opacity
bg-base-200             // subtle background
text-success            // yashil
text-error              // qizil
text-warning            // sariq
text-primary            // asosiy rang
```

### 9. Recharts — Responsive Container MAJBURIY

```tsx
// ❌ NOTO'G'RI — fixed width
<LineChart width={600} height={300} data={data}>

// ✅ TO'G'RI — responsive
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<ResponsiveContainer width="100%" height={240}>
  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
    <XAxis
      dataKey="date"
      tickFormatter={(v) => new Date(v).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
      tick={{ fontSize: 11 }}
    />
    <YAxis tick={{ fontSize: 11 }} />
    <Tooltip
      formatter={(value: number) => [value.toFixed(2), 'Score']}
      labelFormatter={(label) => new Date(label).toLocaleDateString('uz-UZ')}
    />
    <Line
      type="monotone"
      dataKey="score"
      stroke="#570df8"
      strokeWidth={2}
      dot={false}
      activeDot={{ r: 4 }}
    />
  </LineChart>
</ResponsiveContainer>
```

### 10. Accessibility — Minimal Standart

```tsx
// Har bir interactive elementda:
<button aria-label="Mahsulotni kuzatuvga olish" onClick={handleTrack}>
  <HeartIcon className="w-4 h-4" />
</button>

// Loading holat:
<div role="status" aria-live="polite">
  {loading ? 'Yuklanmoqda...' : ''}
</div>

// Error:
<div role="alert" className="alert alert-error">
  <span>{error}</span>
</div>
```

---

## 📋 FEATURES — FRONTEND TASKLAR (v1.0 → v4.0)

---

### 🟢 BUG FIXES (Sprint 0 — BIRINCHI)

```
[ ] S-0.1: apps/web/nginx.conf yaratish
[ ] S-0.2: apps/web/Dockerfile yaratish
[ ] S-0.3: DashboardPage — PAYMENT_DUE banner yaxshilash, empty state
[ ] S-0.4: Skeleton komponenti — SkeletonCard, SkeletonTable, SkeletonStat
```

---

### 🟢 v1.0 FEATURES (01–10) — Frontend

---

#### FEATURE 01 — Competitor Price Tracker UI

**Bekzod dan API:** `GET /api/v1/competitor/products/:id/prices` tayyor bo'lganida

**Tasks:**
```
[ ] apps/web/src/pages/ProductPage.tsx ga qo'shish:
    "Raqiblar narxi" tab yoki section

[ ] apps/web/src/components/competitor/CompetitorPriceTable.tsx
    Ustunlar: # | Mahsulot | Narx | Farq | O'zgarish (7 kun)
    Rang: cheaper → yashil, expensive → qizil

[ ] apps/web/src/components/competitor/PriceComparisonChart.tsx
    Bar chart: o'zimiz vs top-5 raqib (Recharts BarChart)

[ ] api/client.ts:
    competitorApi.getPrices(productId)
    competitorApi.trackCompetitor(productId, competitorIds[])
```

---

#### FEATURE 02 — Seasonal Trend Calendar UI

**Tasks:**
```
[ ] apps/web/src/pages/SeasonalCalendarPage.tsx
    Route: /tools/seasonal-calendar

[ ] 12 oylik heatmap — DaisyUI grid + Tailwind bg-opacity
    Har hujayra: oy + event nomi + boost koeffitsienti (rangli)
    Qizil = yuqori demand, ko'k = past demand

[ ] apps/web/src/components/seasonal/HeatmapGrid.tsx
    Props: { data: MonthlyData[]; onMonthClick: (month: number) => void }

[ ] "Kelasi 30 kun" widget — DashboardPage ga qo'shish:
    Yaqinlashayotgan sezonal event → "8-mart 12 kunda"
```

---

#### FEATURE 03 — Shop Intelligence Dashboard UI

**Tasks:**
```
[ ] apps/web/src/pages/ShopPage.tsx
    Route: /shops/:shopId

[ ] TrustScoreGauge komponenti:
    apps/web/src/components/shop/TrustScoreGauge.tsx
    SVG arc gauge (0-100) — Recharts RadialBarChart yoki custom SVG

[ ] ShopGrowthChart komponenti:
    30 kunlik orders_quantity o'zgarishi → LineChart

[ ] TopProductsList:
    Shop ning top-5 mahsuloti (score bilan)

[ ] AnalyzePage da: URL yuborilganda shop link chiqarish
```

---

#### FEATURE 04 — Niche Finder UI ⭐

**Tasks:**
```
[ ] apps/web/src/pages/NichePage.tsx
    Route: /discovery/niches

[ ] NicheScoreCard komponenti:
    apps/web/src/components/niche/NicheScoreCard.tsx
    Yashil background (niche_score > 0.7)
    Ko'rsatuvchilar: demand, supply, growth, margin

[ ] NicheRadarChart:
    Recharts RadarChart — 4 o'q: demand | supply | growth | margin
    "Bozorga kirish imkoniyati" belgisi (agar 3/4 > threshold)

[ ] Filtrlash:
    Min niche_score: slider (0.5 - 1.0)
    Kategoriya filter: dropdown
```

---

#### FEATURE 05 — CSV/Excel Import-Export UI

**Tasks:**
```
[ ] apps/web/src/components/ImportExportBar.tsx
    "CSV import" tugmasi → file input (accept=".csv")
    "Excel eksport" tugmasi → blob download
    Upload progress bar (axios onUploadProgress)

[ ] apps/web/src/pages/ImportPage.tsx
    Route: /tools/import
    Drag & drop zone (DaisyUI file-input)
    Preview: import qilinayotgan URL'lar ro'yxati
    Batch progress: "23/100 tahlil qilindi"

[ ] api/client.ts:
    importApi.uploadCsv(file: File)
    importApi.getJobStatus(jobId: string)
    exportApi.downloadTrackedCsv()
    exportApi.downloadDiscoveryExcel(runId: string)
```

---

#### FEATURE 06 — Referral Tizimi UI

**Tasks:**
```
[ ] apps/web/src/pages/ReferralPage.tsx
    Route: /referral

[ ] Referal karta:
    Mening kodum: "UTF-X8K2" (katta, nusxa olish tugmasi bilan)
    Ulashish: Telegram, WhatsApp, nusxa olish
    Statistika: {total_referred: 5, active: 3, earned_days: 21}

[ ] Register page ga:
    "Referal kodi bor?" field (optional)
    "7 kun bepul" badge ko'rsatish

[ ] CopyToClipboard utility:
    apps/web/src/utils/clipboard.ts
    async function copyText(text: string): Promise<boolean>
```

---

#### FEATURE 07 — API Access UI (Dev Plan)

**Tasks:**
```
[ ] apps/web/src/pages/ApiKeysPage.tsx
    Route: /settings/api-keys

[ ] API Key karta:
    Yaratish: "Yangi kalit" modal → ism kiritish
    Ko'rsatish: FAQAT bir marta (yaratishda) + nusxa tugmasi
    Ro'yxat: prefix, nomi, so'nggi ishlatilishi, bugungi request soni
    O'chirish: confirm modal bilan

[ ] Rate limit progress:
    ProgressBar: "342 / 1000 req bugun"

[ ] API Docs link:
    "API hujjatlari" → /docs (Swagger UI)
```

---

#### FEATURE 08 — Public Leaderboard UI

**Tasks:**
```
[ ] apps/web/src/pages/PublicLeaderboardPage.tsx
    Route: /leaderboard (auth shart emas!)

[ ] SEO meta taglar:
    apps/web/src/utils/seo.ts
    function setMetaTags(title, description, ogImage)

[ ] Top-5 to'liq ko'rsatish:
    Rank badge (#1 🥇, #2 🥈, #3 🥉)
    Score, weekly_bought, kategoriya

[ ] 6-20 blur effekti:
    Tailwind: filter blur-sm pointer-events-none
    CTA overlay: "Bepul ro'yxatdan o'ting → to'liq ko'ring"

[ ] Kategoriya filter (auth shart emas):
    Select: barcha kategoriyalar
```

---

#### FEATURE 09 — Profit Calculator UI

**Tasks:**
```
[ ] apps/web/src/pages/ProfitCalculatorPage.tsx
    Route: /tools/profit-calculator

[ ] Input panel (chap):
    Sotuv narxi (so'm)
    Xarid narxi ($)
    USD/UZS kurs (auto CBU, o'zgartirilishi mumkin)
    Uzum komissiya % (5-15, slider)
    FBO xarajati (so'm, optional)
    Reklama xarajati (so'm, optional)
    Miqdor

[ ] Natija panel (o'ng):
    Sof foyda: katta yashil raqam
    Margin %: rang ko'rsatgich (<15 qizil, 15-30 sariq, >30 yashil)
    ROI %
    Breakeven miqdori

[ ] Breakeven Chart:
    Recharts AreaChart: quantity → net_profit
    X-o'q: miqdor | Y-o'q: foyda
    Breakeven nuqtasi: vertikal qizil chiziq

[ ] "Manba qo'shish" tugmasi:
    Sourcing sahifasiga o'tkazish → kalkulator avtomatik to'ldiriladi
```

---

#### FEATURE 10 — Browser Extension (Landing)

**Tasks:**
```
[ ] apps/web/src/pages/ExtensionPage.tsx
    Route: /extension
    
    Chrome Web Store havolasi
    "Qanday ishlaydi" — 3 qadamli animatsiya (CSS animation)
    Extension screenshot'lari

[ ] Quick Score Widget (ProductPage da):
    "Chrome'da ochish" tugmasi → uzum.uz/product/... ochiladi
    Extension o'rnatilgan bo'lsa → score sidebar ko'rinadi (postMessage)
```

---

### 🟢 v2.0 FEATURES (11–20) — Frontend

---

#### FEATURE 11 — Trend Prediction UI

**Tasks:**
```
[ ] apps/web/src/components/charts/ForecastChart.tsx
    → Allaqachon mavjud bo'lishi mumkin — yaxshilash kerak
    
    Tarixiy data: to'liq chiziq
    Bashorat 7 kun: nuqtali chiziq + shading (opacity 0.2)
    Trend badge: ⬆ O'syapti | ➡ Barqaror | ⬇ Tushyapti
    Confidence interval: yashil soya (80% CI)

[ ] Confidence score ko'rsatish:
    "Bashorat ishonchliligi: 78%" → progress bar
    "Kam snapshot (<10): past ishonchlilik" warning
```

---

#### FEATURE 12 — Auto Description Generator UI

**Tasks:**
```
[ ] apps/web/src/components/ai/DescriptionGeneratorModal.tsx
    
    Trigger: ProductPage da "AI tavsif" tugmasi
    Modal ichida:
      Loading: "Claude tavsif yozmoqda..." + spinner
      Natija: Ruscha tab + O'zbekcha tab (DaisyUI tabs)
      Har tab: textarea (tahrirlash mumkin) + nusxa tugmasi
      "Uzumga ko'chirish" CTA

[ ] Animatsiya: tavsif "yozilayotgandek" chiqsin
    TypeWriter effect (CSS animation yoki react-type-animation)
```

---

#### FEATURE 13 — Review Sentiment Analysis UI

**Tasks:**
```
[ ] apps/web/src/components/ai/SentimentCard.tsx
    
    Overall score: donut chart (0-1.0, yashil/qizil)
    Ijobiy tomonlar: yashil checkmark ro'yxati
    Salbiy tomonlar: qizil X ro'yxati
    "N ta review tahlil qilindi" subtitle
    
[ ] ProductPage ga qo'shish:
    "Raqib sharhlari" collapsible section
    SentimentCard + "Qo'shimcha imkoniyat sifatida ko'ring" framing
```

---

#### FEATURE 14 — White-label UI

**Tasks:**
```
[ ] apps/web/src/hooks/useBrandConfig.ts
    → GET /api/v1/brand-config → { brand_name, logo_url, primary_color }
    → CSS custom property: document.documentElement.style.setProperty('--primary', color)

[ ] apps/web/src/components/layout/BrandLogo.tsx
    → brand_config bo'lsa: custom logo, bo'lmasa: default "UTF" logo

[ ] Admin panel: White-label sozlamalari tab
    Logo upload (drag & drop)
    Rang tanlagich (input[type=color] + DaisyUI)
    Domain setting input
    Preview (iframe yoki live CSS inject)
```

---

#### FEATURE 15 — Konsultatsiya Marketplace UI

**Tasks:**
```
[ ] apps/web/src/pages/ConsultantsPage.tsx
    Route: /consultants

[ ] ConsultantCard:
    Avatar, ism, expertise, reyting (yulduzlar), soatbay narx
    "Band qilish" tugmasi → modal
    Mavjudligi: 🟢 Mavjud | 🔴 Band

[ ] BookingModal:
    Sana/vaqt tanlash (react-datepicker yoki native input[type=datetime-local])
    Davomiylik: 30 | 60 | 90 daqiqa
    Jami narx avtomatik hisoblanadi
    "To'lov" tugmasi → billing ga yo'naltirish

[ ] ConsultantProfile page:
    Route: /consultants/:id
    Barcha sessiyalar tarixi
    "Konsultant bo'lish" CTA (agar foydalanuvchi ham xohlasa)
```

---

#### FEATURE 16 — PWA

**Tasks:**
```
[ ] pnpm add -D vite-plugin-pwa

[ ] apps/web/vite.config.ts:
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Uzum Trend Finder',
        short_name: 'UTFinder',
        theme_color: '#570df8',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: /^\/api\/v1\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 300 } }
        }]
      }
    })

[ ] "O'rnatish" prompt banner:
    apps/web/src/components/InstallBanner.tsx
    beforeinstallprompt event → DaisyUI alert banner (pastki qismda)
    localStorage'da "dismissed" holati
```

---

#### FEATURE 17 — WebSocket Real-time UI

**Tasks:**
```
[ ] pnpm add socket.io-client

[ ] apps/web/src/hooks/useRealtime.ts
    JWT token → socket.io auth
    Rooms: account:{accountId}
    Events:
      score_update    → DashboardPage'dagi score'ni yangilash
      discovery_done  → DiscoveryPage polling to'xtatish + toast
      alert_triggered → Toast notification
      balance_low     → Dashboard'da warning banner

[ ] Toast system (Feature 04 da kerak):
    apps/web/src/components/ui/Toast.tsx
    + apps/web/src/hooks/useToast.ts
    Auto-dismiss: 4 sekund
    Types: success | warning | error | info
    Stack: bir vaqtda max 3 ta
```

---

#### FEATURE 18 — Multi-language (i18n)

**Tasks:**
```
[ ] pnpm add react-i18next i18next i18next-browser-languagedetector

[ ] apps/web/src/i18n/
    uz.json → { "dashboard.title": "Bosh sahifa", ... }
    ru.json → { "dashboard.title": "Главная", ... }
    en.json → { "dashboard.title": "Dashboard", ... }

[ ] apps/web/src/i18n/index.ts — konfiguratsiya
    defaultLng: 'uz', fallbackLng: 'ru'
    localStorage: 'i18n_lang'

[ ] Barcha sahifalarda:
    const { t } = useTranslation();
    <h1>{t('dashboard.title')}</h1>

[ ] Settings page'da til tanlash:
    3 ta tugma: 🇺🇿 O'zbek | 🇷🇺 Русский | 🇬🇧 English
    Active holat: bold + primary rang

[ ] Minimal kalit fayl (birinchi sprint uchun):
    nav, common actions, error messages
    Pages: dashboard, analyze, discovery, sourcing, billing
```

---

#### FEATURE 19 — Demand-Supply Gap UI

**Tasks:**
```
[ ] apps/web/src/pages/GapsPage.tsx
    Route: /discovery/gaps

[ ] GapScoreCard:
    Yashil karta (gap_score > 0.7)
    Ko'rsatuvchilar:
      Talab: "Haftalik o'rtacha 340 ta sotuv"
      Taklif: "Atigi 8 ta sotuvchi"
      Imkoniyat: "Bozor bo'sh!"

[ ] Gap'lar jadval:
    Sort: gap_score bo'yicha (yuqoridan)
    Filter: kategoriya
    "Discovery boshlash" tugmasi → to'g'ridan-to'g'ri discovery run

[ ] Dashboard widget:
    "Yangi imkoniyatlar (3)" — DashboardPage pastki qismida
```

---

#### FEATURE 20 — Price Elasticity Calculator UI

**Tasks:**
```
[ ] apps/web/src/pages/ProductPage.tsx ga qo'shish:
    "Narx elastikligi" tab

[ ] ElasticityChart:
    Recharts ScatterChart: narx (X) → weekly_bought (Y)
    Regression chiziq (to'q)
    Optimal narx nuqtasi: yashil vertikal chiziq

[ ] Tavsiya bloki:
    "Narxni 5% oshirsangiz → sotuv 12% kamayadi"
    "Optimal narx: 45,000-48,000 so'm"
```

---

### 🟢 v3.0 FEATURES (21–30) — Frontend

---

#### FEATURE 21 — Cannibalization Alert UI

```
[ ] apps/web/src/pages/AlertsPage.tsx ga qo'shish:
    "Kannibalizatsiya" tab
    
[ ] CannibalizationCard:
    "Mahsulot A va B bir-birining sotuvini kamaytiryapti"
    Ikkala mahsulot mini-karta (score, trend)
    "Differensiatsiya tavsiyasi" (Claude dan)
```

---

#### FEATURE 22 — Dead Stock Predictor UI

```
[ ] ProductPage da "Stok xavfi" bloki:
    HIGH   → 🔴 qizil banner: "Stok qolib ketish xavfi!"
    MEDIUM → 🟡 sariq: "Diqqat: sotuv sekinlashyapti"
    LOW    → yashil: "Stok holati yaxshi"
    
[ ] DashboardPage "Diqqat!" bo'limi:
    Kuzatilayotgan mahsulotlardan HIGH risk'lilar
```

---

#### FEATURE 23 — Category Saturation Index UI

```
[ ] DiscoveryPage da qo'shish:
    Kategoriya tanlanganda HHI ko'rsatish
    
[ ] SaturationMeter komponenti:
    Gauge (0-10000):
      0-1500:    💚 "Raqobatli — kirish oson"
      1500-2500: 🟡 "O'rtacha to'yingan"
      2500+:     🔴 "Monopollashgan — xavfli"
    
    HHI raqami + interpretatsiya + top-3 dominant sotuvchi
```

---

#### FEATURE 24 — Flash Sale Detector UI

```
[ ] apps/web/src/pages/FlashSalesPage.tsx
    Route: /alerts/flash-sales
    
[ ] Jadval ustunlari:
    Mahsulot | Eski narx | Yangi narx | Chegirma | Aniqlangan vaqt
    
[ ] Rang: chegirma % ga qarab (20-30% sariq, 30%+ qizil)

[ ] DashboardPage "Bugungi flash sale'lar" mini-widget
```

---

#### FEATURE 25 — Early Signal UI

```
[ ] apps/web/src/pages/EarlySignalsPage.tsx
    Route: /discovery/early-signals
    
[ ] EarlySignalCard:
    🌱 badge + "Yangi trend!"
    feedbackQuantity (oz, yangi mahsulot belgisi)
    growth_velocity: "Oxirgi 7 kunda +180%"
    Score
    
[ ] Sort: growth_velocity bo'yicha (tezroq o'sayotgan birinchi)
```

---

#### FEATURE 26 — Stock Cliff Alert UI

```
[ ] AlertsPage da "Imkoniyatlar" tab:
    "Raqibingiz stoksiz qolmoqda → Siz foyda olishingiz mumkin!"
    
[ ] StockCliffCard:
    Raqib mahsuloti + qancha stok qolgan (%)
    Bizning o'xshash mahsulotimiz bor bo'lsa → "Siz taklif qilishingiz mumkin" highlight
```

---

#### FEATURE 27 — Ranking Position Tracker UI

```
[ ] ProductPage da "Pozitsiya" tab:
    RankingChart: kun bo'yicha kategoriyada necha o'rindasiz
    Recharts AreaChart (Y-o'q teskari: 1 = yuqori)
    
[ ] DashboardPage da mini-widget:
    "📈 3 pozitsiya ko'tarildi!" (yashil) 
    "📉 5 pozitsiya tushdi!" (qizil)
```

---

#### FEATURE 28 — Product Launch Checklist UI

```
[ ] apps/web/src/pages/LaunchChecklistPage.tsx
    Route: /tools/launch-checklist

[ ] Checklist items:
    Har bir item: icon + title + status (✓/✗/⚠) + tavsiya
    Progress: "6 dan 4 tasi tayyor"
    
[ ] Animated progress bar (CSS transition)
    
[ ] "Hisobot sifatida saqlash" → PDF download
```

---

#### FEATURE 29 — A/B Price Testing UI

```
[ ] apps/web/src/pages/AbTestPage.tsx
    Route: /tools/ab-test

[ ] Test yaratish:
    Mahsulot tanlash + Variant A narxi + Variant B narxi
    Test davomiyligi: 7 | 14 | 30 kun

[ ] Natijalar ko'rsatish:
    2 ustunli taqqoslama karta
    StatisticalSignificanceBadge:
      p < 0.05 → "✓ Statistik ahamiyatli"
      p ≥ 0.05 → "⚠ Ko'proq ma'lumot kerak"
    Winner highlight (yashil border)
```

---

#### FEATURE 30 — Replenishment Planner UI

```
[ ] ProductPage da "Stok rejalashtirish" bloki:
    
    DaysRemainingCounter:
      Katta raqam: "14 kun"
      Progress bar (qizil → sariq → yashil)
      "Buyurtma berish sanasi: 1-mart"
    
[ ] DashboardPage widget:
    "Stok eslatmalar" — days_remaining < 14 bo'lganlar ro'yxati
    Sort: eng kam qolgan birinchi
```

---

### 🟢 v4.0 FEATURES (31–43) — Frontend

---

#### FEATURE 31 — Uzum Ads ROI Tracker UI

```
[ ] apps/web/src/pages/AdsPage.tsx
    Route: /ads

[ ] Campaign karta:
    Nom + mahsulot + kunlik byudjet
    ROAS: "3.2x" (katta, yashil)
    ROI: "220%"
    CPA: "12,500 so'm"
    
[ ] Kunlik xarajat kiritish:
    SimpleDateInput + spend + orders kiriting
    
[ ] ROI Chart (Recharts):
    X: kunlar | Y: kümülatif ROI
    Breakeven chiziq (gorizontal qizil)
```

---

#### FEATURE 32 — Telegram Mini App UI

```
[ ] apps/web/src/layouts/TelegramLayout.tsx
    → window.Telegram?.WebApp borligini tekshirish
    → Telegram theme variables ishlatish
    → MainButton, BackButton native API

[ ] Mini App uchun optimizatsiya:
    Kichik font (mobile-first)
    Kichik padding
    Telegram native colors
    Safe area insets
```

---

#### FEATURE 33 — Team Collaboration UI

```
[ ] apps/web/src/pages/TeamPage.tsx
    Route: /settings/team

[ ] A'zolar jadval:
    Avatar | Ism | Email | Rol | Qo'shilgan sana | Amallar
    
[ ] Rol badge'lari:
    OWNER  → 👑 badge-primary
    ADMIN  → 🛡 badge-warning
    ANALYST → 📊 badge-info
    VIEWER → 👁 badge-neutral

[ ] Invite modal:
    Email input + rol tanlash + "Taklif yuborish"
    Pending invitations ro'yxati (cancel tugmasi bilan)
    
[ ] RBAC-aware UI:
    VIEWER: faqat ko'rish, hech qanday amal tugma ko'rinmaydi
    ANALYST: eksport tugmalari ko'rinadi
    ADMIN: invite + role change
    OWNER: hammasini boshqarish
```

---

#### FEATURE 34+35 — Report Builder + Market Share PDF UI

```
[ ] apps/web/src/pages/ReportsPage.tsx
    Route: /reports

[ ] Report type tanlash:
    "Bozor ulushi hisoboti" | "Trend hisoboti" | "Raqib tahlili"
    
[ ] Parametrlar:
    Kategoriya + sana oralig'i
    Format: PDF | Excel
    
[ ] Download progress:
    "Hisobot tayyorlanmoqda... 23 sekund"
    ProgressBar → "Yuklab olish" tugmasi

[ ] Avvalgi hisobotlar ro'yxati (download link bilan)
```

---

#### FEATURE 36 — Watchlist Sharing UI

```
[ ] apps/web/src/pages/WatchlistsPage.tsx
    Route: /watchlists

[ ] Watchlist yaratish:
    Nom + mahsulotlar tanlash (multi-select)
    
[ ] Ulashish:
    "Havolani nusxalash" → /leaderboard?token=...
    Ulashish: Telegram, WhatsApp
    
[ ] Public ko'rinish (auth yo'q):
    /public/watchlist/:token
    Top-5 ko'rinadi, qolganlari blur + CTA
    view_count ko'rsatish: "127 marta ko'rildi"
```

---

#### FEATURE 38 — Collective Intelligence UI

```
[ ] ProductPage da:
    "👥 127 sotuvchi kuzatyapti" — subtle, small text
    Tooltip: "Bu raqam sizning identifikatsiyangizni oshkor qilmaydi"
    
[ ] DiscoveryPage leaderboard da:
    Har mahsulot yonida: "👥 43"
    Sort imkoniyati: "Eng ko'p kuzatilayotgan"
```

---

#### FEATURE 39 — Algorithm Factors UI

```
[ ] apps/web/src/pages/AlgorithmPage.tsx
    Route: /discovery/algorithm

[ ] FactorsChart:
    Recharts BarChart — gorizontal
    X: weight (0-1.0) | Y: factor nomi
    Confidence: error bar yoki progress width

[ ] Disclaimer banner:
    "Bu taxminiy tahlil. R² = 0.73 (aniqligi 73%)"
    
[ ] Tarix: har hafta yangilanadi → "Oxirgi yangilanish: 20-feb"
```

---

#### FEATURE 40+41 — Sourcing + Cargo UI

**Bu Sprint 2-3 da bajariladi — yuqoridagi `TASK_ASSIGNMENT.md` bo'yicha**

---

## 🚀 CLAUDE CLI ISHLATISH

```bash
# Yangi page yaratish:
cat CLAUDE.md CLAUDE_SARDOR.md | claude \
  "NichePage.tsx yaratishim kerak. Feature 04 Niche Finder UI uchun. \
   API: GET /api/v1/discovery/niches?category_id=... \
   DaisyUI v5 + Recharts RadarChart + Tailwind ishlataman. To'liq komponent yoz"

# Komponent refactor:
cat CLAUDE.md CLAUDE_SARDOR.md apps/web/src/components/ScoreRadial.tsx | claude \
  "Bu komponentni yaxshila. TypeScript strict, accessibility, responsive bo'lsin"

# Hook yaratish:
cat CLAUDE.md CLAUDE_SARDOR.md | claude \
  "usePolling.ts universal hook'ni yaratishim kerak. \
   TypeScript generic bilan. Foydalanish misoli ham yoz"

# API client qo'shish:
cat CLAUDE.md CLAUDE_SARDOR.md apps/web/src/api/client.ts | claude \
  "Feature 06 Referral uchun referralApi qo'sh: \
   Bekzodning endpointlari: GET /referrals/stats, POST /referrals/generate-code"

# Bug fix:
cat CLAUDE.md CLAUDE_SARDOR.md apps/web/src/pages/[Page].tsx | claude \
  "Bu sahifada [muammo] bor. Tuzat. Clean code standartlariga mos bo'lsin"
```

---

## 🎨 DIZAYN TIZIMI — ESLATMA

```tsx
// Rang palette (DaisyUI light theme):
primary    → #570df8 (binafsha)
secondary  → #f000b8
accent     → #1dcdbc
neutral    → #2b3440
base-100   → #ffffff
base-200   → #f2f2f2
base-300   → #e5e6e6

// Spacing: Tailwind 4px grid
// gap-3 = 12px | gap-4 = 16px | gap-6 = 24px

// Card pattern:
<div className="card bg-base-200 shadow-sm">
  <div className="card-body gap-4">
    ...
  </div>
</div>

// Stat pattern:
<div className="stat bg-base-200 rounded-2xl">
  <div className="stat-title text-xs">Label</div>
  <div className="stat-value text-xl">Value</div>
  <div className="stat-desc">Subtitle</div>
</div>
```

---

## ⚠️ SARDOR UCHUN XAVFLI ZONALAR

```
❌ apps/api/ papkasiga TEGINMA — bu Bekzodniki
❌ apps/api/prisma/ ga TEGINMA — migration Bekzod qiladi
❌ any type ishlatma — TypeScript'dan to'liq foydalanish
❌ console.log → development faqat, production'da o'chirish
❌ inline style (style={{...}}) → Tailwind class'lar ishlatish
❌ DaisyUI v4 class'lari — v5 ishlatish (alert-error emas, alert alert-error)
❌ localStorage to'g'ridan-to'g'ri — useLocalStorage hook orqali
❌ Komponent ichida 300+ qator — hook'ga chiqarish
```

---

## 📦 WEB PACKAGE'LAR (Kerakli bo'lganda o'rnatish)

```bash
# Mavjud:
axios, recharts, react-router-dom, daisyui, tailwindcss

# Qo'shilishi mumkin:
pnpm add --filter web react-i18next i18next        # Feature 18
pnpm add --filter web socket.io-client             # Feature 17
pnpm add --filter web vite-plugin-pwa              # Feature 16
pnpm add --filter web react-hot-toast              # Toast system
pnpm add --filter web @heroicons/react             # Icon library
pnpm add --filter web react-datepicker             # Feature 15, 29
pnpm add --filter web react-type-animation         # Feature 12 typewriter

# O'rnatishdan oldin Bekzodga ayt — pnpm-lock.yaml sync kerak!
```

---

*CLAUDE_SARDOR.md | Frontend Engineer | 2026-02-23*
