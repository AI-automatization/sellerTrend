/**
 * Light Snapshot processor — T-504
 *
 * Har 15 daqiqada barcha aktiv tracked productlar uchun
 * faqat orders_quantity fetch qiladi (Playwright/GraphQL YO'Q).
 *
 * Maqsad: real-time sotuv kuzatuvi.
 * 00:00 UTC da daily-aggregation bu snapshotlardan
 * kunlik delta hisoblaydi.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { uzumUnlockerClient } from '../clients/uzum-unlocker.client';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'light-snapshot-queue';
const BATCH_LIMIT = 200;

async function processLightSnapshot(jobId: string, jobName: string): Promise<{ total: number; saved: number; failed: number }> {
  const trackedProducts = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
    distinct: ['product_id'],
    take: BATCH_LIMIT,
  });

  if (trackedProducts.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'Aktiv tracked product topilmadi');
    return { total: 0, saved: 0, failed: 0 };
  }

  logJobInfo(QUEUE_NAME, jobId, jobName, `Light snapshot: ${trackedProducts.length} product`);

  let saved = 0;
  let failed = 0;

  for (const { product_id } of trackedProducts) {
    const numId = Number(product_id);
    if (!Number.isSafeInteger(numId)) {
      failed++;
      continue;
    }

    try {
      const data = await uzumUnlockerClient.fetchProductOrders(numId);
      if (!data) {
        failed++;
        continue;
      }

      // Faqat orders_quantity snapshot — minimal write
      await prisma.productSnapshot.create({
        data: {
          product_id,
          orders_quantity: BigInt(data.ordersAmount),
          weekly_bought: null,
          weekly_bought_source: 'calculated',
          rating: data.rating ?? null,
          feedback_quantity: data.reviewsAmount ?? 0,
          score: null,
          score_version: 2,
        },
      });

      saved++;
    } catch (err: unknown) {
      // P2002 = dedup (5-min bucket) — normal, not a failure
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        saved++;
      } else {
        logJobInfo(QUEUE_NAME, jobId, jobName,
          `Failed product=${numId}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    }
  }

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Done: saved=${saved}, failed=${failed}, total=${trackedProducts.length}`);

  return { total: trackedProducts.length, saved, failed };
}

export function createLightSnapshotWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name, job.data);
      try {
        const result = await processLightSnapshot(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    {
      ...redisConnection,
      concurrency: 1,
      lockDuration: 300_000, // 5 min
    },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err));

  return worker;
}
