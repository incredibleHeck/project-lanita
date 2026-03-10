---
name: react-paystack frontend setup
overview: Install react-paystack into the client app, wire the Paystack public key via Next.js env vars, and add a small lib helper for safe access to the key.
todos: []
isProject: false
---

# React Paystack Frontend Setup

## 1) Install dependency into `client`

- From the repo root, install `react-paystack` only in the `client/` workspace using pnpm:

```bash
cd client && pnpm add react-paystack
```

(If you prefer pnpm workspaces style, the equivalent is `pnpm add react-paystack --filter client` from the monorepo root.)

## 2) Configure Next.js environment variables

In the **client app**, expose the Paystack public key via a `NEXT_PUBLIC_` var so it is available to React code.

- **File**: `[client/.env.local](client/.env.local)`
  - Add (or update) the following line, using your real public key:

```env
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
```

- **File**: `[client/.env.example](client/.env.example)`
  - Document the variable with a placeholder value and a short comment:

```env
# Paystack public key used by react-paystack in the dashboard
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_replace_with_real_public_key
```

Notes:

- Only the **public** key is ever exposed in the browser; secret keys must stay server-side (likely in the backend service that talks to Paystack servers).
- After changing `.env.local`, restart the Next.js dev server so `process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is picked up.

## 3) Add `client/src/lib/paystack.ts` helper

Create a small helper to centralize access to the public key and fail fast in development if it is missing.

- **File**: `[client/src/lib/paystack.ts](client/src/lib/paystack.ts)`
- Contents:

```ts
// client/src/lib/paystack.ts

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_PUBLIC_KEY && process.env.NODE_ENV !== "production") {
  throw new Error(
    "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not set. Please define it in client/.env.local.",
  );
}

export function getPaystackPublicKey(): string {
  if (!PAYSTACK_PUBLIC_KEY) {
    throw new Error(
      "Paystack public key is missing at runtime. Check NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.",
    );
  }
  return PAYSTACK_PUBLIC_KEY;
}
```

Usage example from a React (client) component:

```ts
import { getPaystackPublicKey } from "@/lib/paystack";

const publicKey = getPaystackPublicKey();
// pass publicKey to react-paystack components/config
```

This keeps configuration in one place, ensures misconfiguration is caught early in development, and avoids sprinkling `process.env` access throughout the UI code.