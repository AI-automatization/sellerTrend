import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Invite a team member by email */
  async inviteMember(
    accountId: string,
    invitedBy: string,
    data: { email: string; role?: string },
  ) {
    // Check if there's already a pending invite for this email in this account
    const existing = await this.prisma.teamInvite.findFirst({
      where: {
        account_id: accountId,
        email: data.email,
        status: 'PENDING',
      },
    });

    if (existing) {
      throw new BadRequestException('Pending invite already exists for this email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await this.prisma.teamInvite.create({
      data: {
        account_id: accountId,
        email: data.email,
        role: (data.role as any) ?? 'USER',
        token,
        invited_by: invitedBy,
        expires_at: expiresAt,
      },
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    };
  }

  /** List all invites for an account */
  async listInvites(accountId: string) {
    const invites = await this.prisma.teamInvite.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
    });

    return invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invited_by: inv.invited_by,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
    }));
  }

  /** List team members (users in the same account) */
  async listTeamMembers(accountId: string) {
    const users = await this.prisma.user.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
    }));
  }

  /** Accept an invite by token (no auth needed) */
  async acceptInvite(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException(`Invite is already ${invite.status.toLowerCase()}`);
    }

    if (new Date() > invite.expires_at) {
      // Mark as expired
      await this.prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invite has expired');
    }

    // Check if user already exists with this email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      // Link existing user to the account
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          account_id: invite.account_id,
          role: invite.role,
        },
      });
    } else {
      // Create a new user with a random temporary password (bcrypt-hashed)
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const tempHash = await bcrypt.hash(tempPassword, 12);
      await this.prisma.user.create({
        data: {
          account_id: invite.account_id,
          email: invite.email,
          password_hash: tempHash,
          role: invite.role,
        },
      });
      this.logger.log(`Invite accepted: ${invite.email} — temp password generated (user should reset via admin)`);
    }

    // Mark invite as accepted
    await this.prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED' },
    });

    return {
      message: 'Invite accepted',
      email: invite.email,
      account_id: invite.account_id,
    };
  }

  /** Cancel a pending invite */
  async cancelInvite(accountId: string, inviteId: string) {
    const invite = await this.prisma.teamInvite.findFirst({
      where: { id: inviteId, account_id: accountId },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel invite with status ${invite.status}`);
    }

    await this.prisma.teamInvite.delete({
      where: { id: inviteId },
    });

    return { message: 'Invite cancelled' };
  }
}
