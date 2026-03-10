---
name: Paystack Payment Button Component
overview: Add a reusable PaystackPaymentButton React component under the billing components directory that uses react-paystack’s usePaystackPayment hook, multiplies the amount for pesewas, and shows sonner toasts on success or close.
todos: []
isProject: false
---

# PaystackPaymentButton Component Plan

## Current state

- **Billing UI:** Existing billing components live under `[client/src/components/billing](client/src/components/billing)` (e.g. `record-payment-dialog.tsx`, `billing-data-table.tsx`). They already use `sonner` for toasts and shadcn/ui primitives for UI.
- **UI primitives:** `Button` is defined in `[client/src/components/ui/button.tsx](client/src/components/ui/button.tsx)` and is used widely.
- **Toasts:** `sonner` is configured (`toast` imported from `sonner` in several components, e.g. `[client/src/components/billing/record-payment-dialog.tsx](client/src/components/billing/record-payment-dialog.tsx)`).
- **Paystack hook:** `react-paystack` is not yet referenced in the code, but the task assumes it is installed/available. The standard usage is `const initializePayment = usePaystackPayment(config);` followed by `initializePayment(onSuccess, onClose)`.

## 1. Component file and props

- **File:** Create `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)`.
- **Props interface:**
  - `amount: number` — in **major units** (GHS) at the call site.
  - `email: string` — customer email.
  - `reference: string` — unique transaction reference (generated server-side or client-side by the caller).
  - `onSuccess: (reference: unknown) => void` — callback invoked after successful payment; accept the reference object from Paystack (type as `unknown` or a minimal interface, but keep flexible).
- Optionally extend props with standard button props (`className?`, `disabled?`) if needed, but initial implementation can keep it minimal and just pass any additional props down to the underlying `Button`.

## 2. Hook configuration and amount handling

Inside `PaystackPaymentButton`:

- **Public key:** Read from `process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to avoid hardcoding secrets on the client. This is standard for Paystack client-side integrations.
- **Config object** for `usePaystackPayment`:

```ts
  const config = {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string,
    email,
    amount: amount * 100, // convert GHS → pesewas
    reference,
    currency: 'GHS',
  };
  

```

- **Crucial:** Multiply `amount` by 100 in the config because Paystack expects the amount in the smallest denomination (pesewas). Document this in a comment so future maintainers don’t double-multiply.
- Call `const initializePayment = usePaystackPayment(config);` at render time.

## 3. Button rendering and callbacks

- Import and use shadcn’s `Button` from `[client/src/components/ui/button.tsx](client/src/components/ui/button.tsx)`.
- Import `toast` from `sonner` for notifications.
- Implement click handler:

```ts
  const handleClick = () => {
    initializePayment(
      (ref) => {
        toast.success('Payment successful');
        onSuccess(ref);
      },
      () => {
        toast.info('Payment window closed');
      },
    );
  };
  

```

- Render:

```tsx
  return (
    <Button onClick={handleClick} type="button">
      Pay Now
    </Button>
  );
  

```

- Optionally disable the button if `!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to prevent runtime errors.

## 4. Types and environment

- The component is a client component (`"use client"` at the top) since it uses hooks and the Paystack inline SDK.
- The `onSuccess` parameter from `usePaystackPayment` is typically an object containing the transaction reference and status; type it as `unknown` or `{ reference?: string; [key: string]: any }` to keep it flexible, and pass it directly to the caller.
- The plan assumes you will define `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` in the frontend `.env` file; this is outside the scope of this component but should be noted.

## File summary


| Action | File                                                                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add    | `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)` — `PaystackPaymentButton` using `usePaystackPayment`, multiplying amount by 100, showing sonner toasts, rendering a shadcn `Button` labeled “Pay Now” |


Once implemented, pages or dialogs (e.g. billing invoice payment flows) can import `PaystackPaymentButton` and pass in `amount`, `email`, `reference`, and an `onSuccess` handler that might call the backend Paystack initialize/verification endpoints or update local UI state.