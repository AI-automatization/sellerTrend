import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { calculateScore, getSupplyPressure, calcWeeklyBought, weeklyBoughtWithFallback, sleep, SNAPSHOT_MIN_GAP_MS } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { fetchUzumProductRaw } from './uzum-scraper';

async function reanalyzeProduct(
  productId: bigint,
  jobId: string,
  jobName: string,
): Promise<{ updated: boolean; weeklyBought: number | null }> {
  const numId = Number(productId);
  const detail = await fetchUzumProductRaw(numId);
  if (!detail) {
    logJobInfo('reanalysis-queue', jobId, jobName, `API failed for product ${numId}`);
    return { updated: false, weeklyBought: null };
  }

  const currentOrders = detail.ordersAmount ?? 0;

  // Centralized weekly_bought: prefer stored scraped value, fallback to calculated (T-207)
  const recentSnapshots = await prisma.productSnapshot.findMany({
    where: { product_id: productId },
    orderBy: { snapshot_at: 'desc' },
    take: 20,
    select: { orders_quantity: true, weekly_bought: true, weekly_bought_source: true, snapshot_at: true },
  });

  // Dedup guard (T-267): skip snapshot if last one is < 5 min old
  const lastSnap = recentSnapshots[0];
  if (lastSnap && Date.now() - lastSnap.snapshot_at.getTime() < SNAPSHOT_MIN_GAP_MS) {
    logJobInfo('reanalysis-queue', jobId, jobName, `Snapshot dedup: product ${numId}, skip — last snap ${Math.round((Date.now() - lastSnap.snapshot_at.getTime()) / 1000)}s ago`);
    return { updated: false, weeklyBought: null };
  }

  // Prefer last scraped weekly_bought; fallback to calculation (transitional)
  let weeklyBought: number | null = null;
  let wbSource = 'calculated';

  const lastScraped = recentSnapshots.find((s) => s.weekly_bought_source === 'scraped' && s.weekly_bought != null);
  if (lastScraped) {
    weeklyBought = lastScraped.weekly_bought;
    wbSource = 'stored_scraped';
  } else {
    // T-268: fallback to calculated
    const rawWeeklyBought = calcWeeklyBought(recentSnapshots, currentOrders);
    weeklyBought = weeklyBoughtWithFallback(rawWeeklyBought, recentSnapshots);
  }

  // Calculate score before transaction
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

  const title = detail.localizableTitle?.ru || detail.title;

  // Atomic transaction: product + SKUs + snapshot
  const totalAvailable = detail.totalAvailableAmount != null
    ? BigInt(detail.totalAvailableAmount)
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        orders_quantity: BigInt(currentOrders),
        total_available_amount: totalAvailable,
      },
    });

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
        weekly_bought_source: wbSource,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        score,
      },
    });
  });

  return { updated: true, weeklyBought };
}

async function processReanalysis(jobId: string, jobName: string) {
  // Find all unique tracked product IDs
  const trackedProducts = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
    distinct: ['product_id'],
  });

  const productIds = trackedProducts.map((t) => t.product_id);
  logJobInfo('reanalysis-queue', jobId, jobName, `Found ${productIds.length} tracked products to re-analyze`);

  if (productIds.length === 0) {
    return { total: 0, updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((pid) => reanalyzeProduct(pid, jobId, jobName)),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.updated) {
        updated++;
      } else {
        failed++;
      }
    }

    logJobInfo('reanalysis-queue', jobId, jobName,
      `Progress: ${Math.min(i + BATCH_SIZE, productIds.length)}/${productIds.length} (updated=${updated}, failed=${failed})`);

    if (i + BATCH_SIZE < productIds.length) {
      await sleep(1000); // Rate limit: ~5 req/sec
    }
  }

  return { total: productIds.length, updated, failed };
}

export function createReanalysisWorker() {
  return new Worker(
    'reanalysis-queue',
    async (job: Job) => {
      const start = Date.now();
      logJobStart('reanalysis-queue', job.id ?? '-', job.name, {});
      try {
        const result = await processReanalysis(job.id ?? '-', job.name);
        logJobDone('reanalysis-queue', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('reanalysis-queue', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1,
    },
  );
}
