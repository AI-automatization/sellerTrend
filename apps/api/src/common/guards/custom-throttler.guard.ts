import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Global throttler guard — IP-based rate limiting (120 req/min).
 * Only processes the 'default' named throttler.
 * The 'ai' named throttler is handled separately by AiThrottlerGuard.
 */
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

  async onModuleInit(): Promise<void> {
    await super.onModuleInit();
    // Filter out the 'ai' throttler — it's handled by AiThrottlerGuard
    this.throttlers = this.throttlers.filter((t) => t.name !== 'ai');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (err: unknown) {
      // Webpack bundling can break Reflector injection — skip throttling rather than crash
      if (err instanceof Error && err.message?.includes('getAllAndOverride')) {
        return true;
      }
      throw err;
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // JWT auth guard populates req.user with { id, account_id, ... }
    if (req.user?.id) return `user_${req.user.id}`;
    return this.extractClientIp(req);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (this.whitelistedIps.size === 0) return false;
    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const clientIp = this.extractClientIp(req);
    return this.whitelistedIps.has(clientIp);
  }

  private extractClientIp(req: Record<string, unknown>): string {
    // Railway/nginx puts real IP in X-Forwarded-For: "client, proxy1, proxy2"
    const headers = req.headers as Record<string, string | string[]> | undefined;
    const xff = headers?.['x-forwarded-for'];
    if (xff) {
      const first = (typeof xff === 'string' ? xff : xff[0]).split(',')[0].trim();
      return first.replace(/^::ffff:/, '');
    }
    const ip = (req.ip as string) || (req.socket as { remoteAddress?: string })?.remoteAddress || '';
    return ip.replace(/^::ffff:/, '');
  }
}
