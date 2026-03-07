import { Queue } from 'bullmq';
import { redisConnection } from '../redis';

export const onboardingReminderQueue = new Queue('onboarding-reminder-queue', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 50 },
  },
});

/**
 * Schedule onboarding reminders daily at 10:00 UTC.
 * Finds users registered 3+ days ago with incomplete onboarding.
 */
export async function scheduleOnboardingReminder() {
  const repeatableJobs = await onboardingReminderQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'onboarding-reminder') {
      await onboardingReminderQueue.removeRepeatableByKey(job.key);
    }
  }

  await onboardingReminderQueue.add(
    'onboarding-reminder',
    {},
    {
      repeat: { pattern: '0 10 * * *' }, // Daily at 10:00 UTC
      jobId: 'onboarding-reminder-cron',
    },
  );

  console.log('Onboarding reminder cron registered: 0 10 * * * (daily 10:00 UTC)');
}
