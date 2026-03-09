"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const editSectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  defaultRoomId: z.string().uuid().optional().nullable(),
});

type EditSectionFormValues = z.infer<typeof editSectionSchema>;

interface Room {
  id: string;
  name: string;
  type: string;
}

interface SectionItem {
  id: string;
  name: string;
  capacity: number;
  classId: string;
  defaultRoomId?: string | null;
  defaultRoom?: { id: string; name: string; type: string } | null;
}

interface EditSectionSheetProps {
  section: SectionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSectionSheet({
  section,
  open,
  onOpenChange,
}: EditSectionSheetProps) {
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await api.get("/timetable/rooms");
      return res.data;
    },
    enabled: open,
  });

  const form = useForm<EditSectionFormValues>({
    resolver: zodResolver(editSectionSchema),
    defaultValues: {
      name: "",
      capacity: 30,
      defaultRoomId: null,
    },
  });

  useEffect(() => {
    if (section && open) {
      form.reset({
        name: section.name,
        capacity: section.capacity,
        defaultRoomId: section.defaultRoomId ?? null,
      });
    }
  }, [section, open, form]);

  const updateSection = useMutation({
    mutationFn: async (data: EditSectionFormValues) => {
      if (!section) return;
      return api.patch(`/sections/${section.id}`, {
        name: data.name,
        capacity: data.capacity,
        defaultRoomId: data.defaultRoomId || null,
      });
    },
    onSuccess: () => {
      toast.success("Section updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to update section. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: EditSectionFormValues) {
    updateSection.mutate(data);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Edit Section</SheetTitle>
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
                    <Input placeholder="Section A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(isNaN(v) ? 1 : v);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultRoomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Room (optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No default room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No default room</SelectItem>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateSection.isPending}
              className="mt-4"
            >
              {updateSection.isPending ? (
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
