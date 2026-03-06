import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PLAN_KEY = 'requiredPlan';

/**
 * Decorator to mark an endpoint or controller as requiring a specific plan level.
 * Use with PlanGuard: @UseGuards(JwtAuthGuard, PlanGuard)
 *
 * Plan hierarchy: FREE < PRO < MAX < COMPANY
 */
export const RequiresPlan = (plan: string) =>
  SetMetadata(REQUIRED_PLAN_KEY, plan);
