/**
 * Weekly bought Playwright scraper.
 *
 * Scrapes the "X человек купили на этой неделе" banner from Uzum product pages.
 * This data is only available in SSR HTML / rendered DOM — NOT in REST API.
 *
 * Uses a shared browser instance to avoid launching Chromium per product.
 * Each product gets its own BrowserContext for isolation.
 */

import { parseWeeklyBoughtBanner } from '@uzum/utils';
import { logJobInfo } from '../logger';
import { browserPool } from '../browser-pool';

const QUEUE = 'weekly-scrape-queue';

export interface ScrapeResult {
  value: number | null;
  rawText: string | null;
  confidence: number; // 0.00–1.00
}

/**
 * Try to extract weekly_bought from page content using multiple strategies.
 */
function extractFromHtml(html: string, productId: number, jobId: string): ScrapeResult | null {
  // Strategy 1: SSR banners JSON with badge_bought
  const bannerRegex = /badge_bought[^}]*label["']\s*:\s*["']([^"']+)/i;
  const ssrMatch = html.match(bannerRegex);
  if (ssrMatch) {
    const parsed = parseWeeklyBoughtBanner(ssrMatch[1]);
    if (parsed !== null) {
      logJobInfo(QUEUE, jobId, 'scraper', `Strategy 1 (SSR): product=${productId}, wb=${parsed}`);
      return { value: parsed, rawText: ssrMatch[1], confidence: 1.00 };
    }
  }

  // Strategy 1b: Direct regex for "N человек купили" in HTML source
  const directMatch = html.match(/(\d+)\s*человек\s*купили[^<]{0,50}/i);
  if (directMatch) {
    const parsed = parseInt(directMatch[1], 10);
    if (parsed > 0) {
      logJobInfo(QUEUE, jobId, 'scraper', `Strategy 1b (HTML regex): product=${productId}, wb=${parsed}`);
      return { value: parsed, rawText: directMatch[0].trim(), confidence: 0.95 };
    }
  }

  return null;
}

/**
 * Scrape weekly_bought from Uzum product page.
 *
 * Extraction strategies (cascade):
 *   1. SSR HTML source: regex for banners JSON containing badge_bought → confidence 1.00
 *   1b. Direct HTML regex: "N человек купили" in raw HTML → confidence 0.95
 *   2. DOM text: TreeWalker for "человек купили" / "купили на этой" → confidence 0.90
 *   3. Badge image parent: img[src*="badge_bought"] parent text → confidence 0.70
 *   4. Broad DOM: span/div/p with weekly purchase text → confidence 0.80
 *
 * @returns ScrapeResult with value, rawText, and confidence
 */
export async function scrapeWeeklyBought(
  productId: number,
  jobId = '-',
): Promise<ScrapeResult> {
  const url = `https://uzum.uz/ru/product/-${productId}`;
  const browser = await browserPool.getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
  });

  try {
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'load',
      timeout: 20000,
    });

    // Check SSR/HTML content immediately after load
    const earlyHtml = await page.content();
    const earlyResult = extractFromHtml(earlyHtml, productId, jobId);
    if (earlyResult !== null) return earlyResult;

    // Wait for Vue.js hydration + dynamic banner rendering
    try {
      await page.waitForFunction(
        () => document.body?.textContent?.includes('человек купили') ?? false,
        { timeout: 8000 },
      );
    } catch {
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
        return { value: parsed, rawText: bannerText, confidence: 0.90 };
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
        return { value: parsed, rawText: badgeParentText, confidence: 0.70 };
      }
    }

    // Strategy 4: Broader DOM search
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
        return { value: parsed, rawText: broadSearch, confidence: 0.80 };
      }
    }

    logJobInfo(QUEUE, jobId, 'scraper', `No banner found: product=${productId}`);
    return { value: null, rawText: null, confidence: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logJobInfo(QUEUE, jobId, 'scraper', `Scrape error: product=${productId}: ${msg}`);
    return { value: null, rawText: null, confidence: 0 };
  } finally {
    await context.close();
    await browserPool.release();
  }
}
