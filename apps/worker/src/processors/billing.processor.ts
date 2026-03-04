import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError, logJobInfo } from '../logger';

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
    where: { status: 'ACTIVE', id: { notIn: adminAccountIds } },
  });

  let charged = 0;
  let suspended = 0;

  for (const account of accounts) {
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

export function createBillingWorker() {
  const worker = new Worker(
    'billing-queue',
    async (job: Job) => {
      const start = Date.now();
      logJobStart('billing-queue', job.id ?? '-', job.name);
      try {
        const result = await chargeAllActiveAccounts(job.id ?? '-');
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
