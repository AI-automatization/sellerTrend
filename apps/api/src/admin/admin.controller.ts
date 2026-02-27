import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================================
  // EXISTING ENDPOINTS (unchanged)
  // ============================================================

  /** List all accounts */
  @Get('accounts')
  listAccounts() {
    return this.adminService.listAccounts();
  }

  /** Single account with transaction history */
  @Get('accounts/:id')
  getAccount(@Param('id') id: string) {
    return this.adminService.getAccount(id);
  }

  /** Update per-account daily_fee (null = use global default) */
  @Patch('accounts/:id/fee')
  setFee(
    @Param('id') id: string,
    @Body() body: { fee: number | null },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.setAccountDailyFee(id, body.fee, adminUserId);
  }

  /** Deposit balance to an account */
  @Post('accounts/:id/deposit')
  deposit(
    @Param('id') id: string,
    @Body() body: { amount: number; description?: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.depositToAccount(
      id,
      body.amount,
      adminUserId,
      body.description,
    );
  }

  /** Get global daily fee */
  @Get('global-fee')
  getGlobalFee() {
    return this.adminService.getGlobalFee();
  }

  /** Update global daily fee */
  @Put('global-fee')
  setGlobalFee(
    @Body() body: { fee: number },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.setGlobalFee(body.fee, adminUserId);
  }

  /** Audit log */
  @Get('audit-log')
  auditLog(@Query('limit') limit?: string) {
    return this.adminService.getAuditLog(limit ? parseInt(limit) : 50);
  }

  /** List all users across all accounts */
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  /** Create new account + first user */
  @Post('accounts')
  createAccount(
    @Body() body: { company_name: string; email: string; password: string; role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.createAccount(
      body.company_name,
      body.email,
      body.password,
      body.role,
      adminUserId,
    );
  }

  /** Add user to existing account */
  @Post('accounts/:id/users')
  createUser(
    @Param('id') accountId: string,
    @Body() body: { email: string; password: string; role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.createUser(
      accountId,
      body.email,
      body.password,
      body.role,
      adminUserId,
    );
  }

  /** Change user password (admin action) */
  @Patch('users/:id/password')
  changePassword(
    @Param('id') userId: string,
    @Body() body: { password: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.changeUserPassword(userId, body.password, adminUserId);
  }

  /** Change user role */
  @Patch('users/:id/role')
  updateRole(
    @Param('id') userId: string,
    @Body() body: { role: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.updateUserRole(userId, body.role, adminUserId);
  }

  /** Toggle user active/inactive */
  @Patch('users/:id/toggle-active')
  toggleActive(
    @Param('id') userId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.toggleUserActive(userId, adminUserId);
  }

  // ============================================================
  // STATS ENDPOINTS
  // ============================================================

  /** A1 — Stats Overview */
  @Get('stats/overview')
  getStatsOverview() {
    return this.adminService.getStatsOverview();
  }

  /** A2 — Revenue Stats */
  @Get('stats/revenue')
  getStatsRevenue(@Query('period') period?: string) {
    return this.adminService.getStatsRevenue(period ? parseInt(period) : 30);
  }

  /** A3 — Growth Stats */
  @Get('stats/growth')
  getStatsGrowth(@Query('period') period?: string) {
    return this.adminService.getStatsGrowth(period ? parseInt(period) : 30);
  }

  /** A4 — Popular Products */
  @Get('stats/popular-products')
  getPopularProducts(@Query('limit') limit?: string) {
    return this.adminService.getPopularProducts(limit ? parseInt(limit) : 10);
  }

  /** A5 — Popular Categories */
  @Get('stats/popular-categories')
  getPopularCategories(@Query('limit') limit?: string) {
    return this.adminService.getPopularCategories(limit ? parseInt(limit) : 10);
  }

  /** C1 — Realtime Stats */
  @Get('stats/realtime')
  getRealtimeStats() {
    return this.adminService.getRealtimeStats();
  }

  /** C2 — Product Heatmap */
  @Get('stats/product-heatmap')
  getProductHeatmap(@Query('period') period?: string) {
    return this.adminService.getProductHeatmap(period ?? 'month');
  }

  /** C3 — Category Trends */
  @Get('stats/category-trends')
  getCategoryTrends(@Query('weeks') weeks?: string) {
    return this.adminService.getCategoryTrends(weeks ? parseInt(weeks) : 4);
  }

  /** D5 — Top Users */
  @Get('stats/top-users')
  getTopUsers(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTopUsers(period ?? 'month', limit ? parseInt(limit) : 10);
  }

  /** C4 — System Health */
  @Get('stats/health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ============================================================
  // USER MONITORING ENDPOINTS
  // ============================================================

  /** B1 — User Activity */
  @Get('users/:id/activity')
  getUserActivity(
    @Param('id') userId: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUserActivity(
      userId,
      action,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /** B2 — User Tracked Products */
  @Get('users/:id/tracked-products')
  getUserTrackedProducts(@Param('id') userId: string) {
    return this.adminService.getUserTrackedProducts(userId);
  }

  /** B3 — User Sessions */
  @Get('users/:id/sessions')
  getUserSessions(
    @Param('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUserSessions(userId, limit ? parseInt(limit) : 20);
  }

  /** B5 — User Usage */
  @Get('users/:id/usage')
  getUserUsage(@Param('id') userId: string) {
    return this.adminService.getUserUsage(userId);
  }

  /** D1 — User Portfolio Summary */
  @Get('users/:id/portfolio-summary')
  getUserPortfolioSummary(@Param('id') userId: string) {
    return this.adminService.getUserPortfolioSummary(userId);
  }

  /** D2 — User Discovery Results */
  @Get('users/:id/discovery-results')
  getUserDiscoveryResults(@Param('id') userId: string) {
    return this.adminService.getUserDiscoveryResults(userId);
  }

  /** D3 — User Campaigns */
  @Get('users/:id/campaigns')
  getUserCampaigns(@Param('id') userId: string) {
    return this.adminService.getUserCampaigns(userId);
  }

  /** D4 — User Competitor Stats */
  @Get('users/:id/competitor-stats')
  getUserCompetitorStats(@Param('id') userId: string) {
    return this.adminService.getUserCompetitorStats(userId);
  }

  // ============================================================
  // ACCOUNT DETAIL ENDPOINTS
  // ============================================================

  /** B4 — Account Transactions (paginated) */
  @Get('accounts/:id/transactions')
  getAccountTransactions(
    @Param('id') accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAccountTransactions(
      accountId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================

  /** E1 — Impersonate User */
  @Post('users/:id/impersonate')
  impersonateUser(@Param('id') userId: string) {
    return this.adminService.impersonateUser(userId);
  }

  /** E2 — Bulk Account Action */
  @Post('accounts/bulk')
  bulkAction(
    @Body() body: {
      account_ids: string[];
      action: 'DEPOSIT' | 'SUSPEND' | 'ACTIVATE' | 'SET_FEE';
      amount?: number;
      fee?: number;
    },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.bulkAccountAction(
      body.account_ids,
      body.action,
      { amount: body.amount, fee: body.fee, adminUserId },
    );
  }

  /** E3 — Send Notification */
  @Post('notifications')
  sendNotification(
    @Body() body: { message: string; type: string; target: 'all' | string[] },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.sendNotification(body.message, body.type, body.target, adminUserId);
  }

  /** E4 — Update Account Status */
  @Patch('accounts/:id/status')
  updateAccountStatus(
    @Param('id') accountId: string,
    @Body() body: { status: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.updateAccountStatus(accountId, body.status, adminUserId);
  }

  /** E5 — Global Search */
  @Get('search')
  globalSearch(@Query('q') query: string) {
    return this.adminService.globalSearch(query ?? '');
  }

  // ============================================================
  // FEEDBACK ADMIN ENDPOINTS
  // ============================================================

  /** F1 — Feedback Stats (must be before :id route) */
  @Get('feedback/stats')
  getFeedbackStats() {
    return this.adminService.getFeedbackStats();
  }

  /** F1 — List Feedback Tickets */
  @Get('feedback')
  getAdminFeedback(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAdminFeedback(
      status,
      type,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /** F1 — Feedback Detail */
  @Get('feedback/:id')
  getFeedbackDetail(@Param('id') ticketId: string) {
    return this.adminService.getFeedbackDetail(ticketId);
  }

  /** F1 — Update Feedback Status */
  @Patch('feedback/:id/status')
  updateFeedbackStatus(
    @Param('id') ticketId: string,
    @Body() body: { status: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.updateFeedbackStatus(ticketId, body.status, adminUserId);
  }

  /** F1 — Send Feedback Message */
  @Post('feedback/:id/messages')
  sendFeedbackMessage(
    @Param('id') ticketId: string,
    @Body() body: { content: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.sendFeedbackMessage(ticketId, adminUserId, body.content, true);
  }

  // ============================================================
  // DEPOSIT LOG ENDPOINTS
  // ============================================================

  /** Deposit Log — paginated list */
  @Get('deposit-log')
  getDepositLog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getDepositLog(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /** Delete deposit log entry */
  @Delete('deposit-log/:id')
  deleteDepositLog(@Param('id') id: string) {
    return this.adminService.deleteDepositLog(id);
  }
  // ============================================================
  // ACCOUNT PHONE
  // ============================================================

  /** Update account phone number */
  @Patch('accounts/:id/phone')
  updateAccountPhone(
    @Param('id') accountId: string,
    @Body() body: { phone: string | null },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.updateAccountPhone(accountId, body.phone, adminUserId);
  }

  // ============================================================
  // NOTIFICATION TEMPLATES
  // ============================================================

  /** List all notification templates */
  @Get('notification-templates')
  listNotificationTemplates() {
    return this.adminService.listNotificationTemplates();
  }

  /** Create notification template */
  @Post('notification-templates')
  createNotificationTemplate(
    @Body() body: { name: string; message: string; type: string },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.createNotificationTemplate(body.name, body.message, body.type, adminUserId);
  }

  /** Delete notification template */
  @Delete('notification-templates/:id')
  deleteNotificationTemplate(@Param('id') id: string) {
    return this.adminService.deleteNotificationTemplate(id);
  }

  /** Send notification (advanced — template or custom, targeted or broadcast) */
  @Post('notifications/send')
  sendNotificationAdvanced(
    @Body() body: { message: string; type: string; target: 'all' | string[] },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.adminService.sendNotificationAdvanced({
      message: body.message,
      type: body.type,
      target: body.target,
      adminUserId,
    });
  }

  // ============================================================
  // AI USAGE STATS
  // ============================================================

  /** AI usage statistics (tokens, costs) */
  @Get('stats/ai-usage')
  getAiUsageStats(@Query('period') period?: string) {
    return this.adminService.getAiUsageStats(period ? parseInt(period) : 30);
  }

  // ============================================================
  // SYSTEM ERRORS
  // ============================================================

  /** System errors list with filters */
  @Get('system-errors')
  getSystemErrors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('endpoint') endpoint?: string,
    @Query('status_gte') statusGte?: string,
    @Query('account_id') accountId?: string,
    @Query('period') period?: string,
  ) {
    return this.adminService.getSystemErrors({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      endpoint,
      status_gte: statusGte ? parseInt(statusGte) : undefined,
      account_id: accountId,
      period: period ? parseInt(period) : 7,
    });
  }

  // ============================================================
  // LOG VIEWING ENDPOINTS
  // ============================================================

  /** L1 — API Logs (NDJSON file-based) */
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
    return this.adminService.getLogs({
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

  /** L2 — Performance Metrics */
  @Get('logs/performance')
  getLogsPerformance(
    @Query('date') date?: string,
    @Query('top') top?: string,
  ) {
    return this.adminService.getLogsPerformance(
      date,
      top ? parseInt(top) : 20,
    );
  }

  // ============================================================
  // EXPORT ENDPOINTS
  // ============================================================

  /** Export — Users CSV */
  @Get('export/users')
  async exportUsers(@Res() res: Response) {
    const data = await this.adminService.getExportUsersData();

    const headers = ['id', 'email', 'role', 'is_active', 'account_id', 'account_name', 'account_status', 'account_balance', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
      csvRows.push(headers.map((h) => {
        const val = (row as any)[h];
        const str = String(val ?? '');
        // Escape commas and quotes
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.send(csv);
  }

  /** Export — Revenue CSV */
  @Get('export/revenue')
  async exportRevenue(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const data = await this.adminService.getExportRevenueData(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );

    const headers = ['id', 'account_id', 'account_name', 'type', 'amount', 'balance_before', 'balance_after', 'description', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
      csvRows.push(headers.map((h) => {
        const val = (row as any)[h];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','));
    }

    const csv = csvRows.join('\n');

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', 'attachment; filename=revenue_export.csv');
    res!.send(csv);
  }

  /** Export — Activity CSV */
  @Get('export/activity')
  async exportActivity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const data = await this.adminService.getExportActivityData(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );

    const headers = ['id', 'user_id', 'user_email', 'account_id', 'action', 'ip', 'created_at'];
    const csvRows = [headers.join(',')];

    for (const row of data) {
      csvRows.push(headers.map((h) => {
        const val = (row as any)[h];
        const str = String(val ?? '');
        return str.includes(',') || str.includes('"')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','));
    }

    const csv = csvRows.join('\n');

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', 'attachment; filename=activity_export.csv');
    res!.send(csv);
  }
}
