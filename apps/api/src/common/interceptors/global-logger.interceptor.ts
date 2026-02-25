import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  RotatingFileWriter,
  sanitizeBody,
  classifyUA,
  type LogEntry,
} from '../logger/file-logger';

const SLOW_THRESHOLD_MS = 500;
const LOG_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class GlobalLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly writer: RotatingFileWriter;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    this.writer = new RotatingFileWriter(logDir, 'api');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();
    const requestId = crypto.randomUUID();

    // Set request ID header for tracing
    res.setHeader('X-Request-Id', requestId);

    const method: string = req.method;
    const url: string = req.originalUrl || req.url;
    const ip: string = req.ip || req.connection?.remoteAddress || '-';
    const ua: string = req.headers['user-agent'] || '-';
    const accountId: string | null = req.user?.account_id || null;
    const userId: string | null = req.user?.sub || req.user?.id || null;

    // Capture request body for POST/PUT/PATCH
    const body = LOG_BODY_METHODS.has(method) ? sanitizeBody(req.body) : null;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const contentLength = res.getHeader('content-length');
        this.writeEntry({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          method,
          url,
          status: res.statusCode,
          duration_ms: ms,
          account_id: accountId,
          user_id: userId,
          ip,
          user_agent: ua,
          ua_type: classifyUA(ua),
          content_length: contentLength ? Number(contentLength) : null,
          request_body: body,
          is_slow: ms > SLOW_THRESHOLD_MS,
          error: null,
          stack: null,
        });
      }),
      catchError((err) => {
        const ms = Date.now() - start;
        const status = err.status || err.getStatus?.() || 500;
        const errMsg = err.message || 'Unknown error';
        this.writeEntry({
          request_id: requestId,
          timestamp: new Date().toISOString(),
          method,
          url,
          status,
          duration_ms: ms,
          account_id: accountId,
          user_id: userId,
          ip,
          user_agent: ua,
          ua_type: classifyUA(ua),
          content_length: null,
          request_body: body,
          is_slow: ms > SLOW_THRESHOLD_MS,
          error: errMsg,
          stack: status >= 500 ? (err.stack || null) : null,
        });
        return throwError(() => err);
      }),
    );
  }

  private writeEntry(entry: LogEntry) {
    this.writer.write(entry);

    // Console log (brief)
    const tag = `${entry.method} ${entry.url} ${entry.status} ${entry.duration_ms}ms`;
    if (entry.status >= 500) {
      this.logger.error(`${tag} [${entry.request_id}]`);
    } else if (entry.status >= 400) {
      this.logger.warn(`${tag} [${entry.request_id}]`);
    } else if (entry.is_slow) {
      this.logger.warn(`SLOW ${tag} [${entry.request_id}]`);
    } else {
      this.logger.log(tag);
    }
  }
}
