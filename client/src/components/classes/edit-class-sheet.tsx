"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const editClassSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
});

type EditClassFormValues = z.infer<typeof editClassSchema>;

interface ClassItem {
  id: string;
  name: string;
  code: string;
}

interface EditClassSheetProps {
  classItem: ClassItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClassSheet({
  classItem,
  open,
  onOpenChange,
}: EditClassSheetProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditClassFormValues>({
    resolver: zodResolver(editClassSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  useEffect(() => {
    if (classItem && open) {
      form.reset({
        name: classItem.name,
        code: classItem.code,
      });
    }
  }, [classItem, open, form]);

  const updateClass = useMutation({
    mutationFn: async (data: EditClassFormValues) => {
      if (!classItem) return;
      return api.patch(`/classes/${classItem.id}`, {
        name: data.name,
        code: data.code.toUpperCase(),
      });
    },
    onSuccess: () => {
      toast.success("Class updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to update class. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: EditClassFormValues) {
    updateClass.mutate(data);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Edit Class</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Grade 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="G1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateClass.isPending}
              className="mt-4"
            >
              {updateClass.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
