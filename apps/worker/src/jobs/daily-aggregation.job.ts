import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

const dailyAggregationQueue = new Queue('daily-aggregation-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * 19:05 UTC (Toshkent 00:05) — Toshkent kun o'tgandan 5 daqiqa keyin.
 * Kecha Toshkent 00:00 - bugun Toshkent 00:00 orasidagi snapshotlardan daily_orders_delta hisoblaydi.
 * T-504: calendar-day based kunlik sotuv.
 * T-511: UTC o'rniga Toshkent (UTC+5) timezone ishlatish.
 */
export async function scheduleDailyAggregation() {
  const repeatableJobs = await dailyAggregationQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-aggregation') {
      await dailyAggregationQueue.removeRepeatableByKey(job.key);
    }
  }

  await dailyAggregationQueue.add(
    'daily-aggregation',
    {},
    {
      repeat: { pattern: '5 19 * * *' }, // 19:05 UTC = Toshkent 00:05 har kuni
      jobId: 'daily-aggregation-cron',
    },
  );

  console.log('Daily aggregation cron registered: 5 19 * * * (19:05 UTC = Toshkent 00:05)');
}
