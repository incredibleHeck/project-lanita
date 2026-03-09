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

interface ClassItem {
  id: string;
  name: string;
  code: string;
  _count?: { sections: number };
}

interface DeleteClassDialogProps {
  classItem: ClassItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteClassDialog({
  classItem,
  open,
  onOpenChange,
  onDeleted,
}: DeleteClassDialogProps) {
  const queryClient = useQueryClient();

  const deleteClass = useMutation({
    mutationFn: async (id: string) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      toast.success("Class deleted successfully");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      onDeleted?.();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const message =
        error?.response?.data?.message ?? "Failed to delete class. Please try again.";
      toast.error(message);
    },
  });

  function handleConfirm() {
    if (!classItem) return;
    deleteClass.mutate(classItem.id);
  }

  const sectionCount = classItem?._count?.sections ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Class</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{classItem?.name}&quot;?
            {sectionCount > 0 && (
              <span className="mt-2 block text-amber-600 dark:text-amber-500">
                This will remove the class and its {sectionCount} section
                {sectionCount !== 1 ? "s" : ""}. This action cannot be undone.
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
            disabled={deleteClass.isPending}
          >
            {deleteClass.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Class"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
