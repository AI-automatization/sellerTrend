import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

/** Plan pricing constants (som/month) */
const PLAN_PRICES: Record<string, bigint> = {
  FREE: BigInt(0),
  PRO: BigInt(150000),
  MAX: BigInt(350000),
  COMPANY: BigInt(990000),
};

/** Sentinel error used to signal insufficient balance inside a transaction */
class InsufficientBalanceError extends Error {
  constructor() {
    super('Insufficient balance');
  }
}

async function chargeAllActiveAccounts(jobId: string) {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'daily_fee_default' },
  });
  const defaultFee = BigInt(setting?.value ?? '50000');
  const today = new Date().toISOString().split('T')[0];

  // Idempotency check: skip if today's billing was already processed
  const alreadyCharged = await prisma.transaction.findFirst({
    where: {
      type: 'CHARGE',
      description: `Daily fee charge: ${today}`,
    },
  });

  if (alreadyCharged) {
    logJobInfo('billing-queue', jobId, 'charge', `Daily billing already processed for ${today}, skipping (idempotency)`);
    return { charged: 0, suspended: 0, total: 0, skipped: true };
  }

  // Exclude SUPER_ADMIN accounts from daily charges
  const adminAccountIds = (
    await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { account_id: true },
    })
  ).map((u) => u.account_id);

  const accounts = await prisma.account.findMany({
    where: {
      status: 'ACTIVE',
      plan: { not: 'FREE' },  // FREE users don't get charged
      id: { notIn: adminAccountIds },
    },
  });

  let charged = 0;
  let suspended = 0;

  for (const account of accounts) {
    // Skip accounts with expired plans — downgrade to FREE instead of charging
    if (account.plan_expires_at && account.plan_expires_at < new Date()) {
      await prisma.account.update({
        where: { id: account.id },
        data: { plan: 'FREE', status: 'ACTIVE' },
      });
      logJobInfo('billing-queue', jobId, 'charge', `Account ${account.id} plan expired — downgraded to FREE`);
      continue;
    }

    const fee = account.daily_fee ?? defaultFee;

    try {
      // Atomic read-check-write to prevent double-charge TOCTOU
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.account.findUniqueOrThrow({
          where: { id: account.id },
        });

        if (fresh.balance < fee) {
          await tx.account.update({
            where: { id: account.id },
            data: { status: 'PAYMENT_DUE' },
          });
          throw new InsufficientBalanceError();
        }

        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: fee } },
        });

        await tx.transaction.create({
          data: {
            account_id: account.id,
            type: 'CHARGE',
            amount: fee,
            balance_before: fresh.balance,
            balance_after: fresh.balance - fee,
            description: `Daily fee charge: ${today}`,
          },
        });
      }, { isolationLevel: 'Serializable' });

      charged++;
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        suspended++;
      } else {
        throw err;
      }
    }
  }

  return { charged, suspended, total: accounts.length, skipped: false };
}

/**
 * Reset analyses_used counter for all FREE plan accounts.
 * Runs on 1st of every month at 04:00 UTC.
 */
async function resetFreeAnalyses(jobId: string) {
  const result = await prisma.account.updateMany({
    where: { plan: 'FREE' },
    data: { analyses_used: 0 },
  });
  logJobInfo('billing-queue', jobId, 'analyses-reset', `Reset analyses_used for ${result.count} FREE accounts`);
  return { reset: result.count };
}

/**
 * Renew subscriptions for accounts whose plan is about to expire (within 3 days).
 * Charges the monthly subscription fee if balance is sufficient, otherwise marks PAYMENT_DUE.
 * Runs daily at 03:00 UTC via cron.
 */
async function renewSubscriptions(jobId: string) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Exclude SUPER_ADMIN accounts
  const adminAccountIds = (
    await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { account_id: true },
    })
  ).map((u) => u.account_id);

  const accounts = await prisma.account.findMany({
    where: {
      plan: { not: 'FREE' },
      plan_expires_at: { lte: threeDaysFromNow },
      id: { notIn: adminAccountIds },
      status: { not: 'SUSPENDED' },
    },
  });

  let renewed = 0;
  let paymentDue = 0;

  for (const account of accounts) {
    const price = PLAN_PRICES[account.plan];
    if (price === undefined || price === BigInt(0)) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.account.findUniqueOrThrow({
          where: { id: account.id },
        });

        if (fresh.balance < price) {
          await tx.account.update({
            where: { id: account.id },
            data: { status: 'PAYMENT_DUE' },
          });
          throw new InsufficientBalanceError();
        }

        const newExpiresAt = new Date(
          (fresh.plan_expires_at ?? now).getTime() + 30 * 24 * 60 * 60 * 1000,
        );

        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { decrement: price },
            plan_expires_at: newExpiresAt,
            plan_renewed_at: now,
          },
        });

        await tx.transaction.create({
          data: {
            account_id: account.id,
            type: 'SUBSCRIPTION',
            amount: price,
            balance_before: fresh.balance,
            balance_after: fresh.balance - price,
            description: `Monthly subscription renewal: ${account.plan}`,
          },
        });
      }, { isolationLevel: 'Serializable' });

      logJobInfo('billing-queue', jobId, 'subscription-renewal',
        `Account ${account.id} renewed ${account.plan} for ${price.toString()} som`);
      renewed++;
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        logJobInfo('billing-queue', jobId, 'subscription-renewal',
          `Account ${account.id} insufficient balance for ${account.plan} renewal — set PAYMENT_DUE`);
        paymentDue++;
      } else {
        throw err;
      }
    }
  }

  logJobInfo('billing-queue', jobId, 'subscription-renewal',
    `Renewal complete: ${renewed} renewed, ${paymentDue} payment_due, ${accounts.length} total`);
  return { renewed, paymentDue, total: accounts.length };
}

export function createBillingWorker() {
  const worker = new Worker(
    'billing-queue',
    async (job: Job) => {
      const start = Date.now();
      logJobStart('billing-queue', job.id ?? '-', job.name);
      try {
        let result: Record<string, number | boolean>;
        if (job.name === 'analyses-reset') {
          result = await resetFreeAnalyses(job.id ?? '-');
        } else if (job.name === 'subscription-renewal') {
          result = await renewSubscriptions(job.id ?? '-');
        } else {
          result = await chargeAllActiveAccounts(job.id ?? '-');
        }
        logJobDone('billing-queue', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('billing-queue', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );

  worker.on('error', (err) => logJobError('billing-queue', '-', 'worker', err));
  worker.on('failed', (job, err) => logJobError('billing-queue', job?.id ?? '-', job?.name ?? '-', err));
  worker.on('stalled', (jobId) => console.error(`[billing-queue] stalled: ${jobId}`));

  return worker;
}
