import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async chargeAllActiveAccounts(): Promise<void> {
    const defaultFee = await this.getSystemDailyFee();
    const today = new Date().toISOString().split('T')[0];

    const accounts = await this.prisma.account.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const account of accounts) {
      const fee = account.daily_fee ?? defaultFee;

      if (account.balance >= fee) {
        await this.prisma.$transaction([
          this.prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: fee } },
          }),
          this.prisma.transaction.create({
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
        this.logger.log(`Charged ${fee} from account ${account.id}`);
      } else {
        await this.prisma.account.update({
          where: { id: account.id },
          data: { status: 'PAYMENT_DUE' },
        });
        this.logger.warn(`Account ${account.id} set to PAYMENT_DUE`);
      }
    }
  }

  async depositBalance(
    accountId: string,
    amount: bigint,
    description?: string,
  ): Promise<void> {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });

    const newBalance = account.balance + amount;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: {
          balance: newBalance,
          // Restore active if payment was due
          ...(account.status === 'PAYMENT_DUE' && { status: 'ACTIVE' }),
        },
      }),
      this.prisma.transaction.create({
        data: {
          account_id: accountId,
          type: 'DEPOSIT',
          amount,
          balance_before: account.balance,
          balance_after: newBalance,
          description: description ?? 'Manual deposit',
        },
      }),
    ]);
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
