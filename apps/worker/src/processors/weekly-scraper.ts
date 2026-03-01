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
 * Scrape weekly_bought from Uzum product page.
 *
 * 3 extraction strategies (cascade):
 *   1. SSR HTML source: regex for banners JSON containing badge_bought
 *   2. DOM text: element containing "человек купили"
 *   3. Badge image parent: img[src*="badge_bought"] parent text
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
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
  });

  try {
    const page = await context.newPage();

    // Navigate with short timeout — we only need the initial HTML
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait briefly for Vue.js SSR/hydration
    await page.waitForTimeout(2000);

    // Strategy 1: Extract from page source (SSR rendered HTML contains banners JSON)
    const htmlContent = await page.content();
    const bannerRegex = /badge_bought[^}]*label["']\s*:\s*["']([^"']+)/i;
    const ssrMatch = htmlContent.match(bannerRegex);
    if (ssrMatch) {
      const parsed = parseWeeklyBoughtBanner(ssrMatch[1]);
      if (parsed !== null) {
        logJobInfo(QUEUE, jobId, 'scraper', `Strategy 1 (SSR): product=${productId}, wb=${parsed}`);
        return parsed;
      }
    }

    // Strategy 2: DOM text search for "человек купили"
    const bannerText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim() ?? '';
        if (text.includes('человек купили')) {
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
      const img = document.querySelector('img[src*="badge_bought"]');
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
