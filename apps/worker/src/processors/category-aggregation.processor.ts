import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'category-aggregation-queue';

async function runCategoryAggregation(jobId: string, jobName: string) {
  // Barcha aktiv kategoriyalar bo'yicha product statistikasini yig'amiz
  const rows = await prisma.$queryRaw<
    Array<{
      category_id: bigint;
      product_count: number;
      seller_count: number;
      avg_score: number;
      avg_weekly_sold: number;
      total_orders: bigint;
      avg_price: bigint;
    }>
  >`
    SELECT
      p.category_id,
      COUNT(DISTINCT p.id)::int                          AS product_count,
      COUNT(DISTINCT p.shop_id)::int                     AS seller_count,
      AVG(CAST(ps.score AS FLOAT))                       AS avg_score,
      AVG(COALESCE(ps.weekly_bought, 0)::FLOAT)          AS avg_weekly_sold,
      SUM(p.orders_quantity)                             AS total_orders,
      AVG(sk.sell_price)::BIGINT                         AS avg_price
    FROM products p
    LEFT JOIN LATERAL (
      SELECT score, weekly_bought
      FROM product_snapshots
      WHERE product_id = p.id
      ORDER BY snapshot_at DESC
      LIMIT 1
    ) ps ON true
    LEFT JOIN LATERAL (
      SELECT ss.sell_price
      FROM skus s
      JOIN sku_snapshots ss ON ss.sku_id = s.id
      WHERE s.product_id = p.id
      ORDER BY ss.snapshot_at DESC
      LIMIT 1
    ) sk ON true
    WHERE p.category_id IS NOT NULL
    GROUP BY p.category_id
    HAVING COUNT(DISTINCT p.id) > 0
  `;

  if (rows.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'No categories found, skipping');
    return { categories_processed: 0 };
  }

  logJobInfo(QUEUE_NAME, jobId, jobName, `Aggregating ${rows.length} categories`);

  // Batch insert
  await prisma.categoryMetricSnapshot.createMany({
    data: rows.map((r) => ({
      category_id: r.category_id,
      product_count: r.product_count,
      seller_count: r.seller_count,
      avg_score: r.avg_score ?? 0,
      avg_weekly_sold: r.avg_weekly_sold ?? 0,
      total_orders: r.total_orders ?? BigInt(0),
      avg_price: r.avg_price ?? BigInt(0),
    })),
  });

  return { categories_processed: rows.length };
}

export function createCategoryAggregationWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await runCategoryAggregation(job.id ?? '-', job.name);
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
