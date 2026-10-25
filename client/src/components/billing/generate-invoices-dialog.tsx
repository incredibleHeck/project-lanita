"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { typedZodResolver } from "@/lib/zod-resolver";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/axios";
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
import { FilePlus2, Loader2 } from "lucide-react";

const generateSchema = z.object({
  termId: z.string().min(1, "Term is required"),
  classId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
});

type GenerateFormData = z.infer<typeof generateSchema>;

interface Term {
  id: string;
  name: string;
  academicYear: {
    id: string;
    name: string;
  };
}

interface ClassItem {
  id: string;
  name: string;
}

interface GenerateInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateInvoicesDialog({
  open,
  onOpenChange,
}: GenerateInvoicesDialogProps) {
  const queryClient = useQueryClient();

  const { data: terms = [] } = useQuery<Term[]>({
    queryKey: ["billing-terms"],
    queryFn: async () => {
      const res = await api.get("/billing/terms");
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

  const form = useForm<GenerateFormData>({
    resolver: typedZodResolver(generateSchema),
    defaultValues: {
      termId: "",
      classId: "all",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open && !form.getValues("dueDate")) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      form.setValue("dueDate", d.toISOString().split("T")[0]);
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: async (data: GenerateFormData) => {
      const payload: { termId: string; dueDate: string; classId?: string } = {
        termId: data.termId,
        dueDate: new Date(data.dueDate).toISOString(),
      };
      if (data.classId && data.classId !== "all") {
        payload.classId = data.classId;
      }
      const res = await api.post("/billing/invoices/generate", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Invoices generated successfully");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to generate invoices");
    },
  });

  const onSubmit = (data: GenerateFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-primary" />
            Generate Term Invoices
          </DialogTitle>
          <DialogDescription>
            Batch generate student fee invoices based on established fee structures.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="termId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Term</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target term" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {terms.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.academicYear.name})
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
                  <FormLabel>Target Class (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Classes (School-wide)</SelectItem>
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

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Invoices
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
