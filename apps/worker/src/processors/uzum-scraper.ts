/**
 * Uzum category page scraper using Playwright (DOM-based).
 *
 * Why Playwright instead of REST API:
 *   Uzum's REST search endpoint (/api/v2/main/search/product) and
 *   GraphQL getMakeSearch both route through an internal "discovery"
 *   microservice that has been intermittently unavailable (HTTP 500,
 *   "not-available-001"). The product detail API (/api/v2/product/{id})
 *   remains operational.
 *
 * Strategy:
 *   1. Playwright opens the category page in headless Chromium.
 *   2. Vue.js SPA renders product cards in the DOM.
 *   3. Product IDs are extracted from card href attributes.
 *   4. Individual REST calls to /api/v2/product/{id} get orders data.
 */

import { chromium } from 'playwright';
import { ProxyAgent } from 'undici';
import { logJobInfo } from '../logger';

const REST_BASE = 'https://api.uzum.uz/api/v2';

const proxyDispatcher = process.env.PROXY_URL
  ? new ProxyAgent(process.env.PROXY_URL)
  : undefined;
const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

/** Parse product ID from Uzum product href.
 *  /ru/product/some-product-title-12345          → 12345
 *  /ru/product/some-product-title-12345?skuId=99 → 12345
 */
function parseProductId(href: string): number | null {
  // Strip query string (?skuId=...) before parsing
  const path = href.split('?')[0];
  const match = path.match(/-(\d+)$/);
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return isNaN(id) ? null : id;
}

/**
 * Open Uzum category page in Playwright, scroll to load products,
 * and return all unique product IDs found on the page.
 *
 * @param categoryUrl  Full Uzum category URL (e.g. https://uzum.uz/ru/category/makiyazh--10091)
 * @param scrollCount  Number of scroll attempts (each reveals more lazy-loaded products)
 */
export async function scrapeCategoryProductIds(
  categoryUrl: string,
  scrollCount = 15,
): Promise<{ ids: number[]; screenshotBase64?: string }> {
  logJobInfo('discovery-queue', '-', 'scraper', `Opening ${categoryUrl}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ru-RU',
      extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
    });

    const page = await context.newPage();

    await page.goto(categoryUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for Vue.js to render product cards (up to 20s), then extra buffer
    try {
      await page.waitForSelector('[data-test-id="product-card--default"]', {
        timeout: 20000,
      });
      await page.waitForTimeout(1500); // extra buffer for remaining cards
    } catch {
      // Timeout — no products rendered (service down or parent category with no direct products)
    }

    const ids = new Set<number>();

    for (let i = 0; i < scrollCount; i++) {
      // Collect product IDs from currently visible cards
      const hrefs: string[] = await page.$$eval(
        '[data-test-id="product-card--default"]',
        (cards) =>
          cards
            .map((c) => c.getAttribute('href') ?? '')
            .filter((h) => h.includes('/product/')),
      );

      for (const href of hrefs) {
        const id = parseProductId(href);
        if (id) ids.add(id);
      }

      logJobInfo('discovery-queue', '-', 'scraper', `Scroll ${i + 1}/${scrollCount}: ${ids.size} unique IDs`);

      if (i < scrollCount - 1) {
        // Scroll to bottom to trigger lazy loading of next batch
        // String form avoids TypeScript DOM type errors in Node.js context
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(2500);
      }
    }

    logJobInfo('discovery-queue', '-', 'scraper', `Total product IDs collected: ${ids.size}`);

    // If 0 products found, capture a screenshot for vision fallback
    let screenshotBase64: string | undefined;
    if (ids.size === 0) {
      try {
        const buffer = await page.screenshot({ fullPage: false });
        screenshotBase64 = buffer.toString('base64');
        logJobInfo('discovery-queue', '-', 'scraper', 'Captured screenshot for vision fallback');
      } catch {
        logJobInfo('discovery-queue', '-', 'scraper', 'Failed to capture screenshot');
      }
    }

    return { ids: [...ids], screenshotBase64 };
  } finally {
    await browser.close();
  }
}

/** Raw Uzum product data — superset of fields needed by all processors. */
export interface UzumRawProduct {
  id: number;
  title: string;
  localizableTitle?: { ru?: string; uz?: string };
  rating: number;
  ordersAmount: number;
  rOrdersAmount?: number;
  totalAvailableAmount: number;
  reviewsAmount: number;
  category?: { id: number; title?: string };
  seller?: { id: number; title?: string; name?: string; rating?: number; orders?: number; ordersCount?: number };
  shop?: { id: number; title?: string; name?: string; rating?: number; orders?: number; ordersCount?: number };
  skuList: Array<{
    id: number;
    purchasePrice: number;
    fullPrice: number;
    availableAmount: number;
    stock: { type: string };
  }>;
}

/**
 * Fetch raw product data from the Uzum REST API.
 * Returns the unprocessed payload.data object — use this in all processors
 * to avoid code duplication (T-066).
 */
export async function fetchUzumProductRaw(
  productId: number,
): Promise<UzumRawProduct | null> {
  try {
    const res = await fetch(`${REST_BASE}/product/${productId}`, {
      headers: HEADERS,
      dispatcher: proxyDispatcher,
    } as any);
    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const p = data?.payload?.data ?? data?.payload;
    return p ?? null;
  } catch {
    return null;
  }
}

export interface ProductDetail {
  id: number;
  title: string;
  rating: number;
  ordersAmount: number;
  // rOrdersAmount = ROUNDED total orders (NOT weekly!) — faqat display uchun
  rOrdersAmount: number | null;
  totalAvailableAmount: number;
  feedbackQuantity: number;
  sellPrice: bigint | null;
  stockType: 'FBO' | 'FBS';
}

/**
 * Fetch structured product details (used by discovery processor).
 * Internally uses fetchUzumProductRaw().
 */
export async function fetchProductDetail(
  productId: number,
): Promise<ProductDetail | null> {
  const p = await fetchUzumProductRaw(productId);
  if (!p) return null;

  const skuList = p.skuList ?? [];
  const firstSku = skuList[0];

  const stockType: 'FBO' | 'FBS' =
    firstSku?.stock?.type === 'FBO' ? 'FBO' : 'FBS';
  const sellPrice = firstSku?.purchasePrice
    ? BigInt(firstSku.purchasePrice)
    : null;

  return {
    id: productId,
    title: p.localizableTitle?.ru ?? p.title ?? '',
    rating: p.rating ?? 0,
    ordersAmount: p.ordersAmount ?? 0,
    rOrdersAmount: p.rOrdersAmount ?? null,
    totalAvailableAmount: p.totalAvailableAmount ?? 0,
    feedbackQuantity: p.reviewsAmount ?? 0,
    sellPrice,
    stockType,
  };
}
