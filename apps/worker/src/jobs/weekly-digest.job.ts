import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const weeklyDigestQueue = new Queue('weekly-digest-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 50 },
  },
});

/**
 * Schedule weekly digest every Monday at 08:00 UTC (= 13:00 Tashkent).
 * Generates per-user portfolio summary: gainers, losers, signals, avg score change.
 */
export async function scheduleWeeklyDigest() {
  const repeatableJobs = await weeklyDigestQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'weekly-digest') {
      await weeklyDigestQueue.removeRepeatableByKey(job.key);
    }
  }

  await weeklyDigestQueue.add(
    'weekly-digest',
    {},
    {
      repeat: { pattern: '0 8 * * 1' }, // Monday 08:00 UTC
      jobId: 'weekly-digest-cron',
    },
  );

  console.log('Weekly digest cron registered: 0 8 * * 1 (Monday 08:00 UTC = 13:00 Tashkent)');
}
