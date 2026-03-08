import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const currencyUpdateQueue = new Queue('currency-update-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * Schedule CBU currency rate refresh daily at 00:30 UTC.
 */
export async function scheduleCurrencyUpdate() {
  const repeatableJobs = await currencyUpdateQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'currency-update') {
      await currencyUpdateQueue.removeRepeatableByKey(job.key);
    }
  }

  await currencyUpdateQueue.add(
    'currency-update',
    {},
    {
      repeat: { pattern: '30 0 * * *' }, // Daily at 00:30 UTC
      jobId: 'currency-update-cron',
    },
  );

  console.log('Currency update cron registered: 30 0 * * * (daily 00:30 UTC)');
}
