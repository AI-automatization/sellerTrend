/**
 * Weekly bought Playwright scraper.
 *
 * Scrapes the "X человек купили на этой неделе" banner from Uzum product pages.
 * This data is only available in SSR HTML / rendered DOM — NOT in REST API.
 *
 * Uses a shared browser instance to avoid launching Chromium per product.
 * Each product gets its own BrowserContext for isolation.
 */

import { chromium, Browser } from 'playwright';
import { parseWeeklyBoughtBanner } from '@uzum/utils';
import { logJobInfo } from '../logger';

const QUEUE = 'weekly-scrape-queue';

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  sharedBrowser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    proxy: process.env.PROXY_URL ? { server: process.env.PROXY_URL } : undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--blink-settings=imagesEnabled=false', // Disable images for speed
    ],
  });

  return sharedBrowser;
}

/** Close shared browser instance — call after batch completes. */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch { /* already closed */ }
    sharedBrowser = null;
  }
}

/**
 * Try to extract weekly_bought from page content using multiple strategies.
 * Returns parsed number or null.
 */
function extractFromHtml(html: string, productId: number, jobId: string): number | null {
  // Strategy 1: SSR banners JSON with badge_bought
  const bannerRegex = /badge_bought[^}]*label["']\s*:\s*["']([^"']+)/i;
  const ssrMatch = html.match(bannerRegex);
  if (ssrMatch) {
    const parsed = parseWeeklyBoughtBanner(ssrMatch[1]);
    if (parsed !== null) {
      logJobInfo(QUEUE, jobId, 'scraper', `Strategy 1 (SSR): product=${productId}, wb=${parsed}`);
      return parsed;
    }
  }

  // Strategy 1b: Direct regex for "N человек купили" in HTML source
  const directMatch = html.match(/(\d+)\s*человек\s*купили/i);
  if (directMatch) {
    const parsed = parseInt(directMatch[1], 10);
    if (parsed > 0) {
      logJobInfo(QUEUE, jobId, 'scraper', `Strategy 1b (HTML regex): product=${productId}, wb=${parsed}`);
      return parsed;
    }
  }

  return null;
}

/**
 * Scrape weekly_bought from Uzum product page.
 *
 * Extraction strategies (cascade):
 *   1. SSR HTML source: regex for banners JSON containing badge_bought
 *   1b. Direct HTML regex: "N человек купили" in raw HTML
 *   2. DOM text: TreeWalker for "человек купили" / "купили на этой"
 *   3. Badge image parent: img[src*="badge_bought"] parent text
 *   4. Data attribute: [data-test-id] containing weekly/bought info
 *
 * Uzum now redirects through auth endpoint before loading product page,
 * so we use networkidle + extended wait for full Vue.js hydration.
 *
 * @returns weekly_bought number or null if not found
 */
export async function scrapeWeeklyBought(
  productId: number,
  jobId = '-',
): Promise<number | null> {
  const url = `https://uzum.uz/ru/product/-${productId}`;
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
  });

  try {
    const page = await context.newPage();

    // Navigate — Uzum does auth redirect chain, 'load' is safer than 'networkidle'
    // (networkidle times out because Uzum has persistent background connections)
    await page.goto(url, {
      waitUntil: 'load',
      timeout: 20000,
    });

    // Check SSR/HTML content immediately after load
    const earlyHtml = await page.content();
    const earlyResult = extractFromHtml(earlyHtml, productId, jobId);
    if (earlyResult !== null) return earlyResult;

    // Wait for Vue.js hydration + dynamic banner rendering
    // Try to detect banner element first (faster), fallback to fixed wait
    try {
      await page.waitForFunction(
        () => document.body?.textContent?.includes('человек купили') ?? false,
        { timeout: 8000 },
      );
    } catch {
      // Banner not found via waitForFunction — wait fixed time for slow renders
      await page.waitForTimeout(3000);
    }

    // Check HTML again after hydration
    const htmlContent = await page.content();
    const htmlResult = extractFromHtml(htmlContent, productId, jobId);
    if (htmlResult !== null) return htmlResult;

    // Strategy 2: DOM text search for "человек купили" / "купили на этой"
    const bannerText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim() ?? '';
        if (text.includes('человек купили') || text.includes('купили на этой')) {
          return text;
        }
      }
      return null;
    });

    if (bannerText) {
      const parsed = parseWeeklyBoughtBanner(bannerText);
      if (parsed !== null) {
        logJobInfo(QUEUE, jobId, 'scraper', `Strategy 2 (DOM text): product=${productId}, wb=${parsed}`);
        return parsed;
      }
    }

    // Strategy 3: Find badge_bought image and get parent text
    const badgeParentText = await page.evaluate(() => {
      const img = document.querySelector('img[src*="badge_bought"], img[src*="weekly"], img[src*="bought"]');
      if (!img) return null;
      const parent = img.closest('[class]') ?? img.parentElement;
      return parent?.textContent?.trim() ?? null;
    });

    if (badgeParentText) {
      const parsed = parseWeeklyBoughtBanner(badgeParentText);
      if (parsed !== null) {
        logJobInfo(QUEUE, jobId, 'scraper', `Strategy 3 (badge img): product=${productId}, wb=${parsed}`);
        return parsed;
      }
    }

    // Strategy 4: Broader DOM search — any element with weekly purchase info
    const broadSearch = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('span, div, p, b, strong'));
      for (let i = 0; i < allElements.length; i++) {
        const text = allElements[i].textContent?.trim() ?? '';
        if (/\d+\s*человек\s*купили/i.test(text) && text.length < 100) {
          return text;
        }
      }
      return null;
    });

    if (broadSearch) {
      const parsed = parseWeeklyBoughtBanner(broadSearch);
      if (parsed !== null) {
        logJobInfo(QUEUE, jobId, 'scraper', `Strategy 4 (broad DOM): product=${productId}, wb=${parsed}`);
        return parsed;
      }
    }

    logJobInfo(QUEUE, jobId, 'scraper', `No banner found: product=${productId}`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logJobInfo(QUEUE, jobId, 'scraper', `Scrape error: product=${productId}: ${msg}`);
    return null;
  } finally {
    await context.close();
  }
}
