# Pilot Go-Live Checklist

One-school production pilot for Lanita SMS. Complete Phases 0–2 of the production readiness roadmap before checking these boxes.

## Pre-flight (ops)

- [ ] `.env` on VPS created from `.env.production.example` with strong `POSTGRES_PASSWORD`, `JWT_*`, `CORS_ORIGIN`, `WEB_PORT=4000`
- [ ] `ENABLE_SWAGGER=false` (or unset) in production
- [ ] `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` set (live keys only after a successful test-key dry run)
- [ ] Paystack webhook URL pointed at `https://<domain>/api/billing/paystack/webhook` (or your Nginx `/api` prefix)
- [ ] WhatsApp Cloud API vars set; Meta webhook verify URL `https://<domain>/api/webhooks/whatsapp`
- [ ] Meta message templates approved for the pilot school (`attendance_alert`, `fee_reminder`, `fee_overdue`, `report_ready`, `announcement`)
- [ ] Nightly backup cron installed (`scripts/cron-backup.sh`); restore drill completed once ([BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md))
- [ ] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` configured (optional but recommended)
- [ ] Deploy smoke: `GET /health` OK after release ([DEPLOY-ROLLBACK.md](DEPLOY-ROLLBACK.md) reviewed by on-call)

## School provisioning

- [ ] Create / verify the pilot `School` row (tenant code matches `NEXT_PUBLIC_TENANT_ID`)
- [ ] Admin user created by seed or invite — **no** public privileged signup
- [ ] Teachers, students, parents provisioned by admin (temp passwords + first-login change)
- [ ] Fee structures and at least one term invoice generated for a test parent

## Functional smoke (pilot school)

- [ ] Admin login → dashboard loads
- [ ] Teacher marks attendance → parent WhatsApp (or demo log) fires when configured
- [ ] Parent pays an invoice via Paystack → webhook credits invoice → balance updates
- [ ] Stuck PENDING reconciliation endpoint/cron healthy (`POST /billing/paystack/reconcile`)
- [ ] Logout clears session cookies

## On-call

- [ ] Who watches Sentry / uptime for the pilot week: _______________
- [ ] Rollback owner: _______________
- [ ] Support channel for the school: _______________

## Explicitly out of scope for pilot

- Second school / multi-tenant onboarding (complete Phase 3 first)
- Direct Hubtel MoMo UI (use Paystack channels)
- Teacher Stream / file attach polish
- Full GDPR self-service APIs (manual runbook is enough for pilot)
