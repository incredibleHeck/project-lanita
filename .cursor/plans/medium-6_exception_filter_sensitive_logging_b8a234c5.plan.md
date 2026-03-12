---
name: MEDIUM-6 Exception Filter Sensitive Logging
overview: Prevent the global exception filter from logging raw exception messages and stack traces in production, since Prisma and other libs can expose sensitive data (queries, connection strings) in error messages.
todos: []
isProject: false
---

# MEDIUM-6: Exception Filter May Log Sensitive Data

## Problem Summary

For non-HttpException errors, the filter logs `exception.message` and `exception.stack` via `this.logger.error()`. Prisma, database drivers, and other libraries can include sensitive data in error messages (SQL fragments, connection strings, table data). These logs may reach log storage, monitoring, or error-tracking services.

## Root Cause

- [server/src/common/filters/http-exception.filter.ts](server/src/common/filters/http-exception.filter.ts) lines 29-33: For `Error` instances, logs `exception.message` and `exception.stack` unconditionally
- No environment-based behavior; production and development log the same content
- No redaction of known sensitive patterns

## Solution

In production, avoid logging raw `exception.message` and `exception.stack`. Log only a generic identifier and optionally a sanitized summary. In development, keep full logging for debugging.

## Implementation Plan

### 1. Add production-safe logging

**File:** [server/src/common/filters/http-exception.filter.ts](server/src/common/filters/http-exception.filter.ts)

**Current (lines 29-33):**
```ts
} else if (exception instanceof Error) {
  this.logger.error(
    `Unhandled exception: ${exception.message}`,
    exception.stack,
  );
}
```

**Replace with:**

- In **production**: Log only a generic message and a short error ID (e.g. `crypto.randomUUID()` or a hash of the stack). Do not log `exception.message` or `exception.stack` to avoid leaking sensitive data.
- In **development**: Keep current behavior (full message and stack) for debugging.

```ts
} else if (exception instanceof Error) {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const errorId = crypto.randomUUID();
    this.logger.error(
      `Unhandled exception [${errorId}]. Check application logs for full stack.`,
    );
    // Optionally log full details to a secure, internal-only channel if available
  } else {
    this.logger.error(
      `Unhandled exception: ${exception.message}`,
      exception.stack,
    );
  }
}
```

**Import:** Add `import * as crypto from 'crypto';` if not already present (Node.js built-in).

### 2. Optional: Redact sensitive patterns in development

If you want to keep some logging in production but sanitize it, add a helper that redacts known patterns:

- Connection strings (e.g. `postgresql://...`, `postgres://...`)
- Common patterns: `password=`, `secret=`, `token=`, `Bearer`

This is optional; the primary fix is to avoid logging raw message/stack in production.

### 3. Document retry / correlation

For production debugging, the error ID allows correlating logs with client-reported issues. If you add request correlation IDs later, the error ID can be included in the response body (e.g. `{ errorId: '...' }`) so support can look up the full stack in logs. The audit fix does not require this; it focuses on not logging sensitive data.

## Files to Modify

- [server/src/common/filters/http-exception.filter.ts](server/src/common/filters/http-exception.filter.ts) — Add production check; in production, log only error ID and generic message; in development, keep full message/stack

## Verification

- Set `NODE_ENV=production` and trigger an unhandled error (e.g. Prisma connection error); confirm logs do not contain raw exception message or stack
- Set `NODE_ENV=development` and trigger the same error; confirm full message and stack are logged
