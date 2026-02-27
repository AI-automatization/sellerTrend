import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const reanalysisQueue = new Queue('reanalysis-queue', redisConnection);

/**
 * Schedule automatic re-analysis of tracked products every 6 hours.
 * Runs at 00:00, 06:00, 12:00, 18:00 UTC daily.
 */
export async function scheduleReanalysis() {
  // Remove old repeatable jobs
  const repeatableJobs = await reanalysisQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'reanalysis-daily' || job.name === 'reanalysis-6h') {
      await reanalysisQueue.removeRepeatableByKey(job.key);
    }
  }

  await reanalysisQueue.add(
    'reanalysis-6h',
    {},
    {
      repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
      jobId: 'reanalysis-6h-cron',
    },
  );

  console.log('Reanalysis cron registered: 0 */6 * * * (every 6 hours)');
}
