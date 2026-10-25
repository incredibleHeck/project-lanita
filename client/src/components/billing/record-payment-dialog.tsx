"use client";

import { useForm } from "react-hook-form";
import { typedZodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invoice } from "./invoice-columns";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY"]),
  reference: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded?: (paymentId: string) => void;
}

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
  onPaymentRecorded,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const remainingBalance = invoice?.balance ?? 0;

  const form = useForm<PaymentFormData>({
    resolver: typedZodResolver(paymentSchema),
    defaultValues: {
      amount: remainingBalance,
      method: "CASH",
      reference: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!invoice) throw new Error("No invoice selected");
      const res = await api.post("/billing/payments", {
        invoiceId: invoice.id,
        amount: data.amount,
        method: data.method,
        reference: data.reference || undefined,
      });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
      form.reset();
      onOpenChange(false);
      if (resData?.payment?.id && onPaymentRecorded) {
        onPaymentRecorded(resData.payment.id);
      }
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to record payment");
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (data.amount > remainingBalance) {
      form.setError("amount", {
        message: `Amount cannot exceed remaining balance (${formatCurrency(remainingBalance)})`,
      });
      return;
    }
    mutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && invoice) {
      form.reset({
        amount: invoice.balance,
        method: "CASH",
        reference: "",
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record an offline payment for invoice {invoice?.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Student:</span>
              <span className="font-medium">{invoice.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Admission No:</span>
              <span>{invoice.admissionNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Invoiced:</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="text-red-600">
                {formatCurrency(invoice.balance)}
              </span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference / Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Bank slip #, teller ref..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Recording..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
