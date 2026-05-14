import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUserActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserActivity(
    userId: string,
    action?: string,
    from?: Date,
    to?: Date,
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.UserActivityWhereInput = { user_id: userId };
    if (action) where.action = action;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = from;
      if (to) where.created_at.lte = to;
    }

    const [items, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details,
        ip: a.ip,
        user_agent: a.user_agent,
        created_at: a.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUserSessions(userId: string, limit = 20) {
    const sessions = await this.prisma.userSession.findMany({
      where: { user_id: userId },
      orderBy: { logged_in_at: 'desc' },
      take: limit,
    });

    return sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      user_agent: s.user_agent,
      device_type: s.device_type,
      logged_in_at: s.logged_in_at,
    }));
  }

  async getUserUsage(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { account_id: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const [todayByAction, allTimeByAction, apiKeys] = await Promise.all([
      this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { user_id: userId, created_at: { gte: todayStart } },
        _count: { id: true },
      }),
      this.prisma.userActivity.groupBy({
        by: ['action'],
        where: { user_id: userId },
        _count: { id: true },
      }),
      this.prisma.apiKey.findMany({
        where: { account_id: user.account_id },
        select: {
          id: true,
          name: true,
          key_prefix: true,
          daily_limit: true,
          requests_today: true,
          is_active: true,
          last_used_at: true,
        },
      }),
    ]);

    return {
      today: todayByAction.map((g) => ({ action: g.action, count: g._count.id })),
      all_time: allTimeByAction.map((g) => ({ action: g.action, count: g._count.id })),
      api_keys: apiKeys,
    };
  }
}
