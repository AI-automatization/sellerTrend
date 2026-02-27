import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          users: { select: { id: true, email: true, role: true } },
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.account.count(),
    ]);

    return {
      items: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        phone: a.phone ?? null,
        status: a.status,
        balance: a.balance.toString(),
        daily_fee: a.daily_fee?.toString() ?? null,
        created_at: a.created_at,
        users: a.users,
        transaction_count: a._count.transactions,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
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
      phone: (account as any).phone ?? null,
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

  /** Create a new account + first user */
  async createAccount(
    companyName: string,
    email: string,
    password: string,
    role: string,
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const account = await this.prisma.account.create({ data: { name: companyName } });
    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { account_id: account.id, email, password_hash, role: role as UserRole },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: account.id,
        user_id: adminUserId,
        action: 'ACCOUNT_CREATED',
        new_value: { company: companyName, email, role },
      },
    });

    return { account_id: account.id, user_id: user.id, email: user.email, role: user.role };
  }

  /** Update Account Status */
  async updateAccountStatus(accountId: string, status: string, adminUserId: string) {
    const validStatuses = ['ACTIVE', 'PAYMENT_DUE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Noto\'g\'ri status');
    }

    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { status: true },
    });

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { status: status as AccountStatus },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'ACCOUNT_STATUS_CHANGED',
          old_value: { status: account.status },
          new_value: { status },
        },
      }),
    ]);

    return { id: accountId, status };
  }

  /** Update account phone number */
  async updateAccountPhone(accountId: string, phone: string | null, adminUserId: string) {
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { phone: true },
    });

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { phone },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'ACCOUNT_PHONE_CHANGED',
          old_value: { phone: account.phone },
          new_value: { phone },
        },
      }),
    ]);

    return { id: accountId, phone };
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

  /** Deposit Log — list all DEPOSIT transactions */
  async getDepositLog(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { type: 'DEPOSIT' as const };

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          account: { select: { id: true, name: true, status: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        account_id: t.account_id,
        account_name: t.account.name,
        account_status: t.account.status,
        amount: t.amount.toString(),
        balance_before: t.balance_before.toString(),
        balance_after: t.balance_after.toString(),
        description: t.description,
        created_at: t.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** Delete a single deposit log entry */
  async deleteDepositLog(transactionId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction topilmadi');
    if (tx.type !== 'DEPOSIT') throw new BadRequestException('Faqat DEPOSIT turidagi tranzaksiyalarni o\'chirish mumkin');

    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });

    return { deleted: true };
  }

  /** Bulk Account Action */
  async bulkAccountAction(
    accountIds: string[],
    action: 'DEPOSIT' | 'SUSPEND' | 'ACTIVATE' | 'SET_FEE',
    params: { amount?: number; fee?: number; adminUserId: string },
  ) {
    let success = 0;
    let failed = 0;
    const errors: { account_id: string; error: string }[] = [];

    for (const accountId of accountIds) {
      try {
        switch (action) {
          case 'DEPOSIT': {
            if (!params.amount) throw new Error('Amount is required for DEPOSIT');
            await this.depositToAccount(accountId, params.amount, params.adminUserId);
            break;
          }
          case 'SUSPEND': {
            await this.updateAccountStatus(accountId, 'SUSPENDED', params.adminUserId);
            break;
          }
          case 'ACTIVATE': {
            await this.updateAccountStatus(accountId, 'ACTIVE', params.adminUserId);
            break;
          }
          case 'SET_FEE': {
            if (params.fee === undefined) throw new Error('Fee is required for SET_FEE');
            await this.setAccountDailyFee(accountId, params.fee, params.adminUserId);
            break;
          }
        }
        success++;
      } catch (err: unknown) {
        failed++;
        errors.push({ account_id: accountId, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return { success, failed, errors };
  }
}
