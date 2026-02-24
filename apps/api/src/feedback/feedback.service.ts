import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackType, FeedbackPriority, FeedbackStatus } from '@prisma/client';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new feedback ticket with the first message.
   */
  async createTicket(
    userId: string,
    accountId: string,
    subject: string,
    type: FeedbackType,
    priority: FeedbackPriority,
    content: string,
  ) {
    const ticket = await this.prisma.feedbackTicket.create({
      data: {
        account_id: accountId,
        user_id: userId,
        subject,
        type,
        priority,
        messages: {
          create: {
            sender_id: userId,
            content,
            is_admin: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return {
      id: ticket.id,
      subject: ticket.subject,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      created_at: ticket.created_at,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        is_admin: m.is_admin,
        created_at: m.created_at,
      })),
    };
  }

  /**
   * List all tickets belonging to a user, with message count and last message.
   */
  async getMyTickets(accountId: string, userId: string) {
    const tickets = await this.prisma.feedbackTicket.findMany({
      where: {
        account_id: accountId,
        user_id: userId,
      },
      orderBy: { updated_at: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    return tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      type: t.type,
      priority: t.priority,
      status: t.status,
      message_count: t._count.messages,
      last_message: t.messages[0]
        ? {
            content: t.messages[0].content,
            is_admin: t.messages[0].is_admin,
            created_at: t.messages[0].created_at,
          }
        : null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  }

  /**
   * Get ticket detail with all messages.
   * Verifies user owns the ticket, or caller is admin.
   */
  async getTicketDetail(ticketId: string, userId: string, isAdmin = false) {
    const ticket = await this.prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          include: {
            sender: {
              select: { id: true, email: true, role: true },
            },
          },
        },
        user: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Non-admin users can only view their own tickets
    if (!isAdmin && ticket.user_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      id: ticket.id,
      account_id: ticket.account_id,
      user: ticket.user,
      subject: ticket.subject,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_email: m.sender.email,
        sender_role: m.sender.role,
        content: m.content,
        is_admin: m.is_admin,
        created_at: m.created_at,
      })),
    };
  }

  /**
   * Add a message to a ticket.
   */
  async sendMessage(
    ticketId: string,
    senderId: string,
    content: string,
    isAdmin: boolean,
  ) {
    // Verify ticket exists
    const ticket = await this.prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Non-admin users can only message their own tickets
    if (!isAdmin && ticket.user_id !== senderId) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.feedbackMessage.create({
      data: {
        ticket_id: ticketId,
        sender_id: senderId,
        content,
        is_admin: isAdmin,
      },
    });

    // If admin replies, set ticket to IN_PROGRESS (if currently OPEN)
    if (isAdmin && ticket.status === 'OPEN') {
      await this.prisma.feedbackTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return {
      id: message.id,
      ticket_id: message.ticket_id,
      sender_id: message.sender_id,
      content: message.content,
      is_admin: message.is_admin,
      created_at: message.created_at,
    };
  }

  /**
   * Get all tickets with optional filters (admin only). Paginated.
   */
  async getAdminTickets(
    status?: FeedbackStatus,
    type?: FeedbackType,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      this.prisma.feedbackTicket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { messages: true } },
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.feedbackTicket.count({ where }),
    ]);

    return {
      data: tickets.map((t) => ({
        id: t.id,
        account_id: t.account_id,
        user: t.user,
        subject: t.subject,
        type: t.type,
        priority: t.priority,
        status: t.status,
        message_count: t._count.messages,
        last_message: t.messages[0]
          ? {
              content: t.messages[0].content,
              is_admin: t.messages[0].is_admin,
              created_at: t.messages[0].created_at,
            }
          : null,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get ticket count grouped by status (admin dashboard stats).
   */
  async getAdminStats() {
    const stats = await this.prisma.feedbackTicket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const result: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    for (const s of stats) {
      result[s.status] = s._count.id;
    }

    return {
      ...result,
      total: Object.values(result).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Update ticket status (admin only).
   */
  async updateTicketStatus(ticketId: string, status: FeedbackStatus) {
    const ticket = await this.prisma.feedbackTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updated = await this.prisma.feedbackTicket.update({
      where: { id: ticketId },
      data: { status },
    });

    return {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at,
    };
  }
}
