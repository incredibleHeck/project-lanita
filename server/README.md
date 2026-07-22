# Lanita API Server

NestJS backend for Lanita SMS.

## Scripts

```bash
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
npx prisma migrate deploy
npx prisma db seed
```

## Env

Requires `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL`. See repo `.env.production.example` for production.

Product overview: [../README.md](../README.md)
