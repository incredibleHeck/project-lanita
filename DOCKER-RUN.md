# Run Lanita Locally with Docker

## Quick Start

1. **Create `.env`** (optional – defaults work for local dev):
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

4. **Login** with seeded demo credentials:
   - **Email:** `admin@heckteck.com`
   - **Password:** `Admin@123`

## What Runs

| Service   | Port | Description                    |
|----------|------|--------------------------------|
| client   | 3000 | Next.js frontend               |
| server   | 4001 | NestJS API                     |
| db       | 5433 | PostgreSQL                     |
| redis    | 6379 | Redis (Bull queues)            |
| ml-service | 5000 | Python ML (at-risk analytics) |

## First Run

On first run, the server will:

1. Run Prisma migrations
2. Seed the database (DEFAULT school + admin user)
3. Start the API

This can take 1–2 minutes. Check logs with:

```bash
docker compose logs -f server
```

## Troubleshooting

- **"Tenant not specified"** – The client sends `X-Tenant-ID: DEFAULT`. If you see this, the header may not be reaching the server.
- **"Invalid credentials"** – Ensure the seed ran. Run `docker compose logs server` and look for "Seeding started...".
- **Connection refused** – Wait for the server to finish migrations and seeding before logging in.
