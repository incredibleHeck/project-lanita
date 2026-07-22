# Run Lanita Locally with Docker

## Quick Start

1. **Create `.env`** (required — JWT and DB password have no compose defaults):
   ```bash
   cp .env.docker.example .env
   ```

2. **Start all services**:
   ```bash
   docker compose up --build
   ```

3. **Open the app**:
   - **App:** http://localhost:3000
   - **API:** http://localhost:4001
   - **Swagger (dev only):** http://localhost:4001/api/docs — set `ENABLE_SWAGGER=true` if needed; off by default in production

4. **Seed demo data** (not run automatically in production images):
   ```bash
   docker compose exec server npx prisma db seed
   ```
   Then login:
   - **Email:** `admin@heckteck.com`
   - **Password:** `Admin@123`

## What Runs

| Service    | Port | Description                    |
|------------|------|--------------------------------|
| client     | 3000 | Next.js frontend               |
| server     | 4001 | NestJS API                     |
| db         | 5433 | PostgreSQL                     |
| redis      | 6379 | Redis (Bull queues)            |
| ml-service | 5000 | Python ML (at-risk analytics)  |

## First Run

On first run, the server will:

1. Run Prisma migrations (`migrate deploy`)
2. Start the API

Seed is **manual** (see above). Migrations can take 1–2 minutes. Check logs with:

```bash
docker compose logs -f server
```

## Troubleshooting

- **"JWT_ACCESS_SECRET must be set" / compose variable missing** – Copy `.env.docker.example` to `.env` and set secrets before `docker compose up`.
- **"Tenant not specified"** – The client sends `X-Tenant-ID: DEFAULT`. If you see this, the header may not be reaching the server.
- **"Invalid credentials"** – Run the seed command above, then retry login.
- **Connection refused** – Wait for the server to finish migrations before logging in.
