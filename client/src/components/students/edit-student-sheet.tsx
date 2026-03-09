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
import { PassportPhotoUpload } from "@/components/ui/passport-photo-upload";
import type { Student } from "@/components/students/columns";

const editStudentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  contactNumber: z.string().min(1, "Contact number is required"),
  address: z.object({
    city: z.string().optional(),
  }),
  sectionId: z.string().min(1, "Please select a section"),
  avatarUrl: z.string().optional().nullable(),
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

interface SectionItem {
  id: string;
  name: string;
  capacity: number;
  class: { id: string; name: string; code: string };
}

interface EditStudentSheetProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditStudentSheet({
  student,
  open,
  onOpenChange,
}: EditStudentSheetProps) {
  const queryClient = useQueryClient();

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const res = await api.get<SectionItem[]>("/sections");
      return res.data;
    },
    enabled: open,
  });

  const { data: fullStudent } = useQuery({
    queryKey: ["students", student?.id],
    queryFn: async () => {
      if (!student?.id) return null;
      const res = await api.get(`/students/${student.id}`);
      return res.data;
    },
    enabled: open && !!student?.id,
  });

  const studentData = fullStudent ?? student;

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      gender: "MALE",
      contactNumber: "",
      address: { city: "" },
      sectionId: "",
      avatarUrl: null as string | null,
    },
  });

  useEffect(() => {
    if (studentData && open) {
      const s = studentData as {
        id: string;
        email?: string;
        profile?: {
          firstName?: string;
          lastName?: string;
          dob?: string | Date;
          gender?: string;
          contactNumber?: string;
          address?: { city?: string };
          avatarUrl?: string | null;
        };
        studentRecord?: { currentSection?: { id: string } };
      };
      const dob = s.profile?.dob;
      const dobStr =
        typeof dob === "string"
          ? dob.split("T")[0]
          : dob instanceof Date
            ? dob.toISOString().split("T")[0]
            : "";
      const addr = s.profile?.address;
      const city =
        typeof addr === "object" && addr !== null && "city" in addr
          ? String((addr as { city?: unknown }).city ?? "")
          : "";
      const sectionId = s.studentRecord?.currentSection?.id ?? "";

      form.reset({
        firstName: s.profile?.firstName ?? "",
        lastName: s.profile?.lastName ?? "",
        email: s.email ?? "",
        dob: dobStr,
        gender: (s.profile?.gender ?? "MALE") as "MALE" | "FEMALE" | "OTHER",
        contactNumber: s.profile?.contactNumber ?? "",
        address: { city: city || "" },
        sectionId,
        avatarUrl: s.profile?.avatarUrl ?? null,
      });
    }
  }, [studentData, open, form]);

  const updateStudent = useMutation({
    mutationFn: async (data: EditStudentFormValues) => {
      if (!student?.id) return;
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dob: data.dob,
        gender: data.gender,
        contactNumber: data.contactNumber,
        address: { city: data.address.city ?? "" },
        sectionId: data.sectionId,
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      };
      return api.patch(`/students/${student!.id}`, payload);
    },
    onSuccess: () => {
      toast.success("Student updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to update student. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: EditStudentFormValues) {
    updateStudent.mutate(data);
  }

  const isLoading = open && !!student?.id && !studentData;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Edit Student</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <PassportPhotoUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={updateStudent.isPending}
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
                      <Input placeholder="John" {...field} />
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
                      <Input placeholder="Doe" {...field} />
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
                      placeholder="john.doe@example.com"
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

            <FormField
              control={form.control}
              name="sectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={sectionsLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.class.name} - {section.name}
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
              disabled={updateStudent.isPending}
              className="mt-4"
            >
              {updateStudent.isPending ? (
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
        )}
      </SheetContent>
    </Sheet>
  );
}
