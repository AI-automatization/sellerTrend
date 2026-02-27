import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';

/**
 * BillingGuard — must be applied AFTER JwtAuthGuard so req.user is populated.
 * Returns HTTP 402 if account status is PAYMENT_DUE.
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
