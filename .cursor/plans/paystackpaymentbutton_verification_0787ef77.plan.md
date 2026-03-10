---
name: PaystackPaymentButton Verification
overview: The PaystackPaymentButton already implements all six requirements. This plan verifies the implementation and documents optional enhancements (e.g., using react-paystack's inline modal with the backend-generated reference).
todos: []
isProject: false
---

# PaystackPaymentButton Refactor - Verification

## Current implementation status

The existing [client/src/components/billing/paystack-button.tsx](client/src/components/billing/paystack-button.tsx) already satisfies all six requirements:


| Requirement                                                       | Status | Implementation                                                                                                                                       |
| ----------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Update paystack-button.tsx                                     | Done   | Component exists and is wired up                                                                                                                     |
| 2. Add `invoiceId` prop                                           | Done   | `invoiceId: string` is required in props (line 10)                                                                                                   |
| 3. Loading state on click, prevent multiple clicks                | Done   | `isLoading` state, spinner, `disabled={disabled                                                                                                      |
| 4. API call to POST /billing/paystack/initialize with invoiceId   | Done   | `axios.post('/billing/paystack/initialize', { invoiceId, callbackUrl })` (lines 46-50)                                                               |
| 5. Extract reference from response                                | Done   | `const { authorization_url, reference } = data` (line 51)                                                                                            |
| 6. Trigger Paystack modal using reference; error toast on failure | Done   | Opens `authorization_url` (which is tied to our reference) via `window.open`; `toast.error` on catch; `setIsLoading(false)` in finally (lines 54-66) |


The backend [server/src/billing/billing.service.ts](server/src/billing/billing.service.ts) creates a `PaymentTransaction` with a unique reference, calls Paystack initialize, and returns `{ authorization_url, reference }`. The `authorization_url` encodes the session for that reference, so opening it is equivalent to triggering the Paystack checkout for that reference.

---

## Optional: Use react-paystack inline modal

The current flow uses `window.open(authorization_url)`, which opens Paystack in a new popup. The project has [react-paystack](https://www.npmjs.com/package/react-paystack) installed and [client/src/lib/paystack.ts](client/src/lib/paystack.ts) for `getPaystackPublicKey()`.

To use react-paystack’s inline modal with the backend-generated reference:

1. **Backend:** Extend the initialize response to include `email` and `amount` (in pesewas) so the client can build the react-paystack config:
  - In [server/src/billing/billing.service.ts](server/src/billing/billing.service.ts), change the return to:

```ts
     return {
       authorization_url: result.authorization_url,
       reference,
       email: parent.email,
       amount: amountInPesewas,
     };
     

```

1. **Frontend:** Refactor the button to:
  - On click: call the API, then use `usePaystackPayment` with `{ reference, email, amount, publicKey: getPaystackPublicKey(), callback_url }`.
  - Because the hook needs config at render time, use a two-step flow:
    - Store fetched config in state.
    - Render a launcher component when config is set; that component calls `usePaystackPayment(config)` and `initializePayment(onSuccess, onClose)` in a `useEffect`.
  - This avoids double-initialization: the backend still creates the transaction and calls Paystack; the client would then call Paystack again with the same reference. Paystack may reuse the existing session, but this should be validated.

**Note:** Using react-paystack with a backend that already calls Paystack initialize can lead to duplicate or conflicting sessions. A cleaner approach is to have the backend only create the transaction and return `{ reference, email, amount }`, and let the client call Paystack initialize via react-paystack. That would require removing the Paystack initialize call from the backend for this flow.

---

## Recommendation

The current implementation meets all stated requirements. The `authorization_url` is the correct way to open the Paystack checkout for the backend-generated reference. No changes are required unless you specifically want the react-paystack overlay instead of a popup window.