#!/bin/bash
# Restore PostgreSQL database from a backup file
# Usage: ./scripts/restore-db.sh [--force] backups/lanita_YYYY-MM-DD_HHMMSS.sql
# WARNING: This will overwrite existing data. Stop the application during restore.
# Requires: Docker (db container) OR psql + DATABASE_URL

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 [--force] <backup-file.sql>"
  echo "Example: $0 backups/lanita_2025-03-10_120000.sql"
  exit 1
fi

FORCE=false
BACKUP_FILE=""

for arg in "$@"; do
  if [ "$arg" = "--force" ] || [ "$arg" = "-f" ]; then
    FORCE=true
  else
    BACKUP_FILE="$arg"
  fi
done

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ "$FORCE" != "true" ]; then
  echo "WARNING: This will overwrite the database with the backup."
  echo "Stop the application (server, client) before restoring."
  echo "Backup file: $BACKUP_FILE"
  read -p "Type 'yes' to continue: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
  fi
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^lanita-db$'; then
  echo "Restoring via Docker (lanita-db container)..."
  docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" lanita-db \
    psql -U postgres -d lanita < "$BACKUP_FILE"
elif [ -n "$DATABASE_URL" ] && command -v psql >/dev/null 2>&1; then
  echo "Restoring via psql (DATABASE_URL)..."
  psql "$DATABASE_URL" < "$BACKUP_FILE"
else
  echo "Error: Neither Docker container 'lanita-db' nor psql with DATABASE_URL is available."
  echo "  - For Docker: ensure 'docker-compose up -d db' and lanita-db is running."
  echo "  - For direct: set DATABASE_URL and install PostgreSQL client (psql)."
  exit 1
fi

echo "Restore complete from: $BACKUP_FILE"
