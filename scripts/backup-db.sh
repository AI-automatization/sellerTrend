#!/usr/bin/env bash
# ============================================================
# VENTRA — PostgreSQL Backup Script
# Usage: ./scripts/backup-db.sh [daily|weekly|manual]
# Env:   DATABASE_URL or POSTGRES_* vars, S3_BUCKET (optional)
# ============================================================
set -euo pipefail

BACKUP_TYPE="${1:-daily}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/ventra-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

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

FILENAME="ventra_${BACKUP_TYPE}_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting ${BACKUP_TYPE} backup → ${FILENAME}"

# pg_dump with compression
pg_dump \
  --no-owner \
  --no-privileges \
  --format=plain \
  --verbose \
  2>/dev/null \
  | gzip > "$FILEPATH"

FILESIZE=$(du -h "$FILEPATH" | cut -f1)
echo "[$(date)] Backup complete: ${FILEPATH} (${FILESIZE})"

# Upload to S3/R2 if configured
if [ -n "${S3_BUCKET:-}" ]; then
  S3_PATH="s3://${S3_BUCKET}/backups/${BACKUP_TYPE}/${FILENAME}"
  echo "[$(date)] Uploading to ${S3_PATH}..."

  if command -v aws &> /dev/null; then
    aws s3 cp "$FILEPATH" "$S3_PATH" ${S3_ENDPOINT:+--endpoint-url "$S3_ENDPOINT"}
  elif command -v rclone &> /dev/null; then
    rclone copy "$FILEPATH" "s3:${S3_BUCKET}/backups/${BACKUP_TYPE}/"
  else
    echo "[WARN] Neither aws-cli nor rclone found — skipping S3 upload"
  fi

  echo "[$(date)] Upload complete"
fi

# Cleanup old local backups
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "ventra_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "[$(date)] Backup ${BACKUP_TYPE} finished successfully"
