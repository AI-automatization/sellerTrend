import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const billingQueue = new Queue('billing-queue', redisConnection);

/**
 * Schedule daily billing cron at 00:00 server time
 */
export async function scheduleDailyBilling() {
  // Remove old repeatable job if exists
  const repeatableJobs = await billingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-billing') {
      await billingQueue.removeRepeatableByKey(job.key);
    }
  }

  await billingQueue.add(
    'daily-billing',
    {},
    {
      repeat: { pattern: '0 0 * * *' }, // Every day at 00:00
      jobId: 'daily-billing-cron',
    },
  );

  console.log('Daily billing cron registered: 0 0 * * *');
}

/**
 * Trigger billing manually (for testing)
 */
export async function triggerBillingNow() {
  return billingQueue.add('daily-billing', {}, { jobId: `manual-${Date.now()}` });
}
