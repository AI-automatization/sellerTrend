import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts() {
    const accounts = await this.prisma.account.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: { select: { id: true, email: true, role: true } },
        _count: { select: { transactions: true } },
      },
    });

    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      balance: a.balance.toString(),
      daily_fee: a.daily_fee?.toString() ?? null,
      created_at: a.created_at,
      users: a.users,
      transaction_count: a._count.transactions,
    }));
  }

  async getAccount(accountId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      include: {
        users: { select: { id: true, email: true, role: true } },
        transactions: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    return {
      id: account.id,
      name: account.name,
      status: account.status,
      balance: account.balance.toString(),
      daily_fee: account.daily_fee?.toString() ?? null,
      created_at: account.created_at,
      users: account.users,
      transactions: account.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        balance_before: t.balance_before.toString(),
        balance_after: t.balance_after.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
    };
  }

  async setAccountDailyFee(
    accountId: string,
    fee: number | null,
    adminUserId: string,
  ) {
    const old = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { daily_fee: true },
    });

    const newFee = fee !== null ? BigInt(fee) : null;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { daily_fee: newFee },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'DAILY_FEE_CHANGED',
          old_value: { fee: old.daily_fee?.toString() ?? null },
          new_value: { fee: fee?.toString() ?? null },
        },
      }),
    ]);

    return { daily_fee: fee?.toString() ?? null };
  }

  async depositToAccount(
    accountId: string,
    amount: number,
    adminUserId: string,
    description?: string,
  ) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });

    const bigAmount = BigInt(amount);
    const newBalance = account.balance + bigAmount;

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: {
          balance: newBalance,
          ...(account.status === 'PAYMENT_DUE' && { status: 'ACTIVE' }),
        },
      }),
      this.prisma.transaction.create({
        data: {
          account_id: accountId,
          type: 'DEPOSIT',
          amount: bigAmount,
          balance_before: account.balance,
          balance_after: newBalance,
          description: description ?? `Admin deposit by ${adminUserId}`,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'BALANCE_DEPOSITED',
          old_value: { balance: account.balance.toString() },
          new_value: { balance: newBalance.toString(), amount: amount.toString() },
        },
      }),
    ]);

    return {
      balance: newBalance.toString(),
      status: account.status === 'PAYMENT_DUE' ? 'ACTIVE' : account.status,
    };
  }

  async getGlobalFee() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'daily_fee_default' },
    });
    return { daily_fee_default: setting?.value ?? '50000' };
  }

  async setGlobalFee(fee: number, adminUserId: string) {
    const old = await this.prisma.systemSetting.findUnique({
      where: { key: 'daily_fee_default' },
    });

    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: 'daily_fee_default' },
        update: { value: String(fee) },
        create: { key: 'daily_fee_default', value: String(fee) },
      }),
      this.prisma.auditEvent.create({
        data: {
          user_id: adminUserId,
          action: 'GLOBAL_FEE_CHANGED',
          old_value: { fee: old?.value ?? '50000' },
          new_value: { fee: String(fee) },
        },
      }),
    ]);

    return { daily_fee_default: String(fee) };
  }

  async getAuditLog(limit = 50) {
    const events = await this.prisma.auditEvent.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true, role: true } },
        account: { select: { name: true } },
      },
    });

    return events.map((e) => ({
      id: e.id,
      action: e.action,
      account_name: e.account?.name ?? null,
      user_email: e.user?.email ?? null,
      old_value: e.old_value,
      new_value: e.new_value,
      created_at: e.created_at,
    }));
  }
}
