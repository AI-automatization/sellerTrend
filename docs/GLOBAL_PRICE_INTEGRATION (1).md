# Global Narx Solishtirish — Yakuniy Integratsiya

> **Loyiha:** VENTRA Analytics
> **Natija:** Uzum mahsuloti sahifasida 1688, Taobao, Alibaba, Banggood, Shopee narxlari ko'rinadi
> **Sana:** 2026-03

---

## Umumiy tushuncha

### Hozir nima bor

Backend to'liq tayyor — hech narsa yozish kerak emas:
- `POST /sourcing/jobs` — job yaratadi, workerga yuboradi
- `GET /sourcing/jobs/:id` — holat va natijalarni qaytaradi
- Worker: 1688, Taobao, Alibaba → SerpAPI
- Worker: Banggood, Shopee → Playwright
- `sourcingApi.createJob()` → `apps/web/src/api/sourcing.ts` da bor
- `sourcingApi.getJob()` → xuddi shu faylda bor

### Nima ishlamayapti

`ProductPage.tsx` hali eski yo'lni ishlatmoqda:

```
sourcingApi.searchPrices() → /sourcing/search → quick mode
→ faqat Banggood/Shopee, DB ga saqlanmaydi, 1688/Taobao/Alibaba yo'q
```

Banggood/Shopee ham bloklanyapti — chunki Railway IP si ma'lum.

### Nima qilish kerak

```
1. sourcing.processor.ts  → Bright Data ulanishi qo'shish (Banggood/Shopee uchun)
2. sourcing.service.ts    → Job caching qo'shish (30 daqiqa)
3. ProductPage.tsx        → Quick mode → Full pipeline o'tkazish
4. GlobalPriceComparison  → Yangi format bilan ishlash
```

---

## QADAM 1 — `.env` va Railway

### `.env` ga qo'shish

```
BRIGHT_DATA_USERNAME=brd-customer-XXXXXXXX-zone-ventra-scraping
BRIGHT_DATA_PASSWORD=xxxxxxxxxxxxxxxxxxxx
```

### `.env.example` ga qo'shish (bo'sh qiymat)

```
# Bright Data Scraping Browser (Banggood + Shopee uchun)
BRIGHT_DATA_USERNAME=""
BRIGHT_DATA_PASSWORD=""
```

### Railway — `worker` servisi → Variables

```
BRIGHT_DATA_USERNAME = [Bright Data dashboard dan]
BRIGHT_DATA_PASSWORD = [Bright Data dashboard dan]
```

---

## QADAM 2 — `sourcing.processor.ts` — Bright Data

**Fayl:** `apps/worker/src/processors/sourcing.processor.ts`

**Topish:** `runFullPipeline()` funksiyasi ichida quyidagi qatorni topasiz:

```typescript
const browser = await chromium.launch({
```

Shu qatordan boshlab, pastdagi `try {` gacha bo'lgan blok — ya'ni:

```typescript
const browser = await chromium.launch({
  headless: true,
  proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
});

try {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });
```

**Bu blok quyidagi bilan almashtiriladi:**

```typescript
const SBR_WS = process.env.BRIGHT_DATA_USERNAME
  ? `wss://${process.env.BRIGHT_DATA_USERNAME}:${process.env.BRIGHT_DATA_PASSWORD}@brd.superproxy.io:9222`
  : null;

let browser: import('playwright').Browser;
let context: import('playwright').BrowserContext;

if (SBR_WS) {
  console.log('[Sourcing] Bright Data ulanmoqda...');
  browser = await chromium.connectOverCDP(SBR_WS);
  const ctxList = browser.contexts();
  context = ctxList.length > 0 ? ctxList[0] : await browser.newContext();
} else {
  console.log('[Sourcing] Local Playwright (fallback)...');
  browser = await chromium.launch({
    headless: true,
    proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
  });
  context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });
}

try {
```

**Muhim:** `scrapeBanggood()` va `scrapeShopee()` — hech o'zgarmaydi.

---

## QADAM 3 — `sourcing.service.ts` — Job caching

**Fayl:** `apps/api/src/sourcing/sourcing.service.ts`

**Topish:** `createSearchJob()` funksiyasi. Ichida birinchi `const job = await this.prisma.externalSearchJob.create(` qatori bor.

**Shu qatordan OLDIN** quyidagini qo'shish:

```typescript
// 30 daqiqa ichida bir xil product_id uchun qayta qidirmaslik
const recentJob = await this.prisma.externalSearchJob.findFirst({
  where: {
    product_id: BigInt(product_id),
    status: { in: ['DONE', 'RUNNING', 'PENDING'] },
    created_at: { gte: new Date(Date.now() - 30 * 60 * 1000) },
  },
  orderBy: { created_at: 'desc' },
});

if (recentJob) {
  return {
    job_id: recentJob.id,
    status: recentJob.status,
    query: recentJob.query,
    platforms: recentJob.platforms,
  };
}
```

Boshqa hech narsa o'zgarmaydi.

---

## QADAM 4 — `ProductPage.tsx` — State'lar

**Fayl:** `apps/web/src/pages/ProductPage.tsx`

### O'chiriladigan state

Quyidagi qatorni topib o'chirish:

```typescript
const [extNote, setExtNote] = useState('');
```

### Qo'shiladigan state'lar

`extSearched` state qatoridan keyin qo'shish:

```typescript
const [extJobId, setExtJobId] = useState<string | null>(null);
const [extJobStatus, setExtJobStatus] = useState<string | null>(null);
```

---

## QADAM 5 — `ProductPage.tsx` — useEffect almashtirish

**Topish:** Quyidagi useEffect ni topasiz (butun blok):

```typescript
useEffect(() => {
  if (!result?.title || extSearched) return;
  setExtSearched(true);
  setExtLoading(true);
  const q = extractSearchQuery(result.title);
  sourcingApi
    .searchPrices(q, 'BOTH')
    .then((res) => {
      setExtItems((res.data.results ?? []).slice(0, 12));
      if (res.data.note) setExtNote(res.data.note);
    })
    .catch(() => {})
    .finally(() => setExtLoading(false));
}, [result?.title]);
```

**Bu blokni o'chirib, o'rniga ikki yangi useEffect qo'shish:**

```typescript
// useEffect 1 — job yaratish
useEffect(() => {
  if (!result?.product_id || !result?.title || extSearched) return;
  setExtSearched(true);
  setExtLoading(true);
  sourcingApi
    .createJob({ product_id: result.product_id, product_title: result.title })
    .then((res) => {
      setExtJobId(res.data.job_id);
      setExtJobStatus(res.data.status);
    })
    .catch(() => setExtLoading(false));
}, [result?.product_id]);

// useEffect 2 — polling (har 3 soniyada natijani tekshirish)
useEffect(() => {
  if (!extJobId) return;
  let active = true;

  async function poll() {
    while (active) {
      try {
        const res = await sourcingApi.getJob(extJobId!);
        if (!active) return;
        setExtJobStatus(res.data.status);
        if (res.data.status === 'DONE') {
          setExtItems(res.data.results ?? []);
          setExtLoading(false);
          return;
        }
        if (res.data.status === 'FAILED') {
          setExtLoading(false);
          return;
        }
      } catch { /* davom etish */ }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  poll();
  return () => { active = false; };
}, [extJobId]);
```

---

## QADAM 6 — `ProductPage.tsx` — `GlobalPriceComparison` chaqiruvi

**Topish:**

```tsx
<GlobalPriceComparison
  items={extItems} loading={extLoading} note={extNote}
  uzumPrice={result.sell_price} productTitle={result.title}
  usdRate={usdRate}
/>
```

**Almashtirish:**

```tsx
<GlobalPriceComparison
  items={extItems} loading={extLoading} jobStatus={extJobStatus}
  uzumPrice={result.sell_price}
  usdRate={usdRate}
/>
```

`note={extNote}` va `productTitle={result.title}` o'chirildi. `jobStatus={extJobStatus}` qo'shildi.

---

## QADAM 7 — `GlobalPriceComparison` — props o'zgartirish

**Topish** (fayl pastki qismida):

```typescript
function GlobalPriceComparison({
  items, loading, note, uzumPrice, productTitle, usdRate,
}: {
  items: ExternalItem[]; loading: boolean; note: string;
  uzumPrice: number | null; productTitle: string; usdRate: number;
})
```

**Almashtirish:**

```typescript
function GlobalPriceComparison({
  items, loading, jobStatus, uzumPrice, usdRate,
}: {
  items: any[]; loading: boolean; jobStatus: string | null;
  uzumPrice: number | null; usdRate: number;
})
```

---

## QADAM 8 — `GlobalPriceComparison` — `note` bloki o'chirish

**Topish va o'chirish** (butun blok):

```tsx
{!loading && note && (
  <div className="flex items-start gap-2 bg-base-300/60 rounded-xl px-4 py-3 text-sm">
    <span className="text-base-content/40 text-xs shrink-0 mt-0.5">ℹ️</span>
    <p className="text-base-content/70">{note}</p>
  </div>
)}
```

---

## QADAM 9 — `GlobalPriceComparison` — status badge qo'shish

**Topish** (sarlavha va cargo link o'rtasidagi joy):

```tsx
<div className="flex items-center justify-between flex-wrap gap-2">
  <div>
    <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
      <span>🌏</span> Global Bozor Taqqoslash
    </h2>
    <p className="text-xs text-base-content/50 mt-0.5">
      Shu mahsulot uchun Banggood va Shopee global narxlari
    </p>
  </div>
  <Link to="/sourcing" className="btn btn-outline btn-xs gap-1">
    Cargo kalkulyator ↗
  </Link>
</div>
```

**Almashtirish** (sarlavha va link orasiga badge qo'shish):

```tsx
<div className="flex items-center justify-between flex-wrap gap-2">
  <div>
    <h2 className="font-bold text-base lg:text-lg flex items-center gap-2">
      <span>🌏</span> Global Bozor Taqqoslash
    </h2>
    <p className="text-xs text-base-content/50 mt-0.5">
      1688, Taobao, Alibaba, Banggood, Shopee global narxlari
    </p>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    {(jobStatus === 'PENDING' || jobStatus === 'RUNNING') && (
      <span className="badge badge-ghost badge-sm gap-1">
        <span className="loading loading-spinner loading-xs" />
        Qidirilmoqda...
      </span>
    )}
    {jobStatus === 'DONE' && items.length > 0 && (
      <span className="badge badge-success badge-sm">{items.length} ta natija</span>
    )}
    {jobStatus === 'FAILED' && (
      <span className="badge badge-error badge-sm">Xato</span>
    )}
    <Link to="/sourcing" className="btn btn-outline btn-xs gap-1">
      Cargo kalkulyator ↗
    </Link>
  </div>
</div>
```

---

## QADAM 10 — `GlobalPriceComparison` — `parsePrice` yangilash

**Topish:**

```typescript
function parsePrice(priceStr: string): number | null {
  const m = priceStr.match(/[\d.,]+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(',', '.'));
  if (isNaN(n)) return null;
  if (priceStr.includes('$') || n < 10000) return n * USD_RATE;
  return n;
}
```

**Almashtirish** (yangi formatni ham qo'llaydi):

```typescript
function parsePrice(item: any): number | null {
  // Yangi format: price_usd raqam sifatida keladi
  if (typeof item.price_usd === 'number' && item.price_usd > 0) {
    return item.price_usd * USD_RATE;
  }
  // Eski format: price string sifatida keladi
  if (typeof item.price === 'string') {
    const m = item.price.match(/[\d.,]+/);
    if (!m) return null;
    const n = parseFloat(m[0].replace(',', '.'));
    if (isNaN(n)) return null;
    if (item.price.includes('$') || n < 10000) return n * USD_RATE;
    return n;
  }
  return null;
}
```

---

## QADAM 11 — `GlobalPriceComparison` — Kartochka fieldlari

**Topish** (natijalar grid ichidagi `.map()` blok):

```typescript
const meta = SOURCE_META[item.source] ?? { label: item.source, flag: '🌐', color: 'badge-ghost' };
const extPriceUzs = parsePrice(item.price);
```

**Almashtirish:**

```typescript
const sourceKey = (item.platform ?? item.source ?? '').toUpperCase();
const meta = SOURCE_META[sourceKey] ?? { label: sourceKey, flag: '🌐', color: 'badge-ghost' };
const extPriceUzs = parsePrice(item);
```

---

## QADAM 12 — `GlobalPriceComparison` — Kartochka ichki fieldlar

Kartochka ichida quyidagi o'zgarishlar:

**`item.image` → ikki formatni tekshirish:**

```tsx
{/* Hozirgi: */}
{item.image ? (
  <img src={item.image} ...

{/* Yangi: */}
{(item.image ?? item.image_url) ? (
  <img src={item.image ?? item.image_url} ...
```

**`item.price` → ikki formatni tekshirish:**

```tsx
{/* Hozirgi: */}
<p className="font-bold text-base text-primary leading-none">{item.price}</p>

{/* Yangi: */}
<p className="font-bold text-base text-primary leading-none">
  {item.price ?? `$${item.price_usd?.toFixed(2)}`}
</p>
```

**`item.store` → ikki formatni tekshirish:**

```tsx
{/* Hozirgi: */}
{item.store && <p className="text-xs text-base-content/40 truncate">{item.store}</p>}

{/* Yangi: */}
{(item.store ?? item.seller_name) && (
  <p className="text-xs text-base-content/40 truncate">{item.store ?? item.seller_name}</p>
)}
```

**`item.link` → ikki formatni tekshirish:**

```tsx
{/* Hozirgi: */}
{item.link && item.link !== '#' ? (
  <a href={item.link} ...>Ko'rish ↗</a>

{/* Yangi: */}
{(item.link ?? item.url) && (item.link ?? item.url) !== '#' ? (
  <a href={item.link ?? item.url} ...>Ko'rish ↗</a>
```

**Cargo kalkulyator linki — `productTitle` o'chirilgani uchun soddalashtirish:**

```tsx
{/* Hozirgi (o'chirish): */}
<Link to={`/sourcing?q=${encodeURIComponent(productTitle)}&price=${extPriceUzs ?? ''}`}
  className="btn btn-ghost btn-xs" title="Cargo kalkulyatorda hisoblash">🧮</Link>

{/* Yangi (almashtirish): */}
<Link to="/sourcing" className="btn btn-ghost btn-xs" title="Cargo kalkulyatorda hisoblash">🧮</Link>
```

---

## QADAM 13 — `GlobalPriceComparison` — Solishtirish bloki

**Topish:**

```typescript
const prices = items.map((it) => parsePrice(it.price)).filter((p): p is number => p !== null);
```

**Almashtirish:**

```typescript
const prices = items.map((it) => parsePrice(it)).filter((p): p is number => p !== null);
```

---

## QADAM 14 — TypeScript tekshirish

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter worker exec tsc --noEmit
```

Xatolar bo'lsa — xato matni asosida tuzatish.

---

## QADAM 15 — Deploy

```bash
git add apps/worker/src/processors/sourcing.processor.ts
git add apps/api/src/sourcing/sourcing.service.ts
git add apps/web/src/pages/ProductPage.tsx
git commit -m "feat: global price comparison via full pipeline + Bright Data"
# Sardor ruhsati bilan push qilish
git push origin main
```

Railway avtomatik deploy qiladi.

---

## Natijada nima ko'rinadi

Foydalanuvchi Uzum mahsuloti sahifasini ochganda:

```
┌──────────────────────────────────────────────────┐
│ 🌏 Global Bozor Taqqoslash    [Qidirilmoqda...] │
│ 1688, Taobao, Alibaba, Banggood, Shopee         │
├──────────────────────────────────────────────────┤
│ [skeleton skeleton skeleton skeleton skeleton]   │  ← 30-60 soniya
├──────────────────────────────────────────────────┤
│ 🌏 Global Bozor Taqqoslash    [32 ta natija]    │
│                                                  │
│ Uzumda: 125,000 so'm  ↔  Eng arzon: $3.50       │
│                            ≈ 45,150 so'm         │
│                            Farq: 64%             │
│                                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│ │🇨🇳 1688│ │🇨🇳Taobao│ │🇨🇳Alibab│ │🛍️Bangod│    │
│ │ rasm   │ │ rasm   │ │ rasm   │ │ rasm   │    │
│ │ nomi...│ │ nomi...│ │ nomi...│ │ nomi...│    │
│ │ $2.50  │ │ $3.10  │ │ $2.80  │ │ $4.20  │    │
│ │≈32K so'm│ │≈40K so'm│ │≈36K so'm│ │≈54K so'm│    │
│ │Ko'rish↗│ │Ko'rish↗│ │Ko'rish↗│ │Ko'rish↗│    │
│ └────────┘ └────────┘ └────────┘ └────────┘    │
└──────────────────────────────────────────────────┘
```

---

## Conflict bo'lmaydigan narsalar

- `SourcingPage.tsx` — **o'zgarmaydi** (quick mode hali ishlaydi)
- `extractSearchQuery()` — **o'zgarmaydi**
- `SOURCE_META` — **o'zgarmaydi** (faqat `.toUpperCase()` qo'shildi)
- `marginLabel()` — **o'zgarmaydi**
- Loading skeleton — **o'zgarmaydi**
- Bo'sh holat matni — **o'zgarmaydi**
- `scrapeBanggood()` — **o'zgarmaydi**
- `scrapeShopee()` — **o'zgarmaydi**
- DB schema — **o'zgarmaydi**
- API endpointlar — **o'zgarmaydi**

---

*GLOBAL_PRICE_INTEGRATION.md | VENTRA Analytics | 2026-03*
