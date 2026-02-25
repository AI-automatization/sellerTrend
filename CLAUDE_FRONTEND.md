# CLAUDE_FRONTEND.md — Frontend Engineer Guide
# React 19 · TypeScript · Tailwind v4 · DaisyUI v5 · Recharts · React Router v7
# Claude CLI bu faylni Frontend dasturchi (Sardor) tanlanganda o'qiydi

---

## ZONA

```
apps/web/src/
  pages/          → Sahifalar (route = 1 page)
  components/     → Qayta ishlatiluvchi komponentlar
  hooks/          → Custom React hooks
  api/            → API client functions
  types/          → Frontend-only TypeScript types
  i18n/           → Tarjima fayllari
```

**TEGINMA:** `apps/api/`, `apps/worker/`, `apps/bot/` — bu Backend zonasi.

---

## ARXITEKTURA QOIDALARI

### 1. Komponent Tuzilishi — Max 300 Qator

```typescript
// ✅ TO'G'RI — murakkab page alohida fayllarda
apps/web/src/
  pages/
    SourcingPage/
      index.tsx               // asosiy page, export { SourcingPage }
      SourcingResultCard.tsx   // faqat shu page da ishlatilsa — ichida
      useSourcingPolling.ts   // page-specific hook — ichida
  components/
    sourcing/
      PlatformBadge.tsx       // ko'p joyda ishlatilsa → components ga
      CargoBreakdownCard.tsx
  hooks/
    useRealtime.ts            // global hooks
    useDebounce.ts

// ❌ NOTO'G'RI — 400+ qator bir faylda, 3 ta component + 2 ta hook
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
  readonly ai_match_score: number;
  readonly margin_percent: number;
  readonly url: string;
}

type PlatformCode = 'alibaba' | 'taobao' | '1688' | 'aliexpress' | 'amazon_de';

function ResultCard({ result }: { result: SourcingResult }) {
  return <div>{result.title}</div>;
}
```

### 3. Custom Hook Pattern — Logika Hookda, Render Komponentda

```typescript
// ✅ TO'G'RI — logika hook'da
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
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  return <JobsList jobs={jobs} />;
}
```

### 4. Error Handling — Foydalanuvchiga Ko'rsatish

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
  toast.error(message);
}
```

### 5. Loading State — Har Doim Bo'lishi Kerak

```typescript
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
<button onClick={handleSubmit} disabled={submitting || !productId} className="btn btn-primary">
  {submitting
    ? <span className="loading loading-spinner loading-sm" />
    : <SearchIcon className="w-4 h-4" />
  }
  {submitting ? 'Qidirilmoqda...' : 'Qidirish'}
</button>
```

### 6. Polling Pattern

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
      if (!shouldContinue(result)) stopPolling();
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

### 7. API Client — Typed Response

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
};
```

---

## DAISYUI v5 — TO'G'RI CLASSLAR

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

---

## RECHARTS — Responsive Container MAJBURIY

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
    <Line type="monotone" dataKey="score" stroke="#4C7DFF" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

---

## ACCESSIBILITY — Minimal Standart

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

## DIZAYN TIZIMI — VENTRA

```
// VENTRA Theme (oklch tokens):
bg-0:     #0B0F1A (dark background)
accent:   #4C7DFF (primary blue)
Fonts:    Inter (body) + Space Grotesk (headings)

// Tailwind v4: @tailwindcss/vite plugin (postcss config EMAS)
// Import: @import "tailwindcss" (NOT @tailwind directives)

// Card pattern:
<div className="card bg-base-200 shadow-sm">
  <div className="card-body gap-4">...</div>
</div>

// Stat pattern:
<div className="stat bg-base-200 rounded-2xl">
  <div className="stat-title text-xs">Label</div>
  <div className="stat-value text-xl">Value</div>
  <div className="stat-desc">Subtitle</div>
</div>
```

---

## TAQIQLANGAN HARAKATLAR

```
❌ apps/api/ papkasiga TEGINMA
❌ apps/api/prisma/ ga TEGINMA — migration Backend qiladi
❌ any type — TypeScript strict
❌ console.log — development faqat
❌ inline style (style={{...}}) → Tailwind class
❌ DaisyUI v4 class'lari — v5 ishlatish
❌ localStorage to'g'ridan-to'g'ri → useLocalStorage hook
❌ 300+ qatorli komponent → hook'ga ajratish
❌ Fixed width Recharts → ResponsiveContainer
```

---

*CLAUDE_FRONTEND.md | VENTRA Analytics Platform | 2026-02-26*
