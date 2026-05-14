import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminLogService } from './admin-log.service';
import { AdminMonitoringService } from './admin-monitoring.service';
import { CaptureBaselineDto } from './dto/monitoring.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminMonitoringController {
  constructor(
    private readonly logService: AdminLogService,
    private readonly monitoringService: AdminMonitoringService,
  ) {}

  // ── AUDIT & LOG ENDPOINTS ──

  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.logService.getAuditLog(limit ? parseInt(limit) : 50);
  }

  @Get('search')
  globalSearch(@Query('q') query: string) {
    return this.logService.globalSearch(query ?? '');
  }

  @Get('logs')
  getLogs(
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('status_gte') statusGte?: string,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
    @Query('min_ms') minMs?: string,
    @Query('account_id') accountId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.logService.getLogs({
      date,
      status: status ? parseInt(status) : undefined,
      status_gte: statusGte ? parseInt(statusGte) : undefined,
      endpoint,
      method,
      min_ms: minMs ? parseInt(minMs) : undefined,
      account_id: accountId,
      limit: limit ? Math.min(parseInt(limit), 500) : 200,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('logs/performance')
  getLogsPerformance(@Query('date') date?: string, @Query('top') top?: string) {
    return this.logService.getLogsPerformance(date, top ? parseInt(top) : 20);
  }

  // ── MONITORING ENDPOINTS ──

  @Get('monitoring/metrics')
  getMonitoringMetrics(@Query('period') period?: string) {
    return this.monitoringService.getMetrics(period || '1h');
  }

  @Get('monitoring/user-health')
  getUserHealth(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.monitoringService.getUserHealthSummary(period || '24h', parseInt(limit || '50', 10), sort || 'errors');
  }

  @Get('monitoring/capacity')
  getCapacityEstimate() {
    return this.monitoringService.getCapacityEstimate();
  }

  @Get('monitoring/baselines')
  getBaselines() {
    return this.monitoringService.getCapacityBaselines();
  }

  @Post('monitoring/baseline')
  captureBaseline(@Body() body: CaptureBaselineDto) {
    return this.monitoringService.captureBaseline(body.label);
  }

  @Get('monitoring/alerts')
  getAlerts(@Query('limit') limit?: string) {
    return this.monitoringService.getAlerts(parseInt(limit || '50', 10));
  }

  @Get('monitoring/users/:id/health')
  getSingleUserHealth(@Param('id') userId: string) {
    return this.monitoringService.getSingleUserHealth(userId);
  }

  // ── EXPORT ENDPOINTS ──

  @Get('export/users')
  async exportUsers(@Res() res: Response) {
    try {
      const data = await this.logService.getExportUsersData();
      const headers = ['id', 'email', 'role', 'is_active', 'account_id', 'account_name', 'account_status', 'created_at'];
      const csv = this.buildCsv(headers, data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
      res.send(csv);
    } catch {
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message: 'Export failed' });
    }
  }

  @Get('export/revenue')
  async exportRevenue(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    try {
      const data = await this.logService.getExportRevenueData(
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined,
      );
      const headers = ['id', 'account_id', 'account_name', 'type', 'amount', 'description', 'created_at'];
      const csv = this.buildCsv(headers, data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=revenue_export.csv');
      res.send(csv);
    } catch {
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message: 'Export failed' });
    }
  }

  @Get('export/activity')
  async exportActivity(@Res() res: Response, @Query('from') from?: string, @Query('to') to?: string) {
    try {
      const data = await this.logService.getExportActivityData(
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined,
      );
      const headers = ['id', 'user_id', 'user_email', 'account_id', 'action', 'ip', 'created_at'];
      const csv = this.buildCsv(headers, data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=activity_export.csv');
      res.send(csv);
    } catch {
      if (!res.headersSent) res.status(500).json({ statusCode: 500, message: 'Export failed' });
    }
  }

  private buildCsv(headers: string[], data: unknown[]): string {
    const rows = [headers.join(',')];
    for (const row of data) {
      rows.push(headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','));
    }
    return rows.join('\n');
  }
}
