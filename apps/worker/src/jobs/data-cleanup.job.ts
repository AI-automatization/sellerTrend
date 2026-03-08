import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const dataCleanupQueue = new Queue('data-cleanup-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * Schedule data cleanup daily at 02:00 UTC (low-traffic window).
 * Deletes old snapshots, expired sessions, used/expired password resets, stale search jobs.
 */
export async function scheduleDataCleanup() {
  const repeatableJobs = await dataCleanupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'data-cleanup') {
      await dataCleanupQueue.removeRepeatableByKey(job.key);
    }
  }

  await dataCleanupQueue.add(
    'data-cleanup',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Daily at 02:00 UTC
      jobId: 'data-cleanup-cron',
    },
  );

  console.log('Data cleanup cron registered: 0 2 * * * (daily 02:00 UTC)');
}
