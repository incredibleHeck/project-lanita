"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

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
  SheetTrigger,
} from "@/components/ui/sheet";

const addSectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  classId: z.string().uuid(),
  defaultRoomId: z.string().uuid().optional().nullable(),
});

type AddSectionFormValues = z.infer<typeof addSectionSchema>;

interface Room {
  id: string;
  name: string;
  type: string;
}

interface ClassItem {
  id: string;
  name: string;
  code: string;
}

interface AddSectionSheetProps {
  classItem?: ClassItem | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddSectionSheet({
  classItem = null,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddSectionSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const queryClient = useQueryClient();

  const { data: classes = [] } = useQuery<ClassItem[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get("/classes");
      return res.data;
    },
    enabled: open,
  });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await api.get("/timetable/rooms");
      return res.data;
    },
    enabled: open,
  });

  const form = useForm<AddSectionFormValues>({
    resolver: zodResolver(addSectionSchema),
    defaultValues: {
      name: "",
      capacity: 30,
      classId: "",
      defaultRoomId: null,
    },
  });

  useEffect(() => {
    if (classItem && open) {
      form.reset({
        name: "",
        capacity: 30,
        classId: classItem.id,
        defaultRoomId: null,
      });
    }
  }, [classItem, open, form]);

  const createSection = useMutation({
    mutationFn: async (data: AddSectionFormValues) => {
      return api.post("/sections", {
        name: data.name,
        capacity: data.capacity,
        classId: data.classId,
        defaultRoomId: data.defaultRoomId || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Section added successfully");
      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sections"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to add section. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: AddSectionFormValues) {
    createSection.mutate(data);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) form.reset();
    setOpen(nextOpen);
  }

  const sheetTrigger = trigger ?? (
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Section
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{sheetTrigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            Add Section{classItem ? ` to ${classItem.name}` : ""}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            <FormField
              control={form.control}
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!classItem}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
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
              disabled={createSection.isPending}
              className="mt-4"
            >
              {createSection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Section"
              )}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
