---
name: PaymentTransaction Prisma schema
overview: Add a PaymentTransaction model for Paystack integration (reference, amount, status, channel, links to StudentInvoice and User), a new status enum, and the reverse relation on StudentInvoice and School/User. Tenant is represented by tenantId referencing School.
todos: []
isProject: false
---

# PaymentTransaction Prisma Schema Update

## Current schema

- **Billing/Invoice**: The existing invoice model is [StudentInvoice](server/prisma/schema.prisma) (id, schoolId, invoiceNumber, studentId, termId, totalAmount, amountPaid, status, dueDate). It already has `payments Payment[]` for the legacy [Payment](server/prisma/schema.prisma) model (receipt-based, PaymentMethod enum).
- **Tenant**: The app uses **School** as tenant; models use `schoolId` and `school` relation. Per your requirement we will use the field name **tenantId** and relate it to **School** (e.g. `tenant School @relation(...)`).
- **Payer**: Parents are **User** with role PARENT. So `paidById` will reference **User** (the parent or user who paid).

## Changes required

### 1. Add enum

Add a new enum after the existing enums (e.g. after `AuditAction`):

```prisma
enum PaymentTransactionStatus {
  PENDING
  SUCCESS
  FAILED
}
```

### 2. Add reverse relations on existing models

**School** – Add to the School model’s relation list (e.g. after `submissions`):

```prisma
  paymentTransactions PaymentTransaction[]
```

**StudentInvoice** – Add alongside the existing `payments` relation:

```prisma
  paymentTransactions PaymentTransaction[]
```

**User** – Add (e.g. after `coursesTaught` or another relation):

```prisma
  paymentTransactionsPaid PaymentTransaction[]
```

### 3. Append the PaymentTransaction model

Append the following after the `Payment` model (so it sits with billing-related models):

```prisma
model PaymentTransaction {
  id        String                   @id @default(uuid()) @db.Uuid
  reference String                   @unique
  amount    Float
  status    PaymentTransactionStatus @default(PENDING)
  channel   String?
  invoiceId String                   @db.Uuid
  invoice   StudentInvoice           @relation(fields: [invoiceId], references: [id])
  paidById  String                   @db.Uuid
  paidBy    User                     @relation(fields: [paidById], references: [id])
  tenantId  String                   @db.Uuid
  tenant    School                   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt DateTime                 @default(now())
  updatedAt DateTime                 @updatedAt

  @@index([invoiceId])
  @@index([paidById])
  @@index([tenantId])
  @@index([status])
}
```

## Relation summary


| Model              | New relation / usage                                                 |
| ------------------ | -------------------------------------------------------------------- |
| School             | `paymentTransactions PaymentTransaction[]` (tenant)                  |
| StudentInvoice     | `paymentTransactions PaymentTransaction[]` (reverse of invoiceId)    |
| User               | `paymentTransactionsPaid PaymentTransaction[]` (reverse of paidById) |
| PaymentTransaction | `invoice` -> StudentInvoice, `paidBy` -> User, `tenant` -> School    |


- **reference**: Unique Paystack transaction reference (e.g. `ref_xxx`).
- **channel**: Optional string (e.g. `"mobile_money"`, `"card"`) for payment channel.
- **onDelete**: Cascade on `tenantId` only so deleting a school removes its payment transactions; invoice and user use default Restrict so you don’t delete transactions by mistake when deleting an invoice or user.

## Note on "Invoice"

The codebase has no model named `Invoice`; the billing invoice model is **StudentInvoice**. The reverse relation is added on **StudentInvoice** as `paymentTransactions`. If you later introduce a generic `Invoice` model, you can refactor the relation accordingly.

## After applying

- Run `npx prisma validate` from `server/` to confirm the schema.
- When ready, run `npx prisma migrate dev --name add_payment_transaction` to generate and apply the migration (you asked not to generate the migration yet).

