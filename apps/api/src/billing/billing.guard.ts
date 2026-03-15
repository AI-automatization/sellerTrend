import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NO_BILLING_KEY } from '../common/decorators/no-billing.decorator';

/**
 * BillingGuard — placeholder, plan checks are handled by PlanGuard.
 * Kept for backwards compatibility with @UseGuards(JwtAuthGuard, BillingGuard, PlanGuard).
 */
@Injectable()
export class BillingGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const noBilling = this.reflector.get<boolean>(NO_BILLING_KEY, context.getHandler());
    if (noBilling) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;

    return true;
  }
}
