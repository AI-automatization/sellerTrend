#!/usr/bin/env bash
# ============================================================
# VENTRA — PostgreSQL Restore Script
# Usage: ./scripts/restore-db.sh <backup-file.sql.gz>
# ============================================================
set -euo pipefail

BACKUP_FILE="${1:?Usage: restore-db.sh <backup-file.sql.gz>}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

# Parse DATABASE_URL or use individual vars
if [ -n "${DATABASE_URL:-}" ]; then
  export PGHOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
  export PGPORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  export PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  export PGUSER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
  export PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
else
  export PGHOST="${POSTGRES_HOST:-localhost}"
  export PGPORT="${POSTGRES_PORT:-5432}"
  export PGDATABASE="${POSTGRES_DB:-ventra}"
  export PGUSER="${POSTGRES_USER:-postgres}"
  export PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
fi

echo "=== VENTRA DATABASE RESTORE ==="
echo "File:     $BACKUP_FILE"
echo "Database: $PGDATABASE@$PGHOST:$PGPORT"
echo ""
echo "WARNING: This will DROP and recreate all tables!"
read -p "Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date)] Restoring from ${BACKUP_FILE}..."

gunzip -c "$BACKUP_FILE" | psql --single-transaction --set ON_ERROR_STOP=on

echo "[$(date)] Restore complete"
