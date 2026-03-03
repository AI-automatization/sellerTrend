import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Sentinel error used to signal insufficient balance inside a transaction */
class InsufficientBalanceError extends Error {
  constructor() {
    super('Insufficient balance');
  }
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemDailyFee(): Promise<bigint> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'daily_fee_default' },
    });
    return BigInt(setting?.value ?? '50000');
  }

  async chargeAllActiveAccounts(): Promise<{ charged: number; suspended: number; total: number }> {
    const defaultFee = await this.getSystemDailyFee();
    const today = new Date().toISOString().split('T')[0];

    // Find all active accounts, excluding those with SUPER_ADMIN users
    const adminAccountIds = (
      await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { account_id: true },
      })
    ).map((u) => u.account_id);

    const accounts = await this.prisma.account.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: adminAccountIds },
      },
    });

    let charged = 0;
    let suspended = 0;

    for (const account of accounts) {
      const fee = account.daily_fee ?? defaultFee;

      try {
        // Atomic read-check-write to prevent double-charge TOCTOU
        await this.prisma.$transaction(async (tx) => {
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

        this.logger.log(`Charged ${fee} from account ${account.id}`);
        charged++;
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          this.logger.warn(`Account ${account.id} set to PAYMENT_DUE`);
          suspended++;
        } else {
          throw err;
        }
      }
    }

    return { charged, suspended, total: accounts.length };
  }

  async depositBalance(
    accountId: string,
    amount: bigint,
    description?: string,
  ): Promise<void> {
    // Atomic read-check-write to prevent stale balance in transaction log
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.account.findUniqueOrThrow({
        where: { id: accountId },
      });

      const newBalance = account.balance + amount;

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: newBalance,
          // Restore active if payment was due
          ...(account.status === 'PAYMENT_DUE' && { status: 'ACTIVE' }),
        },
      });

      await tx.transaction.create({
        data: {
          account_id: accountId,
          type: 'DEPOSIT',
          amount,
          balance_before: account.balance,
          balance_after: newBalance,
          description: description ?? 'Manual deposit',
        },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async getAccountBalance(accountId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { balance: true, status: true, daily_fee: true },
    });
    const defaultFee = await this.getSystemDailyFee();
    return {
      balance: account.balance.toString(),
      status: account.status,
      daily_fee: (account.daily_fee ?? defaultFee).toString(),
    };
  }
}
