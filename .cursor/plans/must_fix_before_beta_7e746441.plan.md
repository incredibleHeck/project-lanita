---
name: Must Fix Before Beta
overview: "Address the three must-fix items before beta: deploy path mismatch, failing unit tests, and cross-tab cache invalidation after attendance sync."
todos:
  - id: deploy-path
    content: Update deploy.yml to use configurable VPS_PROJECT_PATH or project-lanita
    status: completed
  - id: unit-tests
    content: Add PrismaService, PaystackService, AuthService mocks to failing spec files
    status: completed
  - id: cache-invalidation
    content: Invalidate analytics/dashboard after attendance sync in use-offline-attendance.ts
    status: completed
isProject: false
---

