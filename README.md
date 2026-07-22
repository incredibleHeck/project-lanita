# Lanita SMS (HeckTeck School Management System)

Multi-tenant school management platform for Ghana-focused schools: students, teachers, parents, attendance, exams, LMS, timetable, analytics, billing (Paystack), and WhatsApp notifications.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TanStack Query, PWA |
| Backend | NestJS 11, Prisma 7, PostgreSQL 16, Redis/Bull |
| ML | Python Flask (at-risk analytics, timetable assist) |

## Quick start (Docker)

See [DOCKER-RUN.md](DOCKER-RUN.md) and [SETUP.md](SETUP.md).

```bash
cp .env.docker.example .env
docker compose up --build
docker compose exec server npx prisma db seed
```

- App: http://localhost:3000  
- API: http://localhost:4001  

## Production

- Env template: [.env.production.example](.env.production.example)
- Pilot checklist: [docs/PILOT-GO-LIVE.md](docs/PILOT-GO-LIVE.md)
- Backups: [docs/BACKUP-AND-RESTORE.md](docs/BACKUP-AND-RESTORE.md)
- Rollback: [docs/DEPLOY-ROLLBACK.md](docs/DEPLOY-ROLLBACK.md)
- Privacy ops: [docs/PRIVACY-AND-DATA-REQUESTS.md](docs/PRIVACY-AND-DATA-REQUESTS.md)
- Security notes: [docs/SECURITY.md](docs/SECURITY.md)
- Audit backlog: [docs/AUDIT-REMEDIATION-BACKLOG.md](docs/AUDIT-REMEDIATION-BACKLOG.md)

## Repo layout

```
client/     Next.js portals (admin, teacher, student, parent)
server/     NestJS API + Prisma
ml-service/ Python ML microservice
infra/      Nginx VPS setup
docs/       Ops and security docs
scripts/    Backup / restore / cron helpers
```

## License

UNLICENSED / proprietary unless otherwise agreed.
