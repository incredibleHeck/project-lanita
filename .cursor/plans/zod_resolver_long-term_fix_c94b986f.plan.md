---
name: Zod Resolver Long-term Fix
overview: Remove per-form `as any` assertions by introducing a single typed Zod resolver helper and, optionally, aligning schemas so that when @hookform/resolvers or Zod improve types, only one place needs updating.
todos: []
isProject: false
---

# Long-Term Fix: Zod 4 + React Hook Form Resolver Types

## Why the types break

`@hookform/resolvers` (v5.2.2) exposes a Zod 4 overload that types the resolver as:

```ts
Resolver<z4.input<T>, Context, z4.output<T>>
```

With `z.coerce.number()` (or any transform), Zod 4 infers **input** (e.g. `unknown` or `string | number`) differently from **output** (`number`). React Hook Form’s `useForm<T>` expects `Resolver<T, Context, T>`, i.e. the same type for “form values” and “resolved values”. So when input and output differ, TypeScript rejects the resolver unless we assert.

## Recommended long-term approach: typed resolver helper

Centralize the type correction in **one** project helper so that:

- All form call sites use a single, type-safe API.
- When upstream fixes inference (or you switch resolver), only this helper changes.
- No `as any` (or other assertions) at individual `useForm` call sites.

### 1. Add a typed Zod resolver helper

**New file:** [client/src/lib/zod-resolver.ts](client/src/lib/zod-resolver.ts)

- Re-export or wrap `zodResolver` from `@hookform/resolvers/zod`.
- Export a generic helper that takes a Zod schema and returns a resolver typed as `Resolver<z.infer<typeof schema>>` (i.e. form type = output type).
- Use a **single type assertion** inside this helper (e.g. `as Resolver<Output>`) so that every caller gets a correctly typed resolver without per-form assertions.

Example shape (conceptual):

```ts
import { Resolver } from "react-hook-form";
import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

export function typedZodResolver<T extends z.ZodTypeAny>(schema: T): Resolver<z.infer<T>> {
  return baseZodResolver(schema) as Resolver<z.infer<T>>;
}
```

- Use `z.ZodTypeAny` (or the Zod 4 equivalent your project uses) so any schema can be passed.
- The important part is the return type: `Resolver<z.infer<T>>`, so `useForm<PaymentFormData>({ resolver: typedZodResolver(paymentSchema), ... })` type-checks without `as any`.

### 2. Replace `as any` with the helper in the four forms

**Files that currently use `zodResolver(...) as any`:**

- [client/src/components/billing/record-payment-dialog.tsx](client/src/components/billing/record-payment-dialog.tsx) (line 61)
- [client/src/components/lms/add-assignment-dialog.tsx](client/src/components/lms/add-assignment-dialog.tsx) (line 55)
- [client/src/components/lms/add-lesson-dialog.tsx](client/src/components/lms/add-lesson-dialog.tsx) (line 54)
- [client/src/components/lms/add-module-dialog.tsx](client/src/components/lms/add-module-dialog.tsx) (line 52)

**Change in each:**

- Replace `import { zodResolver } from "@hookform/resolvers/zod"` with `import { typedZodResolver } from "@/lib/zod-resolver"` (or the path you choose).
- Replace `resolver: zodResolver(paymentSchema) as any` with `resolver: typedZodResolver(paymentSchema)`.
- Keep `useForm<PaymentFormData>({ ... })` (and the equivalent form types) as they are.

No other behavior change; only the source of the resolver and removal of `as any`.

### 3. Verify

- Run `npx tsc --noEmit` in `client` and fix any new errors (e.g. if the generic or Zod 4 types need a small tweak in the helper).
- Run `npm run build` in `client` to confirm the build and that existing number field handling (e.g. `value={typeof field.value === "number" ? field.value : ""}`) still behaves as today.

## Optional: future-proof for upstream

- **Watch** [react-hook-form/resolvers#768](https://github.com/react-hook-form/resolvers/issues/768) (Zod 4 support) and related issues/PRs.
- When a version ships that types the Zod 4 resolver as `Resolver<Output, Context, Output>` (or equivalent), you can:
  - Switch the helper to call `zodResolver` and return it without a cast, or
  - Deprecate the helper and use `zodResolver` directly again.

No change to form code is required at that point if the helper is the only place that referenced the resolver type.

## What this plan does not do

- **Does not** change Zod or @hookform/resolvers versions, or add new dependencies.
- **Does not** refactor every form that uses `zodResolver` (only the four that currently use `as any`). Other forms can be migrated to `typedZodResolver` later if you want a single pattern.
- **Does not** remove the need for one assertion entirely; it isolates it in a single, documented helper so the rest of the app stays type-safe and easy to update when the ecosystem improves.

## Summary


| Step | Action                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Add `client/src/lib/zod-resolver.ts` with `typedZodResolver(schema)` returning `Resolver<z.infer<typeof schema>>` and one internal assertion. |
| 2    | In the four listed components, switch to `typedZodResolver` and remove `as any`.                                                              |
| 3    | Run `tsc --noEmit` and `npm run build` in client.                                                                                             |


This gives you a long-term, maintainable fix: one place to adjust when upstream types improve, and no per-form type assertions.