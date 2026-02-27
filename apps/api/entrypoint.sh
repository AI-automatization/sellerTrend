#!/bin/sh
set -e

# Use direct connection for migration if available (PgBouncer can't handle DDL)
if [ -n "$DIRECT_DATABASE_URL" ]; then
  echo "[entrypoint] Running migration via DIRECT_DATABASE_URL..."
  DATABASE_URL="$DIRECT_DATABASE_URL" pnpm exec prisma db push --skip-generate --accept-data-loss
else
  echo "[entrypoint] Running migration via DATABASE_URL..."
  pnpm exec prisma db push --skip-generate --accept-data-loss
fi

echo "[entrypoint] Starting API server..."
exec node dist/main
