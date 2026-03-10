---
name: Deployment Blockers Fix
overview: Fix deployment configuration (server port, frontend port, API URL, health endpoint) and correct documentation inconsistencies (docker-compose references, JWT secret names, production env setup).
todos: []
isProject: false
---

# Fix Deployment Blockers and Documentation

## 1. Add Health Endpoint

**Problem:** VPS-SETUP.md references `https://lanita.com/api/health` but no such endpoint exists. Docker health checks and monitoring rely on this.

**Solution:** Add a `/health` endpoint to the NestJS backend with optional database connectivity check.

**Files to modify:**

- [server/src/app.service.ts](server/src/app.service.ts) - Add `getHealth()` method
- [server/src/app.controller.ts](server/src/app.controller.ts) - Add `@Get('health')` route

**Implementation:**

- Inject `PrismaService` into `AppService` for DB check
- Return `{ status: 'ok', database: 'connected' }` on success
- On DB failure, return 503 with `{ status: 'error', database: 'disconnected' }`
- Keep the endpoint unauthenticated (no guards) for load balancers and Docker

```mermaid
flowchart LR
    Request["GET /health"] --> AppController
    AppController --> AppService
    AppService --> PrismaService["PrismaService.$queryRaw"]
    PrismaService --> Response["200 or 503"]
```



---

## 2. Fix Server Port in Docker

**Problem:** Server listens on port 3001 (default from `main.ts`) but `docker-compose.yml` maps host 4001 to container port 3000. Traffic never reaches the app.

**Solution:** Add `PORT=3000` to the server service environment in [docker-compose.yml](docker-compose.yml).

```yaml
# In server service environment block, add:
PORT: 3000
```

---

## 3. Fix Production Port and API URL Configuration

**Problem:** 

- Nginx expects frontend at port 4000, but docker-compose defaults `WEB_PORT` to 3000
- Client must call `https://lanita.com/api` (with `/api` prefix) when behind Nginx, not `https://lanita.com`

**Solution:** 

- Create [.env.production.example](.env.production.example) with production values
- Update [.env.example](.env.example) production section with correct variable names and values

**Production .env values:**


| Variable    | Value                                                                                  | Reason                                         |
| ----------- | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| WEB_PORT    | 4000                                                                                   | Nginx proxies to 127.0.0.1:4000 for frontend   |
| API_URL     | [https://lanita.com/api](https://lanita.com/api)                                       | Client must use full path including /api       |
| PORT        | 3000                                                                                   | Server listens on 3000 (set in docker-compose) |
| CORS_ORIGIN | [https://lanita.com,https://www.lanita.com](https://lanita.com,https://www.lanita.com) | Allow production domain                        |


---

## 4. Add Server Health Check to Docker

**Problem:** `db` and `ml-service` have health checks; `server` does not. This prevents proper startup ordering and orchestration.

**Solution:** Add healthcheck to server service in [docker-compose.yml](docker-compose.yml) after the health endpoint exists:

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

Note: Node Alpine image may not have `curl`; `wget` is typically available. Alternative: use `node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"` if wget is absent.

---

## 5. Documentation Fixes

### 5a. VPS-SETUP.md

**File:** [infra/nginx/VPS-SETUP.md](infra/nginx/VPS-SETUP.md)

**Changes:**

1. **Step 11** - Remove conditional "(if you have a health endpoint)" since we are adding it
2. **Add new section** before "Troubleshooting": "Production .env Configuration" - Document required variables for VPS deployment:
  - `WEB_PORT=4000` (must match Nginx frontend proxy)
  - `API_URL=https://lanita.com/api`
  - `PORT=3000` (handled in docker-compose; document for clarity)
  - `CORS_ORIGIN=https://lanita.com,https://www.lanita.com`
  - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (required, no defaults in prod)
  - Reference `.env.production.example` as template
3. **Troubleshooting** - Update "Test Backend Directly" to confirm `/health` returns 200

### 5b. deploy.yml (GitHub Actions)

**File:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

**Changes:** Fix OPTIONAL SECRETS comment (lines 17-19):

- `JWT_SECRET` -> `JWT_ACCESS_SECRET` (actual env var name)
- Add note: "Set these in VPS .env; deploy workflow does not inject them"

### 5c. SETUP.md

**File:** [SETUP.md](SETUP.md)

**Changes:** Fix Docker section (lines 361-368):

- Replace `docker-compose.prod.yml` with `docker-compose.yml` (file does not exist)
- Replace `JWT_SECRET` with `JWT_ACCESS_SECRET` in echo example

### 5d. .env.example

**File:** [.env.example](.env.example)

**Changes:** Fix production example block (lines 28-36):

- `JWT_SECRET` -> `JWT_ACCESS_SECRET`
- `API_URL` -> `https://lanita.com/api` (not `:3000`)
- `WEB_PORT` -> `4000` (not 80; Nginx uses 4000)
- Add `PORT=3000` for server (or note it is set in docker-compose)

---

## 6. Optional: .env.docker.example for Production

**File:** [.env.docker.example](.env.docker.example)

**Change:** Add a comment block at the bottom for production override values (WEB_PORT=4000, API_URL with domain, etc.) so deployers know what to change when moving from local Docker to VPS.

---

## File Change Summary


| File                         | Action                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| server/src/app.service.ts    | Add getHealth(), inject PrismaService                                      |
| server/src/app.controller.ts | Add @Get('health') route                                                   |
| server/src/app.module.ts     | Ensure PrismaModule provides PrismaService to AppService                   |
| docker-compose.yml           | Add PORT=3000 to server; add server healthcheck                            |
| .env.example                 | Fix production block (JWT_ACCESS_SECRET, API_URL, WEB_PORT)                |
| .env.production.example      | Create new file with production template                                   |
| infra/nginx/VPS-SETUP.md     | Add production .env section; fix health endpoint reference                 |
| .github/workflows/deploy.yml | Fix JWT secret names in comments                                           |
| SETUP.md                     | Replace docker-compose.prod.yml with docker-compose.yml; fix JWT var names |
| .env.docker.example          | Add production override comment block                                      |


---

## Verification Steps (Post-Implementation)

1. Run `docker compose up --build` locally; verify server responds at `http://localhost:4001/health`
2. Verify client at `http://localhost:3000` can reach API (local dev uses port 3000 for client)
3. For production simulation: set WEB_PORT=4000, API_URL=[https://your-domain/api](https://your-domain/api) in .env and rebuild client
4. Confirm VPS-SETUP.md instructions produce a working deployment

