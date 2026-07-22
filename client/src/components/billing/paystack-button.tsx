"use client";

import { useState, useEffect, useRef } from "react";
import { usePaystackPayment } from "react-paystack";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface InitializeResponse {
  authorization_url: string;
  reference: string;
  amount: number;
  email: string;
}

interface PaymentStatusResponse {
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  invoiceId: string;
  amount: number;
}

async function confirmPaymentOnServer(
  reference: string,
  maxAttempts = 8,
  delayMs = 1500,
): Promise<PaymentStatusResponse> {
  let last: PaymentStatusResponse | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await axios.get<PaymentStatusResponse>(
      `/billing/paystack/status/${encodeURIComponent(reference)}`,
    );
    last = data;
    if (data.status === "SUCCESS" || data.status === "FAILED") {
      return data;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return (
    last ?? {
      reference,
      status: "PENDING",
      invoiceId: "",
      amount: 0,
    }
  );
}

interface PaystackPaymentButtonProps {
  /** Amount in GHS (major units). Paystack expects pesewas, so we multiply by 100. */
  amount: number;
  /** Customer email for Paystack */
  email: string;
  /** Unique transaction reference (server-generated) */
  reference: string;
  onSuccess?: (reference?: unknown) => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  disabled?: boolean;
  /** When true, opens Paystack modal on mount (for use after parent fetches reference) */
  autoOpen?: boolean;
}

export function PaystackPaymentButton({
  amount,
  email,
  reference,
  onSuccess,
  children = "Pay Now",
  className,
  variant = "default",
  size = "sm",
  disabled = false,
  autoOpen = false,
}: PaystackPaymentButtonProps) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string | undefined;
  const hasOpenedRef = useRef(false);
  const [confirming, setConfirming] = useState(false);

  const config = {
    publicKey: publicKey ?? "",
    email,
    amount: Math.round(amount * 100),
    reference,
    currency: "GHS" as const,
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaystackSuccess = async (ref: unknown) => {
    setConfirming(true);
    toast.info("Confirming payment with school...");
    try {
      const result = await confirmPaymentOnServer(reference);
      if (result.status === "SUCCESS") {
        toast.success("Payment confirmed");
        onSuccess?.(ref);
      } else if (result.status === "FAILED") {
        toast.error("Payment failed. Please try again or contact the school.");
      } else {
        toast.info(
          "Payment received by Paystack. Your invoice will update shortly once confirmed.",
        );
        onSuccess?.(ref);
      }
    } catch {
      toast.info(
        "Payment submitted. Refresh billing shortly if the balance has not updated.",
      );
      onSuccess?.(ref);
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (autoOpen && reference && publicKey && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      initializePayment({
        onSuccess: (ref: unknown) => {
          void handlePaystackSuccess(ref);
        },
        onClose: () => {
          toast.info("Payment window closed");
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once per reference
  }, [autoOpen, reference, publicKey, initializePayment]);

  const handleClick = () => {
    if (disabled || confirming) return;

    if (!publicKey) {
      toast.error("Payment provider is not configured");
      return;
    }

    if (!reference || !email || amount <= 0) {
      toast.error("Missing payment configuration");
      return;
    }

    initializePayment({
      onSuccess: (ref: unknown) => {
        void handlePaystackSuccess(ref);
      },
      onClose: () => {
        toast.info("Payment window closed");
      },
    });
  };

  if (autoOpen || confirming) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {confirming ? "Confirming..." : "Opening..."}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}

interface InvoicePaystackButtonProps {
  invoiceId: string;
  callbackUrl?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onSuccess?: () => void;
  disabled?: boolean;
}

export function InvoicePaystackButton({
  invoiceId,
  callbackUrl,
  children = "Pay Now",
  className,
  variant = "default",
  size = "sm",
  onSuccess,
  disabled = false,
}: InvoicePaystackButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<{
    reference: string;
    amount: number;
    email: string;
  } | null>(null);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    const url =
      callbackUrl ??
      (typeof window !== "undefined"
        ? `${window.location.origin}/parent/billing?payment=callback`
        : "");

    try {
      const { data } = await axios.post<InitializeResponse>(
        "/billing/paystack/initialize",
        { invoiceId, callbackUrl: url }
      );
      setPaymentConfig({
        reference: data.reference,
        amount: data.amount,
        email: data.email,
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to initialize payment";
      toast.error(typeof message === "string" ? message : "Failed to initialize payment");
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentConfig) {
    return (
      <PaystackPaymentButton
        amount={paymentConfig.amount}
        email={paymentConfig.email}
        reference={paymentConfig.reference}
        onSuccess={onSuccess}
        autoOpen
        className={className}
        variant={variant}
        size={size}
        disabled={disabled}
      >
        {children}
      </PaystackPaymentButton>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
