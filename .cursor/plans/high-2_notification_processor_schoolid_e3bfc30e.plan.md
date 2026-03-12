---
name: HIGH-2 Notification Processor schoolId
overview: Fix tenant isolation for background notification jobs by including `schoolId` in the Bull job payload and running the processor within tenant context, so NotificationLog rows are correctly scoped to the tenant.
todos: []
isProject: false
---

