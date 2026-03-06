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
import { redisConnection, getHealthRedis } from '../redis';
import { prisma } from '../prisma';
import { calculateScore, getSupplyPressure, sleep, SNAPSHOT_MIN_GAP_MS } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { scrapeWeeklyBought } from './weekly-scraper';
import { fetchUzumProductRaw } from './uzum-scraper';
import { acquireScrapeLock, releaseScrapeLock } from '../scrape-lock';

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
    select: { id: true, snapshot_at: true, weekly_bought: true, weekly_bought_source: true },
  });

  if (lastSnap && Date.now() - lastSnap.snapshot_at.getTime() < SNAPSHOT_MIN_GAP_MS) {
    // Dedup: don't create new snapshot, but UPDATE weekly_bought if scraper found data
    if (scrapedWb !== null && (lastSnap.weekly_bought == null || lastSnap.weekly_bought_source !== 'scraped')) {
      await prisma.productSnapshot.update({
        where: { id: lastSnap.id },
        data: { weekly_bought: scrapedWb, weekly_bought_source: 'scraped' },
      });
      logJobInfo(QUEUE_NAME, jobId, jobName,
        `Snapshot dedup + wb update: product ${numId}, wb=${scrapedWb} (was ${lastSnap.weekly_bought})`);
    } else {
      logJobInfo(QUEUE_NAME, jobId, jobName, `Snapshot dedup: product ${numId}, skip`);
    }

    await prisma.trackedProduct.updateMany({
      where: { product_id: productId },
      data: {
        last_scraped_at: new Date(),
        next_scrape_at: getNextScrapeAt(),
      },
    });
    return { scraped: scrapedWb !== null, weeklyBought: scrapedWb ?? weeklyBought };
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

  // 5. Extract new fields from raw detail
  const title = detail.localizableTitle?.ru || detail.title;
  const titleUz: string | null = detail.localizableTitle?.uz ?? null;
  const totalAvailable = detail.totalAvailableAmount != null
    ? BigInt(detail.totalAvailableAmount)
    : null;

  // Category path: root → leaf (nested parent chain)
  const categoryPath: Array<{ id: number; title: string }> = [];
  {
    let node: { id: number; title: string; parent?: { id: number; title: string; parent?: unknown } | null } | null | undefined = detail.category;
    while (node) {
      categoryPath.unshift({ id: node.id, title: node.title });
      node = (node as { parent?: typeof node }).parent ?? null;
    }
  }

  // Photos: extract high-res URLs in priority order
  const photoSizes = ['720', '800', '540', '480', '240'];
  const photoUrls: string[] = (detail.photos ?? []).map((p) => {
    for (const s of photoSizes) {
      const url = p.photo?.[s]?.high;
      if (url) return url;
    }
    const first = Object.values(p.photo ?? {})[0];
    return first?.high ?? null;
  }).filter((u): u is string => u !== null);
  const mainPhotoUrl = photoUrls[0] ?? null;

  const badges = detail.badges ?? [];

  // 6. Atomic: update product + upsert SKUs + create snapshots + update scrape timestamps
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        title,
        title_uz: titleUz,
        category_path: categoryPath.length > 0 ? categoryPath : undefined,
        badges: badges.length > 0 ? badges : undefined,
        photo_url: mainPhotoUrl ?? undefined,
        photo_urls: photoUrls,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        orders_quantity: BigInt(currentOrders),
        total_available_amount: totalAvailable,
      },
    });

    // Upsert SKUs + create SkuSnapshot
    for (const sku of skuList) {
      const skuStockType = sku.stock?.type === 'FBO' ? 'FBO' : 'FBS';
      const skuId = BigInt(sku.id);

      await tx.sku.upsert({
        where: { id: skuId },
        update: {
          min_sell_price: BigInt(sku.purchasePrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: skuStockType,
          is_available: sku.availableAmount > 0,
        },
        create: {
          id: skuId,
          product_id: productId,
          min_sell_price: BigInt(sku.purchasePrice ?? 0),
          min_full_price: BigInt(sku.fullPrice ?? 0),
          stock_type: skuStockType,
          is_available: sku.availableAmount > 0,
        },
      });

      // Installment options for this SKU
      const installOpts = (sku.productOptionDtos ?? []).filter(
        (o) => o.type === 'UZUM_INSTALLMENT' && o.active,
      );
      const inst0 = installOpts[0] ?? null;
      const inst1 = installOpts[1] ?? null;
      const discountPct =
        sku.fullPrice && sku.purchasePrice && sku.fullPrice > sku.purchasePrice
          ? Math.round((1 - sku.purchasePrice / sku.fullPrice) * 100)
          : null;

      await tx.skuSnapshot.create({
        data: {
          sku_id: skuId,
          sell_price: sku.purchasePrice ? BigInt(sku.purchasePrice) : null,
          full_price: sku.fullPrice ? BigInt(sku.fullPrice) : null,
          discount_percent: discountPct,
          discount_badge: sku.discountBadge ?? null,
          charge_price: inst0?.paymentPerMonth ? BigInt(inst0.paymentPerMonth) : null,
          charge_quantity: inst0?.period ?? null,
          charge_quantity_alt: inst1?.period ?? null,
          stock_type: skuStockType,
        },
      });
    }

    await tx.trackedProduct.updateMany({
      where: { product_id: productId },
      data: {
        last_scraped_at: new Date(),
        next_scrape_at: getNextScrapeAt(),
      },
    });
  });

  // Snapshot create OUTSIDE transaction — dedup via DB unique constraint (5-min bucket)
  try {
    await prisma.productSnapshot.create({
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
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      logJobInfo(QUEUE_NAME, jobId, jobName, `Snapshot dedup: product ${productId} already in this 5-min bucket`);
    } else {
      throw err;
    }
  }

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
  let skipped = 0;
  const redis = getHealthRedis();

  for (const pid of productIds) {
    // T-385: Acquire Redis lock to prevent duplicate scraping
    const locked = await acquireScrapeLock(redis, pid.toString());
    if (!locked) {
      logJobInfo(QUEUE_NAME, jobId, jobName, `Product ${pid} already being scraped, skipping`);
      skipped++;
      continue;
    }

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
    } finally {
      await releaseScrapeLock(redis, pid.toString());
    }

    // Anti-detection: 3-5s random pause between products
    if (productIds.indexOf(pid) < productIds.length - 1) {
      await sleep(randomInt(3000, 5000));
    }
  }

  return { total: productIds.length, scraped, failed, skipped };
}

async function processSingle(productId: string, jobId: string, jobName: string) {
  const pid = BigInt(productId);
  const redis = getHealthRedis();

  // T-385: Acquire Redis lock to prevent duplicate scraping
  const locked = await acquireScrapeLock(redis, productId);
  if (!locked) {
    logJobInfo(QUEUE_NAME, jobId, jobName, `Product ${productId} already being scraped, skipping`);
    return { scraped: false, weeklyBought: null, skipped: true };
  }

  try {
    const result = await scrapeAndSaveProduct(pid, jobId, jobName);
    return result;
  } finally {
    await releaseScrapeLock(redis, productId);
  }
}

export function createWeeklyScrapeWorker() {
  const worker = new Worker(
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
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1, // Serial — one Chromium at a time
      lockDuration: 600_000, // 10 min — batch scraping with Playwright can exceed 30s default
    },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err));
  worker.on('stalled', (jobId) => console.error(`[${QUEUE_NAME}] stalled: ${jobId}`));

  return worker;
}
