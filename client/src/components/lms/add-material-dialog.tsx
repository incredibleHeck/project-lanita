"use client";

import { useState, useEffect } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Link as LinkIcon, Paperclip, Youtube } from "lucide-react";

const materialSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    moduleId: z.string().min(1, "Select a topic"),
    materialType: z.enum(["file", "youtube", "link"]),
    youtubeUrl: z.string().optional(),
    linkUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.materialType === "youtube") return !!data.youtubeUrl?.trim();
      return true;
    },
    { message: "YouTube URL is required", path: ["youtubeUrl"] }
  )
  .refine(
    (data) => {
      if (data.materialType === "link") return !!data.linkUrl?.trim();
      return true;
    },
    { message: "Website URL is required", path: ["linkUrl"] }
  );

type MaterialFormData = z.infer<typeof materialSchema>;

export interface AddMaterialDialogModules {
  id: string;
  title: string;
}

export type MaterialTypeOption = "file" | "youtube" | "link";

interface AddMaterialDialogProps {
  courseId: string;
  modules: AddMaterialDialogModules[];
  /** When set, dialog opens with this type pre-selected (e.g. from "File" or "Link" in Create dropdown) */
  defaultMaterialType?: MaterialTypeOption;
  /** Controlled: open state */
  open?: boolean;
  /** Controlled: open state setter */
  onOpenChange?: (open: boolean) => void;
  /** Uncontrolled: trigger element (e.g. <Button>Add Material</Button>) */
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function AddMaterialDialog({
  courseId,
  modules,
  defaultMaterialType,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
  onSuccess,
}: AddMaterialDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange != null;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  const queryClient = useQueryClient();

  const form = useForm<MaterialFormData>({
    resolver: typedZodResolver(materialSchema),
    defaultValues: {
      title: "",
      description: "",
      moduleId: "",
      materialType: defaultMaterialType ?? "file",
      youtubeUrl: "",
      linkUrl: "",
    },
  });

  // When dialog opens, reset form and clear file selection
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      form.reset({
        title: "",
        description: "",
        moduleId: "",
        materialType: defaultMaterialType ?? "file",
        youtubeUrl: "",
        linkUrl: "",
      });
    }
  }, [open, defaultMaterialType]);

  const materialType = form.watch("materialType");

  const mutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      let resourceUrl: string | undefined;
      if (data.materialType === "youtube") {
        resourceUrl = data.youtubeUrl?.trim() || undefined;
      } else if (data.materialType === "link") {
        resourceUrl = data.linkUrl?.trim() || undefined;
      } else {
        // file: upload first, then use returned URL
        if (!selectedFile) {
          throw new Error("Please select a file to upload");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await api.post<{ url: string }>("/lms/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const base = api.defaults.baseURL ?? "";
        resourceUrl = (base.replace(/\/$/, "") + uploadRes.data.url) || undefined;
      }
      const payload = {
        title: data.title,
        description: data.description || undefined,
        moduleId: data.moduleId,
        materialType: data.materialType.toUpperCase() as "FILE" | "YOUTUBE" | "LINK",
        resourceUrl,
      };
      return api.post(
        `/lms/courses/${courseId}/modules/${data.moduleId}/materials`,
        payload,
      );
    },
    onSuccess: () => {
      toast.success("Material added successfully");
      queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] });
      resetAndClose();
      onSuccess?.();
    },
    onError: (error: Error & { response?: { data?: { message?: string | string[] } } }) => {
      const msg = error.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg ?? error.message;
      toast.error(text ?? "Failed to add material");
    },
  });

  const resetAndClose = () => {
    setSelectedFile(null);
    form.reset({
      title: "",
      description: "",
      moduleId: "",
      materialType: defaultMaterialType ?? "file",
      youtubeUrl: "",
      linkUrl: "",
    });
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedFile(null);
      form.reset();
    }
    setOpen(next);
  };

  const onSubmit = (data: MaterialFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children != null && (
        <DialogTrigger asChild>{children}</DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-[480px] border-2 border-border bg-white"
        style={{ backgroundColor: "hsl(0 0% 100%)" }}
      >
        <DialogHeader>
          <DialogTitle>Add Material</DialogTitle>
          <DialogDescription>
            Add a file, YouTube video, or link to this course.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Chapter 1 notes"
                      className="bg-white border-border"
                      {...field}
                    />
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
                    <Textarea
                      placeholder="Brief description of the material..."
                      className="min-h-[80px] bg-white border-border resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moduleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={modules.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full bg-white border-border">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modules.map((mod) => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modules.length === 0 && (
                    <FormDescription>Create a module first.</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="materialType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="file" id="type-file" />
                        <label
                          htmlFor="type-file"
                          className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          File
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="youtube" id="type-youtube" />
                        <label
                          htmlFor="type-youtube"
                          className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                        >
                          <Youtube className="h-4 w-4 text-muted-foreground" />
                          YouTube
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="link" id="type-link" />
                        <label
                          htmlFor="type-link"
                          className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                        >
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          Link
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {materialType === "file" && (
              <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-6">
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Upload file
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,image/jpeg,image/png,image/gif,image/webp,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="cursor-pointer bg-white border-border file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                      />
                      {selectedFile && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    PDF, Word, images (JPEG, PNG, GIF, WebP), or text. Max 10MB.
                  </FormDescription>
                </FormItem>
              </div>
            )}

            {materialType === "youtube" && (
              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="bg-white border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Paste a link to a YouTube video.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {materialType === "link" && (
              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        className="bg-white border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="border-t border-border pt-4 mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Posting…" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
