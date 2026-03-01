/**
 * Weekly scrape BullMQ processor.
 *
 * Modes:
 *   - 'batch': cron every 15 min — picks products where next_scrape_at <= NOW()
 *   - 'single': immediate scrape for one product (after import/analyze)
 *
 * For each product:
 *   1. Playwright → banner label → parseWeeklyBoughtBanner() → real weekly_bought
 *   2. REST API → ordersAmount, price, stock, rating
 *   3. ProductSnapshot with weekly_bought_source: 'scraped'
 *   4. next_scrape_at = tomorrow same hour + random(0-30min) jitter
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { calculateScore, getSupplyPressure, sleep, SNAPSHOT_MIN_GAP_MS } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { scrapeWeeklyBought, closeBrowser } from './weekly-scraper';
import { fetchUzumProductRaw } from './uzum-scraper';

const QUEUE_NAME = 'weekly-scrape-queue';
const BATCH_LIMIT = 50;

interface WeeklyScrapeJobData {
  mode: 'batch' | 'single';
  productId?: string; // For single mode
}

/** Random integer between min and max (inclusive). */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Calculate next scrape time: +24h from now + random 0-30min jitter. */
function getNextScrapeAt(): Date {
  const jitterMs = randomInt(0, 30) * 60 * 1000;
  return new Date(Date.now() + 24 * 60 * 60 * 1000 + jitterMs);
}

/** Calculate retry scrape time on failure: +6h from now. */
function getRetryScrapeAt(): Date {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

async function scrapeAndSaveProduct(
  productId: bigint,
  jobId: string,
  jobName: string,
): Promise<{ scraped: boolean; weeklyBought: number | null }> {
  const numId = Number(productId);

  // 1. Playwright scrape for banner
  const scrapedWb = await scrapeWeeklyBought(numId, jobId);

  // 2. Fetch REST API data
  const detail = await fetchUzumProductRaw(numId);
  if (!detail) {
    logJobInfo(QUEUE_NAME, jobId, jobName, `REST API failed for product ${numId}`);
    // Update next_scrape_at to retry sooner
    await prisma.trackedProduct.updateMany({
      where: { product_id: productId },
      data: { next_scrape_at: getRetryScrapeAt() },
    });
    return { scraped: false, weeklyBought: null };
  }

  // Determine weekly_bought: prefer scraped, fallback to last scraped value
  let weeklyBought: number | null = scrapedWb;
  let source: string = 'scraped';

  if (weeklyBought === null) {
    // Fallback: use last stored scraped value
    const lastScrapedSnap = await prisma.productSnapshot.findFirst({
      where: {
        product_id: productId,
        weekly_bought_source: 'scraped',
        weekly_bought: { not: null },
      },
      orderBy: { snapshot_at: 'desc' },
      select: { weekly_bought: true },
    });
    if (lastScrapedSnap?.weekly_bought != null) {
      weeklyBought = lastScrapedSnap.weekly_bought;
      source = 'stored_scraped';
    } else {
      source = 'calculated';
    }
  }

  // 3. Dedup guard (T-267)
  const lastSnap = await prisma.productSnapshot.findFirst({
    where: { product_id: productId },
    orderBy: { snapshot_at: 'desc' },
    select: { snapshot_at: true },
  });

  if (lastSnap && Date.now() - lastSnap.snapshot_at.getTime() < SNAPSHOT_MIN_GAP_MS) {
    logJobInfo(QUEUE_NAME, jobId, jobName, `Snapshot dedup: product ${numId}, skip`);
    // Still update scrape timestamps
    await prisma.trackedProduct.updateMany({
      where: { product_id: productId },
      data: {
        last_scraped_at: new Date(),
        next_scrape_at: getNextScrapeAt(),
      },
    });
    return { scraped: scrapedWb !== null, weeklyBought };
  }

  // 4. Calculate score
  const currentOrders = detail.ordersAmount ?? 0;
  const skuList = detail.skuList ?? [];
  const primarySku = skuList[0];
  const stockType = primarySku?.stock?.type === 'FBO' ? 'FBO' as const : 'FBS' as const;
  const supplyPressure = getSupplyPressure(stockType);

  const score = calculateScore({
    weekly_bought: weeklyBought,
    orders_quantity: currentOrders,
    rating: detail.rating ?? 0,
    supply_pressure: supplyPressure,
  });

  // 5. Atomic: update product + create snapshot + update scrape timestamps
  const title = detail.localizableTitle?.ru || detail.title;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        orders_quantity: BigInt(currentOrders),
      },
    });

    // Upsert SKUs
    for (const sku of skuList) {
      const skuStockType = sku.stock?.type === 'FBO' ? 'FBO' : 'FBS';
      await tx.sku.upsert({
        where: { id: BigInt(sku.id) },
        update: {
          min_sell_price: BigInt(sku.purchasePrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: skuStockType,
          is_available: sku.availableAmount > 0,
        },
        create: {
          id: BigInt(sku.id),
          product_id: productId,
          min_sell_price: BigInt(sku.purchasePrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: skuStockType,
          is_available: sku.availableAmount > 0,
        },
      });
    }

    await tx.productSnapshot.create({
      data: {
        product_id: productId,
        orders_quantity: BigInt(currentOrders),
        weekly_bought: weeklyBought,
        weekly_bought_source: source,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        score,
      },
    });

    await tx.trackedProduct.updateMany({
      where: { product_id: productId },
      data: {
        last_scraped_at: new Date(),
        next_scrape_at: getNextScrapeAt(),
      },
    });
  });

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Scraped product=${numId}, wb=${weeklyBought}, source=${source}, score=${score.toFixed(4)}`);

  return { scraped: scrapedWb !== null, weeklyBought };
}

async function processBatch(jobId: string, jobName: string) {
  // Find products due for scraping
  const dueProducts = await prisma.trackedProduct.findMany({
    where: {
      is_active: true,
      OR: [
        { next_scrape_at: { lte: new Date() } },
        { next_scrape_at: null }, // Never scraped yet
      ],
    },
    select: { product_id: true },
    distinct: ['product_id'],
    take: BATCH_LIMIT,
    orderBy: { next_scrape_at: 'asc' },
  });

  const productIds = dueProducts.map((t) => t.product_id);
  logJobInfo(QUEUE_NAME, jobId, jobName, `Batch: ${productIds.length} products due for scraping`);

  if (productIds.length === 0) {
    return { total: 0, scraped: 0, failed: 0 };
  }

  let scraped = 0;
  let failed = 0;

  for (const pid of productIds) {
    try {
      const result = await scrapeAndSaveProduct(pid, jobId, jobName);
      if (result.scraped) {
        scraped++;
      } else {
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logJobInfo(QUEUE_NAME, jobId, jobName, `Error for product ${pid}: ${msg}`);
      failed++;
    }

    // Anti-detection: 3-5s random pause between products
    if (productIds.indexOf(pid) < productIds.length - 1) {
      await sleep(randomInt(3000, 5000));
    }
  }

  // Close shared browser after batch
  await closeBrowser();

  return { total: productIds.length, scraped, failed };
}

async function processSingle(productId: string, jobId: string, jobName: string) {
  const pid = BigInt(productId);
  const result = await scrapeAndSaveProduct(pid, jobId, jobName);
  // Don't close browser for single — might have more coming soon
  return result;
}

export function createWeeklyScrapeWorker() {
  return new Worker(
    QUEUE_NAME,
    async (job: Job<WeeklyScrapeJobData>) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name, job.data);

      try {
        let result: unknown;
        if (job.data.mode === 'single' && job.data.productId) {
          result = await processSingle(job.data.productId, job.id ?? '-', job.name);
        } else {
          result = await processBatch(job.id ?? '-', job.name);
        }
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result as Record<string, unknown>);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        await closeBrowser(); // Clean up on error
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1, // Serial — one Chromium at a time
    },
  );
}
