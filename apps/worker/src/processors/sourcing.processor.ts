/**
 * Sourcing search processor — full pipeline:
 *   1. AI-generated search query (Claude Haiku)
 *   2. Parallel API calls (SerpAPI, AliExpress) + Playwright fallback (Banggood, Shopee)
 *   3. Save results to DB
 *   4. AI match scoring (Claude Haiku batch)
 *   5. Cargo calculation for top results
 *   6. Final ranking by ROI
 *
 * Supports two modes:
 *   - "quick" mode: just returns ExternalProduct[] (backward compat with old queue)
 *   - "full" mode: saves to ExternalSearchJob, runs AI scoring + cargo calc
 */

import { Worker, Job } from 'bullmq';
import { BrowserContext } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { redisConnection } from '../redis';
import { browserPool } from '../browser-pool';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const CUSTOMS_DUTY_RATE = parseFloat(process.env.CUSTOMS_DUTY_RATE ?? '0.10');
const VAT_RATE = parseFloat(process.env.VAT_RATE ?? '0.12');
// Playwright wait times — configurable for slower/faster environments
const BANGGOOD_LOAD_WAIT_MS   = parseInt(process.env.BANGGOOD_LOAD_WAIT_MS   ?? '8000');
const BANGGOOD_SCROLL_WAIT_MS = parseInt(process.env.BANGGOOD_SCROLL_WAIT_MS ?? '2000');
const SHOPEE_LOAD_WAIT_MS     = parseInt(process.env.SHOPEE_LOAD_WAIT_MS     ?? '6000');
const SHOPEE_SCROLL_WAIT_MS   = parseInt(process.env.SHOPEE_SCROLL_WAIT_MS   ?? '2000');
const DHGATE_LOAD_WAIT_MS     = parseInt(process.env.DHGATE_LOAD_WAIT_MS     ?? '6000');
const DHGATE_SCROLL_WAIT_MS   = parseInt(process.env.DHGATE_SCROLL_WAIT_MS   ?? '2000');
const ALIEXPRESS_LOAD_WAIT_MS  = parseInt(process.env.ALIEXPRESS_LOAD_WAIT_MS  ?? '7000');
const ALIEXPRESS_SCROLL_WAIT_MS = parseInt(process.env.ALIEXPRESS_SCROLL_WAIT_MS ?? '2000');
const WILDBERRIES_LOAD_WAIT_MS  = parseInt(process.env.WILDBERRIES_LOAD_WAIT_MS  ?? '6000');
const OZON_LOAD_WAIT_MS         = parseInt(process.env.OZON_LOAD_WAIT_MS         ?? '7000');
const TRENDYOL_LOAD_WAIT_MS     = parseInt(process.env.TRENDYOL_LOAD_WAIT_MS     ?? '6000');
const HEPSIBURADA_LOAD_WAIT_MS  = parseInt(process.env.HEPSIBURADA_LOAD_WAIT_MS  ?? '6000');
const IMAGE_LOAD_WAIT_MS        = parseInt(process.env.IMAGE_LOAD_WAIT_MS        ?? '8000');
const PIPELINE_TIMEOUT_MS = 90_000; // T-461: global pipeline timeout

// Currency conversion fallbacks (env-overridable)
const RUB_TO_USD = parseFloat(process.env.RUB_TO_USD ?? '0.011'); // ~1 RUB = $0.011
const TRY_TO_USD = parseFloat(process.env.TRY_TO_USD ?? '0.030'); // ~1 TRY = $0.030

// T-462/T-463: currency per platform
const PLATFORM_CURRENCY: Record<string, string> = {
  aliexpress:   'USD',
  dhgate:       'USD',
  banggood:     'USD',
  shopee:       'USD',
  alibaba:      'USD',
  '1688':       'CNY',
  taobao:       'CNY',
  wildberries:  'RUB',
  ozon:         'RUB',
  trendyol:     'TRY',
  hepsiburada:  'TRY',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourcingSearchJobData {
  query: string;
  // Full mode fields (optional — if present, activates full pipeline)
  jobId?: string;
  productId?: number;
  productTitle?: string;
  accountId?: string;
  platforms?: string[];
  productImageUrl?: string;
}

export interface ExternalProduct {
  title: string;
  price: string;
  source: string;
  link: string;
  image: string;
  store: string;
}

// ─── AI Client ───────────────────────────────────────────────────────────────

function getAiClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

async function aiGenerateQuery(
  ai: Anthropic,
  title: string,
): Promise<{ cn_query: string; en_query: string }> {
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content:
          `Mahsulot: "${title}"\n\n` +
          `JSON qaytir (boshqa hech narsa yozmang):\n` +
          `{"cn_query":"1688/Taobao uchun qisqa qidiruv","en_query":"AliExpress/Amazon uchun inglizcha"}`,
      }],
    });
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    // Strip markdown code block if model wraps response: ```json ... ```
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);
    return { cn_query: parsed.cn_query || title, en_query: parsed.en_query || title };
  } catch (err) {
    logJobInfo('sourcing-search', '-', 'aiGenerateQuery', `AI query generation failed: ${err}`);
    return { cn_query: title, en_query: title };
  }
}

async function aiScoreResults(
  ai: Anthropic,
  uzumTitle: string,
  results: Array<{ idx: number; title: string; price: string; platform: string }>,
): Promise<Map<number, { score: number; note: string }>> {
  const map = new Map<number, { score: number; note: string }>();
  if (results.length === 0) return map;
  try {
    const list = results.map((r) => `${r.idx}. [${r.platform}] ${r.title} — ${r.price}`).join('\n');
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content:
          `Uzum mahsuloti: "${uzumTitle}"\n\n` +
          `Quyidagilarni 0.0-1.0 match_score bilan baho.\n` +
          `0.8+ = xuddi shu, 0.5-0.8 = oxshash, <0.5 = boshqa.\n\n` +
          `${list}\n\n` +
          `Faqat JSON: [{"index":0,"match_score":0.9,"note":"..."},...]`,
      }],
    });
    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        map.set(item.index, {
          score: Math.min(1, Math.max(0, item.match_score ?? 0.5)),
          note: item.note ?? '',
        });
      }
    }
  } catch (err) {
    logJobInfo('sourcing-search', '-', 'aiScoreResults', `AI scoring failed: ${err}`);
  }
  return map;
}

// ─── Playwright Scrapers ─────────────────────────────────────────────────────

async function scrapeBanggood(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  const captured: Array<{ url: string; json: any }> = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('banggood.com') && ct.includes('application/json')) {
        const text = await response.text();
        if (text.length > 100) {
          captured.push({ url, json: JSON.parse(text) });
        }
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.banggood.com/search/${encodeURIComponent(query)}_1.html`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    await page.waitForTimeout(BANGGOOD_LOAD_WAIT_MS);

    // Check captured JSON for product list
    logJobInfo('sourcing-search', '-', 'scrapeBanggood', `Intercepted ${captured.length} JSON responses`);
    for (const { url: capUrl, json } of captured) {
      const list =
        json?.data?.list ?? json?.list ?? json?.result?.list ??
        json?.products ?? json?.data?.products ?? json?.ret?.list ?? json?.data?.ret?.list;
      if (Array.isArray(list) && list.length > 0) {
        logJobInfo('sourcing-search', '-', 'scrapeBanggood', `JSON hit: ${capUrl.slice(0, 80)} (${list.length} items)`);
        return list.slice(0, 8).map((item: Record<string, unknown>) => ({
          title: (item.name ?? item.title ?? item.goods_name ?? '') as string,
          price: (item.price ?? item.sale_price ?? item.shop_price ?? '') as string,
          source: 'BANGGOOD',
          link: (item.url ?? item.goods_url ?? '') as string,
          image: (item.img ?? item.goods_img ?? item.image ?? '') as string,
          store: 'Banggood',
        })).filter((i: ExternalProduct) => i.title.length > 0);
      }
    }

    // DOM fallback
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(BANGGOOD_SCROLL_WAIT_MS);

    const finalUrl = page.url();
    logJobInfo('sourcing-search', '-', 'scrapeBanggood', `Final URL: ${finalUrl.slice(0, 100)}`);

    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('li[data-product-id]')).slice(0, 10);
      return cards.map((card) => {
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const linkEl = card.querySelector('a[href*="banggood.com"]') as HTMLAnchorElement | null;
        const priceEl = card.querySelector('.main-price, .price, .stprice, [class*="price"]');
        const goodsNameEl = card.querySelector('[class*="title"], a[title], .goods-name, .p-name, [class*="name"]');
        return {
          title: goodsNameEl?.getAttribute('title') ?? goodsNameEl?.textContent?.trim() ?? imgEl?.getAttribute('alt') ?? linkEl?.getAttribute('title') ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'BANGGOOD',
          link: linkEl?.getAttribute('href') ?? `https://www.banggood.com/p-${card.getAttribute('data-product-id')}.html`,
          image: imgEl?.getAttribute('data-src') ?? imgEl?.getAttribute('data-original') ?? imgEl?.getAttribute('src') ?? '',
          store: 'Banggood',
        };
      });
    });
    const filtered = items.filter((i) => i.title.length > 0);
    logJobInfo('sourcing-search', '-', 'scrapeBanggood', `DOM: ${items.length} cards, ${filtered.length} with title`);
    return filtered;
  } finally {
    await page.close();
  }
}

async function scrapeShopee(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let shopeeItems: any[] = [];
  let shopeeBase = 'https://shopee.com';

  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('search_items') && url.includes('keyword=')) {
        const json = await response.json();
        const items = json?.items ?? json?.data?.items;
        if (Array.isArray(items) && items.length > 0 && shopeeItems.length === 0) {
          shopeeItems = items;
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
    if (finalUrl.includes('chromewebdata') || finalUrl.includes('captcha') || finalUrl.includes('challenge')) {
      return [];
    }

    await page.waitForTimeout(SHOPEE_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(SHOPEE_SCROLL_WAIT_MS);

    if (shopeeItems.length > 0) {
      return shopeeItems.slice(0, 8).map((item: any) => {
        const basic = item.item_basic ?? item;
        const shopid = item.shopid ?? basic.shopid ?? 0;
        const itemid = item.itemid ?? basic.itemid ?? 0;
        const name = basic.name ?? basic.title ?? '';
        const rawPrice = basic.price ?? basic.price_min ?? 0;
        const currency = basic.currency ?? 'SGD';
        // Shopee API returns prices in micro-units (price / 100000)
        const priceNum = rawPrice > 1000 ? rawPrice / 100000 : rawPrice;
        const priceStr = priceNum > 0 ? `${currency} ${priceNum.toFixed(2)}` : '';
        const imageHash = basic.image ?? '';
        const imageUrl = imageHash ? `https://cf.shopee.com/file/${imageHash}_tn` : '';
        return {
          title: name,
          price: priceStr,
          source: 'SHOPEE',
          link: shopid && itemid ? `${shopeeBase}/-i.${shopid}.${itemid}` : shopeeBase + '/search?keyword=' + encodeURIComponent(query),
          image: imageUrl,
          store: 'Shopee',
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    // DOM fallback
    const items: ExternalProduct[] = await page.evaluate(() => {
      const selectors = ['[data-sqe="item"]', '[class*="shopee-search-item"]', '[class*="product-item"]', '[class*="col-xs-2-4"]'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 2) { cards = Array.from(found).slice(0, 8); break; }
      }
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
    return items.filter((i: ExternalProduct) => i.title.length > 0 && i.price.length > 0);
  } finally {
    await page.close();
  }
}

async function scrapeDHgate(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  const captured: Array<{ url: string; json: any }> = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if ((url.includes('dhgate.com') || url.includes('dhresource.com')) && ct.includes('application/json')) {
        const text = await response.text();
        if (text.length > 200) captured.push({ url, json: JSON.parse(text) });
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(query)}&catalog=`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(DHGATE_LOAD_WAIT_MS);

    // Try network-intercepted JSON
    for (const { url: capUrl, json } of captured) {
      const list =
        json?.Data?.product_list ?? json?.data?.product_list ??
        json?.products ?? json?.data?.products ??
        json?.result?.products ?? json?.items;
      if (Array.isArray(list) && list.length > 0) {
        logJobInfo('sourcing-search', '-', 'scrapeDHgate', `JSON hit: ${capUrl.slice(0, 80)} (${list.length} items)`);
        return list.slice(0, 8).map((item: Record<string, any>) => ({
          title: String(item.productName ?? item.name ?? item.title ?? ''),
          price: String(item.currentprice ?? item.min_price ?? item.price ?? ''),
          source: 'DHGATE',
          link: String(item.productPageUrl ?? item.url ?? `https://www.dhgate.com/store/product/${item.skuid ?? ''}`),
          image: String(item.imageURL ?? item.img ?? item.image ?? ''),
          store: String((item.storeInfo as Record<string, unknown>)?.storeName ?? item.storeName ?? 'DHgate'),
        })).filter((i: ExternalProduct) => i.title.length > 0);
      }
    }

    // DOM fallback
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(DHGATE_SCROLL_WAIT_MS);

    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll('[class*="list-item"], [class*="item-info"], .gallery-item, [class*="product-item"]'),
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="title"], a[title], h3');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = card.querySelector('a[href]') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        return {
          title: titleEl?.getAttribute('title') ?? titleEl?.textContent?.trim() ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'DHGATE',
          link: href.startsWith('http') ? href : `https://www.dhgate.com${href}`,
          image: imgEl?.getAttribute('data-src') ?? imgEl?.getAttribute('src') ?? '',
          store: 'DHgate',
        };
      });
    });
    const filtered = items.filter((i) => i.title.length > 0 && i.price.length > 0);
    logJobInfo('sourcing-search', '-', 'scrapeDHgate', `DOM: ${items.length} cards, ${filtered.length} with title+price`);
    return filtered;
  } finally {
    await page.close();
  }
}

async function scrapeAliExpress(
  query: string,
  context: BrowserContext,
): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let aeItems: any[] = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('aliexpress.com') && ct.includes('application/json') &&
          (url.includes('search') || url.includes('fn/'))) {
        const json = await response.json();
        const list =
          json?.result?.mods?.itemList?.content ??
          json?.data?.result?.resultList ??
          json?.result?.resultList ??
          json?.items;
        if (Array.isArray(list) && list.length > 0 && aeItems.length === 0) {
          aeItems = list;
          logJobInfo('sourcing-search', '-', 'scrapeAliExpress', `JSON hit: ${url.slice(0, 80)} (${list.length} items)`);
        }
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});

    const finalUrl = page.url();
    if (finalUrl.includes('captcha') || finalUrl.includes('challenge') || finalUrl.includes('login')) {
      logJobInfo('sourcing-search', '-', 'scrapeAliExpress', `Blocked: ${finalUrl.slice(0, 80)}`);
      return [];
    }

    await page.waitForTimeout(ALIEXPRESS_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(ALIEXPRESS_SCROLL_WAIT_MS);

    if (aeItems.length > 0) {
      return aeItems.slice(0, 8).map((item: Record<string, any>) => {
        const itemId = String(item.itemId ?? item.productId ?? '');
        const title = String(item.title ?? item.productTitle ?? item.name ?? '');
        const priceStr: string =
          (item.prices as any)?.salePrice?.formattedPrice ??
          (item.price as any)?.formattedPrice ??
          String(item.salePrice ?? '');
        return {
          title,
          price: priceStr,
          source: 'ALIEXPRESS',
          link: itemId ? `https://www.aliexpress.com/item/${itemId}.html` : url,
          image: String(item.image ?? item.productImageUrl ?? ''),
          store: String((item.store as any)?.storeName ?? item.storeName ?? 'AliExpress'),
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    // DOM fallback
    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll('[class*="manhattan--container"], [class*="product-item"], [class*="item-wrap"]'),
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="title"], h3, [class*="name"]');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = (card.tagName === 'A' ? card : card.querySelector('a')) as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'ALIEXPRESS',
          link: href.startsWith('http') ? href : `https://www.aliexpress.com${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: 'AliExpress',
        };
      });
    });
    const filtered = items.filter((i) => i.title.length > 0 && i.price.length > 0);
    logJobInfo('sourcing-search', '-', 'scrapeAliExpress', `DOM: ${items.length} cards, ${filtered.length} with title+price`);
    return filtered;
  } finally {
    await page.close();
  }
}

// ─── Wildberries REST API ─────────────────────────────────────────────────────

async function searchWildberries(query: string): Promise<ExternalProduct[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://search.wb.ru/exactmatch/ru/common/v4/search?query=${encoded}&resultset=catalog&limit=20&sort=popular&page=1&appType=1&curr=rub&lang=ru&dest=-1257786`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const products: any[] = data?.data?.products ?? [];
    return products.slice(0, 10).map((p: any) => {
      const priceRub = (p.salePriceU ?? p.priceU ?? 0) / 100;
      const priceUsd = priceRub * RUB_TO_USD;
      return {
        title: String(p.name ?? ''),
        price: `$${priceUsd.toFixed(2)}`,
        source: 'WILDBERRIES',
        link: `https://www.wildberries.ru/catalog/${p.id}/detail.aspx`,
        image: '',
        store: String(p.brand ?? 'Wildberries'),
      };
    }).filter((i: ExternalProduct) => i.title.length > 0 && i.price !== '$0.00');
  } catch (err) {
    logJobInfo('sourcing-search', '-', 'searchWildberries', `WB API failed: ${err}`);
    return [];
  }
}

// ─── Ozon Playwright ─────────────────────────────────────────────────────────

async function scrapeOzon(query: string, context: BrowserContext): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  try {
    const url = `https://www.ozon.ru/search/?text=${encodeURIComponent(query)}&from_global=true`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    const finalUrl = page.url();
    if (finalUrl.includes('captcha') || finalUrl.includes('challenge')) return [];
    await page.waitForTimeout(OZON_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    const items: ExternalProduct[] = await page.evaluate((rubToUsd: number) => {
      const selectors = ['[data-widget="searchResultsV2"] > div > div', '[class*="tile-root"]', '[class*="j3k"]'];
      let cards: Element[] = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 2) { cards = Array.from(found).slice(0, 10); break; }
      }
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="tsBody"], [class*="title"], span[class*="eCFs"]');
        const priceEl = card.querySelector('[class*="price"], [class*="tsBodyControl500Medium"]');
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        const priceRaw = priceEl?.textContent?.replace(/[^\d]/g, '') ?? '0';
        const priceRub = parseInt(priceRaw, 10) || 0;
        const priceUsd = priceRub * rubToUsd;
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : (priceEl?.textContent?.trim() ?? ''),
          source: 'OZON',
          link: href.startsWith('http') ? href : `https://www.ozon.ru${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: 'Ozon',
        };
      });
    }, RUB_TO_USD);
    const filtered = items.filter((i) => i.title.length > 0 && i.price.length > 0);
    logJobInfo('sourcing-search', '-', 'scrapeOzon', `DOM: ${items.length} cards, ${filtered.length} valid`);
    return filtered;
  } finally {
    await page.close();
  }
}

// ─── Trendyol Playwright ──────────────────────────────────────────────────────

async function scrapeTrendyol(query: string, context: BrowserContext): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let trendyolItems: any[] = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('trendyol.com') && ct.includes('application/json') &&
          (url.includes('search') || url.includes('filter'))) {
        const json = await response.json();
        const items = json?.result?.products ?? json?.products;
        if (Array.isArray(items) && items.length > 0 && trendyolItems.length === 0) trendyolItems = items;
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.trendyol.com/sr?q=${encodeURIComponent(query)}&qt=${encodeURIComponent(query)}&st=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    const finalUrl = page.url();
    if (finalUrl.includes('captcha') || finalUrl.includes('challenge')) return [];
    await page.waitForTimeout(TRENDYOL_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    if (trendyolItems.length > 0) {
      return trendyolItems.slice(0, 8).map((item: any) => {
        const priceObj = item.price ?? {};
        const priceTry = priceObj.discountedPrice?.value ?? priceObj.originalPrice?.value ?? item.discountedPrice ?? 0;
        const priceUsd = Number(priceTry) * TRY_TO_USD;
        return {
          title: String(item.name ?? ''),
          price: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : String(priceTry),
          source: 'TRENDYOL',
          link: item.url ? `https://www.trendyol.com${item.url}` : url,
          image: item.images?.[0] ? `https://cdn.dsmcdn.com/${item.images[0]}` : '',
          store: String(item.merchantName ?? 'Trendyol'),
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    const items: ExternalProduct[] = await page.evaluate((tryToUsd: number) => {
      const cards = Array.from(
        document.querySelectorAll('.p-card-wrppr, [class*="productCard"], [class*="product-card"]')
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="product-title"], [class*="title"]');
        const priceEl = card.querySelector('[class*="prc-box-dscntd"], [class*="price"]');
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        const priceTry = parseFloat((priceEl?.textContent ?? '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const priceUsd = priceTry * tryToUsd;
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : (priceEl?.textContent?.trim() ?? ''),
          source: 'TRENDYOL',
          link: href.startsWith('http') ? href : `https://www.trendyol.com${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: 'Trendyol',
        };
      });
    }, TRY_TO_USD);
    return items.filter((i) => i.title.length > 0 && i.price.length > 0);
  } finally {
    await page.close();
  }
}

// ─── Hepsiburada Playwright ───────────────────────────────────────────────────

async function scrapeHepsiburada(query: string, context: BrowserContext): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let hepsiItems: any[] = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if ((url.includes('hepsiburada.com') || url.includes('hepsiapigateway.com')) && ct.includes('application/json')) {
        const json = await response.json();
        const items = json?.data?.products ?? json?.data ?? json?.products ?? json?.result?.products;
        if (Array.isArray(items) && items.length > 0 && hepsiItems.length === 0) hepsiItems = items;
      }
    } catch { /* ignore */ }
  });

  try {
    const url = `https://www.hepsiburada.com/ara?q=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    const finalUrl = page.url();
    if (finalUrl.includes('captcha') || finalUrl.includes('challenge')) return [];
    await page.waitForTimeout(HEPSIBURADA_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    if (hepsiItems.length > 0) {
      return hepsiItems.slice(0, 8).map((item: any) => {
        const priceTry = item.price ?? item.finalPrice ?? item.campaignPrice ?? 0;
        const priceUsd = Number(priceTry) * TRY_TO_USD;
        return {
          title: String(item.name ?? item.displayName ?? ''),
          price: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : String(priceTry),
          source: 'HEPSIBURADA',
          link: item.url ? `https://www.hepsiburada.com${item.url}` : url,
          image: String(item.images?.[0] ?? item.imageUrl ?? ''),
          store: String(item.merchantName ?? 'Hepsiburada'),
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    const items: ExternalProduct[] = await page.evaluate((tryToUsd: number) => {
      const cards = Array.from(
        document.querySelectorAll('[data-test-id="product-card-wrapper"], li[class*="productListItem"]')
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[data-test-id="product-title"], [class*="title"]');
        const priceEl = card.querySelector('[data-test-id="price-current-price"], [class*="price"]');
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        const priceTry = parseFloat((priceEl?.textContent ?? '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        const priceUsd = priceTry * tryToUsd;
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : (priceEl?.textContent?.trim() ?? ''),
          source: 'HEPSIBURADA',
          link: href.startsWith('http') ? href : `https://www.hepsiburada.com${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: 'Hepsiburada',
        };
      });
    }, TRY_TO_USD);
    return items.filter((i) => i.title.length > 0 && i.price.length > 0);
  } finally {
    await page.close();
  }
}

// ─── Image Search Scrapers ────────────────────────────────────────────────────

/** Google Lens via SerpAPI — cross-platform visual search (NOT google_shopping) */
async function serpApiLensSearch(imageUrl: string): Promise<ExternalProduct[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine: 'google_lens', url: imageUrl });
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    const items: any[] = data?.visual_matches ?? data?.image_results ?? [];
    return items.slice(0, 15).map((item: any) => ({
      title: String(item.title ?? ''),
      price: item.price ? `$${parseFloat(String(item.price).replace(/[^0-9.]/g, '')).toFixed(2)}` : '',
      source: 'GOOGLE_LENS',
      link: String(item.link ?? ''),
      image: String(item.thumbnail ?? item.image ?? ''),
      store: String(item.source ?? 'Google Lens'),
    })).filter((i: ExternalProduct) => i.title.length > 0 && i.link.length > 0);
  } catch (err) {
    logJobInfo('sourcing-search', '-', 'serpApiLensSearch', `Google Lens failed: ${err}`);
    return [];
  }
}

/** AliExpress image search — Playwright */
async function scrapeAliExpressImage(imageUrl: string, context: BrowserContext): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let aeItems: any[] = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('aliexpress.com') && ct.includes('application/json') &&
          (url.includes('search') || url.includes('fn/') || url.includes('image'))) {
        const json = await response.json();
        const list =
          json?.result?.mods?.itemList?.content ??
          json?.data?.result?.resultList ??
          json?.result?.resultList ??
          json?.items;
        if (Array.isArray(list) && list.length > 0 && aeItems.length === 0) aeItems = list;
      }
    } catch { /* ignore */ }
  });

  try {
    const searchUrl = `https://www.aliexpress.com/searchengine/searchnow?SearchText=&imageUrl=${encodeURIComponent(imageUrl)}&tabCode=imgSearch`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    const finalUrl = page.url();
    if (finalUrl.includes('captcha') || finalUrl.includes('challenge') || finalUrl.includes('login')) return [];
    await page.waitForTimeout(IMAGE_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    if (aeItems.length > 0) {
      return aeItems.slice(0, 8).map((item: Record<string, any>) => {
        const itemId = String(item.itemId ?? item.productId ?? '');
        const priceStr: string =
          (item.prices as any)?.salePrice?.formattedPrice ??
          (item.price as any)?.formattedPrice ??
          String(item.salePrice ?? '');
        return {
          title: String(item.title ?? item.productTitle ?? item.name ?? ''),
          price: priceStr,
          source: 'ALIEXPRESS',
          link: itemId ? `https://www.aliexpress.com/item/${itemId}.html` : searchUrl,
          image: String(item.image ?? item.productImageUrl ?? ''),
          store: String((item.store as any)?.storeName ?? 'AliExpress'),
        };
      }).filter((i: ExternalProduct) => i.title.length > 0);
    }

    // DOM fallback
    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll('[class*="manhattan--container"], [class*="product-item"], [class*="item-wrap"]')
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="title"], h3, [class*="name"]');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = (card.tagName === 'A' ? card : card.querySelector('a')) as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        return {
          title: titleEl?.textContent?.trim() ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'ALIEXPRESS',
          link: href.startsWith('http') ? href : `https://www.aliexpress.com${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: 'AliExpress',
        };
      });
    });
    return items.filter((i) => i.title.length > 0 && i.price.length > 0);
  } finally {
    await page.close();
  }
}

/** 1688 image search — Playwright */
async function scrape1688Image(imageUrl: string, context: BrowserContext): Promise<ExternalProduct[]> {
  const page = await context.newPage();
  let items1688: any[] = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = response.headers()['content-type'] ?? '';
      if (url.includes('1688.com') && ct.includes('application/json')) {
        const json = await response.json();
        const list = json?.data?.offerList ?? json?.offerList ?? json?.data?.data;
        if (Array.isArray(list) && list.length > 0 && items1688.length === 0) items1688 = list;
      }
    } catch { /* ignore */ }
  });

  try {
    const searchUrl = `https://s.1688.com/selloffer/offer_search.htm?keywords=&imageAddress=${encodeURIComponent(imageUrl)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25_000 }).catch(() => {});
    const finalUrl = page.url();
    if (finalUrl.includes('login') || finalUrl.includes('captcha')) return [];
    await page.waitForTimeout(IMAGE_LOAD_WAIT_MS);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

    if (items1688.length > 0) {
      return items1688.slice(0, 8).map((item: any) => ({
        title: String(item.offerName ?? item.subject ?? ''),
        price: item.price ? `$${(parseFloat(String(item.price)) * 0.138).toFixed(2)}` : '',
        source: '1688',
        link: String(item.offerUrl ?? item.detailUrl ?? `https://www.1688.com`),
        image: String(item.image?.imgUrl ?? item.mainImage ?? ''),
        store: String(item.company?.name ?? item.sellerLogin ?? '1688'),
      })).filter((i: ExternalProduct) => i.title.length > 0);
    }

    // DOM fallback
    const domItems: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll('[class*="offer-list-item"], [class*="list-item"], .offer-list-snap-item')
      ).slice(0, 10);
      return cards.map((card) => {
        const titleEl = card.querySelector('[class*="offer-title"], a[title], h3');
        const priceEl = card.querySelector('[class*="price"]');
        const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const href = linkEl?.getAttribute('href') ?? '';
        return {
          title: titleEl?.getAttribute('title') ?? titleEl?.textContent?.trim() ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: '1688',
          link: href.startsWith('http') ? href : `https:${href}`,
          image: imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? '',
          store: '1688.com',
        };
      });
    });
    return domItems.filter((i) => i.title.length > 0 && i.price.length > 0);
  } finally {
    await page.close();
  }
}

// ─── Full Pipeline ───────────────────────────────────────────────────────────

async function runFullPipeline(data: SourcingSearchJobData): Promise<ExternalProduct[]> {
  const { jobId, productId, productTitle, accountId, query } = data;

  // Update job status
  if (jobId) {
    await prisma.externalSearchJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' },
    });
  }

  // Step 1: AI query generation
  const ai = getAiClient();
  let cnQuery = query;
  let enQuery = query;
  if (ai && productTitle) {
    const queries = await aiGenerateQuery(ai, productTitle);
    cnQuery = queries.cn_query;
    enQuery = queries.en_query;
    logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `AI queries: cn="${cnQuery}" en="${enQuery}"`);
  }

  // Step 2: Load platform IDs
  const platforms = await prisma.externalPlatform.findMany({ where: { is_active: true } });
  const platformMap = new Map(platforms.map((p) => [p.code, p.id]));

  // Step 3: Parallel search — REST APIs + Playwright scrapers
  const playwrightEnabled = process.env.ENABLE_PLAYWRIGHT_SCRAPERS !== 'false';
  const wholesaleEnabled  = process.env.ENABLE_WHOLESALE_SCRAPERS  !== 'false';
  const needsPlaywright = playwrightEnabled || wholesaleEnabled;

  let browser: import('playwright').Browser | null = null;
  let context: import('playwright').BrowserContext | null = null;

  if (needsPlaywright) {
    browser = await browserPool.getBrowser();
    if (browserPool.isBrightData()) {
      const existingContexts = browser.contexts();
      context = existingContexts.length > 0 ? existingContexts[0] : await browser.newContext();
    } else {
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        viewport: { width: 1366, height: 768 },
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
      });
    }
  }

  try {
    // T-461: Global 90s timeout — prevent Playwright hang
    const apiFetches: Promise<ExternalProduct[]>[] = [
      searchWildberries(enQuery),
      searchWildberries(cnQuery),
    ];

    const playwrightCalls: Promise<ExternalProduct[]>[] = context ? [
      ...(playwrightEnabled ? [scrapeBanggood(enQuery, context), scrapeShopee(enQuery, context)] : []),
      ...(wholesaleEnabled  ? [scrapeDHgate(enQuery, context), scrapeAliExpress(enQuery, context)] : []),
      scrapeOzon(enQuery, context),
      scrapeTrendyol(enQuery, context),
      scrapeHepsiburada(enQuery, context),
    ] : [];

    // Image-based searches (when productImageUrl is available)
    const imageFetches: Promise<ExternalProduct[]>[] = data.productImageUrl ? [
      serpApiLensSearch(data.productImageUrl),
      ...(context ? [
        scrapeAliExpressImage(data.productImageUrl, context),
        scrape1688Image(data.productImageUrl, context),
      ] : []),
    ] : [];

    const timeoutPromise: Promise<never> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Pipeline timeout after ${PIPELINE_TIMEOUT_MS}ms`)), PIPELINE_TIMEOUT_MS),
    );

    const allResults = await Promise.race([
      Promise.allSettled([...apiFetches, ...playwrightCalls, ...imageFetches]),
      timeoutPromise,
    ]);

    // Collect all as ExternalProduct[]
    const allProducts: ExternalProduct[] = [];
    for (const result of allResults) {
      if (result.status === 'rejected') {
        logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `Search failed: ${String(result.reason)}`);
        continue;
      }
      allProducts.push(...result.value);
    }

    logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `Total products collected: ${allProducts.length}`);

    // Step 4: Save ALL results to DB (if full mode)
    if (jobId) {
      // CNY → USD conversion rate
      const cnyRateRow = await prisma.currencyRate.findUnique({
        where: { from_code_to_code: { from_code: 'CNY', to_code: 'UZS' } },
      });
      const usdRateRow = await prisma.currencyRate.findUnique({
        where: { from_code_to_code: { from_code: 'USD', to_code: 'UZS' } },
      });
      const cnyToUsd = (cnyRateRow && usdRateRow)
        ? Number(cnyRateRow.rate) / Number(usdRateRow.rate)
        : 0.138; // fallback: ~1 CNY = 0.138 USD

      for (const item of allProducts) {
        const code = item.source.toLowerCase();
        const platId = platformMap.get(code);
        if (!platId) continue;
        const currency = PLATFORM_CURRENCY[code] ?? 'USD';
        const priceNum = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
        const priceUsd = currency === 'CNY' ? priceNum * cnyToUsd : priceNum;
        await prisma.externalSearchResult.create({
          data: {
            job_id: jobId,
            platform_id: platId,
            title: item.title,
            price_usd: priceUsd,
            price_local: priceNum,
            currency,
            url: item.link,
            image_url: item.image || null,
            seller_name: item.store,
          },
        });
      }

      // Step 5: AI match scoring
      if (ai && productTitle) {
        const allDbResults = await prisma.externalSearchResult.findMany({
          where: { job_id: jobId },
          orderBy: { created_at: 'asc' },
        });

        // Reverse map: platform_id → code (human-readable for AI)
        const platformIdToCode = new Map(platforms.map((p) => [p.id, p.code]));
        const forScoring = allDbResults.map((r, i) => ({
          idx: i,
          title: r.title,
          price: `$${Number(r.price_usd).toFixed(2)}`,
          platform: platformIdToCode.get(r.platform_id) ?? 'unknown',
        }));

        const scores = await aiScoreResults(ai, productTitle, forScoring);

        // Update scores in DB
        for (let i = 0; i < allDbResults.length; i++) {
          const scoreData = scores.get(i);
          if (scoreData) {
            await prisma.externalSearchResult.update({
              where: { id: allDbResults[i].id },
              data: {
                ai_match_score: scoreData.score,
                ai_notes: scoreData.note,
                rank: i + 1,
              },
            });
          }
        }

        logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `AI scored ${scores.size}/${allDbResults.length} results`);
      }

      // Step 6: Calculate cargo for top results (match_score >= 0.5)
      const topResults = await prisma.externalSearchResult.findMany({
        where: {
          job_id: jobId,
          ai_match_score: { gte: 0.5 },
        },
        orderBy: { ai_match_score: 'desc' },
        take: 10,
      });

      if (topResults.length > 0 && accountId) {
        const cargoProviders = await prisma.cargoProvider.findMany({
          where: { is_active: true },
          take: 1,
          orderBy: { rate_per_kg: 'asc' },
        });

        const rates = await prisma.currencyRate.findMany({ where: { to_code: 'UZS' } });
        const usdRate = rates.find((r) => r.from_code === 'USD');
        if (!usdRate) {
          logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', 'USD rate not found in DB — skipping cargo calculation');
        }
        const usdToUzs = usdRate ? Number(usdRate.rate) : 0;

        // Get Uzum product price for margin calc
        let uzumPriceUzs = 0;
        if (productId) {
          const sku = await prisma.sku.findFirst({
            where: { product_id: BigInt(productId) },
            orderBy: { min_sell_price: 'asc' },
          });
          uzumPriceUzs = sku?.min_sell_price ? Number(sku.min_sell_price) : 0;
        }

        const defaultProvider = cargoProviders[0];
        if (defaultProvider && usdToUzs > 0) {
          for (const result of topResults) {
            const priceUsd = Number(result.price_usd);
            // Weight estimate: use category-based heuristic (default 0.5kg for small items)
            const estWeightKg = priceUsd > 50 ? 1.0 : priceUsd > 20 ? 0.7 : 0.5;
            const cargoCost = estWeightKg * Number(defaultProvider.rate_per_kg);
            const base = priceUsd + cargoCost;
            const customs = base * CUSTOMS_DUTY_RATE;
            const vat = (base + customs) * VAT_RATE;
            const landedUsd = priceUsd + cargoCost + customs + vat;
            const landedUzs = landedUsd * usdToUzs;

            let margin: number | null = null;
            let roi: number | null = null;
            if (uzumPriceUzs > 0) {
              const profit = uzumPriceUzs - landedUzs;
              margin = (profit / uzumPriceUzs) * 100;
              roi = (profit / landedUzs) * 100;
            }

            await prisma.cargoCalculation.create({
              data: {
                account_id: accountId,
                provider_id: defaultProvider.id,
                job_id: jobId,
                result_id: result.id,
                item_name: result.title.slice(0, 500),
                item_cost_usd: priceUsd,
                weight_kg: estWeightKg,
                quantity: 1,
                customs_rate: CUSTOMS_DUTY_RATE,
                vat_rate: VAT_RATE,
                cargo_cost_usd: cargoCost,
                customs_usd: customs,
                vat_usd: vat,
                landed_cost_usd: landedUsd,
                landed_cost_uzs: landedUzs,
                sell_price_uzs: uzumPriceUzs > 0 ? uzumPriceUzs : null,
                gross_margin: margin != null ? margin / 100 : null,
                roi: roi != null ? roi / 100 : null,
                usd_rate: usdToUzs,
              },
            });
          }
          logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `Cargo calculated for ${topResults.length} results`);
        }
      }

      // Step 7: Final rank by ROI
      const finalResults = await prisma.externalSearchResult.findMany({
        where: { job_id: jobId, ai_match_score: { gte: 0.5 } },
        include: { cargo_calculations: true },
        orderBy: { ai_match_score: 'desc' },
      });

      // Sort by composite score: 0.4*ROI + 0.25*match + 0.2*(1/days) + 0.15*rating
      const ranked = finalResults
        .map((r) => {
          const cargo = r.cargo_calculations[0];
          const roiVal = cargo?.roi ? Number(cargo.roi) : 0;
          const matchVal = Number(r.ai_match_score ?? 0);
          const daysVal = r.shipping_days ? 1 / r.shipping_days : 0.1;
          const ratingVal = Number(r.seller_rating ?? 0) / 5;
          const finalScore = 0.40 * roiVal + 0.25 * matchVal + 0.20 * daysVal + 0.15 * ratingVal;
          return { id: r.id, finalScore };
        })
        .sort((a, b) => b.finalScore - a.finalScore);

      for (let i = 0; i < ranked.length; i++) {
        await prisma.externalSearchResult.update({
          where: { id: ranked[i].id },
          data: { rank: i + 1 },
        });
      }

      // Mark job as done
      await prisma.externalSearchJob.update({
        where: { id: jobId },
        data: { status: 'DONE', finished_at: new Date() },
      });
    }

    return allProducts;
  } finally {
    if (context) await context.close().catch(() => {});
    if (needsPlaywright) await browserPool.release().catch(() => {});
  }
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export function createSourcingWorker() {
  const worker = new Worker<SourcingSearchJobData>(
    'sourcing-search',
    async (job: Job<SourcingSearchJobData>) => {
      const { query } = job.data;
      const start = Date.now();
      logJobStart('sourcing-search', job.id ?? '-', job.name, { query, full: !!job.data.jobId });

      try {
        const results = await runFullPipeline(job.data);
        logJobDone('sourcing-search', job.id ?? '-', job.name, Date.now() - start, { resultCount: results.length });
        return results;
      } catch (err) {
        logJobError('sourcing-search', job.id ?? '-', job.name, err, Date.now() - start);
        // Mark job as failed if full mode
        if (job.data.jobId) {
          await prisma.externalSearchJob.update({
            where: { id: job.data.jobId },
            data: { status: 'FAILED', finished_at: new Date() },
          }).catch(() => {});
        }
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1,
      lockDuration: 600_000, // 10 min — Playwright scraping can take 1-5 min
    },
  );

  worker.on('error', (err) => logJobError('sourcing-search', '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError('sourcing-search', job?.id ?? '-', job?.name ?? '-', err));
  worker.on('stalled', (jobId) => console.error(`[sourcing-search] stalled: ${jobId}`));

  return worker;
}
