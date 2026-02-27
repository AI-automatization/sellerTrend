import { Worker, Job } from 'bullmq';
import { redisConnection } from '../redis';
import { prisma } from '../prisma';
import { logJobStart, logJobDone, logJobError } from '../logger';

async function chargeAllActiveAccounts() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'daily_fee_default' },
  });
  const defaultFee = BigInt(setting?.value ?? '50000');
  const today = new Date().toISOString().split('T')[0];

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

    if (account.balance >= fee) {
      await prisma.$transaction([
        prisma.account.update({
          where: { id: account.id },
          data: { balance: { decrement: fee } },
        }),
        prisma.transaction.create({
          data: {
            account_id: account.id,
            type: 'CHARGE',
            amount: fee,
            balance_before: account.balance,
            balance_after: account.balance - fee,
            description: `Daily fee charge: ${today}`,
          },
        }),
      ]);
      charged++;
    } else {
      await prisma.account.update({
        where: { id: account.id },
        data: { status: 'PAYMENT_DUE' },
      });
      suspended++;
    }
  }

  return { charged, suspended, total: accounts.length };
}

export function createBillingWorker() {
  return new Worker(
    'billing-queue',
    async (job: Job) => {
      const start = Date.now();
      logJobStart('billing-queue', job.id ?? '-', job.name);
      try {
        const result = await chargeAllActiveAccounts();
        logJobDone('billing-queue', job.id ?? '-', job.name, Date.now() - start, result);
        return result;
      } catch (err) {
        logJobError('billing-queue', job.id ?? '-', job.name, err, Date.now() - start);
        throw err;
      }
    },
    { ...redisConnection, concurrency: 1 },
  );
}
