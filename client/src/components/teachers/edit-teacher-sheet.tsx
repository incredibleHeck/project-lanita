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

const editTeacherSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  contactNumber: z.string().min(1, "Contact number is required"),
  address: z.object({
    city: z.string().optional(),
  }),
  avatarUrl: z.string().optional().nullable(),
});

type EditTeacherFormValues = z.infer<typeof editTeacherSchema>;

interface TeacherProfile {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dob?: string;
  gender?: string;
  contactNumber?: string;
  address?: { city?: string };
  avatarUrl?: string | null;
}

interface Teacher {
  id: string;
  email: string;
  profile?: TeacherProfile;
}

interface EditTeacherSheetProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeacherSheet({
  teacher,
  open,
  onOpenChange,
}: EditTeacherSheetProps) {
  const queryClient = useQueryClient();

  const form = useForm<EditTeacherFormValues>({
    resolver: zodResolver(editTeacherSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      gender: "MALE",
      contactNumber: "",
      address: { city: "" },
      avatarUrl: null as string | null,
    },
  });

  useEffect(() => {
    if (teacher && open) {
      const dob = teacher.profile?.dob;
      const dobStr =
        typeof dob === "string"
          ? dob.split("T")[0]
          : dob instanceof Date
            ? dob.toISOString().split("T")[0]
            : "";
      const addr = teacher.profile?.address;
      const city =
        typeof addr === "object" && addr !== null && "city" in addr
          ? String((addr as { city?: unknown }).city ?? "")
          : "";
      form.reset({
        firstName: teacher.profile?.firstName ?? "",
        lastName: teacher.profile?.lastName ?? "",
        email: teacher.email,
        dob: dobStr,
        gender: (teacher.profile?.gender ?? "MALE") as "MALE" | "FEMALE" | "OTHER",
        contactNumber: teacher.profile?.contactNumber ?? "",
        address: { city: city || "" },
        avatarUrl: teacher.profile?.avatarUrl ?? null,
      });
    }
  }, [teacher, open, form]);

  const updateTeacher = useMutation({
    mutationFn: async (data: EditTeacherFormValues) => {
      if (!teacher) return;
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dob: data.dob,
        gender: data.gender,
        contactNumber: data.contactNumber,
        address: { city: data.address.city ?? "" },
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      };
      return api.patch(`/teachers/${teacher.id}`, payload);
    },
    onSuccess: () => {
      toast.success("Teacher updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to update teacher. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: EditTeacherFormValues) {
    updateTeacher.mutate(data);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-md overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Edit Teacher</SheetTitle>
        </SheetHeader>
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
                      disabled={updateTeacher.isPending}
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

            <Button
              type="submit"
              disabled={updateTeacher.isPending}
              className="mt-4"
            >
              {updateTeacher.isPending ? (
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
