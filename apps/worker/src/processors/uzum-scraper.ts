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

const REST_BASE = 'https://api.uzum.uz/api/v2';
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
  scrollCount = 6,
): Promise<{ ids: number[]; screenshotBase64?: string }> {
  console.log(`[scraper] Opening ${categoryUrl}`);

  const browser = await chromium.launch({
    headless: true,
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

      console.log(
        `[scraper] Scroll ${i + 1}/${scrollCount}: ${ids.size} unique IDs so far`,
      );

      if (i < scrollCount - 1) {
        // Scroll to bottom to trigger lazy loading of next batch
        // String form avoids TypeScript DOM type errors in Node.js context
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await page.waitForTimeout(2500);
      }
    }

    console.log(`[scraper] Total product IDs collected: ${ids.size}`);

    // If 0 products found, capture a screenshot for vision fallback
    let screenshotBase64: string | undefined;
    if (ids.size === 0) {
      try {
        const buffer = await page.screenshot({ fullPage: false });
        screenshotBase64 = buffer.toString('base64');
        console.log('[scraper] Captured screenshot for vision fallback');
      } catch {
        console.warn('[scraper] Failed to capture screenshot');
      }
    }

    return { ids: [...ids], screenshotBase64 };
  } finally {
    await browser.close();
  }
}

export interface ProductDetail {
  id: number;
  title: string;
  rating: number;
  ordersAmount: number;
  rOrdersAmount: number | null; // recent/weekly orders
  feedbackQuantity: number;
  sellPrice: bigint | null;
  stockType: 'FBO' | 'FBS';
}

/**
 * Fetch full product details from the working REST endpoint.
 * Returns null if the product is unavailable.
 */
export async function fetchProductDetail(
  productId: number,
): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${REST_BASE}/product/${productId}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as any;
    // API wraps response in payload.data (newer format) or payload (older)
    const p = data?.payload?.data ?? data?.payload;
    if (!p) return null;

    const skuList: any[] = p.skuList ?? [];
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
      feedbackQuantity: p.reviewsAmount ?? p.feedbackQuantity ?? 0,
      sellPrice,
      stockType,
    };
  } catch {
    return null;
  }
}
