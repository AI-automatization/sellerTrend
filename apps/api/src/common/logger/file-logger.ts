import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LogEntry {
  request_id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  duration_ms: number;
  account_id: string | null;
  user_id: string | null;
  ip: string;
  user_agent: string;
  ua_type: 'browser' | 'mobile' | 'bot' | 'api-key' | 'unknown';
  content_length: number | null;
  request_body: Record<string, any> | null;
  is_slow: boolean;
  error: string | null;
  stack: string | null;
}

export interface LogFilter {
  status?: number;
  status_gte?: number;
  endpoint?: string;
  method?: string;
  min_ms?: number;
  account_id?: string;
}

// ─── Sensitive Field Sanitization ────────────────────────────────────────────

const SENSITIVE_KEYS = /password|token|secret|api_key|authorization|apikey|access_token|refresh_token|credential/i;
const MAX_BODY_SIZE = 2048;

export function sanitizeBody(body: any): Record<string, any> | null {
  if (!body || typeof body !== 'object') return null;
  try {
    const raw = JSON.stringify(body);
    if (raw.length > MAX_BODY_SIZE) {
      return { _truncated: true, _size: raw.length };
    }
    return sanitizeObj(body);
  } catch {
    return null;
  }
}

function sanitizeObj(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sanitizeObj);
  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeObj(val);
      }
    }
    return result;
  }
  return obj;
}

// ─── User-Agent Classification ───────────────────────────────────────────────

export function classifyUA(ua: string): LogEntry['ua_type'] {
  if (!ua || ua === '-') return 'unknown';
  const lower = ua.toLowerCase();
  if (/bot|crawler|spider|scrapy|curl|wget|python-requests|axios|node-fetch|got\//i.test(lower)) return 'bot';
  if (/mobile|android|iphone|ipad/i.test(lower)) return 'mobile';
  if (/x-api-key|bearer/i.test(lower)) return 'api-key';
  if (/mozilla|chrome|safari|firefox|edge|opera/i.test(lower)) return 'browser';
  return 'unknown';
}

// ─── Rotating File Writer ────────────────────────────────────────────────────

export class RotatingFileWriter {
  private stream: fs.WriteStream | null = null;
  private currentDate = '';
  private readonly logDir: string;
  private readonly prefix: string;

  constructor(logDir: string, prefix: string) {
    this.logDir = logDir;
    this.prefix = prefix;
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  write(entry: Record<string, any>) {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.currentDate) {
      this.rotate(today);
    }
    const line = JSON.stringify(entry) + '\n';
    this.stream!.write(line);
  }

  private rotate(date: string) {
    if (this.stream) {
      this.stream.end();
    }
    this.currentDate = date;
    const filePath = path.join(this.logDir, `${this.prefix}-${date}.log`);
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  destroy() {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

// ─── Log Reading Utilities ───────────────────────────────────────────────────

export function getLogFilePath(logDir: string, prefix: string, date: string): string {
  return path.join(logDir, `${prefix}-${date}.log`);
}

export function getAvailableDates(logDir: string, prefix: string): string[] {
  if (!fs.existsSync(logDir)) return [];
  const files = fs.readdirSync(logDir);
  const pattern = new RegExp(`^${prefix}-(\\d{4}-\\d{2}-\\d{2})\\.log$`);
  return files
    .map((f) => {
      const m = f.match(pattern);
      return m ? m[1] : null;
    })
    .filter(Boolean)
    .sort()
    .reverse() as string[];
}

export async function readLogFile(
  logDir: string,
  prefix: string,
  date: string,
  filters: LogFilter = {},
  limit = 200,
  offset = 0,
): Promise<{ entries: LogEntry[]; total: number }> {
  const filePath = getLogFilePath(logDir, prefix, date);
  if (!fs.existsSync(filePath)) return { entries: [], total: 0 };

  const entries: LogEntry[] = [];
  let total = 0;

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as LogEntry;
      if (!matchesFilter(entry, filters)) continue;
      total++;
      if (total > offset && entries.length < limit) {
        entries.push(entry);
      }
    } catch {
      // skip malformed lines
    }
  }

  return { entries, total };
}

function matchesFilter(entry: LogEntry, filters: LogFilter): boolean {
  if (filters.status !== undefined && entry.status !== filters.status) return false;
  if (filters.status_gte !== undefined && entry.status < filters.status_gte) return false;
  if (filters.method && entry.method !== filters.method.toUpperCase()) return false;
  if (filters.endpoint && !entry.url.includes(filters.endpoint)) return false;
  if (filters.min_ms !== undefined && entry.duration_ms < filters.min_ms) return false;
  if (filters.account_id && entry.account_id !== filters.account_id) return false;
  return true;
}

// ─── Performance Aggregation ─────────────────────────────────────────────────

export interface EndpointPerf {
  endpoint: string;
  method: string;
  count: number;
  avg_ms: number;
  p95_ms: number;
  max_ms: number;
  error_count: number;
  error_rate: number;
  slow_count: number;
}

export interface PerfSummary {
  total_requests: number;
  total_errors: number;
  avg_ms: number;
  p95_ms: number;
  slow_requests: number;
  endpoints: EndpointPerf[];
}

export async function computePerformance(
  logDir: string,
  prefix: string,
  date: string,
  top = 20,
): Promise<PerfSummary> {
  const filePath = getLogFilePath(logDir, prefix, date);
  if (!fs.existsSync(filePath)) {
    return { total_requests: 0, total_errors: 0, avg_ms: 0, p95_ms: 0, slow_requests: 0, endpoints: [] };
  }

  const epMap = new Map<string, { durations: number[]; errors: number; slow: number }>();
  const allDurations: number[] = [];
  let totalErrors = 0;
  let totalSlow = 0;

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as LogEntry;
      // Normalize URL (strip query string for grouping)
      const baseUrl = entry.url.split('?')[0];
      const key = `${entry.method} ${baseUrl}`;

      let ep = epMap.get(key);
      if (!ep) {
        ep = { durations: [], errors: 0, slow: 0 };
        epMap.set(key, ep);
      }

      ep.durations.push(entry.duration_ms);
      allDurations.push(entry.duration_ms);

      if (entry.status >= 500) {
        ep.errors++;
        totalErrors++;
      }
      if (entry.is_slow) {
        ep.slow++;
        totalSlow++;
      }
    } catch {
      // skip
    }
  }

  // Build endpoint stats
  const endpoints: EndpointPerf[] = [];
  for (const [key, data] of epMap) {
    const [method, ...rest] = key.split(' ');
    const endpoint = rest.join(' ');
    const sorted = data.durations.sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    endpoints.push({
      endpoint,
      method,
      count: sorted.length,
      avg_ms: Math.round(avg),
      p95_ms: p95,
      max_ms: max,
      error_count: data.errors,
      error_rate: sorted.length > 0 ? Number(((data.errors / sorted.length) * 100).toFixed(2)) : 0,
      slow_count: data.slow,
    });
  }

  // Sort by count desc, take top N
  endpoints.sort((a, b) => b.count - a.count);
  const topEndpoints = endpoints.slice(0, top);

  // Global stats
  const globalSorted = allDurations.sort((a, b) => a - b);
  const globalAvg = globalSorted.length > 0
    ? globalSorted.reduce((a, b) => a + b, 0) / globalSorted.length
    : 0;
  const globalP95 = globalSorted.length > 0
    ? globalSorted[Math.floor(globalSorted.length * 0.95)] ?? 0
    : 0;

  return {
    total_requests: allDurations.length,
    total_errors: totalErrors,
    avg_ms: Math.round(globalAvg),
    p95_ms: globalP95,
    slow_requests: totalSlow,
    endpoints: topEndpoints,
  };
}
