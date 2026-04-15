/**
 * Light Snapshot cron job — T-504
 *
 * Har 15 daqiqada light-snapshot-queue ga job yuboradi.
 * Faqat orders_quantity fetch — real-time sotuv kuzatuvi.
 */

import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const lightSnapshotQueue = new Queue('light-snapshot-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

export async function scheduleLightSnapshot() {
  const repeatableJobs = await lightSnapshotQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'light-snapshot-batch') {
      await lightSnapshotQueue.removeRepeatableByKey(job.key);
    }
  }

  await lightSnapshotQueue.add(
    'light-snapshot-batch',
    {},
    {
      repeat: { pattern: '*/15 * * * *' }, // har 15 daqiqada
      jobId: 'light-snapshot-batch-cron',
    },
  );

  console.log('Light snapshot cron registered: */15 * * * * (every 15 minutes)');
}
