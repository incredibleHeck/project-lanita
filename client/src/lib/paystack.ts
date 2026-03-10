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

