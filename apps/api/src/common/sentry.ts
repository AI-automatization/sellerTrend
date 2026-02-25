const SENTRY_DSN = process.env.SENTRY_DSN;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryLib: Record<string, any> | null = null;

export async function initSentry() {
  if (!SENTRY_DSN) return;
  try {
    // Dynamic import — only works when @sentry/node is installed
    SentryLib = await (Function('return import("@sentry/node")')() as Promise<Record<string, any>>);
    SentryLib.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2,
    });
  } catch {
    // @sentry/node not installed — skip silently
  }
}

export function captureException(err: unknown) {
  if (SentryLib) SentryLib.captureException(err);
}
