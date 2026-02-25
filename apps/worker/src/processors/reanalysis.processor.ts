import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { calculateScore, getSupplyPressure, sleep } from '@uzum/utils';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const UZUM_API = 'https://api.uzum.uz/api/v2';
const HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://uzum.uz',
  Referer: 'https://uzum.uz/',
  Accept: 'application/json',
};

interface UzumProductData {
  id: number;
  title: string;
  rating: number;
  ordersAmount: number;
  reviewsAmount: number;
  totalAvailableAmount: number;
  skuList: Array<{
    id: number;
    purchasePrice: number;
    fullPrice: number;
    availableAmount: number;
    stock: { type: string };
  }>;
}

async function fetchProductFromUzum(productId: number): Promise<UzumProductData | null> {
  try {
    const res = await fetch(`${UZUM_API}/product/${productId}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    return json?.payload?.data ?? null;
  } catch {
    return null;
  }
}

async function reanalyzeProduct(
  productId: bigint,
  jobId: string,
  jobName: string,
): Promise<{ updated: boolean; weeklyBought: number | null }> {
  const numId = Number(productId);
  const detail = await fetchProductFromUzum(numId);
  if (!detail) {
    logJobInfo('reanalysis-queue', jobId, jobName, `API failed for product ${numId}`);
    return { updated: false, weeklyBought: null };
  }

  const currentOrders = detail.ordersAmount ?? 0;

  // Get previous snapshot for weekly_bought delta
  const prevSnapshot = await prisma.productSnapshot.findFirst({
    where: { product_id: productId },
    orderBy: { snapshot_at: 'desc' },
    select: { orders_quantity: true, snapshot_at: true },
  });

  let weeklyBought: number | null = null;
  if (prevSnapshot && prevSnapshot.orders_quantity != null) {
    const daysDiff =
      (Date.now() - prevSnapshot.snapshot_at.getTime()) / (1000 * 60 * 60 * 24);
    const ordersDiff = currentOrders - Number(prevSnapshot.orders_quantity);
    if (daysDiff > 0 && ordersDiff >= 0) {
      weeklyBought = Math.round((ordersDiff * 7) / daysDiff);
    }
  }

  // Update product
  await prisma.product.update({
    where: { id: productId },
    data: {
      title: detail.title,
      rating: detail.rating ?? null,
      feedback_quantity: detail.reviewsAmount ?? 0,
      orders_quantity: BigInt(currentOrders),
    },
  });

  // Update SKUs
  const skuList = detail.skuList ?? [];
  for (const sku of skuList) {
    const stockType = sku.stock?.type === 'FBO' ? 'FBO' : 'FBS';
    await prisma.sku.upsert({
      where: { id: BigInt(sku.id) },
      update: {
        min_sell_price: BigInt(sku.purchasePrice ?? 0),
        min_full_price: BigInt(sku.fullPrice ?? 0),
        stock_type: stockType,
        is_available: sku.availableAmount > 0,
      },
      create: {
        id: BigInt(sku.id),
        product_id: productId,
        min_sell_price: BigInt(sku.purchasePrice ?? 0),
        min_full_price: BigInt(sku.fullPrice ?? 0),
        stock_type: stockType,
        is_available: sku.availableAmount > 0,
      },
    });
  }

  // Calculate score
  const primarySku = skuList[0];
  const stockType = primarySku?.stock?.type === 'FBO' ? 'FBO' as const : 'FBS' as const;
  const supplyPressure = getSupplyPressure(stockType);

  const score = calculateScore({
    weekly_bought: weeklyBought,
    orders_quantity: currentOrders,
    rating: detail.rating ?? 0,
    supply_pressure: supplyPressure,
  });

  // Create new snapshot
  await prisma.productSnapshot.create({
    data: {
      product_id: productId,
      orders_quantity: BigInt(currentOrders),
      weekly_bought: weeklyBought,
      rating: detail.rating ?? null,
      feedback_quantity: detail.reviewsAmount ?? 0,
      score,
    },
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
