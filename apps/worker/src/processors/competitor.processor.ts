import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { fetchProductDetail } from './uzum-scraper';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const PRICE_DROP_THRESHOLD_PCT = 10;

async function processCompetitorSnapshots(jobId: string, jobName: string) {
  // 1. Get all active trackings
  const trackings = await prisma.competitorTracking.findMany({
    where: { is_active: true },
  });

  if (trackings.length === 0) {
    logJobInfo('competitor-queue', jobId, jobName, 'No active trackings');
    return { total: 0, snapshots: 0, alerts: 0 };
  }

  // 2. Deduplicate competitor product IDs (same product tracked by multiple users)
  const uniqueProductIds = [
    ...new Set(trackings.map((t) => Number(t.competitor_product_id))),
  ];

  logJobInfo('competitor-queue', jobId, jobName, `${trackings.length} trackings, ${uniqueProductIds.length} unique products`);

  // 3. Fetch product details in batches
  const productDetails = new Map<number, Awaited<ReturnType<typeof fetchProductDetail>>>();

  for (let i = 0; i < uniqueProductIds.length; i += BATCH_SIZE) {
    const batch = uniqueProductIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) => fetchProductDetail(id)),
    );

    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        productDetails.set(batch[j], result.value);
      }
    }

    // Sleep between batches to avoid rate limiting
    if (i + BATCH_SIZE < uniqueProductIds.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  logJobInfo('competitor-queue', jobId, jobName, `Fetched ${productDetails.size}/${uniqueProductIds.length} product details`);

  // 4. Create snapshots and check for price drops
  let snapshotCount = 0;
  let alertCount = 0;

  for (const tracking of trackings) {
    const detail = productDetails.get(Number(tracking.competitor_product_id));
    if (!detail) continue;

    const sellPrice = detail.sellPrice;

    // Create snapshot
    await prisma.competitorPriceSnapshot.create({
      data: {
        tracking_id: tracking.id,
        sell_price: sellPrice,
        full_price: null, // REST API doesn't always have fullPrice separately
        discount_pct: 0,
      },
    });
    snapshotCount++;

    // 5. Check for PRICE_DROP alert
    if (sellPrice) {
      const prevSnapshot = await prisma.competitorPriceSnapshot.findFirst({
        where: { tracking_id: tracking.id },
        orderBy: { snapshot_at: 'desc' },
        skip: 1, // skip the one we just created
      });

      if (prevSnapshot?.sell_price) {
        const prevPrice = Number(prevSnapshot.sell_price);
        const newPrice = Number(sellPrice);
        if (prevPrice > 0) {
          const dropPct = ((prevPrice - newPrice) / prevPrice) * 100;

          if (dropPct >= PRICE_DROP_THRESHOLD_PCT) {
            // Find active PRICE_DROP alert rule for this product
            const alertRule = await prisma.alertRule.findFirst({
              where: {
                product_id: tracking.product_id,
                rule_type: 'PRICE_DROP',
                is_active: true,
              },
            });

            if (alertRule) {
              await prisma.alertEvent.create({
                data: {
                  rule_id: alertRule.id,
                  product_id: tracking.product_id,
                  message: `Raqib narxi ${dropPct.toFixed(1)}% tushdi: ${prevPrice} → ${newPrice} so'm (product #${tracking.competitor_product_id})`,
                },
              });
              alertCount++;
              logJobInfo('competitor-queue', jobId, jobName, `PRICE_DROP alert: product ${tracking.product_id}, competitor ${tracking.competitor_product_id}, drop ${dropPct.toFixed(1)}%`);
            }
          }
        }
      }
    }
  }

  return { total: trackings.length, snapshots: snapshotCount, alerts: alertCount };
}

export function createCompetitorWorker() {
  return new Worker(
    'competitor-queue',
    async (job: Job) => {
      const start = Date.now();
      logJobStart('competitor-queue', job.id ?? '-', job.name);
      try {
        const result = await processCompetitorSnapshots(job.id ?? '-', job.name);
        logJobDone('competitor-queue', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('competitor-queue', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );
}
