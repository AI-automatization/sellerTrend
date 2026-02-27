import { Injectable, NotFoundException } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  readLogFile,
  getAvailableDates,
  computePerformance,
  type LogFilter,
} from '../common/logger/file-logger';

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  private get logDir() {
    return path.join(process.cwd(), 'logs');
  }

  /** Audit Log — combined admin events + user activity */
  async getAuditLog(limit = 50) {
    const [adminEvents, userActivities] = await Promise.all([
      this.prisma.auditEvent.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: { select: { email: true, role: true } },
          account: { select: { name: true } },
        },
      }),
      this.prisma.userActivity.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          user: { select: { email: true, role: true } },
          account: { select: { name: true } },
        },
      }),
    ]);

    const combined = [
      ...adminEvents.map((e) => ({
        id: e.id,
        action: e.action,
        account_name: e.account?.name ?? null,
        user_email: e.user?.email ?? null,
        old_value: e.old_value,
        new_value: e.new_value,
        details: null,
        ip: null as string | null,
        source: 'admin' as const,
        created_at: e.created_at,
      })),
      ...userActivities.map((a) => ({
        id: a.id,
        action: a.action,
        account_name: a.account?.name ?? null,
        user_email: a.user?.email ?? null,
        old_value: null,
        new_value: null,
        details: a.details,
        ip: a.ip,
        source: 'user' as const,
        created_at: a.created_at,
      })),
    ];

    combined.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return combined.slice(0, limit);
  }

  /** API Logs from NDJSON files */
  async getLogs(params: {
    date?: string;
    status?: number;
    status_gte?: number;
    endpoint?: string;
    method?: string;
    min_ms?: number;
    account_id?: string;
    limit: number;
    offset: number;
  }) {
    const date = params.date || new Date().toISOString().split('T')[0];
    const filters: LogFilter = {
      status: params.status,
      status_gte: params.status_gte,
      endpoint: params.endpoint,
      method: params.method,
      min_ms: params.min_ms,
      account_id: params.account_id,
    };

    const { entries, total } = await readLogFile(
      this.logDir,
      'api',
      date,
      filters,
      params.limit,
      params.offset,
    );

    const availableDates = getAvailableDates(this.logDir, 'api');

    return {
      date,
      entries,
      total,
      limit: params.limit,
      offset: params.offset,
      available_dates: availableDates,
    };
  }

  /** Performance Metrics */
  async getLogsPerformance(date?: string, top = 20) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const perf = await computePerformance(this.logDir, 'api', targetDate, top);
    return { date: targetDate, ...perf };
  }

  /** Export — Users CSV data */
  async getExportUsersData() {
    const users = await this.prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: { account: { select: { name: true, status: true, balance: true } } },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      account_id: u.account_id,
      account_name: u.account.name,
      account_status: u.account.status,
      account_balance: u.account.balance.toString(),
      created_at: u.created_at.toISOString(),
    }));
  }

  /** Export — Revenue CSV data */
  async getExportRevenueData(from?: Date, to?: Date) {
    const where: any = { type: 'CHARGE' };
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { created_at: 'asc' },
      include: { account: { select: { name: true } } },
    });

    return transactions.map((t) => ({
      id: t.id,
      account_id: t.account_id,
      account_name: t.account.name,
      type: t.type,
      amount: t.amount.toString(),
      balance_before: t.balance_before.toString(),
      balance_after: t.balance_after.toString(),
      description: t.description ?? '',
      created_at: t.created_at.toISOString(),
    }));
  }

  /** Export — Activity CSV data */
  async getExportActivityData(from?: Date, to?: Date) {
    const where: any = {};
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const activities = await this.prisma.userActivity.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 10000,
      include: { user: { select: { email: true } } },
    });

    return activities.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      user_email: a.user.email,
      account_id: a.account_id,
      action: a.action,
      ip: a.ip ?? '',
      created_at: a.created_at.toISOString(),
    }));
  }

  /** Global Search */
  async globalSearch(query: string) {
    const q = query.trim();
    if (!q) return { users: [], accounts: [], products: [] };

    const [users, accounts, products] = await Promise.all([
      this.prisma.user.findMany({
        where: { email: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, email: true, role: true, account_id: true, is_active: true },
      }),
      this.prisma.account.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, name: true, status: true, balance: true },
      }),
      this.prisma.product.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        take: 5,
        select: { id: true, title: true, category_id: true },
      }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        account_id: u.account_id,
        is_active: u.is_active,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        balance: a.balance.toString(),
      })),
      products: products.map((p) => ({
        id: p.id.toString(),
        title: p.title,
        category_id: p.category_id?.toString() ?? null,
      })),
    };
  }
}
