import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const monitoringQueue = new Queue('monitoring-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400, count: 100 },
  },
});

/**
 * Schedule signal monitoring every 6 hours.
 * Runs: detectStockCliff, detectEarlySignals, detectFlashSales for all accounts.
 */
export async function scheduleMonitoring() {
  const repeatableJobs = await monitoringQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'monitoring-signals') {
      await monitoringQueue.removeRepeatableByKey(job.key);
    }
  }

  await monitoringQueue.add(
    'monitoring-signals',
    {},
    {
      repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
      jobId: 'monitoring-signals-cron',
    },
  );

  console.log('Monitoring signals cron registered: 0 */6 * * *');
}
