"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axios from "@/lib/axios";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const submissionSchema = z
  .object({
    content: z.string().optional(),
    fileUrl: z.string().optional(),
  })
  .refine(
    (data) => !!(data.content?.trim() || data.fileUrl?.trim()),
    { message: "Either your answer or a file link is required", path: ["content"] },
  );

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface StudentSubmissionFormProps {
  assignmentId: string;
  onSuccess?: () => void;
  /** Custom submit button label (default: "Submit assignment") */
  submitLabel?: string;
}

export function StudentSubmissionForm({
  assignmentId,
  onSuccess,
  submitLabel = "Submit assignment",
}: StudentSubmissionFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      content: "",
      fileUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SubmissionFormData) => {
      return axios.post(`/lms/assignments/${assignmentId}/submissions`, {
        content: data.content,
        fileUrl: data.fileUrl || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully");
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["lms", "course"] });
      onSuccess?.();
    },
    onError: (
      error: Error & { response?: { data?: { message?: string }; status?: number } }
    ) => {
      if (error.response?.status === 409) {
        toast.error("You have already submitted this assignment");
      } else {
        toast.error(
          error.response?.data?.message || "Failed to submit assignment"
        );
      }
    },
  });

  const onSubmit = (data: SubmissionFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your answer</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Your answer..."
                  className="min-h-[160px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fileUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File link (optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="Optional: Paste a link to your file (e.g. Google Drive, Dropbox)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
