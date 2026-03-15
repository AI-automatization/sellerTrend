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
        plan: a.plan,
        plan_expires_at: a.plan_expires_at,
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
      phone: account.phone ?? null,
      status: account.status,
      plan: account.plan,
      plan_expires_at: account.plan_expires_at,
      created_at: account.created_at,
      users: account.users,
      transactions: account.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
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
    const validStatuses = ['ACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Noto\'g\'ri status. Mumkin: ACTIVE, SUSPENDED');
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

  /** Set account plan (FREE/PRO/MAX/COMPANY) — auto-calculates 30-day expiration */
  async setPlan(accountId: string, plan: string, adminUserId: string) {
    const validPlans = ['FREE', 'PRO', 'MAX', 'COMPANY'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('Noto\'g\'ri plan. Mumkin: FREE, PRO, MAX, COMPANY');
    }

    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: accountId },
      select: { plan: true, plan_expires_at: true },
    });

    const now = new Date();
    const expiresAt = plan === 'FREE'
      ? null
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { plan, plan_expires_at: expiresAt },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: accountId,
          user_id: adminUserId,
          action: 'ACCOUNT_PLAN_CHANGED',
          old_value: { plan: account.plan, plan_expires_at: account.plan_expires_at?.toISOString() ?? null },
          new_value: { plan, plan_expires_at: expiresAt?.toISOString() ?? null },
        },
      }),
    ]);

    return { id: accountId, plan, plan_expires_at: expiresAt };
  }

  /** Bulk Account Action */
  async bulkAccountAction(
    accountIds: string[],
    action: 'SUSPEND' | 'ACTIVATE',
    params: { adminUserId: string },
  ) {
    let success = 0;
    let failed = 0;
    const errors: { account_id: string; error: string }[] = [];

    for (const accountId of accountIds) {
      try {
        switch (action) {
          case 'SUSPEND':
            await this.updateAccountStatus(accountId, 'SUSPENDED', params.adminUserId);
            break;
          case 'ACTIVATE':
            await this.updateAccountStatus(accountId, 'ACTIVE', params.adminUserId);
            break;
        }
        success++;
      } catch (err: unknown) {
        failed++;
        errors.push({ account_id: accountId, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return { success, failed, errors };
  }

  async deleteAccount(accountId: string, adminUserId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account topilmadi');

    await this.prisma.auditEvent.create({
      data: {
        user_id: adminUserId,
        action: 'ACCOUNT_DELETED',
        old_value: { account_id: accountId, name: account.name },
      },
    });

    await this.prisma.account.delete({ where: { id: accountId } });
    return { deleted: true };
  }
}
