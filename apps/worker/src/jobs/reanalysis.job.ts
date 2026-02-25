import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const reanalysisQueue = new Queue('reanalysis-queue', redisConnection);

/**
 * Schedule automatic re-analysis of tracked products every 24 hours.
 * Runs at 03:00 UTC (08:00 Tashkent time) daily.
 */
export async function scheduleReanalysis() {
  // Remove old repeatable job if exists
  const repeatableJobs = await reanalysisQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'reanalysis-daily') {
      await reanalysisQueue.removeRepeatableByKey(job.key);
    }
  }

  await reanalysisQueue.add(
    'reanalysis-daily',
    {},
    {
      repeat: { pattern: '0 3 * * *' }, // Every day at 03:00 UTC
      jobId: 'reanalysis-daily-cron',
    },
  );

  console.log('Reanalysis cron registered: 0 3 * * * (daily 03:00 UTC / 08:00 UZT)');
}
