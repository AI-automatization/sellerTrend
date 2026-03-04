import { Queue } from 'bullmq';
import { redisConnection } from '../redis';
import { logProcess } from '../logger';

export const alertDeliveryQueue = new Queue('alert-delivery-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

/**
 * Schedule alert delivery every 5 minutes.
 * Picks undelivered AlertEvents and creates in-app notifications + Telegram messages.
 */
export async function scheduleAlertDelivery() {
  // Remove old repeatable job if exists
  const repeatableJobs = await alertDeliveryQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'deliver-alerts') {
      await alertDeliveryQueue.removeRepeatableByKey(job.key);
    }
  }

  await alertDeliveryQueue.add(
    'deliver-alerts',
    {},
    {
      repeat: { pattern: '*/5 * * * *' }, // Every 5 minutes
      jobId: 'alert-delivery-cron',
    },
  );

  logProcess('info', 'Alert delivery cron scheduled: every 5 minutes');
}
