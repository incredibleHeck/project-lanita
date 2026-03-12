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

  const config = {
    publicKey: publicKey ?? "",
    email,
    amount: Math.round(amount * 100),
    reference,
    currency: "GHS" as const,
  };

  const initializePayment = usePaystackPayment(config);

  useEffect(() => {
    if (autoOpen && reference && publicKey && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      initializePayment({
        onSuccess: (ref: unknown) => {
          toast.success("Payment successful");
          onSuccess?.(ref);
        },
        onClose: () => {
          toast.info("Payment window closed");
        },
      });
    }
  }, [autoOpen, reference, publicKey, initializePayment, onSuccess]);

  const handleClick = () => {
    if (disabled) return;

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
        toast.success("Payment successful");
        onSuccess?.(ref);
      },
      onClose: () => {
        toast.info("Payment window closed");
      },
    });
  };

  if (autoOpen) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening...
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
