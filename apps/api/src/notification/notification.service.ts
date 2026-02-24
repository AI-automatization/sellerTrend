import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a notification.
   * target = 'all' => account_id = null (broadcast to everyone)
   * target = string[] => one notification per account ID
   */
  async sendNotification(
    message: string,
    type: string,
    target: 'all' | string[],
    createdBy?: string,
  ) {
    if (target === 'all') {
      // Broadcast: account_id = null means visible to all accounts
      const notification = await this.prisma.notification.create({
        data: {
          message,
          type,
          account_id: null,
          created_by: createdBy ?? null,
        },
      });

      return { sent: 1, notifications: [{ id: notification.id }] };
    }

    // Targeted: create one notification per account
    const notifications = await this.prisma.$transaction(
      target.map((accountId) =>
        this.prisma.notification.create({
          data: {
            message,
            type,
            account_id: accountId,
            created_by: createdBy ?? null,
          },
        }),
      ),
    );

    return {
      sent: notifications.length,
      notifications: notifications.map((n) => ({ id: n.id })),
    };
  }

  /**
   * Get unread + recent notifications for an account.
   * Returns notifications where account_id matches OR account_id is null (broadcasts).
   * Limited to the latest 20.
   */
  async getMyNotifications(accountId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        OR: [{ account_id: accountId }, { account_id: null }],
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return notifications.map((n) => ({
      id: n.id,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return {
      id: updated.id,
      is_read: updated.is_read,
    };
  }
}
