/**
 * Sourcing search processor — Playwright bilan Banggood + Shopee dan
 * AJAX interception + DOM scraping orqali real mahsulot narxlarini qidiradi.
 *
 * Muammo: Alibaba, AliExpress, DHgate, eBay — bot detection (x5sec, Incapsula)
 * Yechim: Banggood (DOM featured) + Shopee (public search_items API interception)
 * Fix: context.newPage() ishlatiladi (browser.newPage() emas) — anti-detection ishlaydi
 */

import { Worker, Job } from 'bullmq';
import { chromium, BrowserContext } from 'playwright';
import { redisConnection } from '../redis';

interface SourcingSearchJobData {
  query: string;
}

export interface ExternalProduct {
  title: string;
  price: string;
  source: string;
  link: string;
  image: string;
  store: string;
}

// ─── Banggood Scraper ─────────────────────────────────────────────────────────

async function scrapeBanggood(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  const captured: Array<{ url: string; json: any }> = [];

  // Intercept ALL JSON responses from Banggood
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('banggood.com') && ct.includes('application/json')) {
        const text = await response.text();
        if (text.length > 100) {
          const json = JSON.parse(text);
          console.log('[Banggood] JSON from:', url.slice(0, 100), '| keys:', Object.keys(json || {}).join(','));
          captured.push({ url, json });
        }
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.banggood.com/search/${encodeURIComponent(query)}_1.html`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(8000);

    const finalUrl = page.url();
    const pageTitle = await page.title();
    console.log(`[Banggood] URL: ${finalUrl.slice(0, 80)} | Title: ${pageTitle.slice(0, 60)}`);
    console.log(`[Banggood] Captured ${captured.length} JSON responses`);

    // Check captured JSON for product list
    for (const { url, json } of captured) {
      const list =
        json?.data?.list ??
        json?.list ??
        json?.result?.list ??
        json?.products ??
        json?.data?.products ??
        json?.ret?.list ??
        json?.data?.ret?.list;

      if (Array.isArray(list) && list.length > 0) {
        console.log('[Banggood] Product list in JSON from:', url?.slice(0, 80), 'items:', list.length);
        return list.slice(0, 8).map((item: any) => ({
          title: item.name ?? item.title ?? item.goods_name ?? '',
          price: item.price ?? item.sale_price ?? item.shop_price ?? '',
          source: 'BANGGOOD',
          link: item.url ?? item.goods_url ?? '',
          image: item.img ?? item.goods_img ?? item.image ?? '',
          store: 'Banggood',
        })).filter((i: ExternalProduct) => i.title.length > 0);
      }
    }

    // DOM fallback — scroll to trigger lazy load
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(2000);

    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('li[data-product-id]')).slice(0, 10);

      if (cards.length > 0) {
        console.log('[Banggood-debug] first card innerHTML[:300]:', cards[0].innerHTML.slice(0, 300));
      }

      return cards.map((card) => {
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const linkEl = card.querySelector('a[href*="banggood.com"]') as HTMLAnchorElement | null;
        const priceEl = card.querySelector('.main-price, .price, .stprice, [class*="price"]');
        const goodsNameEl = card.querySelector('.goods-name, .p-name, [class*="name"]');

        const title =
          goodsNameEl?.textContent?.trim() ??
          imgEl?.getAttribute('alt') ??
          linkEl?.getAttribute('title') ??
          '';

        const href = linkEl?.getAttribute('href') ?? '';
        const productId = card.getAttribute('data-product-id') ?? '';

        return {
          title,
          price: priceEl?.textContent?.trim() ?? '',
          source: 'BANGGOOD',
          link: href || `https://www.banggood.com/p-${productId}.html`,
          image:
            imgEl?.getAttribute('data-src') ??
            imgEl?.getAttribute('data-original') ??
            imgEl?.getAttribute('src') ??
            '',
          store: 'Banggood',
        };
      });
    });

    console.log('[Banggood] DOM items:', items.filter((i) => i.title.length > 0).length);
    return items.filter((i) => i.title.length > 0);
  } finally {
    await page.close();
  }
}

// ─── Shopee Scraper ───────────────────────────────────────────────────────────
// Shopee has a public search_items JSON API that is intercepted via network
// Price unit: price / 100000 = actual price (in local currency)

async function scrapeShopee(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let shopeeItems: any[] = [];
  let shopeeBase = 'https://shopee.com';

  // Intercept Shopee's search_items API
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('search_items') && url.includes('keyword=')) {
        const json = await response.json();
        console.log('[Shopee] search_items captured from:', url.slice(0, 100));
        const items = json?.items ?? json?.data?.items;
        if (Array.isArray(items) && items.length > 0 && shopeeItems.length === 0) {
          shopeeItems = items;
          // Detect base domain from URL
          const m = url.match(/https:\/\/([^/]+)\//);
          if (m) shopeeBase = `https://${m[1]}`;
        }
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://shopee.com/search?keyword=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});

    const finalUrl = page.url();
    const pageTitle = await page.title();
    console.log(`[Shopee] URL: ${finalUrl.slice(0, 80)} | Title: ${pageTitle.slice(0, 60)}`);

    if (
      finalUrl.includes('chromewebdata') ||
      finalUrl.includes('captcha') ||
      finalUrl.includes('challenge')
    ) {
      console.log('[Shopee] Load failed or bot detection');
      return [];
    }

    // Wait for search results API to fire
    await page.waitForTimeout(6000);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    console.log(`[Shopee] shopeeItems: ${shopeeItems.length}`);

    if (shopeeItems.length > 0) {
      return shopeeItems.slice(0, 8).map((item: any) => {
        const basic = item.item_basic ?? item;
        const shopid = item.shopid ?? basic.shopid ?? 0;
        const itemid = item.itemid ?? basic.itemid ?? 0;
        const name = basic.name ?? basic.title ?? '';
        // Shopee price is in smallest unit × 100000
        const rawPrice = basic.price ?? basic.price_min ?? 0;
        const currency = basic.currency ?? 'USD';
        const priceNum = rawPrice / 100000;
        const priceStr = priceNum > 0 ? `${currency} ${priceNum.toFixed(2)}` : '';
        const imageHash = basic.image ?? '';
        const imageUrl = imageHash
          ? `https://cf.shopee.com/file/${imageHash}_tn`
          : '';

        return {
          title: name,
          price: priceStr,
          source: 'SHOPEE',
          link: shopid && itemid
            ? `${shopeeBase}/-i.${shopid}.${itemid}`
            : shopeeBase + '/search?keyword=' + encodeURIComponent(query),
          image: imageUrl,
          store: 'Shopee',
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    // DOM fallback
    const items: ExternalProduct[] = await page.evaluate(() => {
      const selectors = [
        '[data-sqe="item"]',
        '[class*="shopee-search-item"]',
        '[class*="product-item"]',
        '[class*="col-xs-2-4"]',
      ];
      let cards: Element[] = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 2) { cards = Array.from(found).slice(0, 8); break; }
      }
      console.log('[Shopee] DOM cards:', cards.length);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="item-name"], [class*="name"], div[class*="ellipsis"]');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = card.querySelector('a');
        const imgEl = card.querySelector('img');
        const href = linkEl?.getAttribute('href') ?? '';
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'SHOPEE',
          link: href.startsWith('http') ? href : `https://shopee.com${href}`,
          image: imgEl?.getAttribute('src') ?? '',
          store: 'Shopee',
        };
      });
    });

    const filtered = items.filter((i: ExternalProduct) => i.title.length > 0 && i.price.length > 0);
    console.log('[Shopee] DOM items:', filtered.length);
    return filtered;
  } finally {
    await page.close();
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export function createSourcingWorker() {
  return new Worker<SourcingSearchJobData>(
    'sourcing-search',
    async (job: Job<SourcingSearchJobData>) => {
      const { query } = job.data;
      console.log(`[Sourcing] Searching: "${query}"`);

      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      });

      try {
        // Anti-detection context — pages must be created from this context
        const context = await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          locale: 'en-US',
          timezoneId: 'America/New_York',
          viewport: { width: 1366, height: 768 },
          extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
        });

        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          (window as any).chrome = { runtime: {} };
        });

        // Run both scrapers in parallel using the anti-detection context
        const [bang, shopee] = await Promise.allSettled([
          scrapeBanggood(query, context),
          scrapeShopee(query, context),
        ]);

        if (bang.status === 'rejected') console.error('[Banggood] Exception:', String(bang.reason));
        if (shopee.status === 'rejected') console.error('[Shopee] Exception:', String(shopee.reason));

        const results: ExternalProduct[] = [
          ...(bang.status === 'fulfilled' ? bang.value : []),
          ...(shopee.status === 'fulfilled' ? shopee.value : []),
        ];

        console.log(
          `[Sourcing] Found: Banggood=${bang.status === 'fulfilled' ? bang.value.length : 'ERR'}, ` +
          `Shopee=${shopee.status === 'fulfilled' ? shopee.value.length : 'ERR'}`,
        );

        return results;
      } finally {
        await browser.close();
      }
    },
    { ...redisConnection, concurrency: 1 },
  );
}
