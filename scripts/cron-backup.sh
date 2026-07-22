#!/bin/bash
# Nightly backup with optional off-site copy.
# Usage: ./scripts/cron-backup.sh
# Env: POSTGRES_PASSWORD, BACKUP_DIR, BACKUP_S3_URI (optional, e.g. s3://bucket/lanita-backups/)
#      BACKUP_RETENTION_DAYS (default 7)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Load .env if present (VPS cron does not inherit interactive shell env)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

echo "[$(date -Iseconds)] Starting Lanita DB backup..."
./scripts/backup-db.sh

LATEST=$(ls -1t "$BACKUP_DIR"/lanita_*.sql 2>/dev/null | head -n1 || true)
if [ -z "$LATEST" ]; then
  echo "Error: no backup file found in $BACKUP_DIR"
  exit 1
fi

if [ -n "${BACKUP_S3_URI:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    echo "Uploading $LATEST to $BACKUP_S3_URI"
    aws s3 cp "$LATEST" "$BACKUP_S3_URI"
  elif command -v rclone >/dev/null 2>&1; then
    echo "Uploading $LATEST via rclone to $BACKUP_S3_URI"
    rclone copy "$LATEST" "$BACKUP_S3_URI"
  else
    echo "Warning: BACKUP_S3_URI set but neither aws nor rclone is installed"
  fi
fi

find "$BACKUP_DIR" -name "lanita_*.sql" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
echo "[$(date -Iseconds)] Backup complete: $LATEST"
