import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new API key. Returns the raw key ONCE — only hash is stored.
   * Format: utf_ + 32 hex bytes = 68 chars
   */
  async createKey(accountId: string, name: string) {
    const rawBytes = crypto.randomBytes(32);
    const rawKey = 'utf_' + rawBytes.toString('hex');
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        account_id: accountId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // only shown once!
      prefix: keyPrefix,
      daily_limit: apiKey.daily_limit,
      created_at: apiKey.created_at,
    };
  }

  async listKeys(accountId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { account_id: accountId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        daily_limit: true,
        requests_today: true,
        is_active: true,
        last_used_at: true,
        created_at: true,
      },
    });
    return keys;
  }

  async deleteKey(accountId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, account_id: accountId },
    });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { is_active: false },
    });

    return { message: 'API key deactivated' };
  }

  /**
   * Validate an API key from X-API-Key header.
   * Returns the account_id if valid, throws otherwise.
   */
  async validateKey(rawKey: string): Promise<{ accountId: string }> {
    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex');

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { key_hash: keyHash, is_active: true },
    });

    if (!apiKey) {
      throw new ForbiddenException('Invalid API key');
    }

    // Daily reset check
    const now = new Date();
    const lastReset = apiKey.last_reset_at;
    if (
      lastReset.getUTCDate() !== now.getUTCDate() ||
      lastReset.getUTCMonth() !== now.getUTCMonth() ||
      lastReset.getUTCFullYear() !== now.getUTCFullYear()
    ) {
      await this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { requests_today: 0, last_reset_at: now },
      });
      apiKey.requests_today = 0;
    }

    if (apiKey.requests_today >= apiKey.daily_limit) {
      throw new ForbiddenException(
        `Daily limit reached (${apiKey.daily_limit} requests/day)`,
      );
    }

    // Increment counter
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        requests_today: { increment: 1 },
        last_used_at: now,
      },
    });

    return { accountId: apiKey.account_id };
  }
}
