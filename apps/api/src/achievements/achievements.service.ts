import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Achievement condition stored as JSON in the DB */
interface AchievementCondition {
  type: string;        // 'analysis_count' | 'track_count' | 'streak_days' | 'discovery_count' | 'sourcing_count'
  threshold: number;   // e.g. 1, 3, 5, 7, 10
}

/** Single user achievement response */
export interface UserAchievementResponse {
  id: string;
  code: string;
  title_key: string;
  description_key: string;
  icon: string;
  earned_at: string;
}

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user qualifies for an achievement and award it if the condition is met.
   * @param userId  The user's ID
   * @param eventType  The type of event (matches condition.type, e.g. 'analysis_count')
   * @param count  Current count for this event type
   */
  async checkAndAward(userId: string, eventType: string, count: number): Promise<void> {
    // Find all achievements matching this event type
    const achievements = await this.prisma.achievement.findMany({
      where: {},
      select: {
        id: true,
        code: true,
        condition: true,
      },
    });

    for (const achievement of achievements) {
      const condition = achievement.condition as unknown as AchievementCondition;
      if (condition.type !== eventType) continue;
      if (count < condition.threshold) continue;

      // Check if already awarded
      const existing = await this.prisma.userAchievement.findUnique({
        where: {
          user_id_achievement_id: {
            user_id: userId,
            achievement_id: achievement.id,
          },
        },
        select: { id: true },
      });

      if (existing) continue;

      // Award the achievement
      await this.prisma.userAchievement.create({
        data: {
          user_id: userId,
          achievement_id: achievement.id,
        },
      });

      this.logger.log(`Achievement "${achievement.code}" awarded to user ${userId}`);
    }
  }

  /**
   * Get all achievements earned by a user.
   */
  async getUserAchievements(userId: string): Promise<UserAchievementResponse[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { user_id: userId },
      include: {
        achievement: {
          select: {
            code: true,
            title_key: true,
            description_key: true,
            icon: true,
          },
        },
      },
      orderBy: { earned_at: 'desc' },
    });

    return userAchievements.map((ua) => ({
      id: ua.id,
      code: ua.achievement.code,
      title_key: ua.achievement.title_key,
      description_key: ua.achievement.description_key,
      icon: ua.achievement.icon,
      earned_at: ua.earned_at.toISOString(),
    }));
  }

  /**
   * Get all available achievements with earned status for a user.
   */
  async getAllWithStatus(userId: string): Promise<Array<{
    code: string;
    title_key: string;
    description_key: string;
    icon: string;
    earned: boolean;
    earned_at: string | null;
  }>> {
    const [allAchievements, userAchievements] = await Promise.all([
      this.prisma.achievement.findMany({
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          code: true,
          title_key: true,
          description_key: true,
          icon: true,
        },
      }),
      this.prisma.userAchievement.findMany({
        where: { user_id: userId },
        select: {
          achievement_id: true,
          earned_at: true,
        },
      }),
    ]);

    const earnedMap = new Map(
      userAchievements.map((ua) => [ua.achievement_id, ua.earned_at]),
    );

    return allAchievements.map((a) => {
      const earnedAt = earnedMap.get(a.id);
      return {
        code: a.code,
        title_key: a.title_key,
        description_key: a.description_key,
        icon: a.icon,
        earned: earnedAt !== undefined,
        earned_at: earnedAt ? earnedAt.toISOString() : null,
      };
    });
  }
}
