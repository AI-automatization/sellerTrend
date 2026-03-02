import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Tracks in-flight HTTP requests for capacity monitoring.
 * Static counters so MetricsService can read them without injection.
 */
@Injectable()
export class ConcurrencyTrackerInterceptor implements NestInterceptor {
  private static activeRequests = 0;
  private static peakConcurrent = 0;
  private static readonly perUser = new Map<string, number>();

  private static peakResetInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Reset peak every 60 seconds (once, for the singleton)
    if (!ConcurrencyTrackerInterceptor.peakResetInterval) {
      ConcurrencyTrackerInterceptor.peakResetInterval = setInterval(() => {
        ConcurrencyTrackerInterceptor.peakConcurrent =
          ConcurrencyTrackerInterceptor.activeRequests;
      }, 60_000);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.sub || req.user?.id;

    // Increment
    ConcurrencyTrackerInterceptor.activeRequests++;
    if (
      ConcurrencyTrackerInterceptor.activeRequests >
      ConcurrencyTrackerInterceptor.peakConcurrent
    ) {
      ConcurrencyTrackerInterceptor.peakConcurrent =
        ConcurrencyTrackerInterceptor.activeRequests;
    }

    if (userId) {
      const current = ConcurrencyTrackerInterceptor.perUser.get(userId) ?? 0;
      ConcurrencyTrackerInterceptor.perUser.set(userId, current + 1);
    }

    return next.handle().pipe(
      finalize(() => {
        ConcurrencyTrackerInterceptor.activeRequests = Math.max(
          0,
          ConcurrencyTrackerInterceptor.activeRequests - 1,
        );
        if (userId) {
          const current =
            ConcurrencyTrackerInterceptor.perUser.get(userId) ?? 1;
          if (current <= 1) {
            ConcurrencyTrackerInterceptor.perUser.delete(userId);
          } else {
            ConcurrencyTrackerInterceptor.perUser.set(userId, current - 1);
          }
        }
      }),
    );
  }

  static getActiveRequests(): number {
    return ConcurrencyTrackerInterceptor.activeRequests;
  }

  static getPeakConcurrent(): number {
    return ConcurrencyTrackerInterceptor.peakConcurrent;
  }

  static getPerUserConcurrent(): Map<string, number> {
    return new Map(ConcurrencyTrackerInterceptor.perUser);
  }
}
