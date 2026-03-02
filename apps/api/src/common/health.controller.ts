import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const start = Date.now();

    // DB check (pool_timeout=10 ensures this won't hang forever)
    let db = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'unreachable';
    }

    const status = db === 'ok' ? 'ok' : 'degraded';
    const response_ms = Date.now() - start;
    const uptime_seconds = Math.floor(process.uptime());

    return { status, db, response_ms, uptime_seconds, timestamp: new Date().toISOString() };
  }
}
