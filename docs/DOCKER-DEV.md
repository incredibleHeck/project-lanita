# Docker Development with Hot Reload

Use this setup to run the full stack in Docker with **hot reload**—code changes are reflected without rebuilding.

## Quick Start

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- **Client**: http://localhost:3000 (Next.js dev server with fast refresh)
- **API**: http://localhost:4001

## How It Works

- **Volume mounts**: Source code (`./server`, `./client`) is mounted into the containers, so edits on your host are visible inside the container.
- **Dev servers**: The server runs `npm run start:dev` (NestJS watch); the client runs `npm run dev -- --webpack` (Next.js with webpack so file watching works in Docker).
- **Named volumes**: `server_node_modules` and `client_node_modules` persist dependencies so you don't reinstall on every restart.
- **File watching**: In Docker (especially on Windows), normal file events often don't reach the container. The dev override enables **polling** so changes are detected:
  - **Server**: `CHOKIDAR_USEPOLLING` + `CHOKIDAR_INTERVAL` (NestJS/webpack).
  - **Client**: `WATCHPACK_POLLING` + `next.config` `webpack.watchOptions.poll` (Next.js uses webpack in dev Docker so polling applies).

## If Hot Reload Still Doesn’t Work

1. **Full rebuild** after changing compose or Dockerfiles:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```
2. **Restart the stack** so env vars and commands are applied:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml down
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
   ```
3. **Windows**: Ensure the project is under a path that Docker Desktop can bind-mount (e.g. not a network drive). WSL2 backend is recommended.
4. **Client**: The client runs with `--webpack` in dev Docker so that `WATCHPACK_POLLING` and `watchOptions.poll` are used; Turbopack’s watcher doesn’t work reliably in containers.

## When to Rebuild

Rebuild when you change:

- `package.json` (new dependencies)
- `Dockerfile.dev`
- `docker-compose.dev.yml`

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Production vs Development

| Command | Use | Hot Reload |
|--------|-----|------------|
| `docker compose up` | Production | No |
| `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build` | Development | Yes (with polling) |
