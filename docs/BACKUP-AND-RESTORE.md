# Database Backup and Restore

This document describes the backup strategy and restore procedure for the Lanita SMS PostgreSQL database.

## Manual Backup

Run the backup script from the project root:

```bash
./scripts/backup-db.sh
```

Backups are saved to `backups/lanita_YYYY-MM-DD_HHMMSS.sql` (or the directory specified by `BACKUP_DIR`).

### Requirements

- **Docker mode:** The `lanita-db` container must be running (`docker-compose up -d db`). Uses `POSTGRES_PASSWORD` from your environment (default: `postgres`).
- **Direct mode:** Set `DATABASE_URL` and ensure `pg_dump` is installed (PostgreSQL client tools).

## Restore Procedure

1. **Stop the application** (server and client) to avoid writes during restore.

2. Run the restore script:

   ```bash
   ./scripts/restore-db.sh backups/lanita_2025-03-10_120000.sql
   ```

3. The script will prompt for confirmation unless you pass `--force`:

   ```bash
   ./scripts/restore-db.sh --force backups/lanita_2025-03-10_120000.sql
   ```

4. Restart the application.

### Requirements

- **Docker mode:** The `lanita-db` container must be running.
- **Direct mode:** Set `DATABASE_URL` and ensure `psql` is installed.

## Cron Setup (VPS / Production)

To run daily backups at 2 AM, add a crontab entry:

```bash
crontab -e
```

Add:

```
0 2 * * * cd /var/www/heckteck-sms && POSTGRES_PASSWORD="your-password" ./scripts/backup-db.sh
```

Replace `your-password` with your actual `POSTGRES_PASSWORD` (or source your `.env` before running).

### Retention

Keep the last 7 daily backups. Add a cleanup cron job:

```
0 3 * * * find /var/www/heckteck-sms/backups -name "lanita_*.sql" -mtime +7 -delete
```

This runs at 3 AM and deletes backups older than 7 days.

## Object Storage (Production)

For production, copy backups to off-site storage (S3, GCS, etc.) so they survive server failure.

### AWS S3

```bash
# After backup, copy to S3
aws s3 cp backups/lanita_$(date +%Y-%m-%d).sql s3://your-bucket/lanita-backups/
```

### rclone (generic)

```bash
rclone copy backups/ remote:lanita-backups/
```

## Testing a Restore

To verify a backup without affecting the live database:

1. Create a temporary database:

   ```bash
   docker exec -i lanita-db psql -U postgres -c "CREATE DATABASE lanita_test;"
   ```

2. Restore into it:

   ```bash
   docker exec -i -e PGPASSWORD=postgres lanita-db psql -U postgres -d lanita_test < backups/lanita_YYYY-MM-DD_HHMMSS.sql
   ```

3. Verify data, then drop the test database:

   ```bash
   docker exec -i lanita-db psql -U postgres -c "DROP DATABASE lanita_test;"
   ```
