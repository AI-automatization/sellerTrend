import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FeedbackStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin Feedback List */
  async getAdminFeedback(
    status?: string,
    type?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [tickets, total] = await Promise.all([
      this.prisma.feedbackTicket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { email: true } },
          account: { select: { name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.feedbackTicket.count({ where }),
    ]);

    return {
      items: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        type: t.type,
        priority: t.priority,
        status: t.status,
        user_email: t.user.email,
        account_name: t.account.name,
        message_count: t._count.messages,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /** Feedback Stats */
  async getFeedbackStats() {
    const byStatus = await this.prisma.feedbackTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };
    for (const row of byStatus) {
      statusMap[row.status] = row._count.id;
    }

    const byType = await this.prisma.feedbackTicket.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      typeMap[row.type] = row._count.id;
    }

    const byPriority = await this.prisma.feedbackTicket.groupBy({
      by: ['priority'],
      _count: { id: true },
    });

    const priorityMap: Record<string, number> = {};
    for (const row of byPriority) {
      priorityMap[row.priority] = row._count.id;
    }

    return {
      by_status: statusMap,
      by_type: typeMap,
      by_priority: priorityMap,
      total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    };
  }

  /** Feedback Detail */
  async getFeedbackDetail(ticketId: string) {
    const ticket = await this.prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true } },
        account: { select: { id: true, name: true } },
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            sender: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    return {
      id: ticket.id,
      subject: ticket.subject,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      user: ticket.user,
      account: ticket.account,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        content: m.content,
        is_admin: m.is_admin,
        sender_email: m.sender.email,
        created_at: m.created_at,
      })),
    };
  }

  /** Update Feedback Status */
  async updateFeedbackStatus(ticketId: string, status: string, adminUserId: string) {
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Noto\'g\'ri status');
    }

    const ticket = await this.prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    await this.prisma.$transaction([
      this.prisma.feedbackTicket.update({
        where: { id: ticketId },
        data: { status: status as FeedbackStatus },
      }),
      this.prisma.auditEvent.create({
        data: {
          account_id: ticket.account_id,
          user_id: adminUserId,
          action: 'FEEDBACK_STATUS_CHANGED',
          old_value: { status: ticket.status, ticket_id: ticketId },
          new_value: { status },
        },
      }),
    ]);

    return { id: ticketId, status };
  }

  /** Send Feedback Message */
  async sendFeedbackMessage(
    ticketId: string,
    senderId: string,
    content: string,
    isAdmin: boolean,
  ) {
    const ticket = await this.prisma.feedbackTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket topilmadi');

    const message = await this.prisma.feedbackMessage.create({
      data: {
        ticket_id: ticketId,
        sender_id: senderId,
        content,
        is_admin: isAdmin,
      },
    });

    // If admin replies and ticket is OPEN, move to IN_PROGRESS
    if (isAdmin && ticket.status === 'OPEN') {
      await this.prisma.feedbackTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return {
      id: message.id,
      ticket_id: message.ticket_id,
      content: message.content,
      is_admin: message.is_admin,
      created_at: message.created_at,
    };
  }

  /** Send Notification */
  async sendNotification(
    message: string,
    type: string,
    target: 'all' | string[],
    adminUserId: string,
  ) {
    if (target === 'all') {
      await this.prisma.notification.create({
        data: {
          account_id: null,
          message,
          type,
          created_by: adminUserId,
        },
      });
      return { sent: 1, target: 'all' };
    }

    // target is array of account_ids
    const data = target.map((accountId) => ({
      account_id: accountId,
      message,
      type,
      created_by: adminUserId,
    }));

    await this.prisma.notification.createMany({ data });

    return { sent: target.length, target: 'specific_accounts' };
  }

  /** Send notification with template or custom message */
  async sendNotificationAdvanced(opts: {
    message: string;
    type: string;
    target: 'all' | string[];
    adminUserId: string;
  }) {
    if (opts.target === 'all') {
      await this.prisma.notification.create({
        data: {
          account_id: null,
          message: opts.message,
          type: opts.type,
          created_by: opts.adminUserId,
        },
      });
      return { sent: 1, target: 'all' };
    }

    const data = opts.target.map((accountId) => ({
      account_id: accountId,
      message: opts.message,
      type: opts.type,
      created_by: opts.adminUserId,
    }));

    await this.prisma.notification.createMany({ data });
    return { sent: opts.target.length, target: 'specific_accounts' };
  }

  /** Get User Notifications */
  async getUserNotifications(accountId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        OR: [
          { account_id: accountId },
          { account_id: null },
        ],
        is_read: false,
      },
      orderBy: { created_at: 'desc' },
    });

    return notifications.map((n) => ({
      id: n.id,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));
  }

  /** Mark Notification Read */
  async markNotificationRead(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification topilmadi');

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return { id: notificationId, is_read: true };
  }

  /** List all notification templates */
  async listNotificationTemplates() {
    return this.prisma.notificationTemplate.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  /** Create notification template */
  async createNotificationTemplate(
    name: string,
    message: string,
    type: string,
    adminUserId: string,
  ) {
    return this.prisma.notificationTemplate.create({
      data: { name, message, type, created_by: adminUserId },
    });
  }

  /** Delete notification template */
  async deleteNotificationTemplate(id: string) {
    const tmpl = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!tmpl) throw new NotFoundException('Shablon topilmadi');
    await this.prisma.notificationTemplate.delete({ where: { id } });
    return { deleted: true };
  }
}
