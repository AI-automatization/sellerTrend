import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── User Endpoints ────────────────────────────────────────────

  /** Get my notifications (unread + recent) */
  @Get('my')
  @UseGuards(JwtAuthGuard, BillingGuard)
  getMyNotifications(@CurrentUser('account_id') accountId: string) {
    return this.notificationService.getMyNotifications(accountId);
  }

  /** Mark a notification as read */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, BillingGuard)
  markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.notificationService.markAsRead(notificationId, accountId);
  }

  // ─── Admin Endpoints ───────────────────────────────────────────

  /** Send a notification (admin only) */
  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  sendNotification(
    @Body()
    body: {
      message: string;
      type: string;
      target: 'all' | string[];
    },
    @CurrentUser('id') adminId: string,
  ) {
    return this.notificationService.sendNotification(
      body.message,
      body.type,
      body.target,
      adminId,
    );
  }
}
