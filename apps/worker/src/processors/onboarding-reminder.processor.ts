import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

const QUEUE_NAME = 'onboarding-reminder-queue';

/** Max users to process per run to avoid memory pressure */
const BATCH_LIMIT = 100;

/**
 * Find users who registered 3+ days ago but have NOT completed onboarding.
 * For now, log reminders — actual email/Telegram delivery is a future feature.
 */
async function processOnboardingReminders(jobId: string, jobName: string) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const users = await prisma.user.findMany({
    where: {
      created_at: { lt: threeDaysAgo },
      account: { onboarding_completed: false },
    },
    include: {
      account: { select: { name: true, onboarding_step: true } },
    },
    take: BATCH_LIMIT,
  });

  logJobInfo(QUEUE_NAME, jobId, jobName,
    `Found ${users.length} users needing onboarding reminder`);

  for (const user of users) {
    logJobInfo(QUEUE_NAME, jobId, jobName,
      `Reminder for ${user.email} (account: ${user.account.name}, step: ${user.account.onboarding_step}, created: ${user.created_at.toISOString()})`);
  }

  return { reminded: users.length };
}

// ─── Worker factory ──────────────────────────────────────────────────────────

export function createOnboardingReminderWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const start = Date.now();
      logJobStart(QUEUE_NAME, job.id ?? '-', job.name);
      try {
        const result = await processOnboardingReminders(job.id ?? '-', job.name);
        logJobDone(QUEUE_NAME, job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError(QUEUE_NAME, job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError(QUEUE_NAME, '-', 'worker', err));
  worker.on('failed', (job, err) =>
    logJobError(QUEUE_NAME, job?.id ?? '-', job?.name ?? '-', err),
  );

  return worker;
}
