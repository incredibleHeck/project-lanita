# Lanita SMS — Audit Remediation Backlog

This file catalogs every issue identified in the comprehensive audit of the Lanita School Management System. Each issue uses a consistent block so you can add a step-by-step fix plan (or link to one under `.cursor/plans/`) and track status as you remediate.

**How to use:** For each issue, add a link in the **Plan** field to a `.cursor/plans/xxx.md` file or inline steps, then update **Status** to `[ ] In progress` or `[x] Done` as you work.

---

## Table of contents

- [Critical](#critical)
  - [CRITICAL-1: JWT fallback secret](#critical-1-jwt-fallback-secret)
  - [CRITICAL-2: Billing groupBy tenant leak](#critical-2-billing-groupby-tenant-leak)
- [High](#high)
  - [HIGH-1: Attendance batch N+1 and per-record notifications](#high-1-attendance-batch-n1-and-per-record-notifications)
  - [HIGH-2: Notification processor missing schoolId](#high-2-notification-processor-missing-schoolid)
  - [HIGH-3: Default passwords in production](#high-3-default-passwords-in-production)
  - [HIGH-4: Paystack webhook idempotency](#high-4-paystack-webhook-idempotency)
  - [HIGH-5: Analytics unbounded load](#high-5-analytics-unbounded-load)
- [Medium](#medium)
  - [MEDIUM-1: No client lint/build in CI](#medium-1-no-client-lintbuild-in-ci)
  - [MEDIUM-2: No database backup strategy](#medium-2-no-database-backup-strategy)
  - [MEDIUM-3: Seed runs on every server start](#medium-3-seed-runs-on-every-server-start)
  - [MEDIUM-4: SETUP.md suggests weak secrets](#medium-4-setupmd-suggests-weak-secrets)
  - [MEDIUM-5: Auth endpoints need stricter rate limits](#medium-5-auth-endpoints-need-stricter-rate-limits)
  - [MEDIUM-6: Exception filter may log sensitive data](#medium-6-exception-filter-may-log-sensitive-data)
- [Low / Enhancement](#low--enhancement)
  - [LOW-1: Offline sync UX](#low-1-offline-sync-ux)
  - [LOW-2: Paystack callback / polling](#low-2-paystack-callback--polling)
  - [LOW-3: WhatsApp retry and tenant in job](#low-3-whatsapp-retry-and-tenant-in-job)
  - [LOW-4: Data privacy compliance](#low-4-data-privacy-compliance)
- [Infrastructure and DevOps](#infrastructure-and-devops)
  - [INFRA-1: Docker resource limits](#infra-1-docker-resource-limits)
  - [INFRA-2: Client port and WEB_PORT documentation](#infra-2-client-port-and-web_port-documentation)
  - [INFRA-3: Migration timing in deploy](#infra-3-migration-timing-in-deploy)
  - [INFRA-4: No rollback path](#infra-4-no-rollback-path)

---

## Critical

### CRITICAL-1: JWT fallback secret

- **Location:** [server/src/auth/strategies/accessToken.strategy.ts](server/src/auth/strategies/accessToken.strategy.ts) (line 11)
- **Problem:** `secretOrKey` uses `config.get<string>('JWT_ACCESS_SECRET') || 'fallback-secret'`. If `JWT_ACCESS_SECRET` is unset in production (e.g. misconfigured env), tokens are validated with a known default, effectively allowing full auth bypass.
- **Impact:** Critical security vulnerability; production auth can be compromised if env is wrong.
- **Suggested fix:**
  - Remove the fallback; require `JWT_ACCESS_SECRET` at startup.
  - Throw (or fail bootstrap) if the value is missing instead of defaulting.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/critical-1_jwt_fallback_secret_baf16a4d.plan.md](.cursor/plans/critical-1_jwt_fallback_secret_baf16a4d.plan.md)

---

### CRITICAL-2: Billing groupBy tenant leak

- **Location:** [server/src/billing/billing.service.ts](server/src/billing/billing.service.ts) — `getDashboardStats()`
- **Problem:** `findMany()` is tenant-scoped by the Prisma extension, but `this.prisma.studentInvoice.groupBy({ by: ['status'], _count: { status: true } })` has no `where`. The tenant extension does not override `groupBy`, so counts are global across all tenants.
- **Impact:** Wrong dashboard stats for admins; in multi-tenant, cross-tenant data leak in aggregate counts.
- **Suggested fix:**
  - Add explicit tenant filter: `where: { schoolId: getTenantSchoolId() }` to the `groupBy` call.
  - Consider avoiding loading all invoices into memory for totals; use aggregated queries or pagination if needed.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/critical-2_billing_groupby_tenant_leak_d2084d56.plan.md](.cursor/plans/critical-2_billing_groupby_tenant_leak_d2084d56.plan.md)

---

## High

### HIGH-1: Attendance batch N+1 and per-record notifications

- **Location:** [server/src/attendance/attendance.service.ts](server/src/attendance/attendance.service.ts) — `markRegister()`
- **Problem:** (1) `Promise.all(records.map(...))` does one `findUnique` plus one `upsert` per record (2N queries). (2) A subsequent loop does one `studentRecord.findUnique` and optional `sendAttendanceAlert` per absent/late record (another N queries and N notification calls).
- **Impact:** Performance degrades with large classes; unnecessary DB and notification load.
- **Suggested fix:**
  - Bulk-load existing attendance by (studentId, allocationId, date); then batch upsert (e.g. single transaction with bulk upserts or createMany/updateMany where applicable).
  - For alerts: load all students (and parents) for the allocation in one or two queries, then send notifications in a loop (or enqueue one job with batch payload) instead of one DB query per record.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/high-1_attendance_batch_n+1_ca332b89.plan.md](.cursor/plans/high-1_attendance_batch_n+1_ca332b89.plan.md)

---

### HIGH-2: Notification processor missing schoolId

- **Location:** [server/src/notifications/notification.processor.ts](server/src/notifications/notification.processor.ts)
- **Problem:** Bull jobs run without HTTP request context, so `getTenantSchoolId()` is undefined when the processor runs. `notificationLog.create` does not receive `schoolId`; the Prisma tenant extension cannot inject it without context.
- **Impact:** NotificationLog rows created without tenant; tenant isolation broken for background notifications.
- **Suggested fix:**
  - Include `schoolId` (or tenant id) in the job payload when enqueueing (e.g. in notification.service).
  - In the processor, run the create inside `tenantStorage.run({ schoolId: job.data.schoolId }, () => { ... })` and/or pass `schoolId` explicitly in the create call so logs are tenant-scoped.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/high-2_notification_processor_schoolid_e3bfc30e.plan.md](.cursor/plans/high-2_notification_processor_schoolid_e3bfc30e.plan.md)

---

### HIGH-3: Default passwords in production

- **Location:** [server/src/students/students.service.ts](server/src/students/students.service.ts), [server/src/teachers/teachers.service.ts](server/src/teachers/teachers.service.ts), [server/src/parents/parents.service.ts](server/src/parents/parents.service.ts)
- **Problem:** New students, teachers, and parents are created with default passwords (`Student@123`, `Teacher@123`, `Parent@123`). Acceptable for seed/demo; in production there is no "change password on first login" or one-time link flow.
- **Impact:** If these defaults are used in production, accounts are easily guessable.
- **Suggested fix:**
  - For production: add "change password on first login" or one-time token/link; do not rely on these defaults in prod.
  - Optionally generate a random temporary password and send via secure channel (or force reset on first sign-in).
- **Status:** [x] Done
- **Plan:** [.cursor/plans/high-3_default_passwords_production_a8c4e2b1.plan.md](.cursor/plans/high-3_default_passwords_production_a8c4e2b1.plan.md)

---

### HIGH-4: Paystack webhook idempotency

- **Location:** [server/src/billing/paystack-webhook.controller.ts](server/src/billing/paystack-webhook.controller.ts) and [server/src/billing/billing.service.ts](server/src/billing/billing.service.ts) — `processChargeSuccess`
- **Problem:** Paystack may retry webhooks. If processing is slow or fails after a partial DB update, a retry could double-apply payment (e.g. double credit). Early-return when transaction is already SUCCESS exists; full flow should be clearly idempotent.
- **Impact:** Risk of double-crediting payments on webhook retries.
- **Suggested fix:**
  - Ensure the entire update in `processChargeSuccess` is inside a single transaction and that double delivery cannot double-credit (idempotency key or strict "already processed" check).
  - Document retry behavior and ensure no side effects after success.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/high-4_paystack_webhook_idempotency_3b612ae6.plan.md](.cursor/plans/high-4_paystack_webhook_idempotency_3b612ae6.plan.md)

---

### HIGH-5: Analytics unbounded load

- **Location:** [server/src/analytics/analytics.service.ts](server/src/analytics/analytics.service.ts) — `getAtRiskStudentsML()` and `getAtRiskStudentsRuleBased()`
- **Problem:** `studentRecord.findMany({ include: { ... } })` with no `take`/pagination. For large schools this loads and serializes a very large set; tenant scope is applied by extension but volume is unbounded.
- **Impact:** Slow or memory-heavy requests; risk of timeouts or OOM.
- **Suggested fix:**
  - Add pagination (e.g. take/skip or cursor) and/or cap to "current term" or recent sections.
  - Consider moving heavy ML call to a background job and caching results per tenant/term.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/high-5_analytics_unbounded_load_ca8f4b8d.plan.md](.cursor/plans/high-5_analytics_unbounded_load_ca8f4b8d.plan.md)

---

## Medium

### MEDIUM-1: No client lint/build in CI

- **Location:** [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)
- **Problem:** CI runs only server lint, tests, and build. The client (Next.js) is not linted or built in the pipeline, so frontend regressions can reach production.
- **Impact:** Broken or low-quality frontend can be deployed without CI catching it.
- **Suggested fix:**
  - Add a job that runs `npm ci` and `npm run lint` (and ideally `npm run build`) in the `client/` directory.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-1_client_lint_build_ci_5b442c57.plan.md](.cursor/plans/medium-1_client_lint_build_ci_5b442c57.plan.md)

---

### MEDIUM-2: No database backup strategy

- **Location:** Project-wide (no backup automation found)
- **Problem:** No pg_dump, cron, or restore procedure documented or implemented. For beta/production, at least daily backups and a tested restore are needed.
- **Impact:** Data loss risk with no recovery path.
- **Suggested fix:**
  - Add a backup strategy (e.g. daily pg_dump to object storage or managed DB backups) and document restore steps.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-2_database_backup_strategy_c272ffa9.plan.md](.cursor/plans/medium-2_database_backup_strategy_c272ffa9.plan.md)

---

### MEDIUM-3: Seed runs on every server start

- **Location:** [server/Dockerfile](server/Dockerfile) — CMD runs `npx prisma db seed` on every container start
- **Problem:** Running seed on every deploy can duplicate or overwrite data. For production, seed should run only once (e.g. init container or separate job), not on every app start.
- **Impact:** Unpredictable or duplicate seed data in production.
- **Suggested fix:**
  - Remove `db seed` from the server CMD for production; run seed only once (e.g. manual or dedicated init step).
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-3_seed_on_every_start_f932f1db.plan.md](.cursor/plans/medium-3_seed_on_every_start_f932f1db.plan.md)

---

### MEDIUM-4: SETUP.md suggests weak secrets

- **Location:** [SETUP.md](SETUP.md)
- **Problem:** Example `.env` content in the doc uses placeholder secrets (e.g. `my-super-secret-access-key-12345`, `postgres123`). Copy-paste into production would be unsafe.
- **Impact:** Users may deploy with weak or documented secrets.
- **Suggested fix:**
  - In SETUP.md, reference "see .env.example" and warn never to use doc snippets in production; avoid embedding real-looking secrets in prose.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-4_setup.md_weak_secrets_47e30cb2.plan.md](.cursor/plans/medium-4_setup.md_weak_secrets_47e30cb2.plan.md)

---

### MEDIUM-5: Auth endpoints need stricter rate limits

- **Location:** [server/src/app.module.ts](server/src/app.module.ts) — ThrottlerModule; auth routes
- **Problem:** Global throttle is 100 req/min per IP. Login and refresh should be stricter to limit brute force and token abuse.
- **Impact:** Easier brute-force or token-guessing attacks on auth.
- **Suggested fix:**
  - Use `@Throttle()` / `@SkipThrottle()` and custom throttler for routes (e.g. auth: 5/min, others: 100/min). Consider separate limits for `/auth/signin`, `/auth/refresh`, and webhook.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-5_auth_rate_limits_0c6c20bb.plan.md](.cursor/plans/medium-5_auth_rate_limits_0c6c20bb.plan.md)

---

### MEDIUM-6: Exception filter may log sensitive data

- **Location:** [server/src/common/filters/http-exception.filter.ts](server/src/common/filters/http-exception.filter.ts)
- **Problem:** For non-HttpException, the filter logs `exception.message` and `exception.stack`. If Prisma or other libs expose query/data in error messages, logs could leak sensitive data.
- **Impact:** Sensitive data in log storage or monitoring.
- **Suggested fix:**
  - In production, log only a stable error id and stack to your logging system; avoid logging raw message/stack to a channel that might be exposed. Optionally redact known sensitive patterns.
- **Status:** [x] Done
- **Plan:** [.cursor/plans/medium-6_exception_filter_sensitive_logging_b8a234c5.plan.md](.cursor/plans/medium-6_exception_filter_sensitive_logging_b8a234c5.plan.md)

---

## Low / Enhancement

### LOW-1: Offline sync UX

- **Location:** [client/src/lib/sync-engine.ts](client/src/lib/sync-engine.ts), [client/src/lib/offline-db.ts](client/src/lib/offline-db.ts), PWA config
- **Problem:** Only attendance is queued for offline; no offline read path for billing or LMS; conflict feedback ("server has newer data") is minimal.
- **Impact:** Limited offline experience and unclear sync status for users.
- **Suggested fix:**
  - Expose "Pending uploads" count and "Sync now" in the UI; surface sync errors (e.g. toast with retry).
  - Consider caching read-only data (e.g. fee structures) for offline viewing; document service worker update flow.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### LOW-2: Paystack callback / polling

- **Location:** [client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx), parent billing page
- **Problem:** Popup can be blocked; no explicit "payment completed" detection in the parent window (e.g. polling or postMessage); callback URL is fixed.
- **Impact:** User may not see payment success without reloading; poor UX.
- **Suggested fix:**
  - After opening Paystack popup, poll a "payment status" endpoint (by reference) or use postMessage from callback page so the parent tab updates. On callback page, show clear success/failure and link back to billing.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### LOW-3: WhatsApp retry and tenant in job

- **Location:** [server/src/notifications/whatsapp.service.ts](server/src/notifications/whatsapp.service.ts), [server/src/notifications/notification.processor.ts](server/src/notifications/notification.processor.ts)
- **Problem:** Single template/language; no retry/backoff in processor; NotificationLog tenant issue covered in HIGH-2.
- **Impact:** Failed sends not retried; limited i18n and robustness.
- **Suggested fix:**
  - Add Bull retry/backoff for failed sends; store failure reason; consider opt-out and channel preference for compliance.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### LOW-4: Data privacy compliance

- **Location:** Project-wide
- **Problem:** No "data export" or "right to be forgotten" endpoints; no consent or retention policy in code. For EdTech, export and deletion per request, plus consent for channels (e.g. WhatsApp), are typically required.
- **Impact:** Compliance risk (e.g. GDPR) and inability to fulfill user requests.
- **Suggested fix:**
  - Add export of personal data (e.g. parent/student) per request; deletion or anonymization; document consent and retention; document where PII lives and who can access it.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

## Infrastructure and DevOps

### INFRA-1: Docker resource limits

- **Location:** [docker-compose.yml](docker-compose.yml)
- **Problem:** No `deploy.resources` (or mem_limit/cpus) defined. On a small VPS one service could starve others.
- **Impact:** Unpredictable performance or OOM.
- **Suggested fix:**
  - Add memory/CPU limits per service (e.g. server, client, ml-service) appropriate for your VPS.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### INFRA-2: Client port and WEB_PORT documentation

- **Location:** [docker-compose.yml](docker-compose.yml), [infra/nginx/VPS-SETUP.md](infra/nginx/VPS-SETUP.md)
- **Problem:** Client container exposes 3001; compose maps to host `${WEB_PORT:-3000}`. For VPS, Nginx expects frontend on 4000; setting WEB_PORT=4000 must be explicit and documented.
- **Impact:** Misconfiguration on VPS (frontend not reachable via Nginx).
- **Suggested fix:**
  - Document in VPS-SETUP that WEB_PORT=4000 must be set for production so Nginx and compose match.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### INFRA-3: Migration timing in deploy

- **Location:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- **Problem:** Migrations run after `docker-compose up`. If the new image expects a new migration and the DB is not yet migrated, the app might start with an old schema.
- **Impact:** Brief inconsistency or startup errors until migrations complete.
- **Suggested fix:**
  - Consider running migrations before starting new containers (e.g. a dedicated migration step or init container), or document and accept the current order.
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

### INFRA-4: No rollback path

- **Location:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- **Problem:** No documented or automated rollback (e.g. previous image tag or compose override) if a deploy fails.
- **Impact:** Harder to recover from a bad release.
- **Suggested fix:**
  - Document a simple rollback (e.g. git revert + redeploy, or keep previous image and re-run compose with it).
- **Status:** [ ] Not started
- **Plan:** *Add link or steps*

---

## Summary table

| ID | Title | Priority | Status | Plan |
|----|-------|----------|--------|------|
| CRITICAL-1 | JWT fallback secret | Critical | [ ] Not started | *Add link or steps* |
| CRITICAL-2 | Billing groupBy tenant leak | Critical | [ ] Not started | *Add link or steps* |
| HIGH-1 | Attendance batch N+1 and per-record notifications | High | [x] Done | [plan](.cursor/plans/high-1_attendance_batch_n+1_ca332b89.plan.md) |
| HIGH-2 | Notification processor missing schoolId | High | [x] Done | [.cursor/plans/high-2_notification_processor_schoolid_e3bfc30e.plan.md](.cursor/plans/high-2_notification_processor_schoolid_e3bfc30e.plan.md) |
| HIGH-3 | Default passwords in production | High | [x] Done | [plan](.cursor/plans/high-3_default_passwords_production_a8c4e2b1.plan.md) |
| HIGH-4 | Paystack webhook idempotency | High | [x] Done | [.cursor/plans/high-4_paystack_webhook_idempotency_3b612ae6.plan.md](.cursor/plans/high-4_paystack_webhook_idempotency_3b612ae6.plan.md) |
| HIGH-5 | Analytics unbounded load | High | [x] Done | [plan](.cursor/plans/high-5_analytics_unbounded_load_ca8f4b8d.plan.md) |
| MEDIUM-1 | No client lint/build in CI | Medium | [x] Done | [.cursor/plans/medium-1_client_lint_build_ci_5b442c57.plan.md](.cursor/plans/medium-1_client_lint_build_ci_5b442c57.plan.md) |
| MEDIUM-2 | No database backup strategy | Medium | [x] Done | [plan](.cursor/plans/medium-2_database_backup_strategy_c272ffa9.plan.md) |
| MEDIUM-3 | Seed runs on every server start | Medium | [x] Done | [.cursor/plans/medium-3_seed_on_every_start_f932f1db.plan.md](.cursor/plans/medium-3_seed_on_every_start_f932f1db.plan.md) |
| MEDIUM-4 | SETUP.md suggests weak secrets | Medium | [x] Done | [.cursor/plans/medium-4_setup.md_weak_secrets_47e30cb2.plan.md](.cursor/plans/medium-4_setup.md_weak_secrets_47e30cb2.plan.md) |
| MEDIUM-5 | Auth endpoints need stricter rate limits | Medium | [x] Done | [.cursor/plans/medium-5_auth_rate_limits_0c6c20bb.plan.md](.cursor/plans/medium-5_auth_rate_limits_0c6c20bb.plan.md) |
| MEDIUM-6 | Exception filter may log sensitive data | Medium | [x] Done | [.cursor/plans/medium-6_exception_filter_sensitive_logging_b8a234c5.plan.md](.cursor/plans/medium-6_exception_filter_sensitive_logging_b8a234c5.plan.md) |
| LOW-1 | Offline sync UX | Low | [ ] Not started | *Add link or steps* |
| LOW-2 | Paystack callback / polling | Low | [ ] Not started | *Add link or steps* |
| LOW-3 | WhatsApp retry and tenant in job | Low | [ ] Not started | *Add link or steps* |
| LOW-4 | Data privacy compliance | Low | [ ] Not started | *Add link or steps* |
| INFRA-1 | Docker resource limits | Infra | [ ] Not started | *Add link or steps* |
| INFRA-2 | Client port and WEB_PORT documentation | Infra | [ ] Not started | *Add link or steps* |
| INFRA-3 | Migration timing in deploy | Infra | [ ] Not started | *Add link or steps* |
| INFRA-4 | No rollback path | Infra | [ ] Not started | *Add link or steps* |
