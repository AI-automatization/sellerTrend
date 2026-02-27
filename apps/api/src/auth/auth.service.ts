import {
  Injectable,
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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 30;

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const WINDOW_SECONDS = 15 * 60;  // 15 minute window

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly referralService: ReferralService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    this.redis.connect().catch(() => {
      this.logger.warn('Redis not available for rate limiting — falling back to no rate limit');
    });
  }

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

    // Rotate: revoke old, issue new refresh token
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

  async bootstrapAdmin(email: string, secret: string): Promise<{ ok: boolean; message: string }> {
    const expectedSecret = process.env.BOOTSTRAP_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid bootstrap secret');
    }

    const existing = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (existing) {
      return { ok: false, message: 'SUPER_ADMIN already exists' };
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
