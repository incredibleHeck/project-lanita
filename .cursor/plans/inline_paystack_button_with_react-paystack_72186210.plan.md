---
name: Inline Paystack Button with React-Paystack
overview: Introduce a PaystackPaymentButton component in the billing components directory that uses react-paystack’s usePaystackPayment hook, multiplies the amount into pesewas, and shows sonner toasts on success and close.
todos: []
isProject: false
---

# Inline PaystackPaymentButton Plan

## Current state

- **Existing Paystack button:** `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)` currently calls the backend `POST /billing/paystack/initialize` and opens a popup using the returned `authorization_url`. It does **not** use `react-paystack` or `usePaystackPayment`.
- **Billing UI:** Parent billing page is at `[client/src/app/(dashboard)/parent/billing/page.tsx](client/src/app/(dashboard)/parent/billing/page.tsx)` and already imports `PaystackPaymentButton` to render a Pay Now button for unpaid invoices.
- **UI primitives:** `Button` lives in `[client/src/components/ui/button.tsx](client/src/components/ui/button.tsx)`; `toast` from `sonner` is used throughout the client (e.g. `record-payment-dialog.tsx`).
- **Paystack hook:** `react-paystack` is not currently referenced; the task explicitly wants `usePaystackPayment` used inline with Paystack’s JS checkout.

## 1. Decide on implementation strategy

- Keep the **file path and export name**: continue to use `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)` exporting `PaystackPaymentButton`, so existing imports in the billing page remain valid.
- **Switch implementation** from API-init + popup to **inline Paystack checkout** via `react-paystack` hook.
- Treat the button as a **pure client-side payment trigger**: it will not call the backend initialize endpoint; instead, the backend will verify payments later via webhooks or a separate verification flow (already present in billing service).

## 2. Component API (props)

- **File:** `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)`.
- **Props (per request):**
  - `amount: number` — amount in **GHS** (major units) at call site.
  - `email: string` — customer/parent email for Paystack.
  - `reference: string` — unique transaction reference (should be generated server-side or in a parent component; this component will pass it to Paystack).
  - `onSuccess: (reference: unknown) => void` — callback invoked after Paystack reports success, receiving whatever reference object Paystack returns.
- **Optional extras (non-breaking extension):** add `className?`, `variant?`, `size?`, `disabled?`, and `children?` (defaults to "Pay Now") to keep styling flexible. These are passed directly to the shadcn `Button`.

## 3. Hook configuration and amount conversion

- Mark the component as a client component with `"use client"` at the top.
- Import `usePaystackPayment` from `react-paystack`.
- Build the `config` object inside the component:

```ts
const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string | undefined;

const config = {
  publicKey: publicKey ?? "", // hook requires a string; guard on click if missing
  email,
  // Paystack expects amount in smallest unit (pesewas), so multiply by 100
  amount: Math.round(amount * 100),
  reference,
  currency: "GHS",
};

const initializePayment = usePaystackPayment(config);
```

- **Crucial:** Multiply `amount` by 100 before passing it to the hook so the Paystack inline modal receives the value in pesewas. Document this in a comment to avoid double-multiplication later.
- If `publicKey` is missing, do **not** call `initializePayment`; instead, show `toast.error("Payment provider is not configured")` in the click handler.

## 4. Button rendering and callbacks

- Import `Button` from `[client/src/components/ui/button.tsx](client/src/components/ui/button.tsx)`.
- Import `toast` from `sonner`.
- Optionally track a local `isLoading` flag to disable the button while the modal is initializing, but the hook itself opens the modal immediately; loading can be minimal (or omitted).
- Implement click handler:

```ts
const handleClick = () => {
  if (!publicKey) {
    toast.error("Payment provider is not configured");
    return;
  }

  initializePayment(
    (ref: unknown) => {
      toast.success("Payment successful");
      onSuccess(ref);
    },
    () => {
      toast.info("Payment window closed");
    },
  );
};
```

- Render the shadcn button:

```tsx
return (
  <Button
    type="button"
    onClick={handleClick}
    className={className}
    variant={variant}
    size={size}
    disabled={disabled}
  >
    {children ?? "Pay Now"}
  </Button>
);
```

## 5. Integration considerations

- **Where to use it:** The parent billing page currently passes only `invoice.id` into `PaystackPaymentButton`. To use the new inline button correctly, callers must instead pass `amount`, `email`, and `reference` (or you can create a thin wrapper per use-case that adapts those props from the invoice data). That is outside the scope of this specific request but should be planned next.
- **Environment:** Ensure `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is set in the frontend `.env` file; otherwise, the button will show a configuration error toast when clicked.

## File summary


| Action | File                                                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update | `[client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx)` — reimplement `PaystackPaymentButton` using `usePaystackPayment`, multiplying `amount * 100`, showing sonner toasts on success and close, and rendering a shadcn `Button` labeled "Pay Now" |


This plan focuses only on the reusable inline Paystack button; any wiring from invoices/users into its props can be handled in a follow-up change once this component is in place.