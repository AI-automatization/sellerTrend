import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsRealtimeService } from './admin-stats-realtime.service';
import { AdminStatsAnalyticsService } from './admin-stats-analytics.service';
import { AdminFeedbackService } from './admin-feedback.service';
import {
  AdminUpdateFeedbackStatusDto,
  AdminSendFeedbackMessageDto,
  AdminSendNotificationDto,
  CreateNotificationTemplateDto,
} from './dto/feedback.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly statsService: AdminStatsService,
    private readonly statsRealtimeService: AdminStatsRealtimeService,
    private readonly statsAnalyticsService: AdminStatsAnalyticsService,
    private readonly feedbackService: AdminFeedbackService,
  ) {}

  // ── STATS ENDPOINTS ──

  @Get('search-analytics')
  getSearchAnalytics() {
    return this.statsAnalyticsService.getSearchAnalytics();
  }

  @Get('stats/overview')
  getStatsOverview() {
    return this.statsService.getStatsOverview();
  }

  @Get('stats/revenue')
  getStatsRevenue(@Query('period') period?: string) {
    return this.statsService.getStatsRevenue(period ? parseInt(period) : 30);
  }

  @Get('stats/growth')
  getStatsGrowth(@Query('period') period?: string) {
    return this.statsService.getStatsGrowth(period ? parseInt(period) : 30);
  }

  @Get('stats/popular-products')
  getPopularProducts(@Query('limit') limit?: string) {
    return this.statsService.getPopularProducts(limit ? parseInt(limit) : 10);
  }

  @Get('stats/popular-categories')
  getPopularCategories(@Query('limit') limit?: string) {
    return this.statsService.getPopularCategories(limit ? parseInt(limit) : 10);
  }

  @Get('stats/realtime')
  getRealtimeStats() {
    return this.statsRealtimeService.getRealtimeStats();
  }

  @Get('stats/product-heatmap')
  getProductHeatmap(@Query('period') period?: string) {
    return this.statsRealtimeService.getProductHeatmap(period ?? 'month');
  }

  @Get('stats/category-trends')
  getCategoryTrends(@Query('weeks') weeks?: string) {
    return this.statsRealtimeService.getCategoryTrends(weeks ? parseInt(weeks) : 4);
  }

  @Get('stats/top-users')
  getTopUsers(@Query('period') period?: string, @Query('limit') limit?: string) {
    return this.statsRealtimeService.getTopUsers(period ?? 'month', limit ? parseInt(limit) : 10);
  }

  @Get('stats/health')
  getSystemHealth() {
    return this.statsRealtimeService.getSystemHealth();
  }

  @Get('stats/ai-usage')
  getAiUsageStats(@Query('period') period?: string) {
    return this.statsAnalyticsService.getAiUsageStats(period ? parseInt(period) : 30);
  }

  @Get('rag-audit')
  getRagAuditStats(@Query('period') period?: string) {
    return this.statsAnalyticsService.getRagAuditStats(period ? parseInt(period) : 7);
  }

  @Get('ml-audit')
  getMlAuditStats(@Query('period') period?: string) {
    return this.statsAnalyticsService.getMlAuditStats(period ? parseInt(period) : 7);
  }

  @Post('ml-audit/retrain')
  triggerMlRetrain() {
    return this.statsAnalyticsService.triggerMlRetrain();
  }

  @Get('marketplace/top-products')
  getMarketplaceTopProducts(@Query('limit') limit?: string) {
    return this.statsAnalyticsService.getMarketplaceTopProducts(limit ? parseInt(limit) : 10);
  }

  @Get('system-errors')
  getSystemErrors(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('endpoint') endpoint?: string,
    @Query('status_gte') statusGte?: string,
    @Query('account_id') accountId?: string,
    @Query('period') period?: string,
  ) {
    return this.statsAnalyticsService.getSystemErrors({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      endpoint,
      status_gte: statusGte ? parseInt(statusGte) : undefined,
      account_id: accountId,
      period: period ? parseInt(period) : 7,
    });
  }

  // ── FEEDBACK ENDPOINTS ──

  @Get('feedback/stats')
  getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @Get('feedback')
  getAdminFeedback(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.getAdminFeedback(status, type, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get('feedback/:id')
  getFeedbackDetail(@Param('id') ticketId: string) {
    return this.feedbackService.getFeedbackDetail(ticketId);
  }

  @Patch('feedback/:id/status')
  updateFeedbackStatus(
    @Param('id') ticketId: string,
    @Body() body: AdminUpdateFeedbackStatusDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.feedbackService.updateFeedbackStatus(ticketId, body.status, adminUserId);
  }

  @Post('feedback/:id/messages')
  sendFeedbackMessage(
    @Param('id') ticketId: string,
    @Body() body: AdminSendFeedbackMessageDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.feedbackService.sendFeedbackMessage(ticketId, adminUserId, body.content, true);
  }

  // ── NOTIFICATION ENDPOINTS ──

  @Post('notifications')
  sendNotification(@Body() body: AdminSendNotificationDto, @CurrentUser('id') adminUserId: string) {
    return this.feedbackService.sendNotification(body.message, body.type, body.target, adminUserId);
  }

  @Post('notifications/send')
  sendNotificationAdvanced(@Body() body: AdminSendNotificationDto, @CurrentUser('id') adminUserId: string) {
    return this.feedbackService.sendNotificationAdvanced({ message: body.message, type: body.type, target: body.target, adminUserId });
  }

  @Get('notification-templates')
  listNotificationTemplates() {
    return this.feedbackService.listNotificationTemplates();
  }

  @Post('notification-templates')
  createNotificationTemplate(@Body() body: CreateNotificationTemplateDto, @CurrentUser('id') adminUserId: string) {
    return this.feedbackService.createNotificationTemplate(body.name, body.message, body.type, adminUserId);
  }

  @Delete('notification-templates/:id')
  deleteNotificationTemplate(@Param('id') id: string) {
    return this.feedbackService.deleteNotificationTemplate(id);
  }
}
