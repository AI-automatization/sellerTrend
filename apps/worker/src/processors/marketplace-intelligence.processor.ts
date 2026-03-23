import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { uzumGraphQLClient } from '../clients/uzum-graphql.client';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'marketplace-intelligence-queue';
/** Keep last N snapshots per type to avoid unbounded growth */
const MAX_SNAPSHOTS_KEPT = 30;

async function processTopProducts(jobId: string, jobName: string): Promise<number> {
  const products = await uzumGraphQLClient.getTopProducts(45);

  if (products.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, "TOP mahsulotlar bo'sh qaytdi");
    return 0;
  }

  await prisma.marketplaceSnapshot.create({
    data: {
      type: 'top_products',
      data: products.map((p) => ({
        product_id: p.productId,
        title: p.title,
        orders_quantity: p.ordersQuantity,
        sell_price: p.minSellPrice,
        uzum_card_price: p.discount?.discountPrice ?? null,
        uzum_card_discount: p.discount?.sellDiscountPercent ?? null,
        is_best_price: p.buyingOptions?.isBestPrice ?? null,
        rating: p.rating ?? null,
        feedback_quantity: p.feedbackQuantity ?? null,
      })),
    },
  });

  // Prune old snapshots beyond MAX_SNAPSHOTS_KEPT
  const old = await prisma.marketplaceSnapshot.findMany({
    where: { type: 'top_products' },
    orderBy: { captured_at: 'desc' },
    skip: MAX_SNAPSHOTS_KEPT,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.marketplaceSnapshot.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
  }

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `TOP ${products.length} mahsulot saqlandi. Top-3: ${products.slice(0, 3).map((p) => `${p.productId}:${p.title.slice(0, 20)}`).join(', ')}`);

  return products.length;
}

export function createMarketplaceIntelligenceWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processTopProducts(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, { count: result });
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) =>
    logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err),
  );

  return worker;
}
