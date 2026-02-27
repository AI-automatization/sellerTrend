import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

@Catch()
export class ErrorTrackerFilter extends BaseExceptionFilter {
  private readonly prisma: PrismaService;

  constructor(httpAdapter: any, prisma: PrismaService) {
    super(httpAdapter);
    this.prisma = prisma;
  }

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Only track 4xx/5xx errors
    if (status >= 400) {
      const message =
        exception instanceof HttpException
          ? (exception.getResponse() as Record<string, unknown>)?.message || exception.message
          : exception.message || 'Unknown error';

      try {
        await this.prisma.systemError.create({
          data: {
            endpoint: req.originalUrl || req.url || '-',
            method: req.method || 'UNKNOWN',
            status,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            stack: status >= 500 ? (exception.stack || null) : null,
            account_id: req.user?.account_id || null,
            user_id: req.user?.sub || req.user?.id || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            user_agent: req.headers?.['user-agent'] || null,
          },
        });
      } catch {
        // Don't fail if error logging fails
      }
    }

    super.catch(exception, host);
  }
}
