import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const morningDigestQueue = new Queue('morning-digest-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * Schedule morning digest daily at 07:00 UTC.
 * Sends per-account summary: top products, pending alerts, balance.
 */
export async function scheduleMorningDigest() {
  const repeatableJobs = await morningDigestQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'morning-digest') {
      await morningDigestQueue.removeRepeatableByKey(job.key);
    }
  }

  await morningDigestQueue.add(
    'morning-digest',
    {},
    {
      repeat: { pattern: '0 7 * * *' }, // Daily at 07:00 UTC (= 12:00 Tashkent)
      jobId: 'morning-digest-cron',
    },
  );

  console.log('Morning digest cron registered: 0 7 * * * (07:00 UTC = 12:00 Tashkent)');
}
