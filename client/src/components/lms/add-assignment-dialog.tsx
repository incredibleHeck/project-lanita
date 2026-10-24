"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { typedZodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Link as LinkIcon, Paperclip } from "lucide-react";

const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().int().min(0).optional(),
  attachmentUrl: z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional(),
  formUrl: z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

interface AddAssignmentDialogProps {
  moduleId: string;
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAssignmentDialog({
  moduleId,
  courseId,
  open,
  onOpenChange,
  onSuccess,
}: AddAssignmentDialogProps) {
  const queryClient = useQueryClient();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const form = useForm<AssignmentFormData>({
    resolver: typedZodResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      maxScore: undefined,
      attachmentUrl: "",
      formUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      let attachmentUrl: string | undefined = data.attachmentUrl?.trim() || undefined;
      if (attachmentFile) {
        const formData = new FormData();
        formData.append("file", attachmentFile);
        const uploadRes = await api.post<{ url: string }>("/lms/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const base = api.defaults.baseURL ?? "";
        attachmentUrl = (base.replace(/\/$/, "") + uploadRes.data.url) || undefined;
      }
      return api.post(`/lms/modules/${moduleId}/assignments`, {
        title: data.title,
        description: data.description || undefined,
        dueDate: data.dueDate || undefined,
        maxScore: data.maxScore,
        attachmentUrl,
        formUrl: data.formUrl?.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Assignment added successfully");
      queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] });
      setAttachmentFile(null);
      form.reset({ title: "", description: "", dueDate: "", maxScore: undefined, attachmentUrl: "", formUrl: "" });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to add assignment");
    },
  });

  const onSubmit = (data: AssignmentFormData) => {
    mutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setAttachmentFile(null);
    if (!newOpen) {
      form.reset({ title: "", description: "", dueDate: "", maxScore: undefined, attachmentUrl: "", formUrl: "" });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Assignment</DialogTitle>
          <DialogDescription>
            Add a new assignment to this module.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Quiz 1: Linear Equations" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                      placeholder="Assignment instructions..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Score (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 100"
                      {...field}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Attach assignment (optional)</p>
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2 text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Upload file
                </FormLabel>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,image/jpeg,image/png,image/gif,image/webp,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="cursor-pointer bg-white border-border file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
                {attachmentFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <FormField
                control={form.control}
                name="attachmentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Or paste a document link
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://... (PDF, Google Doc, etc.)"
                        className="bg-white border-border"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Upload a file above or paste a link. Max 10MB for uploads.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="formUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-muted-foreground">
                      <LinkIcon className="h-4 w-4" />
                      Google Form
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://docs.google.com/forms/..."
                        className="bg-white border-border"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Adding..." : "Add Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
