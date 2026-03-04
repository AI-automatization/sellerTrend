const SENTRY_DSN = process.env.SENTRY_DSN;

let SentryLib: Record<string, unknown> | null = null;

export async function initSentry() {
  if (!SENTRY_DSN) return;
  try {
    // Dynamic import — only loads when @sentry/node is installed
    const mod = await import('@sentry/node');
    SentryLib = mod as unknown as Record<string, unknown>;
    if (typeof mod.init === 'function') {
      mod.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.2,
      });
    }
  } catch {
    // @sentry/node not installed — skip silently
  }
}

export function captureException(err: unknown) {
  if (SentryLib && typeof (SentryLib as Record<string, unknown>)['captureException'] === 'function') {
    (SentryLib as { captureException: (e: unknown) => void }).captureException(err);
  }
}
