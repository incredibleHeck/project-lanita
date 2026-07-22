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

Use the wrapper script (loads `.env`, runs backup, optional off-site upload, retention cleanup):

```bash
chmod +x scripts/backup-db.sh scripts/cron-backup.sh scripts/restore-db.sh
crontab -e
```

Add (daily 2 AM):

```
0 2 * * * cd /var/www/project-lanita && ./scripts/cron-backup.sh >> /var/log/lanita-backup.log 2>&1
```

Optional off-site: set `BACKUP_S3_URI=s3://your-bucket/lanita-backups/` in `.env` (requires `aws` CLI or `rclone`).

### Retention

`cron-backup.sh` deletes local dumps older than `BACKUP_RETENTION_DAYS` (default 7).

---

## Restore Drill (required before pilot)

Run once on staging or a throwaway DB to prove backups work:

1. Take a fresh backup: `./scripts/backup-db.sh`
2. Create a test DB and restore into it (see [Testing a Restore](#testing-a-restore))
3. Confirm critical tables have rows, e.g.:

   ```bash
   docker exec -i lanita-db psql -U postgres -d lanita_test -c "SELECT count(*) FROM \"User\";"
   docker exec -i lanita-db psql -U postgres -d lanita_test -c "SELECT count(*) FROM \"StudentInvoice\";"
   ```

4. Drop `lanita_test` and record the drill date in your ops log.

Do **not** restore over production without stopping app containers first.

---

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
   docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" lanita-db psql -U postgres -d lanita_test < backups/lanita_YYYY-MM-DD_HHMMSS.sql
   ```

3. Verify data, then drop the test database:

   ```bash
   docker exec -i lanita-db psql -U postgres -c "DROP DATABASE lanita_test;"
   ```
