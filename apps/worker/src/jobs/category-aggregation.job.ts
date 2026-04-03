import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const categoryAggregationQueue = new Queue('category-aggregation-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * Schedule daily category metric aggregation at 03:00 UTC.
 * Inserts CategoryMetricSnapshot rows for ML Model 5 (Category Intelligence).
 */
export async function scheduleCategoryAggregation() {
  const repeatableJobs = await categoryAggregationQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'category-aggregation') {
      await categoryAggregationQueue.removeRepeatableByKey(job.key);
    }
  }

  await categoryAggregationQueue.add(
    'category-aggregation',
    {},
    {
      repeat: { pattern: '0 3 * * *' }, // Har kuni 03:00 UTC
      jobId: 'category-aggregation-cron',
    },
  );

  console.log('Category aggregation cron registered: 0 3 * * *');
}
