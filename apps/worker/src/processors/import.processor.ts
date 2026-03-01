import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { parseUzumProductId, calculateScore, getSupplyPressure, calcWeeklyBought, weeklyBoughtWithFallback, sleep, SNAPSHOT_MIN_GAP_MS } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';
import { fetchUzumProductRaw } from './uzum-scraper';

interface ImportBatchJobData {
  accountId: string;
  urls: string[];
}

async function processUrl(url: string, accountId: string, jobId: string, jobName: string) {
  const productId = parseUzumProductId(url);
  if (!productId) {
    logJobInfo('import-batch', jobId, jobName, `Skip invalid URL: ${url}`);
    return null;
  }

  try {
    const detail = await fetchUzumProductRaw(productId);
    if (!detail) {
      logJobInfo('import-batch', jobId, jobName, `API failed for product ${productId}`);
      return null;
    }

    const shopData = detail.seller || detail.shop;
    const shopId = shopData?.id ? BigInt(shopData.id) : null;

    // Upsert shop
    if (shopId && shopData) {
      const shopOrders = shopData.orders ?? shopData.ordersCount ?? null;
      await prisma.shop.upsert({
        where: { id: shopId },
        update: {
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopOrders ? BigInt(shopOrders) : null,
        },
        create: {
          id: shopId,
          title: shopData.title || shopData.name,
          rating: shopData.rating ?? null,
          orders_quantity: shopOrders ? BigInt(shopOrders) : null,
        },
      });
    }

    // Upsert product
    const title =
      detail.localizableTitle?.ru ||
      detail.title ||
      `Product ${productId}`;
    const pid = BigInt(productId);

    await prisma.product.upsert({
      where: { id: pid },
      update: {
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        orders_quantity: detail.ordersAmount
          ? BigInt(detail.ordersAmount)
          : BigInt(0),
        shop_id: shopId,
        category_id: detail.category?.id
          ? BigInt(detail.category.id)
          : null,
      },
      create: {
        id: pid,
        title,
        rating: detail.rating ?? null,
        feedback_quantity: detail.reviewsAmount ?? 0,
        orders_quantity: detail.ordersAmount
          ? BigInt(detail.ordersAmount)
          : BigInt(0),
        shop_id: shopId,
        category_id: detail.category?.id
          ? BigInt(detail.category.id)
          : null,
      },
    });

    // Centralized weekly_bought: 7-day lookback, 24h minimum gap (T-207)
    const currentOrders = detail.ordersAmount ?? 0;

    const recentSnapshots = await prisma.productSnapshot.findMany({
      where: { product_id: pid },
      orderBy: { snapshot_at: 'desc' },
      take: 20,
      select: { orders_quantity: true, weekly_bought: true, snapshot_at: true },
    });

    // Dedup guard (T-267): skip snapshot if last one is < 5 min old
    const lastSnap = recentSnapshots[0];
    if (lastSnap && Date.now() - lastSnap.snapshot_at.getTime() < SNAPSHOT_MIN_GAP_MS) {
      logJobInfo('import-batch', jobId, jobName, `Snapshot dedup: product ${productId}, skip — last snap ${Math.round((Date.now() - lastSnap.snapshot_at.getTime()) / 1000)}s ago`);
    } else {
      // T-268: fallback to last valid snapshot when calcWeeklyBought returns null
      const rawWeeklyBought = calcWeeklyBought(recentSnapshots, currentOrders);
      const weeklyBought = weeklyBoughtWithFallback(rawWeeklyBought, recentSnapshots);

      const stockType = detail.skuList?.[0]?.stock?.type;
      const supplyPressure = getSupplyPressure(
        stockType === 'FBO' ? 'FBO' : 'FBS',
      );
      const score = calculateScore({
        weekly_bought: weeklyBought,
        orders_quantity: currentOrders,
        rating: detail.rating ?? 0,
        supply_pressure: supplyPressure,
      });

      await prisma.productSnapshot.create({
        data: {
          product_id: pid,
          orders_quantity: currentOrders ? BigInt(currentOrders) : null,
          weekly_bought: weeklyBought,
          rating: detail.rating ?? null,
          score,
        },
      });
    }

    // Track product
    await prisma.trackedProduct.upsert({
      where: {
        account_id_product_id: {
          account_id: accountId,
          product_id: pid,
        },
      },
      update: { is_active: true },
      create: {
        account_id: accountId,
        product_id: pid,
      },
    });

    return productId;
  } catch (err: unknown) {
    logJobInfo('import-batch', jobId, jobName, `Error for ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export function createImportWorker() {
  return new Worker(
    'import-batch',
    async (job: Job<ImportBatchJobData>) => {
      const { accountId, urls } = job.data;
      const start = Date.now();
      logJobStart('import-batch', job.id ?? '-', job.name, { accountId, urlCount: urls.length });

      try {
        let success = 0;
        let failed = 0;

        // Process 5 at a time with rate limiting
        const BATCH_SIZE = 5;
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
          const batch = urls.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map((url) => processUrl(url, accountId, job.id ?? '-', job.name)),
          );
          success += results.filter(Boolean).length;
          failed += results.filter((r) => r === null).length;

          if (i + BATCH_SIZE < urls.length) {
            await sleep(1000); // rate limit
          }
        }

        const result = { success, failed, total: urls.length };
        logJobDone('import-batch', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('import-batch', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );
}
