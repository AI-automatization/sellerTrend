import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const competitorQueue = new Queue('competitor-queue', redisConnection);

/**
 * Schedule competitor price snapshots every 6 hours
 */
export async function scheduleCompetitorSnapshots() {
  // Remove old repeatable job if exists
  const repeatableJobs = await competitorQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'competitor-snapshot') {
      await competitorQueue.removeRepeatableByKey(job.key);
    }
  }

  await competitorQueue.add(
    'competitor-snapshot',
    {},
    {
      repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
      jobId: 'competitor-snapshot-cron',
    },
  );

  console.log('Competitor snapshot cron registered: 0 */6 * * *');
}
