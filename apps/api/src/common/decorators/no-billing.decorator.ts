import { SetMetadata } from '@nestjs/common';

export const NO_BILLING_KEY = 'no-billing';

/**
 * Marks an endpoint as exempt from BillingGuard checks.
 * Use on endpoints that should be available to all authenticated users
 * regardless of billing status (e.g., search).
 */
export const NoBilling = () => SetMetadata(NO_BILLING_KEY, true);
