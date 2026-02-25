import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkerLogEntry {
  timestamp: string;
  queue: string;
  job_id: string;
  job_name: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  duration_ms?: number;
  data?: Record<string, any>;
  error?: string;
  stack?: string;
}

// ─── Rotating File Writer ────────────────────────────────────────────────────

let stream: fs.WriteStream | null = null;
let currentDate = '';

function getLogDir() {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function ensureStream() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== currentDate) {
    if (stream) stream.end();
    currentDate = today;
    const filePath = path.join(getLogDir(), `worker-${today}.log`);
    stream = fs.createWriteStream(filePath, { flags: 'a' });
  }
  return stream!;
}

function writeEntry(entry: WorkerLogEntry) {
  const s = ensureStream();
  s.write(JSON.stringify(entry) + '\n');

  // Console mirror
  const prefix = `[${entry.queue}] ${entry.job_name}#${entry.job_id}`;
  if (entry.level === 'error') {
    console.error(`${prefix} ERROR: ${entry.message}`, entry.error ?? '');
  } else {
    console.log(`${prefix} ${entry.message}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function logJobStart(queue: string, jobId: string, jobName: string, data?: Record<string, any>) {
  writeEntry({
    timestamp: new Date().toISOString(),
    queue,
    job_id: jobId,
    job_name: jobName,
    level: 'info',
    message: 'Job started',
    data,
  });
}

export function logJobDone(queue: string, jobId: string, jobName: string, durationMs: number, data?: Record<string, any>) {
  writeEntry({
    timestamp: new Date().toISOString(),
    queue,
    job_id: jobId,
    job_name: jobName,
    level: 'info',
    message: `Job completed in ${durationMs}ms`,
    duration_ms: durationMs,
    data,
  });
}

export function logJobError(queue: string, jobId: string, jobName: string, err: unknown, durationMs?: number) {
  const error = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  writeEntry({
    timestamp: new Date().toISOString(),
    queue,
    job_id: jobId,
    job_name: jobName,
    level: 'error',
    message: 'Job failed',
    duration_ms: durationMs,
    error,
    stack,
  });
}

export function logJobInfo(queue: string, jobId: string, jobName: string, message: string, data?: Record<string, any>) {
  writeEntry({
    timestamp: new Date().toISOString(),
    queue,
    job_id: jobId,
    job_name: jobName,
    level: 'info',
    message,
    data,
  });
}
