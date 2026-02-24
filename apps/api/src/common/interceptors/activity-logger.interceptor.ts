import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_ACTION_KEY } from '../decorators/activity-action.decorator';

@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLoggerInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(
      ACTIVITY_ACTION_KEY,
      context.getHandler(),
    );

    // If no @ActivityAction decorator is set, skip logging
    if (!action) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    const accountId: string | undefined = req.user?.account_id;

    // Cannot log without authenticated user
    if (!userId || !accountId) {
      return next.handle();
    }

    const ip = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // Build details from body + params
    const details: Record<string, any> = {};
    if (req.params && Object.keys(req.params).length > 0) {
      details.params = req.params;
    }
    if (req.body && Object.keys(req.body).length > 0) {
      // Exclude sensitive fields
      const { password, password_hash, token, ...safeBody } = req.body;
      if (Object.keys(safeBody).length > 0) {
        details.body = safeBody;
      }
    }

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget: do not await, do not block response
        this.prisma.userActivity
          .create({
            data: {
              user_id: userId,
              account_id: accountId,
              action,
              details: Object.keys(details).length > 0 ? details : undefined,
              ip,
              user_agent: userAgent,
            },
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to log activity "${action}": ${err.message}`,
            );
          });
      }),
    );
  }
}
