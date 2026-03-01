import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { BillingGuard } from '../billing/billing.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityLoggerInterceptor } from '../common/interceptors/activity-logger.interceptor';
import { ActivityAction } from '../common/decorators/activity-action.decorator';
import { FeedbackService } from './feedback.service';
import { FeedbackType, FeedbackPriority, FeedbackStatus } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';

@ApiTags('feedback')
@ApiBearerAuth()
@UseInterceptors(ActivityLoggerInterceptor)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // ─── User Endpoints ────────────────────────────────────────────

  /** Create a new feedback ticket */
  @Post()
  @UseGuards(JwtAuthGuard, BillingGuard)
  @ActivityAction('FEEDBACK_CREATE')
  createTicket(
    @Body() body: CreateTicketDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.feedbackService.createTicket(
      userId,
      accountId,
      body.subject,
      body.type,
      body.priority,
      body.content,
    );
  }

  /** Get my tickets */
  @Get('my')
  @UseGuards(JwtAuthGuard, BillingGuard)
  getMyTickets(
    @CurrentUser('id') userId: string,
    @CurrentUser('account_id') accountId: string,
  ) {
    return this.feedbackService.getMyTickets(accountId, userId);
  }

  /** Get ticket detail (user sees own tickets) */
  @Get(':id')
  @UseGuards(JwtAuthGuard, BillingGuard)
  getTicketDetail(
    @Param('id') ticketId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    return this.feedbackService.getTicketDetail(ticketId, userId, isAdmin);
  }

  /** Send a message to a ticket */
  @Post(':id/messages')
  @UseGuards(JwtAuthGuard, BillingGuard)
  @ActivityAction('FEEDBACK_MESSAGE')
  sendMessage(
    @Param('id') ticketId: string,
    @Body() body: { content: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
    return this.feedbackService.sendMessage(
      ticketId,
      userId,
      body.content,
      isAdmin,
    );
  }

  // ─── Admin Endpoints ───────────────────────────────────────────

  /** Get all tickets (admin, with filters & pagination) */
  @Get('admin/tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  getAdminTickets(
    @Query('status') status?: FeedbackStatus,
    @Query('type') type?: FeedbackType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedbackService.getAdminTickets(
      status,
      type,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /** Get ticket stats for admin dashboard */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  getAdminStats() {
    return this.feedbackService.getAdminStats();
  }

  /** Update ticket status (admin only) */
  @Patch('admin/tickets/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ActivityAction('FEEDBACK_STATUS_UPDATE')
  updateTicketStatus(
    @Param('id') ticketId: string,
    @Body() body: { status: FeedbackStatus },
  ) {
    return this.feedbackService.updateTicketStatus(ticketId, body.status);
  }

  /** Admin sends message to any ticket */
  @Post('admin/tickets/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ActivityAction('FEEDBACK_ADMIN_MESSAGE')
  adminSendMessage(
    @Param('id') ticketId: string,
    @Body() body: { content: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.feedbackService.sendMessage(ticketId, userId, body.content, true);
  }
}
