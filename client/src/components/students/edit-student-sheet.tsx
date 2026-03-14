"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
} from "@/components/ui/sheet";
import { PassportPhotoUpload } from "@/components/ui/passport-photo-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Student } from "@/components/students/columns";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const GUARDIAN_RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "SIBLING", label: "Sibling" },
  { value: "OTHER", label: "Other" },
] as const;

const editStudentSchema = z
  .object({
    avatarUrl: z.string().optional().nullable(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    dob: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    residentialAddress: z.string().min(1, "Residential address is required"),
    studentEmail: z.string().optional(),
    studentPhone: z.string().optional(),
    enrollmentDate: z.string().min(1, "Enrollment date is required"),
    classId: z.string().min(1, "Please select a class"),
    sectionId: z.string().min(1, "Please select a section"),
    previousSchool: z.string().optional(),
    specialEducationNotes: z.string().optional(),
    linkExistingParent: z.boolean(),
    existingParentId: z.string().optional(),
    guardianFullName: z.string().optional(),
    guardianRelationship: z.string().optional(),
    guardianPhone: z.string().optional(),
    whatsappSameAsPrimary: z.boolean().optional(),
    guardianEmail: z.string().optional(),
    guardianOccupation: z.string().optional(),
    guardianEmployer: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    bloodGroup: z.string().optional(),
    allergies: z.string().optional(),
    medicalConditions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkExistingParent) {
      if (!data.existingParentId?.trim()) {
        ctx.addIssue({
          path: ["existingParentId"],
          message: "Please select a parent",
          code: z.ZodIssueCode.custom,
        });
      }
    } else {
      if (!data.guardianFullName?.trim()) {
        ctx.addIssue({
          path: ["guardianFullName"],
          message: "Guardian full name is required",
          code: z.ZodIssueCode.custom,
        });
      }
      if (!data.guardianPhone?.trim()) {
        ctx.addIssue({
          path: ["guardianPhone"],
          message: "Guardian phone is required",
          code: z.ZodIssueCode.custom,
        });
      }
      if (!data.guardianEmail?.trim()) {
        ctx.addIssue({
          path: ["guardianEmail"],
          message: "Guardian email is required",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

interface SectionItem {
  id: string;
  name: string;
  capacity: number;
  classId: string;
  class: { id: string; name: string; code: string };
}

interface ClassItem {
  id: string;
  name: string;
  code: string;
}

interface ParentItem {
  id: string;
  email: string;
  profile: { firstName: string; lastName: string };
}

const STEP_1_FIELDS = [
  "firstName",
  "lastName",
  "middleName",
  "dob",
  "gender",
  "residentialAddress",
  "studentEmail",
  "studentPhone",
  "avatarUrl",
] as const;
const STEP_2_FIELDS = [
  "enrollmentDate",
  "classId",
  "sectionId",
  "previousSchool",
  "specialEducationNotes",
] as const;
const STEP_3_FIELDS = [
  "linkExistingParent",
  "existingParentId",
  "guardianFullName",
  "guardianRelationship",
  "guardianPhone",
  "guardianEmail",
  "guardianOccupation",
  "guardianEmployer",
  "emergencyContactName",
  "emergencyContactPhone",
] as const;

const inputClass =
  "bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary";

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
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get<ClassItem[]>("/classes");
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

  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const res = await api.get<ParentItem[]>("/parents");
      return res.data;
    },
    enabled: open && step >= 3,
  });

  const { data: fullStudent, isLoading: studentLoading } = useQuery({
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
      avatarUrl: null,
      firstName: "",
      lastName: "",
      middleName: "",
      dob: "",
      gender: "MALE",
      residentialAddress: "",
      studentEmail: "",
      studentPhone: "",
      enrollmentDate: format(new Date(), "yyyy-MM-dd"),
      classId: "",
      sectionId: "",
      previousSchool: "",
      specialEducationNotes: "",
      linkExistingParent: false,
      existingParentId: "",
      guardianFullName: "",
      guardianRelationship: "FATHER",
      guardianPhone: "",
      whatsappSameAsPrimary: true,
      guardianEmail: "",
      guardianOccupation: "",
      guardianEmployer: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      bloodGroup: "",
      allergies: "",
      medicalConditions: "",
    },
  });

  const classId = form.watch("classId");
  const linkExistingParent = form.watch("linkExistingParent");

  const filteredSections = classId
    ? sections.filter((s) => s.classId === classId)
    : sections;

  useEffect(() => {
    if (studentData && open) {
      const s = studentData as {
        id: string;
        email?: string;
        profile?: {
          firstName?: string;
          lastName?: string;
          middleName?: string;
          dob?: string | Date;
          gender?: string;
          contactNumber?: string;
          address?: { city?: string; fullAddress?: string } | string;
          avatarUrl?: string | null;
        };
        studentRecord?: {
          enrollmentDate?: string | Date;
          currentSection?: { id: string; classId?: string; class?: { id: string } };
          address?: string;
          bloodGroup?: string;
          allergies?: string[];
          medicalConditions?: string;
          previousSchool?: string;
          specialNeeds?: string;
        };
      };
      const dob = s.profile?.dob ?? s.studentRecord?.enrollmentDate;
      const dobStr =
        typeof dob === "string"
          ? dob.split("T")[0]
          : dob instanceof Date
            ? dob.toISOString().split("T")[0]
            : "";
      const addr = s.profile?.address;
      const residentialAddress =
        typeof addr === "object" && addr !== null && "fullAddress" in addr
          ? String((addr as { fullAddress?: unknown }).fullAddress ?? "")
          : typeof addr === "object" && addr !== null && "city" in addr
            ? String((addr as { city?: unknown }).city ?? "")
            : typeof addr === "string"
              ? addr
              : "";
      const section = s.studentRecord?.currentSection;
      const sectionId = section?.id ?? "";
      const classIdVal = section?.class?.id ?? section?.classId ?? "";

      form.reset({
        avatarUrl: s.profile?.avatarUrl ?? null,
        firstName: s.profile?.firstName ?? "",
        lastName: s.profile?.lastName ?? "",
        middleName: s.profile?.middleName ?? "",
        dob: dobStr,
        gender: (s.profile?.gender ?? "MALE") as "MALE" | "FEMALE" | "OTHER",
        residentialAddress: residentialAddress || (s.studentRecord?.address ?? ""),
        studentEmail: s.email ?? "",
        studentPhone: s.profile?.contactNumber ?? "",
        enrollmentDate:
          s.studentRecord?.enrollmentDate instanceof Date
            ? s.studentRecord.enrollmentDate.toISOString().split("T")[0]
            : typeof s.studentRecord?.enrollmentDate === "string"
              ? s.studentRecord.enrollmentDate.split("T")[0]
              : format(new Date(), "yyyy-MM-dd"),
        classId: classIdVal,
        sectionId,
        previousSchool: s.studentRecord?.previousSchool ?? "",
        specialEducationNotes: s.studentRecord?.specialNeeds ?? "",
        linkExistingParent: false,
        existingParentId: "",
        guardianFullName: "",
        guardianRelationship: "FATHER",
        guardianPhone: "",
        whatsappSameAsPrimary: true,
        guardianEmail: "",
        guardianOccupation: "",
        guardianEmployer: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        bloodGroup: s.studentRecord?.bloodGroup ?? "",
        allergies: Array.isArray(s.studentRecord?.allergies)
          ? s.studentRecord.allergies.join(", ")
          : s.studentRecord?.allergies ?? "",
        medicalConditions: s.studentRecord?.medicalConditions ?? "",
      });
      setStep(1);
    }
  }, [studentData, open, form]);

  const updateStudent = useMutation({
    mutationFn: async (data: EditStudentFormValues) => {
      if (!student?.id) return;
      const existingEmail = (studentData as { email?: string })?.email;
      const email =
        data.studentEmail?.trim() ||
        existingEmail ||
        data.guardianEmail?.trim() ||
        `student-${Date.now()}@temp.local`;
      const contactNumber =
        data.studentPhone?.trim() ||
        data.guardianPhone?.trim() ||
        "0000000000";

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        email,
        dob: data.dob,
        gender: data.gender,
        contactNumber,
        address: {
          city: data.residentialAddress?.split(",")[0]?.trim() || "N/A",
          fullAddress: data.residentialAddress,
        },
        sectionId: data.sectionId,
        admissionDate: data.enrollmentDate,
        studentRecordAddress: data.residentialAddress,
        bloodGroup: data.bloodGroup || undefined,
        allergies: data.allergies
          ? data.allergies.split(",").map((a) => a.trim()).filter(Boolean)
          : undefined,
        medicalConditions: data.medicalConditions || undefined,
        previousSchool: data.previousSchool || undefined,
        specialNeeds: data.specialEducationNotes || undefined,
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      };
      return api.patch(`/students/${student.id}`, payload);
    },
    onSuccess: async (res, data) => {
      const studentData = res.data;
      const admissionNumber =
        studentData?.studentRecord?.admissionNumber ||
        studentData?.admissionNumber;

      if (data.linkExistingParent && data.existingParentId && admissionNumber) {
        await api.patch(`/students/${studentData.id}/link-parent`, {
          parentId: data.existingParentId,
        });
      } else if (
        !data.linkExistingParent &&
        data.guardianFullName?.trim() &&
        data.guardianEmail?.trim() &&
        data.guardianPhone?.trim() &&
        admissionNumber
      ) {
        const parts = data.guardianFullName.trim().split(/\s+/);
        const guardianFirstName = parts[0] || "Guardian";
        const guardianLastName = parts.slice(1).join(" ") || "Unknown";
        await api.post("/parents", {
          firstName: guardianFirstName,
          lastName: guardianLastName,
          email: data.guardianEmail,
          phone: data.guardianPhone,
          studentAdmissionNumbers: [admissionNumber],
        });
      }

      toast.success("Student updated successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ??
        "Failed to update student. Please try again.";
      toast.error(message);
    },
  });

  function onSubmit(data: EditStudentFormValues) {
    updateStudent.mutate(data);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setStep(1);
    onOpenChange(nextOpen);
  }

  async function handleNext() {
    const fields =
      step === 1
        ? STEP_1_FIELDS
        : step === 2
          ? STEP_2_FIELDS
          : STEP_3_FIELDS;
    const valid = await form.trigger([...fields]);
    if (valid) setStep((s) => Math.min(4, s + 1));
  }

  function handlePrev() {
    setStep((s) => Math.max(1, s - 1));
  }

  const isLoading = open && !!student?.id && studentLoading;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Edit Student</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Step {step} of 4</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "h-2 w-full rounded-full transition-colors",
                      s < step && "bg-primary/60",
                      s === step && "bg-primary",
                      s > step && "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-1 min-h-0 flex-col"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-4 space-y-6">
                  {step === 1 && (
                    <>
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
                                size="lg"
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
                                <Input
                                  placeholder="John"
                                  className={inputClass}
                                  {...field}
                                />
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
                                <Input
                                  placeholder="Doe"
                                  className={inputClass}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Middle"
                                className={inputClass}
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
                                <DatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Pick date"
                                  disabled={updateStudent.isPending}
                                />
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
                              <FormControl>
                                <RadioGroup
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  className="flex gap-4 pt-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="MALE" id="edit-male" />
                                    <Label htmlFor="edit-male">Male</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="FEMALE" id="edit-female" />
                                    <Label htmlFor="edit-female">Female</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="OTHER" id="edit-other" />
                                    <Label htmlFor="edit-other">Other</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="residentialAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Residential Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Street, City, State"
                                className={inputClass}
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
                          name="studentEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student Email (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="student@example.com"
                                  className={inputClass}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="studentPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Student Phone (optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="+234 000 000 0000"
                                  className={inputClass}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <FormField
                        control={form.control}
                        name="enrollmentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enrollment / Admission Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Pick date"
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
                          name="classId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Class / Grade</FormLabel>
                              <Select
                                onValueChange={(v) => {
                                  field.onChange(v);
                                  form.setValue("sectionId", "");
                                }}
                                value={field.value}
                                disabled={classesLoading}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className={cn(inputClass, "h-9")}
                                  >
                                    <SelectValue placeholder="Select class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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
                          name="sectionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Section / Stream</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={sectionsLoading || !classId}
                              >
                                <FormControl>
                                  <SelectTrigger
                                    className={cn(inputClass, "h-9")}
                                  >
                                    <SelectValue placeholder="Select section" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredSections.map((s) => (
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
                      </div>
                      <FormField
                        control={form.control}
                        name="previousSchool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Previous School (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="School name"
                                className={inputClass}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="specialEducationNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Special Education Needs / Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any special needs or notes"
                                className={cn(inputClass, "min-h-20")}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {step === 3 && (
                    <Card className="border-border/60">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Parent / Guardian Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="linkExistingParent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link existing parent or create new?</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  value={field.value ? "link" : "create"}
                                  onValueChange={(v) =>
                                    field.onChange(v === "link")
                                  }
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="link" id="edit-link" />
                                    <Label htmlFor="edit-link">Link existing parent</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="create" id="edit-create" />
                                    <Label htmlFor="edit-create">Create new parent</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {linkExistingParent ? (
                          <FormField
                            control={form.control}
                            name="existingParentId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Select Parent</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={parentsLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(inputClass, "h-9")}
                                    >
                                      <SelectValue placeholder="Select parent" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {parents.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.profile.firstName} {p.profile.lastName} (
                                        {p.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : (
                          <>
                            <FormField
                              control={form.control}
                              name="guardianFullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Primary Guardian Full Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Full name"
                                      className={inputClass}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="guardianRelationship"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Relationship to Student</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger
                                        className={cn(inputClass, "h-9")}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {GUARDIAN_RELATIONSHIPS.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                          {r.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="whatsappSameAsPrimary"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={(e) =>
                                        field.onChange(e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-input"
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    WhatsApp same as primary phone
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2">
                              <FormField
                                control={form.control}
                                name="guardianPhone"
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormLabel>Primary Phone</FormLabel>
                                    <FormControl>
                                      <div className="flex">
                                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                          +234
                                        </span>
                                        <Input
                                          placeholder="800 000 0000"
                                          className={cn(
                                            inputClass,
                                            "rounded-l-none"
                                          )}
                                          {...field}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="guardianEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder="guardian@example.com"
                                      className={inputClass}
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
                                name="guardianOccupation"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Occupation</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Occupation"
                                        className={inputClass}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="guardianEmployer"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Employer</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Employer"
                                        className={inputClass}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="emergencyContactName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Emergency Contact Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Name"
                                        className={inputClass}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="emergencyContactPhone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Emergency Contact Phone</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="+234 000 000 0000"
                                        className={inputClass}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {step === 4 && (
                    <>
                      <FormField
                        control={form.control}
                        name="bloodGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Group</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className={cn(inputClass, "h-9")}
                                >
                                  <SelectValue placeholder="Select blood group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {BLOOD_GROUPS.map((bg) => (
                                  <SelectItem key={bg} value={bg}>
                                    {bg}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="allergies"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Known Allergies</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Peanuts, Penicillin"
                                className={inputClass}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicalConditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Underlying Medical Conditions</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any medical conditions to note"
                                className={cn(inputClass, "min-h-20")}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>

                <SheetFooter className="border-t pt-4 px-4 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={handlePrev}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  ) : null}
                  {step < 4 ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={updateStudent.isPending}
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
                  )}
                </SheetFooter>
              </form>
            </Form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
