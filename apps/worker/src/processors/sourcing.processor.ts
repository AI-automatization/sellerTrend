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
import { chromium, BrowserContext } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SourcingSearchJobData {
  query: string;
  // Full mode fields (optional — if present, activates full pipeline)
  jobId?: string;
  productId?: number;
  productTitle?: string;
  accountId?: string;
  platforms?: string[];
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
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
    const parsed = JSON.parse(text);
    return { cn_query: parsed.cn_query || title, en_query: parsed.en_query || title };
  } catch {
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
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
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

// ─── SerpAPI Client ──────────────────────────────────────────────────────────

async function serpApiSearch(
  query: string,
  engine: string,
  platformCode: string,
): Promise<Array<{ title: string; price_usd: number; currency: string; url: string; image: string; seller: string | null; external_id: string | null; platform_code: string }>> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];
  try {
    const params = new URLSearchParams({ api_key: apiKey, engine, q: query, num: '10' });
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) return [];
    const data = await res.json() as any;
    const items = data.organic_results ?? data.shopping_results ?? data.products_results ?? [];
    return items.slice(0, 10).map((item: any) => {
      const raw = item.price ?? item.extracted_price ?? item.offer_price ?? '0';
      const priceNum = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
      return {
        title: item.title ?? item.name ?? '',
        price_usd: priceNum,
        currency: ['amazon_de'].includes(platformCode) ? 'EUR' : 'CNY',
        url: item.link ?? item.product_link ?? item.url ?? '',
        image: item.thumbnail ?? item.image ?? '',
        seller: item.source ?? item.seller ?? item.shop_name ?? null,
        external_id: item.product_id ?? item.id ? String(item.product_id ?? item.id) : null,
        platform_code: platformCode,
      };
    }).filter((p: any) => p.title && p.price_usd > 0);
  } catch (err) {
    logJobInfo('sourcing-search', '-', 'searchSerpApi', `SerpAPI:${engine} failed: ${err}`);
    return [];
  }
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
    await page.waitForTimeout(8000);

    // Check captured JSON for product list
    for (const { json } of captured) {
      const list =
        json?.data?.list ?? json?.list ?? json?.result?.list ??
        json?.products ?? json?.data?.products ?? json?.ret?.list ?? json?.data?.ret?.list;
      if (Array.isArray(list) && list.length > 0) {
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

    // DOM fallback
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(2000);

    const items: ExternalProduct[] = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('li[data-product-id]')).slice(0, 10);
      return cards.map((card) => {
        const imgEl = card.querySelector('img') as HTMLImageElement | null;
        const linkEl = card.querySelector('a[href*="banggood.com"]') as HTMLAnchorElement | null;
        const priceEl = card.querySelector('.main-price, .price, .stprice, [class*="price"]');
        const goodsNameEl = card.querySelector('.goods-name, .p-name, [class*="name"]');
        return {
          title: goodsNameEl?.textContent?.trim() ?? imgEl?.getAttribute('alt') ?? linkEl?.getAttribute('title') ?? '',
          price: priceEl?.textContent?.trim() ?? '',
          source: 'BANGGOOD',
          link: linkEl?.getAttribute('href') ?? `https://www.banggood.com/p-${card.getAttribute('data-product-id')}.html`,
          image: imgEl?.getAttribute('data-src') ?? imgEl?.getAttribute('data-original') ?? imgEl?.getAttribute('src') ?? '',
          store: 'Banggood',
        };
      });
    });
    return items.filter((i) => i.title.length > 0);
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

    await page.waitForTimeout(6000);
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(2000);

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

  // Step 3: Parallel search — SerpAPI + Playwright
  const serpApiKey = process.env.SERPAPI_API_KEY;
  const apiSearches: Promise<any[]>[] = [];

  if (serpApiKey) {
    apiSearches.push(serpApiSearch(cnQuery, '1688', '1688'));
    apiSearches.push(serpApiSearch(cnQuery, 'taobao', 'taobao'));
    apiSearches.push(serpApiSearch(enQuery, 'alibaba', 'alibaba'));
  }

  // Always run Playwright scrapers
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

    // Run all searches in parallel
    const allResults = await Promise.allSettled([
      ...apiSearches,
      scrapeBanggood(enQuery, context),
      scrapeShopee(enQuery, context),
    ]);

    // Collect SerpAPI results
    const serpResults: Array<{ title: string; price_usd: number; currency: string; url: string; image: string; seller: string | null; external_id: string | null; platform_code: string }> = [];
    const playwrightProducts: ExternalProduct[] = [];

    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];
      if (result.status === 'rejected') {
        logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `Search ${i} failed: ${String(result.reason)}`);
        continue;
      }
      if (i < apiSearches.length) {
        serpResults.push(...(result.value as any[]));
      } else {
        playwrightProducts.push(...(result.value as ExternalProduct[]));
      }
    }

    logJobInfo('sourcing-search', jobId ?? '-', 'processSearch', `SerpAPI: ${serpResults.length}, Playwright: ${playwrightProducts.length}`);

    // Step 4: Save results to DB (if full mode)
    if (jobId) {
      // Save SerpAPI results
      for (const item of serpResults) {
        const platId = platformMap.get(item.platform_code);
        if (!platId) continue;
        await prisma.externalSearchResult.create({
          data: {
            job_id: jobId,
            platform_id: platId,
            external_id: item.external_id,
            title: item.title,
            price_usd: item.price_usd,
            price_local: item.price_usd,
            currency: item.currency,
            url: item.url,
            image_url: item.image || null,
            seller_name: item.seller,
          },
        });
      }

      // Save Playwright results
      for (const item of playwrightProducts) {
        const code = item.source === 'BANGGOOD' ? 'banggood' : 'shopee';
        const platId = platformMap.get(code);
        if (!platId) continue;
        const priceNum = parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0;
        await prisma.externalSearchResult.create({
          data: {
            job_id: jobId,
            platform_id: platId,
            title: item.title,
            price_usd: priceNum,
            currency: 'USD',
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
        const usdToUzs = usdRate ? Number(usdRate.rate) : 12900;

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
        if (defaultProvider) {
          for (const result of topResults) {
            const priceUsd = Number(result.price_usd);
            const estWeightKg = 0.5; // default estimate
            const cargoCost = estWeightKg * Number(defaultProvider.rate_per_kg);
            const customsRate = 0.10;
            const vatRate = 0.12;
            const base = priceUsd + cargoCost;
            const customs = base * customsRate;
            const vat = (base + customs) * vatRate;
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
                customs_rate: customsRate,
                vat_rate: vatRate,
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

    // Return ExternalProduct[] for backward compatibility
    const combined: ExternalProduct[] = [
      ...serpResults.map((r) => ({
        title: r.title,
        price: `$${r.price_usd.toFixed(2)}`,
        source: r.platform_code.toUpperCase(),
        link: r.url,
        image: r.image,
        store: r.seller ?? r.platform_code,
      })),
      ...playwrightProducts,
    ];

    return combined;
  } finally {
    await browser.close();
  }
}

// ─── Worker ──────────────────────────────────────────────────────────────────

export function createSourcingWorker() {
  return new Worker<SourcingSearchJobData>(
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
    { ...redisConnection, concurrency: 1 },
  );
}
