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
    if (this.whitelistedIps.size === 0) return false;
    const req = context.switchToHttp().getRequest();
    const clientIp = this.extractClientIp(req);
    return this.whitelistedIps.has(clientIp);
  }

  private extractClientIp(req: any): string {
    // Railway/nginx puts real IP in X-Forwarded-For: "client, proxy1, proxy2"
    const xff = req.headers?.['x-forwarded-for'];
    if (xff) {
      const first = (typeof xff === 'string' ? xff : xff[0]).split(',')[0].trim();
      return first.replace(/^::ffff:/, '');
    }
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip.replace(/^::ffff:/, '');
  }
}
