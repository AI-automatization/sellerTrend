/**
 * Daily Aggregation processor.
 *
 * Har kuni kechasi ProductSnapshot → ProductSnapshotDaily ga aggregate qiladi.
 * data-cleanup.processor.ts faqat 30+ kunlik eski datani aggregate qiladi —
 * bu processor esa BUGUNGI va KECHAGI datani real-time to'ldiradi.
 *
 * daily_orders_delta = bugungi max_orders - kechagi max_orders
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'daily-aggregation-queue';

function toDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function aggregateDay(jobId: string, jobName: string): Promise<{ aggregated: number }> {
  const todayUtc = toDate(new Date());
  const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000);

  // Bugungi ProductSnapshot larni product bo'yicha aggregate qilish
  const rows = await prisma.$queryRaw<Array<{
    product_id: bigint;
    avg_score: number | null;
    max_wb: number | null;
    avg_rating: number | null;
    max_orders: bigint | null;
    min_price: bigint | null;
    cnt: number;
  }>>`
    SELECT
      ps.product_id,
      AVG(ps.score)::decimal(8,4)          AS avg_score,
      MAX(ps.weekly_bought)::int            AS max_wb,
      AVG(ps.rating)::decimal(3,2)          AS avg_rating,
      MAX(ps.orders_quantity)               AS max_orders,
      MIN(ss.sell_price)                    AS min_price,
      COUNT(DISTINCT ps.id)::int            AS cnt
    FROM product_snapshots ps
    LEFT JOIN skus sk ON sk.product_id = ps.product_id
    LEFT JOIN sku_snapshots ss ON ss.sku_id = sk.id
      AND ss.snapshot_at::date = CURRENT_DATE
    WHERE ps.snapshot_at::date = CURRENT_DATE
      AND EXISTS (
        SELECT 1 FROM tracked_products tp
        WHERE tp.product_id = ps.product_id AND tp.is_active = true
      )
    GROUP BY ps.product_id
  `;

  if (rows.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'Bugun snapshot yoq');
    return { aggregated: 0 };
  }

  // Kechagi max_orders ni batch olish (delta hisoblash uchun)
  const productIds = rows.map((r) => r.product_id);
  const yesterdayRows = await prisma.productSnapshotDaily.findMany({
    where: {
      product_id: { in: productIds },
      day: yesterdayUtc,
    },
    select: { product_id: true, max_orders: true },
  });
  const yesterdayMap = new Map<bigint, bigint | null>(
    yesterdayRows.map((r) => [r.product_id, r.max_orders]),
  );

  let aggregated = 0;
  for (const row of rows) {
    const prevOrders = yesterdayMap.get(row.product_id) ?? null;
    // Manfiy delta bo'lmasligi kerak (Uzum API inconsistency tufayli ba'zan kamayadigan qiymat keladi)
    const rawDelta = row.max_orders != null && prevOrders != null
      ? Number(row.max_orders - prevOrders)
      : null;
    // rawDelta < 0 → Uzum counter reset: ma'lumot ishonchsiz → null (0 sotuv emas!)
    const dailyDelta = rawDelta !== null ? (rawDelta < 0 ? null : rawDelta) : null;

    try {
      await prisma.productSnapshotDaily.upsert({
        where: {
          product_id_day: { product_id: row.product_id, day: todayUtc },
        },
        create: {
          product_id: row.product_id,
          day: todayUtc,
          avg_score: row.avg_score,
          max_weekly_bought: row.max_wb,
          avg_rating: row.avg_rating,
          max_orders: row.max_orders,
          daily_orders_delta: dailyDelta,
          min_price: row.min_price,
          snapshot_count: row.cnt,
        },
        update: {
          avg_score: row.avg_score,
          max_weekly_bought: row.max_wb,
          avg_rating: row.avg_rating,
          max_orders: row.max_orders,
          daily_orders_delta: dailyDelta,
          min_price: row.min_price,
          snapshot_count: row.cnt,
        },
      });
      aggregated++;
    } catch {
      // Individual failure — skip
    }
  }

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Aggregated ${aggregated}/${rows.length} products for ${todayUtc.toISOString().split('T')[0]}`);
  return { aggregated };
}

export function createDailyAggregationWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await aggregateDay(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
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
