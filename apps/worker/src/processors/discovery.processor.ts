import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import type { CategoryDiscoveryJobData } from '@uzum/types';
import { calculateScore, getSupplyPressure, sleep } from '@uzum/utils';
import {
  scrapeCategoryProductIds,
  fetchProductDetail,
  type ProductDetail,
} from './uzum-scraper';
import {
  extractCategoryName,
  filterByCategory,
} from './uzum-ai-scraper';

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

async function processDiscovery(data: CategoryDiscoveryJobData) {
  const { categoryId, runId, categoryUrl } = data;

  // Build URL for Playwright (use provided URL or construct a canonical one)
  const url =
    categoryUrl ?? `https://uzum.uz/ru/category/c--${categoryId}`;

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', started_at: new Date() },
  });

  const categoryName = extractCategoryName(url);
  console.log(`[discovery] Category name: "${categoryName}"`);

  // Step 1: Scrape product IDs from the category page via Playwright
  console.log(`[discovery] Scraping category ${categoryId} from ${url}`);
  let productIds: number[];
  try {
    const { ids } = await scrapeCategoryProductIds(url);
    productIds = ids;
  } catch (err) {
    console.error('[discovery] Playwright scraping failed:', err);
    throw new Error(`Playwright scraping failed: ${(err as Error).message}`);
  }

  if (productIds.length === 0) {
    throw new Error(`No products found for category ${categoryId}`);
  }

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { total_products: productIds.length },
  });

  console.log(
    `[discovery] Found ${productIds.length} product IDs — fetching details...`,
  );

  // Step 2: Fetch product details from the working REST product detail API
  // Limit to 200 products to cover more of the category
  const idsToFetch = productIds.slice(0, 200);
  let products = await batchFetchDetails(idsToFetch);

  await prisma.categoryRun.update({
    where: { id: runId },
    data: { processed: products.length },
  });

  console.log(
    `[discovery] Fetched details for ${products.length}/${idsToFetch.length} products`,
  );

  if (products.length === 0) {
    throw new Error('Product detail API returned no results');
  }

  // Step 2b: AI category filter — remove cross-category noise
  if (categoryName) {
    products = await filterByCategory(products, categoryName);
    console.log(`[discovery] After AI filter: ${products.length} products`);
    if (products.length === 0) {
      throw new Error('AI filter removed all products — check category name');
    }
  }

  // Step 3: Score all products
  const scored = products
    .map((p) => {
      const score = calculateScore({
        weekly_bought: p.rOrdersAmount ?? null,
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

    await prisma.product.upsert({
      where: { id: productId },
      update: {
        title: product.title,
        rating: product.rating,
        orders_quantity: BigInt(product.ordersAmount),
      },
      create: {
        id: productId,
        title: product.title,
        rating: product.rating,
        orders_quantity: BigInt(product.ordersAmount),
      },
    });

    await prisma.categoryWinner.create({
      data: {
        run_id: runId,
        product_id: productId,
        score,
        rank: i + 1,
        weekly_bought: product.rOrdersAmount ?? null,
        orders_quantity: BigInt(product.ordersAmount),
        sell_price: product.sellPrice,
      },
    });
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
  return new Worker<CategoryDiscoveryJobData>(
    'discovery-queue',
    async (job: Job<CategoryDiscoveryJobData>) => {
      console.log(
        `[discovery] Run ${job.data.runId}, category ${job.data.categoryId}`,
      );
      try {
        const result = await processDiscovery(job.data);
        console.log(`[discovery] Done:`, result);
        return result;
      } catch (err) {
        console.error(`[discovery] Failed:`, err);
        await prisma.categoryRun.update({
          where: { id: job.data.runId },
          data: { status: 'FAILED', finished_at: new Date() },
        });
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 }, // 1 concurrent run (Playwright is heavy)
  );
}
