"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import axios from "@/lib/axios";
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
import { Loader2, CheckCircle2, Phone, Smartphone } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const PROVIDERS = [
  {
    id: "MTN",
    name: "MTN MoMo",
    color: "#FFCC00",
    textColor: "#000000",
    prefixes: ["024", "054", "055", "059"],
  },
  {
    id: "TELECEL",
    name: "Telecel Cash",
    color: "#E60000",
    textColor: "#FFFFFF",
    prefixes: ["020", "050"],
  },
  {
    id: "AIRTELTIGO",
    name: "AirtelTigo Money",
    color: "#0066B3",
    textColor: "#FFFFFF",
    prefixes: ["027", "057", "026", "056"],
  },
];

const phoneRegex = /^0[2,5][0-9]{8}$/;

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  provider: z.string().min(1, "Please select a provider"),
  phoneNumber: z
    .string()
    .regex(phoneRegex, "Please enter a valid Ghana phone number (e.g., 024XXXXXXX)"),
  reference: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Invoice {
  id: string;
  invoiceNumber: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string;
}

interface MobileMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess?: () => void;
}

export function MobileMoneyDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: MobileMoneyDialogProps) {
  const [step, setStep] = useState<"form" | "processing" | "success">("form");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: invoice?.balance || 0,
      provider: "",
      phoneNumber: "",
      reference: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const response = await axios.post("/billing/payments", {
        invoiceId: invoice?.id,
        amount: data.amount,
        method: "MOBILE_MONEY",
        reference: `PLACEHOLDER-${data.provider}-${Date.now()}`,
      });
      return response.data;
    },
    onSuccess: () => {
      setStep("success");
      onSuccess?.();
    },
    onError: () => {
      setStep("form");
    },
  });

  const handleClose = () => {
    setStep("form");
    form.reset({
      amount: invoice?.balance || 0,
      provider: "",
      phoneNumber: "",
      reference: "",
    });
    onOpenChange(false);
  };

  const onSubmit = (data: FormValues) => {
    setStep("processing");
    mutation.mutate(data);
  };

  if (!invoice) return null;

  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch()
  const selectedProvider = PROVIDERS.find((p) => p.id === form.watch("provider"));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Money Payment
              </DialogTitle>
              <DialogDescription>
                Pay invoice {invoice.invoiceNumber} using mobile money.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-lg border p-3 bg-muted/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invoice Total:</span>
                    <span>{formatCurrency(invoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium mt-1 pt-1 border-t">
                    <span>Balance Due:</span>
                    <span className="text-red-600">{formatCurrency(invoice.balance)}</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Provider</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2">
                          {PROVIDERS.map((provider) => (
                            <button
                              key={provider.id}
                              type="button"
                              onClick={() => field.onChange(provider.id)}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                field.value === provider.id
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-transparent hover:border-muted-foreground/20"
                              }`}
                              style={{
                                backgroundColor: provider.color,
                                color: provider.textColor,
                              }}
                            >
                              <span className="font-semibold text-xs">{provider.name}</span>
                            </button>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (GHS)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={invoice.balance}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="024XXXXXXX"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      {selectedProvider && (
                        <p className="text-xs text-muted-foreground">
                          Valid prefixes: {selectedProvider.prefixes.join(", ")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Pay {formatCurrency(form.watch("amount"))}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processing Payment...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we initiate the transaction
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-lg font-medium text-center">Payment Initiated!</p>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
              Please complete the payment on your phone when prompted. 
            </p>
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs text-yellow-800 text-center">
                <strong>Demo Mode:</strong> This is a placeholder payment. No actual transaction was made.
              </p>
            </div>
            <Button className="mt-6" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
