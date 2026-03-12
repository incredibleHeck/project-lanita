---
name: MEDIUM-4 SETUP.md Weak Secrets
overview: Update SETUP.md to remove embedded weak/placeholder secrets from prose, reference .env.example instead, and add explicit warnings against using documentation snippets in production.
todos: []
isProject: false
---

# MEDIUM-4: SETUP.md Suggests Weak Secrets

## Problem Summary

SETUP.md embeds example `.env` content with placeholder secrets (`my-super-secret-access-key-12345`, `postgres123`, etc.). Users who copy-paste these into production would deploy with weak, documented secrets.

## Root Cause

- [SETUP.md](SETUP.md) Step 4 (lines 108-116): Inline copy-paste block with `postgres123`, `my-super-secret-access-key-12345`, `my-super-secret-refresh-key-67890`
- [SETUP.md](SETUP.md) Step 2 (line 67): Suggests PostgreSQL password `postgres123` for local install
- [SETUP.md](SETUP.md) Docker section (lines 335-341): Uses `your-secure-password`, `your-jwt-secret`—less risky but still placeholder patterns
- No warning that these values must never be used in production

## Solution

1. Replace the inline `.env` snippet with a reference to `.env.example`
2. Add a prominent warning: never use documentation snippets in production
3. Keep the PostgreSQL local-dev password guidance (users need *something* for Step 2) but add a note that it is for local development only
4. Add a production security note in the env section

## Implementation Plan

### 1. Replace Step 4 inline .env block

**File:** [SETUP.md](SETUP.md)

**Current (lines 104-116):**
```markdown
4. Copy and paste the following text into Notepad:
   ```
   DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/lanita_db"
   JWT_ACCESS_SECRET="my-super-secret-access-key-12345"
   JWT_REFRESH_SECRET="my-super-secret-refresh-key-67890"
   ```
```

**Replace with:**
- Instruct users to copy `.env.example` to `.env` (e.g. `copy .env.example .env` on Windows, or open `.env.example` and save as `.env`)
- Add a warning box: "**Security:** Never use values from this guide or `.env.example` in production. Generate strong random secrets (e.g. `openssl rand -base64 32`) and use a unique database password."
- For local dev, note that `.env.example` has development defaults; users may need to set `DATABASE_URL` to match their PostgreSQL password from Step 2

### 2. Add production warning to "What do these settings mean?"

**File:** [SETUP.md](SETUP.md)

After the bullet list explaining each variable, add:
- "For production deployment, see `.env.production.example` and use cryptographically random secrets."

### 3. Soften Step 2 PostgreSQL password guidance

**File:** [SETUP.md](SETUP.md)

Keep `postgres123` for local dev (beginners need a concrete value), but add:
- "This is for local development only. Use a strong, unique password for production databases."

### 4. Update Docker section placeholders

**File:** [SETUP.md](SETUP.md)

The Docker section (lines 335-341) uses `your-secure-password` and `your-jwt-secret`. Add a one-line note:
- "Replace placeholders with strong random values. Never use example values in production."

### 5. Avoid embedding real-looking secrets

Ensure no new prose introduces secrets that look production-ready. Use phrases like "generate a strong random value" or "see .env.example" instead of inline fake secrets.

## Files to Modify

- [SETUP.md](SETUP.md) — Replace Step 4 inline .env block with .env.example reference and security warning; add production note to env explanation; add local-only note to Step 2; add Docker placeholder warning

## Verification

- Read through SETUP.md and confirm no copy-pasteable block contains secrets suitable for production
- Confirm `.env.example` is referenced and users are directed there
- Confirm at least one explicit "never use in production" warning appears in the env setup section
