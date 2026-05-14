import { Module } from '@nestjs/common';
import { AdminAccountService } from './admin-account.service';
import { AdminUserService } from './admin-user.service';
import { AdminUserActivityService } from './admin-user-activity.service';
import { AdminUserDataService } from './admin-user-data.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminStatsRealtimeService } from './admin-stats-realtime.service';
import { AdminStatsAnalyticsService } from './admin-stats-analytics.service';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminLogService } from './admin-log.service';
import { AdminMonitoringService } from './admin-monitoring.service';
import { AdminController } from './admin.controller';
import { AdminAccountsController } from './admin-accounts.controller';
import { AdminMonitoringController } from './admin-monitoring.controller';

@Module({
  controllers: [AdminController, AdminAccountsController, AdminMonitoringController],
  providers: [
    AdminAccountService,
    AdminUserService,
    AdminUserActivityService,
    AdminUserDataService,
    AdminStatsService,
    AdminStatsRealtimeService,
    AdminStatsAnalyticsService,
    AdminFeedbackService,
    AdminLogService,
    AdminMonitoringService,
  ],
})
export class AdminModule {}
