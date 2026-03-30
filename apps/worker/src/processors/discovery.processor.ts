import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import type { CategoryDiscoveryJobData } from '@uzum/types';
import { calculateScore, getSupplyPressure, sleep } from '@uzum/utils';
import {
  scrapeCategoryProductIds,
  scrapeSearchProductIds,
  fetchProductDetail,
  fetchUzumProductRaw,
  fetchCategoryProductIdsREST,
  type ProductDetail,
} from './uzum-scraper';
import { uzumGraphQLClient } from '../clients/uzum-graphql.client';
import {
  extractCategoryName,
  filterByCategory,
} from './uzum-ai-scraper';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

// Feature flag: set USE_REST_DISCOVERY=false to skip REST and go straight to GraphQL/Playwright
const USE_REST_DISCOVERY = process.env.USE_REST_DISCOVERY !== 'false';

/**
 * Fetch product details in parallel batches with rate limiting.
 * Keeps concurrency at `batchSize` requests at a time.
 */
async function batchFetchDetails(
  ids: number[],
  batchSize = 5,
): Promise<ProductDetail[]> {
  const results: ProductDetail[] = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchProductDetail));
    results.push(...(batchResults.filter(Boolean) as ProductDetail[]));
    if (i + batchSize < ids.length) {
      await sleep(500); // rate limit: ~10 req/sec
    }
  }

  return results;
}

async function processDiscovery(data: CategoryDiscoveryJobData, jobId: string, jobName: string) {
  const { categoryId, runId, categoryUrl, categoryName: knownCategoryName, fromSearch } = data;

  // Build URL for Playwright (use provided URL or construct a canonical one)
  const url =
    categoryUrl ?? `https://uzum.uz/ru/category/c--${categoryId}`;

  // Use known name from job data (search picker) → fall back to URL slug extraction
  let categoryName: string | null = knownCategoryName ?? extractCategoryName(url);
  if (!categoryName || categoryName.length <= 2) categoryName = null;

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', started_at: new Date(), category_name: categoryName ?? undefined },
  });
  logJobInfo('discovery-queue', jobId, jobName, `Category name: "${categoryName}", fromSearch=${fromSearch}`);

  let productIds: number[];
  let source: 'rest' | 'graphql' | 'playwright' | 'text-search' = 'rest';

  // Step 1 (fromSearch): getSuggestions ID lari yaroqsiz browse page ID — Playwright ishlatma.
  // To'g'ridan GraphQL text search ishlatish (category nomi bo'yicha).
  if (fromSearch && categoryName) {
    logJobInfo('discovery-queue', jobId, jobName,
      `fromSearch=true → GraphQL text search (text="${categoryName}")`);
    source = 'text-search';
    try {
      const cards = await uzumGraphQLClient.searchAllProducts({
        text: categoryName,
        sort: 'BY_ORDERS_NUMBER_DESC',
        maxProducts: 500,
      });
      productIds = cards.map((c) => c.productId);
      logJobInfo('discovery-queue', jobId, jobName,
        `Text search: ${productIds.length} products (text="${categoryName}")`);
      if (productIds.length === 0) {
        throw new Error(`Text search returned 0 products for "${categoryName}"`);
      }
    } catch (err) {
      logJobInfo('discovery-queue', jobId, jobName,
        `GraphQL text search failed — Playwright search fallback (query="${categoryName}")`);
      try {
        const { ids } = await scrapeSearchProductIds(categoryName);
        productIds = ids;
        source = 'text-search';
        logJobInfo('discovery-queue', jobId, jobName,
          `Playwright search: ${productIds.length} products (query="${categoryName}")`);
        if (productIds.length === 0) {
          throw new Error(`Playwright search returned 0 products for "${categoryName}"`);
        }
      } catch (playwrightErr) {
        logJobError('discovery-queue', jobId, jobName, playwrightErr);
        throw new Error(`Text search failed (GraphQL + Playwright): ${(err as Error).message}`);
      }
    }
  } else {
    // Step 1: REST (categoryId filter) → GraphQL fallback → Playwright last resort
    // REST /main/search/product?categoryId=X correctly filters by category.
    // makeSearch GraphQL ignores categoryId when text is provided → same products for all categories.
    logJobInfo('discovery-queue', jobId, jobName, `Discovering category ${categoryId} (rest=${USE_REST_DISCOVERY})`);

    if (USE_REST_DISCOVERY) {
      try {
        const restIds = await fetchCategoryProductIdsREST(categoryId, 500);
        if (restIds.length >= 3) {
          productIds = restIds;
          logJobInfo('discovery-queue', jobId, jobName, `REST discovery (categoryId=${categoryId}): ${productIds.length} mahsulot`);
        } else {
          throw new Error(`REST returned only ${restIds.length} products`);
        }
      } catch (restErr) {
        logJobInfo('discovery-queue', jobId, jobName, `REST failed — GraphQL fallback: ${(restErr as Error).message}`);
        source = 'graphql';
        try {
          const cards = await uzumGraphQLClient.searchAllProducts({
            categoryId,
            text: '',
            sort: 'BY_ORDERS_NUMBER_DESC',
            maxProducts: 500,
          });
          productIds = cards.map((c) => c.productId);
          logJobInfo('discovery-queue', jobId, jobName, `GraphQL fallback (text="", categoryId=${categoryId}): ${productIds.length} mahsulot`);
        } catch {
          logJobInfo('discovery-queue', jobId, jobName, 'GraphQL failed — Playwright fallback');
          source = 'playwright';
          try {
            const { ids } = await scrapeCategoryProductIds(url);
            productIds = ids;
          } catch (err) {
            logJobError('discovery-queue', jobId, jobName, err);
            throw new Error(`Discovery failed (REST + GraphQL + Playwright): ${(err as Error).message}`);
          }
        }
      }
    } else {
      source = 'playwright';
      logJobInfo('discovery-queue', jobId, jobName, 'REST disabled — Playwright');
      try {
        const { ids } = await scrapeCategoryProductIds(url);
        productIds = ids;
      } catch (err) {
        logJobError('discovery-queue', jobId, jobName, err);
        throw new Error(`Discovery failed (Playwright): ${(err as Error).message}`);
      }
    }
  }

  if (productIds.length === 0) {
    throw new Error(`No products found for category ${categoryId}`);
  }

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { total_products: productIds.length },
  });

  logJobInfo('discovery-queue', jobId, jobName, `Found ${productIds.length} product IDs — fetching details...`);

  // Step 2: Fetch product details from the working REST product detail API
  // Limit to 200 products to cover more of the category
  const idsToFetch = productIds.slice(0, 200);
  let products = await batchFetchDetails(idsToFetch);

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { processed: products.length },
  });

  logJobInfo('discovery-queue', jobId, jobName, `Fetched details for ${products.length}/${idsToFetch.length} products`);

  if (products.length === 0) {
    throw new Error('Product detail API returned no results');
  }

  // Step 2b: Resolve real category name from Uzum if still unknown (e.g. plain ID was passed)
  if (!categoryName && idsToFetch.length > 0) {
    try {
      const raw = await fetchUzumProductRaw(idsToFetch[0]);
      categoryName = raw?.category?.title ?? null;
      if (categoryName) {
        await prisma.categoryRun.update({ where: { id: runId }, data: { category_name: categoryName } });
        logJobInfo('discovery-queue', jobId, jobName, `Category name resolved from product: "${categoryName}"`);
      }
    } catch { /* non-critical, continue without name */ }
  }

  // Step 2c: Hard category filter — faqat REST va GraphQL uchun
  // Playwright + session cookies ishonchli: to'g'ridan category URL scrape qiladi.
  // text-search: AI filter yetarli, hard filter shart emas (categoryId yaroqsiz bo'lishi mumkin).
  // REST/GraphQL esa ba'zan noto'g'ri (global popular) mahsulotlar qaytaradi.
  if (source !== 'playwright' && source !== 'text-search') {
    const beforeHardFilter = products.length;
    const hardFiltered = products.filter((p) => p.categoryIds.includes(categoryId));
    logJobInfo('discovery-queue', jobId, jobName,
      `Hard category filter (${source}): ${beforeHardFilter} → ${hardFiltered.length} products (categoryId=${categoryId})`);

    if (hardFiltered.length >= 3) {
      products = hardFiltered;
    } else {
      // REST/GraphQL noto'g'ri natija → Playwright fallback
      logJobInfo('discovery-queue', jobId, jobName,
        `Hard filter yetarsiz (${source}) → Playwright fallback (url=${url})`);
      const { ids } = await scrapeCategoryProductIds(url);
      const idsToFetch2 = ids.slice(0, 200);
      products = await batchFetchDetails(idsToFetch2);
      await prisma.categoryRun.update({ where: { id: runId }, data: { total_products: ids.length, processed: products.length } });
      source = 'playwright';
    }
  } else {
    logJobInfo('discovery-queue', jobId, jobName,
      `Playwright: ${products.length} products (cookies bilan to'g'ri scrape)`);
  }

  // Step 2c-2: Playwright got ≤ 10 products → likely Uzum's generic recommendations widget
  // (parent category pages show subcategory grid, not products; Uzum renders 10 "popular" items)
  // Fallback: GraphQL text search by category name to get real category products.
  // text-search source uchun shart emas (allaqachon text search ishlatilgan).
  if (source === 'playwright' && products.length <= 10 && categoryName) {
    logJobInfo('discovery-queue', jobId, jobName,
      `Playwright ≤10 products (likely recommendations widget) → GraphQL text search (text="${categoryName}")`);
    try {
      const cards = await uzumGraphQLClient.searchAllProducts({
        text: categoryName,
        sort: 'BY_ORDERS_NUMBER_DESC',
        maxProducts: 500,
      });
      if (cards.length > 0) {
        const idsToFetch3 = cards.map((c) => c.productId).slice(0, 200);
        const textProducts = await batchFetchDetails(idsToFetch3);
        logJobInfo('discovery-queue', jobId, jobName,
          `GraphQL text search: ${textProducts.length} products (text="${categoryName}")`);
        if (textProducts.length > products.length) {
          products = textProducts;
          await prisma.categoryRun.update({ where: { id: runId }, data: { total_products: cards.length, processed: products.length } });
          // source stays 'playwright' — AI filter below will clean cross-category noise
        }
      }
    } catch (err) {
      // GraphQL failed → Playwright search fallback
      logJobInfo('discovery-queue', jobId, jobName,
        `GraphQL text search failed: ${(err as Error).message} — trying Playwright search`);
      try {
        const { ids } = await scrapeSearchProductIds(categoryName);
        if (ids.length > products.length) {
          const searchProducts = await batchFetchDetails(ids.slice(0, 200));
          logJobInfo('discovery-queue', jobId, jobName,
            `Playwright search fallback: ${searchProducts.length} products (query="${categoryName}")`);
          if (searchProducts.length > products.length) {
            products = searchProducts;
            await prisma.categoryRun.update({ where: { id: runId }, data: { total_products: ids.length, processed: products.length } });
          }
        }
      } catch {
        logJobInfo('discovery-queue', jobId, jobName,
          `Playwright search also failed — keeping ${products.length} Playwright products`);
      }
    }
  }

  // Step 2d: AI category filter — qolgan cross-category shovqinini tozalash
  if (categoryName) {
    products = await filterByCategory(products, categoryName);
    logJobInfo('discovery-queue', jobId, jobName, `After AI filter: ${products.length} products`);
    if (products.length === 0) {
      throw new Error('AI filter removed all products — check category name');
    }
  }

  // Step 3: Score all products
  // ESLATMA: rOrdersAmount = rounded total orders (haftalik EMAS!)
  // Discovery batch'da weekly_bought hisoblanmaydi (snapshot delta kerak)
  // ordersAmount ga asoslangan scoring ishlatiladi
  const scored = products
    .map((p) => {
      const score = calculateScore({
        weekly_bought: null,
        orders_quantity: p.ordersAmount,
        rating: p.rating,
        supply_pressure: getSupplyPressure(p.stockType),
      });
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score);

  const top20 = scored.slice(0, 20);

  // Step 4: Upsert products and create winners
  for (let i = 0; i < top20.length; i++) {
    const { product, score } = top20[i];
    const productId = BigInt(product.id);

    try {
      await prisma.product.upsert({
        where: { id: productId },
        update: {
          title: product.title,
          rating: product.rating,
          orders_quantity: BigInt(product.ordersAmount),
          ...(product.photoUrl ? { photo_url: product.photoUrl } : {}),
        },
        create: {
          id: productId,
          title: product.title,
          rating: product.rating,
          orders_quantity: BigInt(product.ordersAmount),
          ...(product.photoUrl ? { photo_url: product.photoUrl } : {}),
        },
      });

      await prisma.categoryWinner.create({
        data: {
          run_id: runId,
          product_id: productId,
          score,
          rank: i + 1,
          weekly_bought: null, // Delta hisob faqat snapshot tarix bilan mumkin
          orders_quantity: BigInt(product.ordersAmount),
          sell_price: product.sellPrice,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logJobInfo('discovery-queue', runId, 'processDiscovery', `Skip product ${product.id}: ${msg}`);
    }
  }

  await prisma.categoryRun.update({
    where: { id: runId },
    data: {
      status: 'DONE',
      finished_at: new Date(),
      processed: products.length,
    },
  });

  return {
    total: productIds.length,
    fetched: products.length,
    winners: top20.length,
  };
}

export function createDiscoveryWorker() {
  const worker = new Worker<CategoryDiscoveryJobData>(
    'discovery-queue',
    async (job: Job<CategoryDiscoveryJobData>) => {
      const start = Date.now();
      logJobStart('discovery-queue', job.id ?? '-', job.name, {
        runId: job.data.runId,
        categoryId: job.data.categoryId,
      });
      try {
        const result = await processDiscovery(job.data, job.id ?? '-', job.name);
        logJobDone('discovery-queue', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('discovery-queue', job.id ?? '-', job.name, err, Date.now() - start);
        await prisma.categoryRun.update({
          where: { id: job.data.runId },
          data: { status: 'FAILED', finished_at: new Date() },
        });
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1, // 1 concurrent run (Playwright is heavy)
      lockDuration: 600_000, // 10 min — category scraping + batch REST calls can take minutes
    },
  );

  worker.on('error', (err) => logJobError('discovery-queue', '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError('discovery-queue', job?.id ?? '-', job?.name ?? '-', err));
  worker.on('stalled', (jobId) => console.error(`[discovery-queue] stalled: ${jobId}`));

  return worker;
}
