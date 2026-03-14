---
name: Should Fix Soon
overview: "Address the three \"should fix soon\" items: WEB_PORT documentation visibility, backup cron path consistency, and migration timing in the deploy workflow."
todos:
  - id: web-port-docs
    content: Add prominent WEB_PORT=4000 callout to VPS-SETUP.md
    status: completed
  - id: backup-cron-path
    content: Update BACKUP-AND-RESTORE.md cron examples to use project-lanita path
    status: completed
  - id: migration-timing
    content: Document or refactor migration step in deploy.yml (Option A or B)
    status: completed
isProject: false
---

# Should Fix Soon

This plan addresses the three items identified as "should fix soon" in the beta readiness audit.

---

## 1. WEB_PORT Documentation (INFRA-2)

**Problem:** Nginx (`[infra/nginx/lanita.conf](infra/nginx/lanita.conf)`) proxies the frontend from `127.0.0.1:4000`, but docker-compose maps the client with `WEB_PORT:-3000` (default 3000). If `WEB_PORT=4000` is not set on the VPS, the frontend will be unreachable via Nginx.

**Current state:** `[infra/nginx/VPS-SETUP.md](infra/nginx/VPS-SETUP.md)` already documents `WEB_PORT=4000` in the "Production .env Configuration" table (lines 159-171), but it is easy to miss during setup.

**Solution:** Add a prominent callout earlier in the document so deployers see it before configuring Docker.

**Changes to [infra/nginx/VPS-SETUP.md](infra/nginx/VPS-SETUP.md):**

- Add a "Before Deploying with Docker" subsection (or expand "Production .env Configuration") with a clear warning:
  - **Critical:** Set `WEB_PORT=4000` in your `.env`. The Nginx config proxies to port 4000; the client container must expose `4000:3001`. Without this, the frontend will not be reachable.
- Optionally add a one-line reminder in "Step 11: Verify Everything Works" or in the Troubleshooting section.

---

## 2. Backup Cron Path (BACKUP-AND-RESTORE)

**Problem:** `[docs/BACKUP-AND-RESTORE.md](docs/BACKUP-AND-RESTORE.md)` uses `/var/www/heckteck-sms` in the cron examples (lines 53 and 62). This path should match the actual VPS project directory used by the deploy workflow.

**Solution:** Update the cron examples to use a consistent path. Align with the deploy path (e.g. `project-lanita` if that is standardized in the must-fix plan).

**Changes to [docs/BACKUP-AND-RESTORE.md](docs/BACKUP-AND-RESTORE.md):**

- Replace `/var/www/heckteck-sms` with `/var/www/project-lanita` (or `$VPS_PROJECT_PATH` if using a variable) in both cron entries:
  - Line 53: `0 2 * * * cd /var/www/project-lanita && POSTGRES_PASSWORD="..." ./scripts/backup-db.sh`
  - Line 62: `0 3 * * * find /var/www/project-lanita/backups -name "lanita_*.sql" -mtime +7 -delete`
- Add a note: "Replace `/var/www/project-lanita` with your actual project directory if different."

---

## 3. Migration Timing in Deploy (INFRA-3)

**Problem:** The deploy workflow runs `docker-compose up -d --build` before `docker exec lanita-server npx prisma migrate deploy`. The server container's CMD already runs `prisma migrate deploy` on startup, so migrations run when the container starts. The `docker exec` step is redundant. The audit concern was potential schema mismatch if the app starts before migrations complete.

**Current flow:**

1. `docker-compose up` starts containers
2. Server container runs `prisma migrate deploy && node dist/main.js` (from Dockerfile CMD)
3. Deploy workflow runs `docker exec ... prisma migrate deploy` again (no-op)

**Solution:** Document the current behavior and optionally run migrations before starting app containers for clearer separation of concerns.

**Option A (Document only):** Add a comment in `[.github/workflows/deploy.yml](.github/workflows/deploy.yml)` explaining that migrations run as part of the server container startup, and the `docker exec` is a safety re-run. No structural change.

**Option B (Run migrations first):** Run migrations in a one-off container before `docker-compose up`, so the database is migrated before any app containers start. This avoids any theoretical race and makes migration failures visible before new containers serve traffic.

**Recommended: Option B** — Add a migration step before `docker-compose up`:

```yaml
# Run migrations before starting new containers
docker-compose -f docker-compose.yml run --rm -e DATABASE_URL=... server npx prisma migrate deploy
```

This requires `DATABASE_URL` to be available (from `.env` on the VPS). The `run --rm` creates a temporary container that exits after migrations. Then `docker-compose up` starts the normal containers.

**Alternative (simpler):** Keep the current order but move the `docker exec` migration step to run *before* `docker-compose up`, using a one-off container. This requires the db container to be running first: `docker-compose up -d db`, wait for healthy, then run migrations, then `docker-compose up -d` for the rest.

**Minimal change:** If the current flow works reliably (server waits for db via `depends_on`), document it and leave as-is. The plan should present Option A (document) as the low-effort path and Option B as the more robust path.

---

## Summary


| Item             | File(s)                        | Effort                                   |
| ---------------- | ------------------------------ | ---------------------------------------- |
| WEB_PORT docs    | `infra/nginx/VPS-SETUP.md`     | 5 min                                    |
| Backup cron path | `docs/BACKUP-AND-RESTORE.md`   | 5 min                                    |
| Migration timing | `.github/workflows/deploy.yml` | 10–15 min (Option B) or 2 min (Option A) |


