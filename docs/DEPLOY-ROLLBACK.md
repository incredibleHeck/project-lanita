# Deploy Rollback

How to recover from a bad production deploy on the VPS.

## Prerequisites

- SSH access to the VPS
- Project path (default `/var/www/project-lanita`)
- Images are tagged with `IMAGE_TAG` (Git SHA) during deploy; previous tags remain until pruned

## Quick rollback (previous git revision)

```bash
cd /var/www/project-lanita
git fetch origin
git log --oneline -5          # pick the last known-good commit
git checkout <good-sha>
export IMAGE_TAG=<good-sha>
docker compose -f docker-compose.yml up -d --build
# or if images were already tagged:
# docker tag lanita-server:<good-sha> lanita-server:latest
# docker tag lanita-client:<good-sha> lanita-client:latest
# docker compose up -d
```

Then return to `main` only after a fix is merged:

```bash
git checkout main
git pull origin main
```

## Rollback using tagged images

Deploy tags images as `lanita-server:<sha>` and `lanita-client:<sha>`.

```bash
cd /var/www/project-lanita
export IMAGE_TAG=<previous-good-sha>
docker compose -f docker-compose.yml up -d
curl -sf http://127.0.0.1:4001/health || curl -sf https://lanita.com/api/health
```

## Database migrations

Prisma migrations are forward-only. If a bad release included a migration:

1. Prefer fixing forward with a new migration.
2. Only restore from backup if data is corrupted (see [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md)) — stop app containers first.

## Smoke checks after rollback

- `GET /health` returns OK
- Admin can sign in
- Parent billing page loads
- Sentry (if configured) shows no spike of 5xx
