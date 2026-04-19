/**
 * Daily Aggregation processor — T-504, T-511
 *
 * Har kuni Toshkent 00:00 (UTC 19:00) da calendar-day delta hisoblaydi.
 *
 * daily_orders_delta = kecha_oxirgi_snapshot.orders - bugunoq_oldingi_kun_oxirgi_snapshot.orders
 *
 * Ya'ni:
 *   - Bugun (kecha Toshkent 00:00 - bugun Toshkent 00:00) orasidagi oxirgi snapshot = "kechagi sotuv oxiri"
 *   - Avvalgi kun (ikki kun oldin - kecha Toshkent 00:00) orasidagi oxirgi snapshot = "oldingi kun oxiri"
 *   - Delta = kechagi_oxirgi - oldingi_kun_oxirgi = o'sha kunning sotuvlari
 *
 * Nima uchun Toshkent timezone (T-511):
 *   UTC 00:00 ishlatilsa Toshkent 00:00–05:00 orasidagi sotuvlar noto'g'ri kunda hisoblanadi.
 *   Toshkent 00:00 = UTC 19:00 (oldingi kun) — foydalanuvchi Toshkent vaqtida ishlaydi.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'daily-aggregation-queue';

const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5

/** Toshkent calendar kun boshini UTC timestamp sifatida qaytaradi */
function toTashkentDayStartUTC(d: Date): Date {
  const tashkent = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  tashkent.setUTCHours(0, 0, 0, 0);
  return new Date(tashkent.getTime() - TASHKENT_OFFSET_MS);
}

/** Kecha (Toshkent) boshlanish va tugash vaqtlari (UTC sifatida) */
function getYesterdayRange(): { start: Date; end: Date; day: Date } {
  const now = new Date();
  const todayStartUTC = toTashkentDayStartUTC(now);                              // bugun Toshkent 00:00 = UTC 19:00
  const yesterdayStartUTC = new Date(todayStartUTC.getTime() - 24 * 60 * 60 * 1000); // kecha Toshkent 00:00
  // day key: Toshkent sanasi (masalan 2026-04-19)
  const dayKey = new Date(yesterdayStartUTC.getTime() + TASHKENT_OFFSET_MS);
  dayKey.setUTCHours(0, 0, 0, 0);
  return {
    start: yesterdayStartUTC,
    end: todayStartUTC,
    day: dayKey,
  };
}

async function aggregateDay(jobId: string, jobName: string): Promise<{ aggregated: number }> {
  const { start: yesterdayStart, end: todayStart, day: dayKey } = getYesterdayRange();
  const twoDaysAgoStart = new Date(yesterdayStart.getTime() - 24 * 60 * 60 * 1000);

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Calendar-day aggregation: day=${dayKey.toISOString().split('T')[0]}`);

  // Har aktiv tracked product uchun:
  // 1. Kecha (yesterdayStart..todayStart) oxirgi snapshot
  // 2. Ikki kun oldin (twoDaysAgoStart..yesterdayStart) oxirgi snapshot
  // delta = kecha_oxirgi - ikki_kun_oldin_oxirgi
  const trackedProductIds = await prisma.trackedProduct.findMany({
    where: { is_active: true },
    select: { product_id: true },
    distinct: ['product_id'],
  });

  if (trackedProductIds.length === 0) {
    logJobInfo(QUEUE_NAME, jobId, jobName, 'Aktiv tracked product topilmadi');
    return { aggregated: 0 };
  }

  let aggregated = 0;

  for (const { product_id } of trackedProductIds) {
    // Kechagi oxirgi snapshot (kecha 00:00 → bugun 00:00)
    const yesterdaySnap = await prisma.productSnapshot.findFirst({
      where: {
        product_id,
        snapshot_at: { gte: yesterdayStart, lt: todayStart },
      },
      orderBy: { snapshot_at: 'desc' },
      select: { orders_quantity: true, score: true, weekly_bought: true, rating: true },
    });

    if (!yesterdaySnap?.orders_quantity) continue;

    // Ikki kun oldingi oxirgi snapshot (2 kun oldin 00:00 → kecha 00:00)
    const prevDaySnap = await prisma.productSnapshot.findFirst({
      where: {
        product_id,
        snapshot_at: { gte: twoDaysAgoStart, lt: yesterdayStart },
      },
      orderBy: { snapshot_at: 'desc' },
      select: { orders_quantity: true },
    });

    const rawDelta = prevDaySnap?.orders_quantity
      ? Number(yesterdaySnap.orders_quantity) - Number(prevDaySnap.orders_quantity)
      : null;

    // rawDelta < 0 → Uzum counter reset: ishonchsiz → null
    const dailyDelta = rawDelta !== null ? (rawDelta >= 0 ? rawDelta : null) : null;

    // O'sha kungi min narx
    const minPriceRow = await prisma.$queryRaw<Array<{ min_price: bigint | null }>>`
      SELECT MIN(ss.sell_price) AS min_price
      FROM skus sk
      JOIN sku_snapshots ss ON ss.sku_id = sk.id
      WHERE sk.product_id = ${product_id}
        AND ss.snapshot_at >= ${yesterdayStart}
        AND ss.snapshot_at < ${todayStart}
    `;
    const minPrice = minPriceRow[0]?.min_price ?? null;

    try {
      await prisma.productSnapshotDaily.upsert({
        where: { product_id_day: { product_id, day: dayKey } },
        create: {
          product_id,
          day: dayKey,
          avg_score: yesterdaySnap.score ? Number(yesterdaySnap.score) : null,
          max_weekly_bought: yesterdaySnap.weekly_bought ?? null,
          avg_rating: yesterdaySnap.rating ? Number(yesterdaySnap.rating) : null,
          max_orders: yesterdaySnap.orders_quantity,
          daily_orders_delta: dailyDelta,
          min_price: minPrice,
          snapshot_count: 1,
        },
        update: {
          avg_score: yesterdaySnap.score ? Number(yesterdaySnap.score) : null,
          max_weekly_bought: yesterdaySnap.weekly_bought ?? null,
          avg_rating: yesterdaySnap.rating ? Number(yesterdaySnap.rating) : null,
          max_orders: yesterdaySnap.orders_quantity,
          daily_orders_delta: dailyDelta,
          min_price: minPrice,
          snapshot_count: 1,
        },
      });
      aggregated++;
    } catch {
      // Individual failure — skip
    }
  }

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Aggregated ${aggregated}/${trackedProductIds.length} products (calendar-day: ${dayKey.toISOString().split('T')[0]})`);
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
