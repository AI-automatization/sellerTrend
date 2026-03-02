import { Request, Response, NextFunction } from 'express';

// Max heap from NODE_OPTIONS (default 2048MB for Railway Pro)
const MAX_HEAP_MB = parseInt(process.env.MAX_HEAP_MB || '2048', 10);
const CRITICAL_PCT = 0.85; // 85% = 340MB

const WHITELIST = ['/api/v1/health', '/api/v1/admin/monitoring'];

export function memoryPressureMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const heapUsed = process.memoryUsage().heapUsed / (1024 * 1024);
  const threshold = MAX_HEAP_MB * CRITICAL_PCT;

  if (heapUsed > threshold && !WHITELIST.some((p) => req.url.startsWith(p))) {
    res.setHeader('Retry-After', '30');
    res.status(503).json({
      statusCode: 503,
      message: 'Server under memory pressure, please retry later',
      heap_used_mb: Math.round(heapUsed),
      threshold_mb: Math.round(threshold),
    });
    return;
  }
  next();
}
