import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { sleep } from '@uzum/utils';
import { uzumGraphQLClient } from '../clients/uzum-graphql.client';
import { scrapeCategoryProductIds } from './uzum-scraper';
import { browserPool } from '../browser-pool';
import { tokenManager } from '../clients/token-manager';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE = 'seller-index-queue';
const REST_BASE = 'https://api.uzum.uz/api/v2';
const BATCH_SIZE = 6;
const BATCH_DELAY_MS = 400;
const SCROLL_COUNT = 20; // Per category — ~250-400 products

// ─── Uzum saytidagi barcha kategoriya URL larini topish ───────────────────────
async function discoverCategoryUrls(jobId: string): Promise<string[]> {
  logJobInfo(QUEUE, jobId, 'seller-index', 'Uzum.uz navigatsiyasidan kategoriyalar topilmoqda...');

  const browser = await browserPool.getBrowser();
  const cookieStr = tokenManager.getCookies();

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ru-RU',
  });

  if (cookieStr) {
    const cookies = cookieStr.split('; ').map((pair) => {
      const eqIdx = pair.indexOf('=');
      return { name: eqIdx > 0 ? pair.slice(0, eqIdx) : pair, value: eqIdx > 0 ? pair.slice(eqIdx + 1) : '', domain: '.uzum.uz', path: '/' };
    });
    await context.addCookies(cookies);
  }

  const urls: string[] = [];
  try {
    const page = await context.newPage();
    await page.goto('https://uzum.uz/ru', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Barcha kategoriya havolalarini olish
    const hrefs = await page.$$eval(
      'a[href*="/ru/category/"], a[href*="/uz/category/"]',
      (links) => links.map((l) => l.getAttribute('href') ?? '').filter(Boolean),
    );

    const seen = new Set<string>();
    for (const href of hrefs) {
      // Noto'g'ri URL (masalan https://uzum.uz prefiks bilan) tozalash
      const cleaned = href.replace(/^https:\/\/uzum\.uz(https:\/\/uzum\.uz)/, '$1');
      const url = cleaned.startsWith('http') ? cleaned : `https://uzum.uz${cleaned}`;
      // Reklama kategoriyalar va populyarnoe emas, haqiqiy kategoriyalar
      if (url.startsWith('https://uzum.uz') && url.includes('/category/') && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }

    logJobInfo(QUEUE, jobId, 'seller-index', `Topilgan kategoriya URL lari: ${urls.length}`);
  } catch (err) {
    logJobInfo(QUEUE, jobId, 'seller-index', `Kategoriya discovery xatosi: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await context.close();
    await browserPool.release();
  }

  // Fallback: agar Playwright topisa olmasa, oldindan tayyorlangan URL lar
  if (urls.length === 0) {
    logJobInfo(QUEUE, jobId, 'seller-index', 'Playwright discovery topilmadi — fallback URL lar ishlatiladi');
    return FALLBACK_CATEGORY_URLS;
  }

  return urls;
}

// ─── Fallback kategoriya URL lari (haqiqiy Uzum navigatsiya kategoriyalari) ────
// uzum.uz/ru bosh sahifasidan olingan (2026-04-03)
const FALLBACK_CATEGORY_URLS = [
  'https://uzum.uz/ru/category/mebel-2894',
  'https://uzum.uz/ru/category/turizm-rybalka-i-okhota-10039',
  'https://uzum.uz/ru/category/elektronika-10020',
  'https://uzum.uz/ru/category/bytovaya-tekhnika-10004',
  'https://uzum.uz/ru/category/odezhda-10014',
  'https://uzum.uz/ru/category/obuv-10013',
  'https://uzum.uz/ru/category/aksessuary-10003',
  'https://uzum.uz/ru/category/krasota-i-ukhod-10012',
  'https://uzum.uz/ru/category/zdorove-10009',
  'https://uzum.uz/ru/category/tovary-dlya-doma-10018',
  'https://uzum.uz/ru/category/stroitelstvo-i-remont-10016',
  'https://uzum.uz/ru/category/avtotovary-10002',
  'https://uzum.uz/ru/category/detskie-tovary-10007',
  'https://uzum.uz/ru/category/khobbi-i-tvorchestvo-10008',
  'https://uzum.uz/ru/category/sport-i-otdykh-10015',
  'https://uzum.uz/ru/category/produkty-pitaniya-1821',
  'https://uzum.uz/ru/category/bytovaya-khimiya-10005',
  'https://uzum.uz/ru/category/kanctovary-10010',
  'https://uzum.uz/ru/category/zootovary-10019',
  'https://uzum.uz/ru/category/knigi-10011',
  'https://uzum.uz/ru/category/dacha-sad-i-ogorod-10006',
];

// ─── REST /api/v2/product/{id} dan seller ma'lumotini olish ──────────────────
async function fetchSellerFromProductREST(
  productId: number,
): Promise<{ id: number; title: string; ordersQuantity: number; rating: number } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${REST_BASE}/product/${productId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
        Origin: 'https://uzum.uz',
        Referer: 'https://uzum.uz/',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const seller = data?.payload?.data?.seller;
    if (!seller?.id || !seller?.title) return null;
    return {
      id: seller.id,
      title: seller.title,
      ordersQuantity: seller.orders ?? 0,
      rating: seller.rating ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── GraphQL productPage fallback ─────────────────────────────────────────────
async function fetchSellerFromProductGraphQL(
  productId: number,
): Promise<{ id: number; title: string; ordersQuantity: number; rating: number } | null> {
  try {
    const page = await uzumGraphQLClient.getProductPage(productId);
    const shop = page?.product?.shop;
    if (!shop?.id || !shop?.title) return null;
    return {
      id: shop.id,
      title: shop.title,
      ordersQuantity: shop.ordersQuantity ?? 0,
      rating: shop.rating ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Product ID to'plamidan seller ajratish va DB ga yozish ──────────────────
async function processProductIds(
  productIds: number[],
  visitedProductIds: Set<number>,
  upsertedShopIds: Set<string>,
  jobId: string,
  label: string,
): Promise<number> {
  const newIds = productIds.filter((id) => !visitedProductIds.has(id));
  newIds.forEach((id) => visitedProductIds.add(id));
  if (newIds.length === 0) return 0;

  let upserted = 0;
  for (let i = 0; i < newIds.length; i += BATCH_SIZE) {
    const batch = newIds.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (id) => {
        const rest = await fetchSellerFromProductREST(id);
        if (rest) return rest;
        return fetchSellerFromProductGraphQL(id);
      }),
    );

    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const shop = result.value;
      const shopIdStr = shop.id.toString();
      if (upsertedShopIds.has(shopIdStr)) continue;

      try {
        await prisma.shop.upsert({
          where: { id: BigInt(shop.id) },
          update: {
            title: shop.title,
            rating: shop.rating ? shop.rating.toString() : undefined,
            orders_quantity: BigInt(shop.ordersQuantity),
          },
          create: {
            id: BigInt(shop.id),
            title: shop.title,
            rating: shop.rating ? shop.rating.toString() : undefined,
            orders_quantity: BigInt(shop.ordersQuantity),
          },
        });
        upsertedShopIds.add(shopIdStr);
        upserted++;
      } catch { /* skip upsert errors */ }
    }

    if (i + BATCH_SIZE < newIds.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  logJobInfo(QUEUE, jobId, 'seller-index',
    `${label}: ${newIds.length} mahsulot → ${upserted} yangi do'kon. Jami: ${upsertedShopIds.size}`);

  return upserted;
}

async function processSellerIndex(jobId: string) {
  const visitedProductIds = new Set<number>();
  const upsertedShopIds = new Set<string>();
  let totalUpserted = 0;

  // ── 0-qadam: DB dagi mahsulotlar ────────────────────────────────────────
  const dbProducts = await prisma.product.findMany({ select: { id: true }, take: 1000 });
  if (dbProducts.length > 0) {
    logJobInfo(QUEUE, jobId, 'seller-index', `Bosqich 0: ${dbProducts.length} ta DB mahsulot`);
    const count = await processProductIds(
      dbProducts.map((p) => Number(p.id)),
      visitedProductIds, upsertedShopIds, jobId, 'DB products',
    );
    totalUpserted += count;
  }

  // ── 1-qadam: GraphQL makeSearch (429 bo'lmasa) ────────────────────────
  const SEARCH_TERMS = [
    'телефон', 'смартфон', 'ноутбук', 'планшет', 'телевизор',
    'платье', 'куртка', 'джинсы', 'футболка',
    'мебель', 'диван', 'посуда',
    'косметика', 'парфюм',
    'спорт', 'велосипед',
    'детские игрушки', 'коляска',
    'холодильник', 'стиральная машина',
    'сумка', 'рюкзак',
    'инструменты',
    'kiyim', 'telefon', 'noutbuk',
  ];

  let searchWorking = true;
  logJobInfo(QUEUE, jobId, 'seller-index', `Bosqich 1: ${SEARCH_TERMS.length} ta makeSearch qidiruvi`);

  for (const term of SEARCH_TERMS) {
    if (!searchWorking) break;
    let cards: Array<{ productId: number }> = [];
    try {
      cards = await uzumGraphQLClient.searchAllProducts({
        text: term,
        sort: 'BY_ORDERS_NUMBER_DESC',
        maxProducts: 100,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429')) {
        logJobInfo(QUEUE, jobId, 'seller-index', `makeSearch 429 — bosqich 1 to'xtatildi`);
        searchWorking = false;
        break;
      }
      logJobInfo(QUEUE, jobId, 'seller-index', `"${term}" xato: ${msg}`);
      continue;
    }
    const count = await processProductIds(
      cards.map((c) => c.productId),
      visitedProductIds, upsertedShopIds, jobId, `"${term}"`,
    );
    totalUpserted += count;
    await sleep(1000);
  }

  logJobInfo(QUEUE, jobId, 'seller-index',
    `Bosqich 1 tugadi. Mahsulotlar: ${visitedProductIds.size}, Do'konlar: ${upsertedShopIds.size}`);

  // ── 2-qadam: Kategoriya sahifalarini scraping (Playwright) ────────────
  const categoryUrls = await discoverCategoryUrls(jobId);
  logJobInfo(QUEUE, jobId, 'seller-index', `Bosqich 2: ${categoryUrls.length} ta kategoriya (Playwright)`);

  let skippedEmpty = 0;
  for (const categoryUrl of categoryUrls) {
    let productIds: number[] = [];
    try {
      const result = await scrapeCategoryProductIds(categoryUrl, SCROLL_COUNT);
      productIds = result.ids;
    } catch (err) {
      logJobInfo(QUEUE, jobId, 'seller-index',
        `${categoryUrl} xato: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    if (productIds.length === 0) {
      skippedEmpty++;
      continue;
    }

    const count = await processProductIds(
      productIds,
      visitedProductIds, upsertedShopIds, jobId, categoryUrl,
    );
    totalUpserted += count;
    await sleep(1500);
  }

  if (skippedEmpty > 0) {
    logJobInfo(QUEUE, jobId, 'seller-index', `${skippedEmpty} ta kategoriya mahsulot qaytarmadi`);
  }

  logJobInfo(QUEUE, jobId, 'seller-index',
    `Bosqich 2 tugadi. Jami mahsulotlar: ${visitedProductIds.size}, Jami do'konlar: ${upsertedShopIds.size}`);

  return {
    products_visited: visitedProductIds.size,
    shops_upserted: totalUpserted,
    unique_shops: upsertedShopIds.size,
    categories_scraped: categoryUrls.length,
  };
}

export function createSellerIndexWorker() {
  const worker = new Worker(
    QUEUE,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE, job.id ?? '-', job.name, {});
      try {
        const result = await processSellerIndex(job.id ?? '-');
        logJobDone(QUEUE, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1,
      lockDuration: 7_200_000, // 2 soat
    },
  );

  worker.on('error', (err) => logJobError(QUEUE, '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError(QUEUE, job?.id ?? '-', job?.name ?? '-', err));

  return worker;
}
