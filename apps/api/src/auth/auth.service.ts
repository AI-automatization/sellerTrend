import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralService } from '../referral/referral.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { StreakService } from './streak.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 30;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MAX_RESETS_PER_HOUR = 3;

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const WINDOW_SECONDS = 15 * 60;  // 15 minute window

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly referralService: ReferralService,
    private readonly streakService: StreakService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const account = await this.prisma.account.create({
      data: { name: dto.company_name },
    });

    const password_hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        account_id: account.id,
        email: dto.email,
        password_hash,
        role: 'USER',
      },
    });

    // Apply referral code if provided
    if (dto.referral_code) {
      try {
        await this.referralService.applyReferralCode(
          dto.referral_code,
          account.id,
        );
        this.logger.log(
          `Referral code ${dto.referral_code} applied for account ${account.id}`,
        );
      } catch (e: unknown) {
        this.logger.warn(
          `Referral code ${dto.referral_code} failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const access_token = this.signAccessToken(user.id, account.id, user.role, dto.email);
    const refresh_token = await this.createRefreshToken(user.id);
    return { access_token, refresh_token, account_id: account.id };
  }

  async login(dto: LoginDto) {
    const key = dto.email.toLowerCase();

    // Check if locked out
    await this.checkLockout(key);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { account: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password_hash))) {
      await this.recordFailedAttempt(key);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset attempts
    await this.resetAttempts(key);

    // Record login streak (fire-and-forget, non-blocking)
    this.streakService.recordLogin(user.id).catch((err: unknown) => {
      this.logger.warn(`Failed to record login streak: ${err instanceof Error ? err.message : String(err)}`);
    });

    const access_token = this.signAccessToken(user.id, user.account_id, user.role, user.email);
    const refresh_token = await this.createRefreshToken(user.id);
    return {
      access_token,
      refresh_token,
      account_id: user.account_id,
      status: user.account.status,
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findFirst({
      where: { refresh_token_hash: hash, revoked_at: null },
      include: { user: { include: { account: true } } },
    });

    if (!session || !session.expires_at || session.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (!session.user.is_active) {
      throw new ForbiddenException('Account deactivated');
    }

    // Rotate: revoke old (update logged_in_at for active session tracking), issue new
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revoked_at: new Date() },
    });

    const access_token = this.signAccessToken(
      session.user.id,
      session.user.account_id,
      session.user.role,
      session.user.email,
    );
    const refresh_token = await this.createRefreshToken(session.user.id);
    return { access_token, refresh_token };
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.userSession.updateMany({
      where: { refresh_token_hash: hash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    return { ok: true };
  }

  async bootstrapAdmin(email: string, secret: string, force?: boolean): Promise<{ ok: boolean; message: string }> {
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid bootstrap secret');
    }

    if (!force) {
      const existing = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' },
      });
      if (existing) {
        return { ok: false, message: 'SUPER_ADMIN already exists' };
      }
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, message: 'User not found' };
    }
    await this.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN' },
    });
    return { ok: true, message: `${email} promoted to SUPER_ADMIN` };
  }

  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    const genericResponse = { ok: true, message: 'If the email exists, a reset link has been sent.' };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return genericResponse;
    }

    // Rate limit: max resets per hour per user
    const recentResets = await this.prisma.passwordReset.count({
      where: {
        user_id: user.id,
        created_at: { gte: new Date(Date.now() - 3600_000) },
      },
    });
    if (recentResets >= MAX_RESETS_PER_HOUR) {
      return genericResponse;
    }

    // Generate token — store only hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    this.logger.log(`Password reset token for ${email}: ${token} (expires in ${RESET_TOKEN_EXPIRY_MINUTES} min)`);
    await this.sendResetNotification(user.id, email, token);

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { gte: new Date() },
      },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const password_hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.user_id },
        data: { password_hash },
      }),
      this.prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used_at: new Date() },
      }),
      this.prisma.userSession.updateMany({
        where: { user_id: resetRecord.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
    ]);

    this.logger.log(`Password reset successful for user ${resetRecord.user.email}`);
    return { ok: true, message: 'Password has been reset. Please login with your new password.' };
  }

  private async sendResetNotification(userId: string, email: string, token: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { account_id: true },
      });
      if (!user) return;

      const rows = await this.prisma.$queryRawUnsafe<Array<{ chat_id: string }>>(
        `SELECT chat_id FROM telegram_links WHERE account_id = $1 AND is_active = true LIMIT 1`,
        user.account_id,
      );
      if (!rows || rows.length === 0) return;

      const chatId = rows[0].chat_id;
      const resetUrl = `${process.env.FRONTEND_URL || 'https://app.ventra.uz'}/reset-password?token=${token}`;
      const message = [
        '<b>Parol tiklash</b>',
        '',
        `${email} uchun parol tiklash so'raldi.`,
        '',
        `<a href="${resetUrl}">Parolni tiklash</a>`,
        '',
        `Link ${RESET_TOKEN_EXPIRY_MINUTES} daqiqa amal qiladi.`,
      ].join('\n');

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      });
    } catch {
      // Telegram send failed or table doesn't exist — non-critical
    }
  }

  async getMe(jwtUser: { id: string; account_id: string }) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: jwtUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        account: {
          select: {
            id: true,
            name: true,
            status: true,
            balance: true,
            daily_fee: true,
            plan: true,
            plan_expires_at: true,
            analyses_used: true,
            onboarding_completed: true,
            onboarding_step: true,
            selected_marketplaces: true,
            created_at: true,
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      account: {
        ...user.account,
        balance: user.account.balance.toString(),
        daily_fee: user.account.daily_fee?.toString() ?? null,
        plan: user.account.plan,
        plan_expires_at: user.account.plan_expires_at,
        analyses_used: user.account.analyses_used,
      },
    };
  }

  async updateOnboarding(
    accountId: string,
    dto: { step?: number; completed?: boolean; marketplaces?: string[] },
  ) {
    const data: Record<string, unknown> = {};
    if (dto.step !== undefined) data.onboarding_step = dto.step;
    if (dto.completed !== undefined) data.onboarding_completed = dto.completed;
    if (dto.marketplaces !== undefined) data.selected_marketplaces = dto.marketplaces;

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data,
      select: {
        onboarding_completed: true,
        onboarding_step: true,
        selected_marketplaces: true,
      },
    });

    return account;
  }

  private signAccessToken(userId: string, accountId: string, role: string, email?: string): string {
    return this.jwt.sign(
      { sub: userId, account_id: accountId, role, email },
      { expiresIn: ACCESS_TOKEN_TTL },
    );
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(40).toString('hex');
    const hash = this.hashToken(raw);
    const expires = new Date();
    expires.setDate(expires.getDate() + REFRESH_TOKEN_DAYS);

    await this.prisma.userSession.create({
      data: {
        user_id: userId,
        refresh_token_hash: hash,
        expires_at: expires,
      },
    });

    return raw;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async checkLockout(key: string): Promise<void> {
    try {
      const lockKey = `auth:lock:${key}`;
      const ttl = await this.redis.ttl(lockKey);
      if (ttl > 0) {
        this.logger.warn(`Login locked for ${key}, ${ttl}s remaining`);
        throw new ForbiddenException(
          `Juda ko'p urinish. ${Math.ceil(ttl / 60)} daqiqadan keyin qayta urinib ko'ring.`,
        );
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // Redis unavailable — skip lockout check
    }
  }

  private async recordFailedAttempt(key: string): Promise<void> {
    try {
      const attemptsKey = `auth:attempts:${key}`;
      const count = await this.redis.incr(attemptsKey);
      if (count === 1) {
        await this.redis.expire(attemptsKey, WINDOW_SECONDS);
      }

      if (count >= MAX_ATTEMPTS) {
        const lockKey = `auth:lock:${key}`;
        await this.redis.set(lockKey, '1', 'EX', LOCKOUT_SECONDS);
        await this.redis.del(attemptsKey);
        this.logger.warn(`Account locked: ${key} after ${count} failed attempts`);
      }
    } catch {
      // Redis unavailable — skip rate limiting
    }
  }

  private async resetAttempts(key: string): Promise<void> {
    try {
      await this.redis.del(`auth:attempts:${key}`, `auth:lock:${key}`);
    } catch {
      // Redis unavailable — skip
    }
  }
}
