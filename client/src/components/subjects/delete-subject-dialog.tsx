"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Subject {
  id: string;
  name: string;
}

interface DeleteSubjectDialogProps {
  subject: Subject | null;
  usage?: { classCount: number; teacherCount: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteSubjectDialog({
  subject,
  usage = { classCount: 0, teacherCount: 0 },
  open,
  onOpenChange,
  onDeleted,
}: DeleteSubjectDialogProps) {
  const queryClient = useQueryClient();

  const deleteSubject = useMutation({
    mutationFn: async (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: () => {
      toast.success("Subject deleted successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onDeleted?.();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to delete subject. Please try again.";
      toast.error(message);
    },
  });

  function handleConfirm() {
    if (!subject) return;
    deleteSubject.mutate(subject.id);
  }

  const hasUsage = usage.classCount > 0 || usage.teacherCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Subject</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{subject?.name}&quot;?
            {hasUsage && (
              <span className="mt-2 block text-amber-600">
                Warning: This subject is in use. It will be removed from{" "}
                {usage.teacherCount > 0 && `${usage.teacherCount} teacher(s)`}
                {usage.teacherCount > 0 && usage.classCount > 0 && " and "}
                {usage.classCount > 0 && `${usage.classCount} class(es)`}.
                This action cannot be undone.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteSubject.isPending}
          >
            {deleteSubject.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
