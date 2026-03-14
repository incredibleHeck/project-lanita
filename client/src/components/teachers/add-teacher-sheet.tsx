"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

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
import { PassportPhotoUpload } from "@/components/ui/passport-photo-upload";

interface SubjectItem {
  id: string;
  name: string;
  code: string;
}

interface SectionItem {
  id: string;
  name: string;
  capacity: number;
  class: { id: string; name: string; code: string };
}

const addTeacherSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  contactNumber: z.string().min(1, "Contact number is required"),
  address: z.object({
    city: z.string().min(1, "City is required"),
  }),
  allocations: z
    .array(
      z.object({
        sectionId: z.string(),
        subjectId: z.string(),
      })
    )
    .optional(),
  avatarUrl: z.string().optional().nullable(),
});

type AddTeacherFormValues = z.infer<typeof addTeacherSchema>;

export function AddTeacherSheet() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get<SubjectItem[]>("/subjects");
      return res.data;
    },
    enabled: open,
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const res = await api.get<SectionItem[]>("/sections");
      return res.data;
    },
    enabled: open,
  });

  const form = useForm<AddTeacherFormValues>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      gender: "MALE",
      contactNumber: "",
      address: { city: "" },
      allocations: [{ sectionId: "", subjectId: "" }],
      avatarUrl: null as string | null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  const createTeacher = useMutation({
    mutationFn: async (data: AddTeacherFormValues) => {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dob: data.dob,
        gender: data.gender,
        contactNumber: data.contactNumber,
        address: { city: data.address.city },
        ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
      };
      const teacherRes = await api.post<{ id: string }>("/teachers", payload);
      const teacherId = teacherRes.data.id;

      const allocations = data.allocations?.filter(
        (a) => a.sectionId && a.subjectId
      ) ?? [];
      for (const alloc of allocations) {
        await api.post("/allocations", {
          teacherId,
          sectionId: alloc.sectionId,
          subjectId: alloc.subjectId,
        });
      }
      return teacherRes;
    },
    onSuccess: () => {
      toast.success("Teacher added successfully");
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        dob: "",
        gender: "MALE",
        contactNumber: "",
        address: { city: "" },
        allocations: [{ sectionId: "", subjectId: "" }],
        avatarUrl: null,
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to add teacher. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: AddTeacherFormValues) {
    createTeacher.mutate(data);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        dob: "",
        gender: "MALE",
        contactNumber: "",
        address: { city: "" },
        allocations: [{ sectionId: "", subjectId: "" }],
        avatarUrl: null,
      });
    }
    setOpen(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Add Teacher</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 min-h-0 flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-4">
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PassportPhotoUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={createTeacher.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jane.smith@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="New York" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Subject Allocations</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ sectionId: "", subjectId: "" })}
                  disabled={subjectsLoading || sectionsLoading}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign sections and subjects this teacher will teach (optional)
              </p>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex gap-2 items-end rounded-lg border p-3"
                >
                  <FormField
                    control={form.control}
                    name={`allocations.${index}.sectionId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Section</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={sectionsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Section" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sections.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.class.name} - {s.name}
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
                    name={`allocations.${index}.subjectId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Subject</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={subjectsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Default password: Teacher@123 (teacher can change after first login)
            </p>
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTeacher.isPending}
              >
                {createTeacher.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Teacher"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
