import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * T-239: Per-account rate limiter for AI endpoints.
 *
 * Tracks by account_id (not IP or user_id) because AI budget is per-account.
 * Only processes the 'ai' named throttler — the 'default' throttler is
 * handled globally by CustomThrottlerGuard.
 *
 * Default limits (overridable via @Throttle({ ai: { limit, ttl } })):
 *   - Cached endpoints (GET):  30 req/min per account
 *   - AI call endpoints (POST): 10 req/min per account
 */
@Injectable()
export class AiThrottlerGuard extends ThrottlerGuard {
  async onModuleInit(): Promise<void> {
    await super.onModuleInit();
    // Only process the 'ai' named throttler
    this.throttlers = this.throttlers.filter((t) => t.name === 'ai');
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // JWT auth guard populates req.user with { id, account_id, ... }
    const accountId = req.user?.account_id as string | undefined;
    if (accountId) return `ai_account_${accountId}`;
    // Fallback to user id if account_id is missing
    const userId = req.user?.id as string | undefined;
    if (userId) return `ai_user_${userId}`;
    // Last resort: IP (should not happen on authenticated AI endpoints)
    return `ai_ip_${(req.ip as string) || 'unknown'}`;
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException(
      'AI so\'rovlar limiti oshdi. Iltimos, bir daqiqadan keyin qayta urinib ko\'ring.',
    );
  }
}
