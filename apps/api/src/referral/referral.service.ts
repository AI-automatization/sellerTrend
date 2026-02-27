import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCode(accountId: string) {
    // Check if account already has a referral code
    const existing = await this.prisma.referral.findFirst({
      where: { referrer_account_id: accountId, referred_account_id: null },
      orderBy: { created_at: 'desc' },
    });

    if (existing) {
      return { code: existing.code, created_at: existing.created_at };
    }

    const code = nanoid(8).toUpperCase();

    const referral = await this.prisma.referral.create({
      data: {
        referrer_account_id: accountId,
        code,
        reward_days: 7,
      },
    });

    return { code: referral.code, created_at: referral.created_at };
  }

  async getStats(accountId: string) {
    const myCode = await this.prisma.referral.findFirst({
      where: { referrer_account_id: accountId },
      orderBy: { created_at: 'desc' },
      select: { code: true },
    });

    const referrals = await this.prisma.referral.findMany({
      where: { referrer_account_id: accountId, referred_account_id: { not: null } },
    });

    const total = referrals.length;
    const active = referrals.filter((r) => r.status === 'ACTIVE').length;
    const earnedDays = referrals
      .filter((r) => r.status === 'ACTIVE')
      .reduce((sum, r) => sum + r.reward_days, 0);

    return {
      my_code: myCode?.code ?? null,
      total_referred: total,
      active,
      earned_days: earnedDays,
    };
  }

  /**
   * Called during registration when a referral code is provided.
   * Updates the referral record with the new account ID.
   */
  async applyReferralCode(code: string, referredAccountId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
    });

    if (!referral) {
      throw new BadRequestException('Invalid referral code');
    }

    if (referral.status !== 'PENDING') {
      throw new BadRequestException('Referral code already used');
    }

    if (referral.referrer_account_id === referredAccountId) {
      throw new BadRequestException('Cannot use own referral code');
    }

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        referred_account_id: referredAccountId,
        status: 'ACTIVE',
        credited_at: new Date(),
      },
    });

    return { reward_days: referral.reward_days };
  }
}
