import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const billingQueue = new Queue('billing-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

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
 * Schedule monthly analyses_used reset for FREE plan accounts.
 * Runs on the 1st of every month at 04:00 UTC.
 */
export async function scheduleAnalysesReset() {
  const repeatableJobs = await billingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'analyses-reset') {
      await billingQueue.removeRepeatableByKey(job.key);
    }
  }

  await billingQueue.add(
    'analyses-reset',
    {},
    {
      repeat: { pattern: '0 4 1 * *' }, // 1st of every month at 04:00 UTC
      jobId: 'analyses-reset-cron',
    },
  );

  console.log('Analyses reset cron registered: 0 4 1 * *');
}

/**
 * Schedule daily subscription renewal check at 03:00 UTC.
 * Finds accounts whose plan expires within 3 days and renews if balance sufficient.
 */
export async function scheduleSubscriptionRenewal() {
  const repeatableJobs = await billingQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'subscription-renewal') {
      await billingQueue.removeRepeatableByKey(job.key);
    }
  }

  await billingQueue.add(
    'subscription-renewal',
    {},
    {
      repeat: { pattern: '0 3 * * *' }, // Every day at 03:00 UTC
      jobId: 'subscription-renewal-cron',
    },
  );

  console.log('Subscription renewal cron registered: 0 3 * * *');
}

/**
 * Trigger billing manually (for testing)
 */
export async function triggerBillingNow() {
  return billingQueue.add('daily-billing', {}, { jobId: `manual-${Date.now()}` });
}
