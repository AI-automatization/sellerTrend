import { Module } from '@nestjs/common';
import { AdminAccountService } from './admin-account.service';
import { AdminUserService } from './admin-user.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminLogService } from './admin-log.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [
    AdminAccountService,
    AdminUserService,
    AdminStatsService,
    AdminFeedbackService,
    AdminLogService,
  ],
})
export class AdminModule {}
