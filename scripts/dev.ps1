# Start Docker with hot reload (volume mounts + file watching)
# Usage: .\scripts\dev.ps1
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
