"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Check } from "lucide-react";

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
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SUBJECT_COLOR_PALETTE, DEFAULT_SUBJECT_COLOR } from "@/lib/subject-colors";

const SUBJECT_TYPES = ["CORE", "OPTIONAL", "ELECTIVE"] as const;
const ROOM_TYPES = ["CLASSROOM", "LAB", "HALL", "LIBRARY", "OTHER"] as const;

const addSubjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  subjectType: z.enum(SUBJECT_TYPES),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  isExaminable: z.boolean(),
  isSingleResource: z.boolean(),
  requiredRoomId: z.string().uuid().optional().nullable(),
  requiredRoomType: z.enum(ROOM_TYPES).optional().nullable(),
});

type AddSubjectFormValues = z.infer<typeof addSubjectSchema>;

interface Room {
  id: string;
  name: string;
  type: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  subjectType?: string;
  isElective?: boolean;
  color?: string;
  isExaminable?: boolean;
  isSingleResource?: boolean;
  requiredRoomId?: string | null;
  requiredRoomType?: string | null;
}

interface AddSubjectSheetProps {
  subject?: Subject | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function AddSubjectSheet({
  subject,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: AddSubjectSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const queryClient = useQueryClient();
  const isEdit = !!subject;

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await api.get("/timetable/rooms");
      return res.data;
    },
    enabled: open,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get<Subject[]>("/subjects");
      return res.data;
    },
    enabled: open,
  });
  const usedColors = (subjectsData ?? [])
    .filter((s) => !isEdit || s.id !== subject?.id)
    .map((s) => s.color)
    .filter(Boolean) as string[];

  const form = useForm<AddSubjectFormValues>({
    resolver: zodResolver(addSubjectSchema),
    defaultValues: {
      name: "",
      code: "",
      subjectType: "CORE",
      description: "",
      color: DEFAULT_SUBJECT_COLOR,
      isExaminable: true,
      isSingleResource: false,
      requiredRoomId: null,
      requiredRoomType: null,
    },
  });

  useEffect(() => {
    if (subject && open) {
      form.reset({
        name: subject.name,
        code: subject.code,
        subjectType: (subject.subjectType ?? "CORE") as "CORE" | "OPTIONAL" | "ELECTIVE",
        description: subject.description ?? "",
        color: subject.color ?? DEFAULT_SUBJECT_COLOR,
        isExaminable: subject.isExaminable ?? true,
        isSingleResource: subject.isSingleResource ?? false,
        requiredRoomId: subject.requiredRoomId ?? null,
        requiredRoomType: subject.requiredRoomType && (ROOM_TYPES as readonly string[]).includes(subject.requiredRoomType)
          ? (subject.requiredRoomType as (typeof ROOM_TYPES)[number])
          : null,
      });
    } else if (!open) {
      form.reset({
        name: "",
        code: "",
        subjectType: "CORE",
        description: "",
        color: DEFAULT_SUBJECT_COLOR,
        isExaminable: true,
        isSingleResource: false,
        requiredRoomId: null,
        requiredRoomType: null,
      });
    }
  }, [subject, open, form]);

  const createSubject = useMutation({
    mutationFn: async (data: AddSubjectFormValues) => {
      const payload = {
        name: data.name,
        code: data.code.toUpperCase(),
        subjectType: data.subjectType,
        description: data.description || undefined,
        color: data.color,
        isExaminable: data.isExaminable,
        isSingleResource: data.isSingleResource,
        requiredRoomId: data.requiredRoomId || undefined,
        requiredRoomType: data.requiredRoomType || undefined,
      };
      return api.post("/subjects", payload);
    },
    onSuccess: () => {
      toast.success("Subject added successfully");
      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to add subject. Please try again.";
      toast.error(message);
    },
  });

  const updateSubject = useMutation({
    mutationFn: async (data: AddSubjectFormValues) => {
      if (!subject) return;
      const payload = {
        name: data.name,
        code: data.code.toUpperCase(),
        subjectType: data.subjectType,
        description: data.description || undefined,
        color: data.color,
        isExaminable: data.isExaminable,
        isSingleResource: data.isSingleResource,
        requiredRoomId: data.requiredRoomId || undefined,
        requiredRoomType: data.requiredRoomType || undefined,
      };
      return api.patch(`/subjects/${subject.id}`, payload);
    },
    onSuccess: () => {
      toast.success("Subject updated successfully");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to update subject. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: AddSubjectFormValues) {
    if (isEdit) {
      updateSubject.mutate(data);
    } else {
      createSubject.mutate(data);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({
        name: "",
        code: "",
        subjectType: "CORE",
        description: "",
        color: DEFAULT_SUBJECT_COLOR,
        isExaminable: true,
        isSingleResource: false,
        requiredRoomId: null,
        requiredRoomType: null,
      });
    }
    setOpen(nextOpen);
  }

  const isPending = createSubject.isPending || updateSubject.isPending;
  // eslint-disable-next-line react-hooks/incompatible-library -- React Hook Form watch()
  const colorValue = form.watch("color");

  const sheetContent = (
    <SheetContent
      side="right"
      className="flex flex-col sm:max-w-md"
    >
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit Subject" : "Add Subject"}</SheetTitle>
      </SheetHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-1 min-h-0 flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Mathematics" {...field} />
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
                  <Input placeholder="MATH" {...field} disabled={isEdit} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subjectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CORE">Core</SelectItem>
                    <SelectItem value="OPTIONAL">Optional</SelectItem>
                    <SelectItem value="ELECTIVE">Elective</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Core mathematics curriculum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_COLOR_PALETTE.map((c) => {
                    const usedByOther = !isEdit && Array.isArray(usedColors) && usedColors.includes(c.hex);
                    const isSelected = colorValue === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => field.onChange(c.hex)}
                        className={`h-8 w-8 rounded-full transition-all flex items-center justify-center ${
                          usedByOther && !isSelected ? "opacity-40 grayscale" : "hover:scale-110"
                        } ${isSelected ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isExaminable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Examinable</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Include in exam timetable generation
                  </p>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isSingleResource"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Single Resource Facility</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Only one class school-wide per period (e.g. ICT Lab)
                  </p>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requiredRoomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixed Room (optional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  value={field.value ?? "__none__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No fixed room" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No fixed room</SelectItem>
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

          <FormField
            control={form.control}
            name="requiredRoomType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Required Room Type (optional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  value={field.value ?? "__none__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Saving..." : "Adding..."}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Add Subject"
              )}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  );

  const isControlledOnly = isControlled && !trigger;

  if (isControlledOnly) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        {sheetContent}
      </Sheet>
    );
  }

  if (trigger) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        {sheetContent}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Subject
        </Button>
      </SheetTrigger>
      {sheetContent}
    </Sheet>
  );
}
