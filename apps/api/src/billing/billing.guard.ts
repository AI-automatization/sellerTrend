import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  ForbiddenException,
} from '@nestjs/common';

/** Maximum analyses per month for FREE plan users */
const FREE_PLAN_ANALYSIS_LIMIT = 10;

/**
 * BillingGuard — must be applied AFTER JwtAuthGuard so req.user is populated.
 * Returns HTTP 402 if account status is PAYMENT_DUE (for paid plan users).
 * Returns HTTP 403 if FREE plan analysis limit exceeded.
 * Apply as: @UseGuards(JwtAuthGuard, BillingGuard)
 */
@Injectable()
export class BillingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const account = user?.account;

    // No user yet (unauthenticated) — let JwtAuthGuard handle it
    if (!account) return true;

    // SUPER_ADMIN is exempt from billing
    if (user?.role === 'SUPER_ADMIN') return true;

    // FREE plan users: check analysis limit
    if (account.plan === 'FREE') {
      const used = account.analyses_used ?? 0;
      if (used >= FREE_PLAN_ANALYSIS_LIMIT) {
        throw new ForbiddenException({
          error: 'PLAN_LIMIT',
          message: `Bepul rejadagi tahlil limiti tugadi (${FREE_PLAN_ANALYSIS_LIMIT}/oy)`,
          used,
          limit: FREE_PLAN_ANALYSIS_LIMIT,
        });
      }
      // FREE plan users skip PAYMENT_DUE check — they don't pay
      return true;
    }

    // Paid plan users: check PAYMENT_DUE status
    if (account.status === 'PAYMENT_DUE') {
      throw new HttpException(
        {
          error: 'PAYMENT_DUE',
          message: "Balansingiz yetarli emas. Hisobni to'ldiring.",
          balance: account.balance?.toString(),
        },
        402,
      );
    }

    return true;
  }
}
