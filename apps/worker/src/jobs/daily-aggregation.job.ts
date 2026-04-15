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
 * 00:05 UTC — calendar kun o'tgandan 5 daqiqa keyin.
 * Kecha 00:00 - bugun 00:00 orasidagi snapshotlardan daily_orders_delta hisoblaydi.
 * T-504: calendar-day based kunlik sotuv.
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
      repeat: { pattern: '5 0 * * *' }, // 00:05 UTC har kuni
      jobId: 'daily-aggregation-cron',
    },
  );

  console.log('Daily aggregation cron registered: 5 0 * * * (00:05 UTC, Toshkent 05:05)');
}
