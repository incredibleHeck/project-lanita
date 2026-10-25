"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer, CheckCircle2, School as SchoolIcon } from "lucide-react";
import api from "@/lib/axios";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export interface PaymentReceipt {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference?: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    term: string;
    academicYear: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
  };
  student: {
    id: string;
    admissionNumber: string;
    name: string;
    class: string;
    section: string;
  };
  school: {
    name: string;
    code: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
}

interface PaymentReceiptDialogProps {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentReceiptDialog({
  paymentId,
  open,
  onOpenChange,
}: PaymentReceiptDialogProps) {
  const { data: receipt, isLoading } = useQuery<PaymentReceipt>({
    queryKey: ["payment-receipt", paymentId],
    queryFn: async () => {
      if (!paymentId) throw new Error("No payment ID");
      const res = await api.get(`/billing/payments/${paymentId}/receipt`);
      return res.data;
    },
    enabled: !!paymentId && open,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Official Payment Receipt
          </DialogTitle>
          <DialogDescription>
            System-authenticated transaction receipt
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : receipt ? (
          <div id="printable-receipt" className="p-6 space-y-5 bg-card text-card-foreground">
            {/* School Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <SchoolIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">{receipt.school.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Code: {receipt.school.code} | {receipt.school.contactEmail || "accounts@lanita.edu"}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="uppercase text-xs font-semibold">
                Paid
              </Badge>
            </div>

            {/* Receipt & Student Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
              <div>
                <span className="text-xs text-muted-foreground block">Receipt Number</span>
                <span className="font-mono font-semibold">{receipt.receiptNumber}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Date of Payment</span>
                <span className="font-medium">{formatDate(receipt.paymentDate)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Student Name</span>
                <span className="font-semibold">{receipt.student.name}</span>
                <span className="text-xs text-muted-foreground block font-mono">
                  {receipt.student.admissionNumber}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Class & Section</span>
                <span className="font-medium">
                  {receipt.student.class} - {receipt.student.section}
                </span>
              </div>
            </div>

            {/* Invoice & Payment Breakdown */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Breakdown
              </div>
              <div className="divide-y text-sm">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Invoice Reference:</span>
                  <span className="font-mono">{receipt.invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Academic Term:</span>
                  <span>{receipt.invoice.term} ({receipt.invoice.academicYear})</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium capitalize">{receipt.method.replace('_', ' ').toLowerCase()}</span>
                </div>
                {receipt.reference && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-muted-foreground">Reference / Trx ID:</span>
                    <span className="font-mono text-xs">{receipt.reference}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 bg-muted/20 font-bold text-base">
                  <span>Amount Paid Now:</span>
                  <span className="text-green-600">{formatCurrency(receipt.amount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-xs text-muted-foreground">
                  <span>Total Invoice Fee:</span>
                  <span>{formatCurrency(receipt.invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 text-xs font-semibold">
                  <span>Remaining Outstanding Balance:</span>
                  <span className={receipt.invoice.balance > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(receipt.invoice.balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-muted-foreground">
                Thank you for your payment. This is an official digital receipt generated by Lanita SIS.
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="p-4 bg-muted/40 border-t flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
