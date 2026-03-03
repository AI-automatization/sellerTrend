import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prefix used when cloning a broadcast notification for per-user read tracking.
 * The original broadcast notification ID is stored in `created_by` field
 * with this prefix so we can identify user-scoped copies and deduplicate.
 */
const BROADCAST_READ_PREFIX = 'broadcast_read:';

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
   * Returns per-account notifications + broadcast notifications.
   *
   * For broadcasts: if the user has already marked one as read, a per-user
   * copy exists (with created_by = "broadcast_read:{originalId}"). In that case,
   * we show the copy (is_read: true) and exclude the original broadcast.
   */
  async getMyNotifications(accountId: string) {
    // 1. Fetch per-account notifications (including broadcast read copies)
    const userNotifications = await this.prisma.notification.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // 2. Collect IDs of broadcast notifications this user has already read
    const readBroadcastIds = new Set<string>();
    for (const n of userNotifications) {
      if (n.created_by?.startsWith(BROADCAST_READ_PREFIX)) {
        readBroadcastIds.add(n.created_by.slice(BROADCAST_READ_PREFIX.length));
      }
    }

    // 3. Fetch broadcast notifications, excluding ones user already has a copy of
    const broadcasts = await this.prisma.notification.findMany({
      where: {
        account_id: null,
        id: readBroadcastIds.size > 0
          ? { notIn: [...readBroadcastIds] }
          : undefined,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    // 4. Merge and sort by created_at desc, limit to 20
    const all = [...userNotifications, ...broadcasts]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 20);

    return all.map((n) => ({
      id: n.id,
      message: n.message,
      type: n.type,
      is_read: n.is_read,
      created_at: n.created_at,
    }));
  }

  /**
   * Mark a single notification as read.
   *
   * For per-account notifications: directly update is_read = true.
   * For broadcast notifications (account_id IS NULL): create a per-user copy
   * with is_read = true. The original broadcast stays untouched so other
   * users still see it as unread.
   */
  async markAsRead(notificationId: string, accountId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [{ account_id: accountId }, { account_id: null }],
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Per-account notification: simple update
    if (notification.account_id !== null) {
      const updated = await this.prisma.notification.update({
        where: { id: notificationId },
        data: { is_read: true },
      });

      return { id: updated.id, is_read: updated.is_read };
    }

    // Broadcast notification: check if user already has a read copy
    const existingCopy = await this.prisma.notification.findFirst({
      where: {
        account_id: accountId,
        created_by: `${BROADCAST_READ_PREFIX}${notificationId}`,
      },
    });

    if (existingCopy) {
      return { id: existingCopy.id, is_read: true };
    }

    // Create a per-user copy of the broadcast notification, marked as read.
    // Store the original broadcast ID in created_by for deduplication.
    const copy = await this.prisma.notification.create({
      data: {
        message: notification.message,
        type: notification.type,
        account_id: accountId,
        is_read: true,
        created_by: `${BROADCAST_READ_PREFIX}${notificationId}`,
        created_at: notification.created_at,
      },
    });

    return { id: copy.id, is_read: true };
  }
}
