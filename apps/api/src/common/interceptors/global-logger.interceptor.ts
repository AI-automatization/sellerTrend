import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GlobalLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly stream: fs.WriteStream;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.stream = fs.createWriteStream(path.join(logDir, 'api.log'), {
      flags: 'a',
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const ip = req.ip || req.connection?.remoteAddress || '-';
    const ua = req.headers['user-agent'] || '-';
    const accountId = req.user?.account_id || '-';

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const ms = Date.now() - start;
        this.writeLine(method, url, res.statusCode, ms, accountId, ip, ua);
      }),
      catchError((err) => {
        const ms = Date.now() - start;
        const status = err.status || err.getStatus?.() || 500;
        const errMsg = err.message || 'Unknown error';
        this.writeLine(
          method,
          url,
          status,
          ms,
          accountId,
          ip,
          ua,
          errMsg,
        );
        return throwError(() => err);
      }),
    );
  }

  private writeLine(
    method: string,
    url: string,
    status: number,
    ms: number,
    account: string,
    ip: string,
    ua: string,
    error?: string,
  ) {
    const ts = new Date().toISOString();
    const line = error
      ? `${ts} | ${method} | ${url} | ${status} | ${ms}ms | ${account} | ${ip} | ERROR: ${error}`
      : `${ts} | ${method} | ${url} | ${status} | ${ms}ms | ${account} | ${ip}`;
    this.stream.write(line + '\n');
    if (status >= 400) {
      this.logger.warn(line);
    } else {
      this.logger.log(`${method} ${url} ${status} ${ms}ms`);
    }
  }
}
