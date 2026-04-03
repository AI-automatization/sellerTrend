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

/** 03:30 UTC — category-aggregation (03:00) tugaganidan keyin */
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
      repeat: { pattern: '30 3 * * *' },
      jobId: 'daily-aggregation-cron',
    },
  );

  console.log('Daily aggregation cron registered: 30 3 * * * (03:30 UTC)');
}
