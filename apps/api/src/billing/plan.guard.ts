import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PLAN_KEY } from './requires-plan.decorator';

/** Plan hierarchy — higher index = higher tier */
const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  MAX: 2,
  COMPANY: 3,
};

/**
 * PlanGuard — checks if user's plan meets the minimum required plan level.
 * Must be applied AFTER JwtAuthGuard so req.user is populated.
 *
 * If no @RequiresPlan() decorator is present, the guard passes (no restriction).
 * SUPER_ADMIN is always exempt.
 *
 * Usage: @UseGuards(JwtAuthGuard, PlanGuard)
 *        @RequiresPlan('PRO')
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check handler-level first, then controller-level
    const requiredPlan =
      this.reflector.get<string>(REQUIRED_PLAN_KEY, context.getHandler()) ??
      this.reflector.get<string>(REQUIRED_PLAN_KEY, context.getClass());

    // No @RequiresPlan decorator → no restriction
    if (!requiredPlan) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const account = user?.account;

    // No user/account yet — let JwtAuthGuard handle
    if (!account) return true;

    // SUPER_ADMIN is always exempt
    if (user?.role === 'SUPER_ADMIN') return true;

    const userPlanLevel = PLAN_HIERARCHY[account.plan ?? 'FREE'] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;

    if (userPlanLevel < requiredLevel) {
      throw new ForbiddenException({
        error: 'PLAN_REQUIRED',
        message: `Bu funksiya "${requiredPlan}" rejasidan boshlab mavjud.`,
        current_plan: account.plan ?? 'FREE',
        upgrade_to: requiredPlan,
      });
    }

    return true;
  }
}
