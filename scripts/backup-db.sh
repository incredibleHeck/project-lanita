#!/bin/bash
# Backup PostgreSQL database for Lanita SMS
# Usage: ./scripts/backup-db.sh
# Requires: Docker (db container) OR pg_dump + DATABASE_URL
# Env: BACKUP_DIR (default: ./backups), POSTGRES_PASSWORD (for Docker mode)

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/lanita_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^lanita-db$'; then
  echo "Backing up via Docker (lanita-db container)..."
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" lanita-db \
    pg_dump -U postgres --clean --if-exists lanita > "$BACKUP_FILE"
elif [ -n "$DATABASE_URL" ] && command -v pg_dump >/dev/null 2>&1; then
  echo "Backing up via pg_dump (DATABASE_URL)..."
  pg_dump --clean --if-exists "$DATABASE_URL" > "$BACKUP_FILE"
else
  echo "Error: Neither Docker container 'lanita-db' nor pg_dump with DATABASE_URL is available."
  echo "  - For Docker: ensure 'docker-compose up -d db' and lanita-db is running."
  echo "  - For direct: set DATABASE_URL and install PostgreSQL client (pg_dump)."
  exit 1
fi

echo "Backup saved to: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
