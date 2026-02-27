import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly whitelistedIps: Set<string>;

  constructor(...args: ConstructorParameters<typeof ThrottlerGuard>) {
    super(...args);
    const raw = process.env.THROTTLE_WHITELIST_IPS || '';
    this.whitelistedIps = new Set(
      raw.split(',').map((ip) => ip.trim()).filter(Boolean),
    );
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.socket?.remoteAddress || '';
    if (this.whitelistedIps.has(ip)) {
      return true;
    }
    // IPv4-mapped IPv6 check: ::ffff:1.2.3.4 → 1.2.3.4
    const stripped = ip.replace(/^::ffff:/, '');
    if (stripped !== ip && this.whitelistedIps.has(stripped)) {
      return true;
    }
    return false;
  }
}
