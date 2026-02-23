import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
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
      data: { account_id: account.id, email, password_hash, role: role as any },
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

  /** Add user to existing account */
  async createUser(
    accountId: string,
    email: string,
    password: string,
    role: string,
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account topilmadi');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { account_id: accountId, email, password_hash, role: role as any },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: accountId,
        user_id: adminUserId,
        action: 'USER_CREATED',
        new_value: { email, role },
      },
    });

    return { id: user.id, email: user.email, role: user.role, account_id: accountId };
  }

  /** List all users */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: { account: { select: { name: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      account_id: u.account_id,
      account_name: u.account.name,
      created_at: u.created_at,
    }));
  }

  /** Update user role */
  async updateUserRole(userId: string, role: string, adminUserId: string) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { role: role as any } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: 'USER_ROLE_CHANGED',
          old_value: { role: user.role },
          new_value: { role, target_user: user.email },
        },
      }),
    ]);

    return { id: userId, role };
  }

  /** Toggle user active status */
  async toggleUserActive(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (userId === adminUserId) throw new BadRequestException('O\'zingizni o\'chira olmaysiz');

    const newActive = !user.is_active;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { is_active: newActive } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          new_value: { target_user: user.email },
        },
      }),
    ]);

    return { id: userId, is_active: newActive };
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
