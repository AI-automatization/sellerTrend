#!/bin/sh
set -e

DB_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

# Pre-migration: convert deprecated enum values so db push can alter enums
# Each DO block catches its own error independently (no cross-rollback)
cat > /tmp/pre_migration.sql << 'EOF'
DO $$ BEGIN
  UPDATE transactions SET type = 'SUBSCRIPTION'::text::"TransactionType"
  WHERE type::text IN ('CHARGE', 'DEPOSIT');
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE accounts SET status = 'ACTIVE'::text::"AccountStatus"
  WHERE status::text = 'PAYMENT_DUE';
EXCEPTION WHEN others THEN NULL;
END $$;
EOF

echo "[entrypoint] Running pre-migration data cleanup..."
prisma db execute --url "$DB_URL" --file /tmp/pre_migration.sql || true

# Use direct connection for migration if available (PgBouncer can't handle DDL)
if [ -n "$DIRECT_DATABASE_URL" ]; then
  echo "[entrypoint] Running migration via DIRECT_DATABASE_URL..."
  DATABASE_URL="$DIRECT_DATABASE_URL" prisma db push --skip-generate --accept-data-loss
else
  echo "[entrypoint] Running migration via DATABASE_URL..."
  prisma db push --skip-generate --accept-data-loss
fi

echo "[entrypoint] Starting API server..."

# V8 heap limit — configurable via Railway env, default 2GB for Pro plan
export NODE_OPTIONS="--max-old-space-size=${MAX_HEAP_MB:-2048}"
echo "[entrypoint] NODE_OPTIONS=$NODE_OPTIONS"

exec node dist/main
