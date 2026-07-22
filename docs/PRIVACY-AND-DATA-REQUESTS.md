# Privacy & Data Requests (Ops Runbook)

Manual process for pilot schools until self-service export/delete APIs exist.

## Consent (WhatsApp)

- Parents should provide a WhatsApp number only when they consent to school notifications.
- Set `Parent.whatsappOptIn = true` when recording consent; set `false` (and clear or keep number) on opt-out.
- Fee/attendance WhatsApp jobs should skip recipients with `whatsappOptIn = false` (see notification service).

## Access / export request

1. Verify the requester’s identity with the school admin.
2. Scope: student record(s), linked parent/guardian, invoices, attendance, grades, message metadata as needed.
3. Export via SQL or Prisma Studio for the tenant `schoolId`, e.g.:

```sql
-- Replace :schoolId and :studentId
SELECT * FROM "StudentRecord" WHERE "schoolId" = :schoolId AND id = :studentId;
SELECT * FROM "Parent" WHERE "schoolId" = :schoolId AND id = :parentId;
SELECT * FROM "StudentInvoice" WHERE "schoolId" = :schoolId AND "studentId" = :studentId;
```

4. Deliver a password-protected archive to the school admin (not by unencrypted email if avoidable).
5. Log the request in ops notes (date, requester, school, what was exported).

## Deletion / anonymization request

1. Confirm legal basis with the school (e.g. former student, parent withdrawal).
2. Prefer **anonymization** over hard delete when invoices/audit must be retained:

```sql
UPDATE "Profile" SET "firstName" = 'REDACTED', "lastName" = 'REDACTED', "contactNumber" = '', "address" = '{}'
WHERE "userId" = :userId;
UPDATE "User" SET email = CONCAT('redacted+', id, '@invalid.local'), "isActive" = false
WHERE id = :userId;
UPDATE "Parent" SET "whatsappNumber" = NULL, "whatsappOptIn" = false WHERE "userId" = :userId;
```

3. Hard delete only when the school confirms no retention requirement; take a backup first ([BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md)).
4. Record completion in ops notes.

## Public pages

- Privacy: `/privacy`
- Terms: `/terms`
