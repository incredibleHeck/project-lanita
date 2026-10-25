"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { typedZodResolver } from "@/lib/zod-resolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
import { formatCurrency } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2, Plus, Trash2, Loader2, DollarSign } from "lucide-react";

const feeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  academicYearId: z.string().min(1, "Academic year is required"),
  classId: z.string().optional(),
});

type FeeFormData = z.infer<typeof feeSchema>;

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  academicYear: {
    id: string;
    name: string;
  };
  class?: {
    id: string;
    name: string;
  } | null;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface FeeStructuresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeeStructuresDialog({
  open,
  onOpenChange,
}: FeeStructuresDialogProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: feeStructures = [], isLoading } = useQuery<FeeStructure[]>({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const res = await api.get("/billing/fee-structures");
      return res.data;
    },
    enabled: open,
  });

  const { data: academicYears = [] } = useQuery<AcademicYear[]>({
    queryKey: ["academic-years-list"],
    queryFn: async () => {
      const res = await api.get("/academic-years");
      return res.data;
    },
    enabled: open,
  });

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const res = await api.get("/classes");
      return res.data;
    },
    enabled: open,
  });

  const form = useForm<FeeFormData>({
    resolver: typedZodResolver(feeSchema),
    defaultValues: {
      name: "",
      amount: 0,
      academicYearId: "",
      classId: "all",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FeeFormData) => {
      const payload: {
        name: string;
        amount: number;
        academicYearId: string;
        classId?: string;
      } = {
        name: data.name,
        amount: Number(data.amount),
        academicYearId: data.academicYearId,
      };
      if (data.classId && data.classId !== "all") {
        payload.classId = data.classId;
      }
      const res = await api.post("/billing/fee-structures", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Fee structure created successfully");
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      form.reset();
      setShowAddForm(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to create fee structure");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/billing/fee-structures/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Fee structure removed");
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete fee structure");
    },
  });

  const onSubmit = (data: FeeFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings2 className="h-5 w-5 text-primary" />
              Fee Structures Management
            </DialogTitle>
            {!showAddForm && (
              <Button size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Fee Item
              </Button>
            )}
          </div>
          <DialogDescription>
            Configure school tuition, levies, and auxiliary fees applied during invoice generation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {showAddForm && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Fee Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Tuition Fee" {...field} />
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
                            <FormLabel className="text-xs">Amount (GHS/NGN)</FormLabel>
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
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="academicYearId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Academic Session</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select session" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {academicYears.map((ay) => (
                                  <SelectItem key={ay.id} value={ay.id}>
                                    {ay.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="classId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Class Scope</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="All classes" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Classes (General)</SelectItem>
                                {classes.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending && (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        Save Fee Structure
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <div className="h-12 bg-muted animate-pulse rounded-md" />
              <div className="h-12 bg-muted animate-pulse rounded-md" />
              <div className="h-12 bg-muted animate-pulse rounded-md" />
            </div>
          ) : feeStructures.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No fee structures configured yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create fee items such as Tuition, PTA, or Laboratory fees to generate invoices.
              </p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden">
              {feeStructures.map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {fee.name}
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {fee.class ? fee.class.name : "All Classes"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Session: {fee.academicYear.name}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-sm">
                      {formatCurrency(fee.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      onClick={() => deleteMutation.mutate(fee.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
