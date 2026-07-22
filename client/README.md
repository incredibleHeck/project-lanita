# Lanita Client

Next.js frontend for Lanita SMS (admin, teacher, student, and parent portals).

## Scripts

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
npm test         # Vitest smoke tests
```

## Env

See repo root `.env.example` / `.env.docker.example`. Important public vars:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_TENANT_ID`
- `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
- `NEXT_PUBLIC_SENTRY_DSN` (optional)

Product overview: [../README.md](../README.md)
