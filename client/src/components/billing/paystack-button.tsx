"use client";

import { useState } from "react";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaystackPaymentButtonProps {
  invoiceId: string;
  callbackUrl?: string;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onSuccess?: () => void;
  disabled?: boolean;
}

interface InitializeResponse {
  authorization_url: string;
  reference: string;
}

export function PaystackPaymentButton({
  invoiceId,
  callbackUrl,
  children = "Pay Now",
  className,
  variant = "default",
  size = "sm",
  onSuccess,
  disabled = false,
}: PaystackPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || disabled) return;

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

      const { authorization_url } = data;

      if (authorization_url) {
        window.open(authorization_url, "paystack", "width=500,height=700,scrollbars=yes");
        onSuccess?.();
      }
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
