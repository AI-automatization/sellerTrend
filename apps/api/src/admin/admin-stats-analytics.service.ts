import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminStatsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAiUsageStats(period = 30) {
    const since = new Date();
    since.setDate(since.getDate() - period);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLogs, todayLogs, byMethod] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where: { created_at: { gte: since } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { created_at: { gte: todayStart } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['method'],
        where: { created_at: { gte: since } },
        _sum: { input_tokens: true, output_tokens: true, cost_usd: true },
        _count: { id: true },
        _avg: { duration_ms: true },
      }),
    ]);

    const [byDay, recentErrors] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT DATE(created_at) as date,
               COUNT(*)::int as calls,
               COALESCE(SUM(input_tokens), 0)::int as input_tokens,
               COALESCE(SUM(output_tokens), 0)::int as output_tokens,
               COALESCE(SUM(cost_usd), 0)::float as cost_usd
        FROM ai_usage_logs
        WHERE created_at >= ${since}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      ` as Promise<{ date: Date; calls: number; input_tokens: number; output_tokens: number; cost_usd: number }[]>,
      this.prisma.aiUsageLog.findMany({
        where: { error: { not: null }, created_at: { gte: since } },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: { id: true, method: true, error: true, created_at: true },
      }),
    ]);

    return {
      period: {
        calls: totalLogs._count.id,
        input_tokens: totalLogs._sum.input_tokens ?? 0,
        output_tokens: totalLogs._sum.output_tokens ?? 0,
        cost_usd: Number(totalLogs._sum.cost_usd ?? 0).toFixed(4),
      },
      today: {
        calls: todayLogs._count.id,
        input_tokens: todayLogs._sum.input_tokens ?? 0,
        output_tokens: todayLogs._sum.output_tokens ?? 0,
        cost_usd: Number(todayLogs._sum.cost_usd ?? 0).toFixed(4),
      },
      by_method: byMethod.map((m) => ({
        method: m.method,
        calls: m._count.id,
        input_tokens: m._sum.input_tokens ?? 0,
        output_tokens: m._sum.output_tokens ?? 0,
        cost_usd: Number(m._sum.cost_usd ?? 0).toFixed(4),
        avg_duration_ms: Math.round(m._avg.duration_ms ?? 0),
      })),
      daily: byDay.map((row) => ({
        date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date),
        calls: row.calls,
        input_tokens: row.input_tokens,
        output_tokens: row.output_tokens,
        cost_usd: Number(Number(row.cost_usd).toFixed(6)),
      })),
      recent_errors: recentErrors,
    };
  }

  async getSearchAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [topQueries, zeroResults, totalSearches, trackedSearches] = await Promise.all([
      this.prisma.searchLog.groupBy({
        by: ['query'],
        where: { created_at: { gte: thirtyDaysAgo } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.searchLog.groupBy({
        by: ['query'],
        where: { created_at: { gte: thirtyDaysAgo }, results: 0 },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.searchLog.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
      this.prisma.searchLog.count({ where: { created_at: { gte: thirtyDaysAgo }, tracked: true } }),
    ]);

    return {
      top_queries: topQueries.map((q) => ({ query: q.query, count: q._count.id })),
      zero_result_queries: zeroResults.map((q) => ({ query: q.query, count: q._count.id })),
      total_searches: totalSearches,
      tracked_searches: trackedSearches,
      conversion_rate: totalSearches > 0
        ? Number(((trackedSearches / totalSearches) * 100).toFixed(1))
        : 0,
      period: '30d',
    };
  }

  async getSystemErrors(opts: {
    page?: number; limit?: number; endpoint?: string;
    status_gte?: number; account_id?: string; period?: number;
  }) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const since = new Date();
    since.setDate(since.getDate() - (opts.period ?? 7));

    const where: Prisma.SystemErrorWhereInput = { created_at: { gte: since } };
    if (opts.endpoint) where.endpoint = { contains: opts.endpoint };
    if (opts.status_gte) where.status = { gte: opts.status_gte };
    if (opts.account_id) where.account_id = opts.account_id;

    const [items, total, byEndpoint, byStatus] = await Promise.all([
      this.prisma.systemError.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.systemError.count({ where }),
      this.prisma.systemError.groupBy({
        by: ['endpoint'],
        where: { created_at: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.systemError.groupBy({
        by: ['status'],
        where: { created_at: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id, endpoint: e.endpoint, method: e.method, status: e.status,
        message: e.message, stack: e.stack, account_id: e.account_id,
        user_id: e.user_id, ip: e.ip, created_at: e.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
      by_endpoint: byEndpoint.map((e) => ({ endpoint: e.endpoint, count: e._count.id })),
      by_status: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    };
  }

  async getMarketplaceTopProducts(limit = 10) {
    const snapshots = await this.prisma.marketplaceSnapshot.findMany({
      where: { type: 'top_products' },
      orderBy: { captured_at: 'desc' },
      take: limit,
      select: { id: true, captured_at: true, data: true },
    });

    if (snapshots.length === 0) return { snapshots: [], trend: [] };

    const latest = snapshots[0];
    const prev = snapshots[1];

    const latestIds = new Set((latest.data as Array<{ product_id: number }>).map((p) => p.product_id));
    const prevIds = prev
      ? new Set((prev.data as Array<{ product_id: number }>).map((p) => p.product_id))
      : new Set<number>();

    return {
      snapshots: snapshots.map((s) => ({
        id: s.id, captured_at: s.captured_at,
        count: (s.data as unknown[]).length, products: s.data,
      })),
      trend: {
        new_products: [...latestIds].filter((id) => !prevIds.has(id)),
        dropped_products: [...prevIds].filter((id) => !latestIds.has(id)),
        captured_at: latest.captured_at,
      },
    };
  }

  async getRagAuditStats(period = 7) {
    const since = new Date();
    since.setDate(since.getDate() - period);

    const [totalMsg, assistantMsg, feedbackUp, feedbackDown, costAgg, byIntent, daily] = await Promise.all([
      this.prisma.chatMessage.count({ where: { created_at: { gte: since } } }),
      this.prisma.chatMessage.count({ where: { role: 'ASSISTANT', created_at: { gte: since } } }),
      this.prisma.chatMessage.count({ where: { role: 'ASSISTANT', feedback: 'UP', created_at: { gte: since } } }),
      this.prisma.chatMessage.count({ where: { role: 'ASSISTANT', feedback: 'DOWN', created_at: { gte: since } } }),
      this.prisma.chatMessage.aggregate({
        where: { role: 'ASSISTANT', cost_usd: { not: null }, created_at: { gte: since } },
        _sum: { cost_usd: true, input_tokens: true, output_tokens: true },
      }),
      this.prisma.chatMessage.groupBy({
        by: ['intent'],
        where: { role: 'ASSISTANT', intent: { not: null }, created_at: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.$queryRaw<{ date: Date; messages: number; cost: number }[]>`
        SELECT DATE(created_at) as date,
               COUNT(*)::int as messages,
               COALESCE(SUM(cost_usd::float), 0) as cost
        FROM chat_messages
        WHERE created_at >= ${since} AND role = 'ASSISTANT'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ]);

    const totalFeedback = feedbackUp + feedbackDown;
    return {
      period_days: period,
      total_messages: totalMsg,
      assistant_messages: assistantMsg,
      feedback: {
        up: feedbackUp, down: feedbackDown, total: totalFeedback,
        satisfaction_pct: totalFeedback > 0 ? Math.round((feedbackUp / totalFeedback) * 100) : null,
      },
      cost: {
        total_usd: Number(Number(costAgg._sum.cost_usd ?? 0).toFixed(4)),
        input_tokens: costAgg._sum.input_tokens ?? 0,
        output_tokens: costAgg._sum.output_tokens ?? 0,
        avg_per_message: assistantMsg > 0
          ? Number((Number(costAgg._sum.cost_usd ?? 0) / assistantMsg).toFixed(6))
          : 0,
      },
      by_intent: byIntent.map((r) => ({ intent: r.intent ?? 'GENERAL', count: r._count.id })),
      daily: daily.map((r) => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
        messages: r.messages,
        cost: Number(Number(r.cost).toFixed(6)),
      })),
    };
  }

  async getMlAuditStats(period = 7): Promise<{
    period_days: number;
    models: Array<{ model_name: string; avg_mape: number; direction_accuracy: number | null; audit_count: number; last_audit: string | null }>;
    total_predictions: number;
    generated_at: string;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - period);

    const rows = await this.prisma.$queryRaw<Array<{ model_name: string; avg_mape: number; audit_count: number; last_audit: Date }>>`
      SELECT model_name, AVG(error_pct)::float AS avg_mape, COUNT(*)::int AS audit_count, MAX(created_at) AS last_audit
      FROM ml_audit_logs WHERE created_at >= ${since} GROUP BY model_name ORDER BY audit_count DESC
    `;

    const dirRows = await this.prisma.$queryRaw<Array<{ model_name: string; direction_accuracy: number }>>`
      SELECT model_name,
             AVG(CASE WHEN (predicted_value > 0) = (actual_value > 0) THEN 1.0 ELSE 0.0 END)::float AS direction_accuracy
      FROM ml_audit_logs WHERE created_at >= ${since} AND actual_value IS NOT NULL GROUP BY model_name
    `;
    const dirMap = new Map(dirRows.map((r) => [r.model_name, r.direction_accuracy]));

    return {
      period_days: period,
      models: rows.map((r) => ({
        model_name: r.model_name,
        avg_mape: Number(Number(r.avg_mape ?? 0).toFixed(1)),
        direction_accuracy: dirMap.has(r.model_name) ? Number((dirMap.get(r.model_name)! * 100).toFixed(1)) : null,
        audit_count: r.audit_count,
        last_audit: r.last_audit ? new Date(r.last_audit).toISOString() : null,
      })),
      total_predictions: rows.reduce((s, r) => s + (r.audit_count ?? 0), 0),
      generated_at: new Date().toISOString(),
    };
  }

  async triggerMlRetrain(): Promise<{ status: string; message: string }> {
    const mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
    try {
      const res = await fetch(`${mlServiceUrl}/batch/retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 90 }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { status: 'error', message: `ML service error: ${res.status}` };
      return { status: 'ok', message: 'Retrain boshlandi — model yangilanmoqda' };
    } catch {
      return { status: 'error', message: 'ML service bilan aloqa yo\'q' };
    }
  }
}
