import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Streak data returned to the client */
export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_login_date: string | null;
}

@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a login event for streak tracking.
   * - If last_login_date was yesterday: increment current_streak
   * - If last_login_date is today: skip (already recorded)
   * - Otherwise (gap > 1 day or first login): reset streak to 1
   */
  async recordLogin(userId: string): Promise<void> {
    const today = this.getDateOnly(new Date());

    const existing = await this.prisma.loginStreak.findUnique({
      where: { user_id: userId },
    });

    if (!existing) {
      // First ever login — create streak record
      await this.prisma.loginStreak.create({
        data: {
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_login_date: today,
        },
      });
      this.logger.debug(`Streak created for user ${userId}: 1 day`);
      return;
    }

    // Already logged in today — skip
    if (existing.last_login_date) {
      const lastDate = this.getDateOnly(existing.last_login_date);
      if (lastDate.getTime() === today.getTime()) {
        return;
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastDate.getTime() === yesterday.getTime()) {
        // Consecutive day — increment streak
        const newStreak = existing.current_streak + 1;
        const newLongest = Math.max(newStreak, existing.longest_streak);
        await this.prisma.loginStreak.update({
          where: { user_id: userId },
          data: {
            current_streak: newStreak,
            longest_streak: newLongest,
            last_login_date: today,
          },
        });
        this.logger.debug(`Streak incremented for user ${userId}: ${newStreak} days`);
        return;
      }
    }

    // Gap > 1 day — reset streak to 1
    await this.prisma.loginStreak.update({
      where: { user_id: userId },
      data: {
        current_streak: 1,
        longest_streak: Math.max(1, existing.longest_streak),
        last_login_date: today,
      },
    });
    this.logger.debug(`Streak reset for user ${userId}: 1 day`);
  }

  /**
   * Get current streak data for a user.
   */
  async getStreak(userId: string): Promise<StreakData> {
    const streak = await this.prisma.loginStreak.findUnique({
      where: { user_id: userId },
    });

    if (!streak) {
      return {
        current_streak: 0,
        longest_streak: 0,
        last_login_date: null,
      };
    }

    return {
      current_streak: streak.current_streak,
      longest_streak: streak.longest_streak,
      last_login_date: streak.last_login_date
        ? streak.last_login_date.toISOString().split('T')[0]
        : null,
    };
  }

  /**
   * Normalize a Date to midnight UTC (date-only comparison).
   */
  private getDateOnly(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}
