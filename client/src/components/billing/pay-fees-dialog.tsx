"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { InvoicePaystackButton } from "@/components/billing/paystack-button";
import { Smartphone, CreditCard, Building2, Wallet } from "lucide-react";
import type { Invoice } from "@/components/billing/invoice-columns";

interface PayFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  onPaySuccess: () => void;
}

export function PayFeesDialog({
  open,
  onOpenChange,
  invoices,
  onPaySuccess,
}: PayFeesDialogProps) {
  const unpaidInvoices = invoices.filter((inv) => inv.status !== "PAID");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay School Fees</DialogTitle>
          <DialogDescription>
            Pay securely using your preferred method. Paystack supports:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-green-600" />
              <span>Mobile Money (MTN, Vodafone, AirtelTigo)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>Card (Visa, Mastercard)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-foreground" />
              <span>Bank Transfer</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-amber-600" />
              <span>USSD</span>
            </div>
          </div>

          {unpaidInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All invoices are fully paid.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">Select an invoice to pay:</p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {unpaidInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {invoice.invoiceNumber} – {invoice.term}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(invoice.balance)}
                      </p>
                    </div>
                    <InvoicePaystackButton
                      invoiceId={invoice.id}
                      size="sm"
                      onSuccess={() => {
                        onPaySuccess();
                      }}
                    >
                      Pay Now
                    </InvoicePaystackButton>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
