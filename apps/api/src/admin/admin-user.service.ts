import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
          account_id: true,
          created_at: true,
          account: { select: { name: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
        account_id: u.account_id,
        account_name: u.account.name,
        created_at: u.created_at,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async createUser(
    accountId: string,
    email: string,
    password: string,
    role: string,
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account topilmadi');

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const password_hash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: { account_id: accountId, email, password_hash, role: role as UserRole },
    });

    await this.prisma.auditEvent.create({
      data: {
        account_id: accountId,
        user_id: adminUserId,
        action: 'USER_CREATED',
        new_value: { email, role },
      },
    });

    return { id: user.id, email: user.email, role: user.role, account_id: accountId };
  }

  async changeUserPassword(userId: string, newPassword: string, adminUserId: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const password_hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password_hash } });

    await this.prisma.auditEvent.create({
      data: {
        account_id: user.account_id,
        user_id: adminUserId,
        action: 'PASSWORD_CHANGED',
        new_value: { target_user_id: userId, target_email: user.email },
      },
    });

    return { success: true, message: 'Parol o\'zgartirildi' };
  }

  async updateUserRole(userId: string, role: string, adminUserId: string) {
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'];
    if (!allowedRoles.includes(role)) throw new BadRequestException('Noto\'g\'ri rol');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { role: role as UserRole } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: 'USER_ROLE_CHANGED',
          old_value: { role: user.role },
          new_value: { role, target_user: user.email },
        },
      }),
    ]);

    return { id: userId, role };
  }

  async toggleUserActive(userId: string, adminUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (userId === adminUserId) throw new BadRequestException('O\'zingizni o\'chira olmaysiz');

    const newActive = !user.is_active;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { is_active: newActive } }),
      this.prisma.auditEvent.create({
        data: {
          account_id: user.account_id,
          user_id: adminUserId,
          action: newActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          new_value: { target_user: user.email },
        },
      }),
    ]);

    return { id: userId, is_active: newActive };
  }

  async impersonateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { account: { select: { id: true, name: true, status: true } } },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      account_id: user.account_id,
      account_name: user.account.name,
      account_status: user.account.status,
      is_active: user.is_active,
    };
  }
}
