"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, GraduationCap, Loader2, Users } from "lucide-react";

interface Section {
  id: string;
  name: string;
  class: {
    id: string;
    name: string;
  };
}

interface StudentInPromotion {
  id: string;
  studentId: string;
  name: string;
  admissionNumber: string;
  currentSection: string;
  action: "PROMOTE" | "REPEAT" | "GRADUATE";
  selected: boolean;
}

interface PromoteStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoteStudentsDialog({
  open,
  onOpenChange,
}: PromoteStudentsDialogProps) {
  const queryClient = useQueryClient();
  const [sourceSectionId, setSourceSectionId] = useState<string>("");
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [defaultAction, setDefaultAction] = useState<"PROMOTE" | "REPEAT" | "GRADUATE">("PROMOTE");
  const [studentList, setStudentList] = useState<StudentInPromotion[]>([]);

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["all-sections"],
    queryFn: async () => {
      const res = await api.get("/sections");
      return res.data;
    },
    enabled: open,
  });

  const { isFetching: loadingStudents } = useQuery({
    queryKey: ["section-students-for-promotion", sourceSectionId],
    queryFn: async () => {
      if (!sourceSectionId) return [];
      const res = await api.get(`/students/section/${sourceSectionId}`);
      const mapped: StudentInPromotion[] = (res.data || []).map((s: {
        id: string;
        user?: { profile?: { firstName?: string; lastName?: string } };
        admissionNumber: string;
        currentSection?: { name: string; class?: { name: string } };
      }) => ({
        id: s.id,
        studentId: s.id,
        name: `${s.user?.profile?.firstName || ""} ${s.user?.profile?.lastName || ""}`.trim() || "Unknown",
        admissionNumber: s.admissionNumber || "N/A",
        currentSection: `${s.currentSection?.class?.name || ""} ${s.currentSection?.name || ""}`,
        action: defaultAction,
        selected: true,
      }));
      setStudentList(mapped);
      return res.data;
    },
    enabled: !!sourceSectionId && open,
  });

  const promoteMutation = useMutation({
    mutationFn: async () => {
      const selected = studentList.filter((s) => s.selected);
      if (selected.length === 0) {
        throw new Error("No students selected for promotion");
      }
      if (defaultAction !== "GRADUATE" && !targetSectionId) {
        throw new Error("Target section is required for promotion or repetition");
      }

      const payload = {
        promotions: selected.map((s) => ({
          studentId: s.id,
          targetSectionId: s.action === "GRADUATE" ? undefined : targetSectionId,
          action: s.action,
        })),
      };

      const res = await api.post("/students/promote", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Promotion batch processed successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onOpenChange(false);
      setStudentList([]);
      setSourceSectionId("");
      setTargetSectionId("");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || "Failed to promote students");
    },
  });

  const toggleSelectAll = (checked: boolean) => {
    setStudentList((prev) => prev.map((s) => ({ ...s, selected: checked })));
  };

  const updateStudentAction = (id: string, action: "PROMOTE" | "REPEAT" | "GRADUATE") => {
    setStudentList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, action } : s))
    );
  };

  const toggleStudent = (id: string) => {
    setStudentList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  };

  const selectedCount = studentList.filter((s) => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-6 w-6 text-primary" />
            Student Academic Promotion & Progression
          </DialogTitle>
          <DialogDescription>
            Advance students to their next academic grade, repeat classes, or mark final-year students as graduated.
          </DialogDescription>
        </DialogHeader>

        {/* Section Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Source Section (Current)
            </label>
            <Select value={sourceSectionId} onValueChange={setSourceSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select current class section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.class.name} - {sec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Target Section (Next Grade)
            </label>
            <Select
              value={targetSectionId}
              onValueChange={setTargetSectionId}
              disabled={defaultAction === "GRADUATE"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.class.name} - {sec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Default Action Selector */}
        <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
          <div>
            <span className="text-sm font-semibold block">Batch Action Policy</span>
            <span className="text-xs text-muted-foreground">
              Applied by default to all checked students in this section.
            </span>
          </div>
          <Select
            value={defaultAction}
            onValueChange={(val: "PROMOTE" | "REPEAT" | "GRADUATE") => {
              setDefaultAction(val);
              setStudentList((prev) => prev.map((s) => ({ ...s, action: val })));
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROMOTE">Promote</SelectItem>
              <SelectItem value="REPEAT">Repeat Class</SelectItem>
              <SelectItem value="GRADUATE">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        <div className="flex-1 overflow-y-auto border rounded-lg p-2 min-h-[220px]">
          {loadingStudents ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Loading enrolled students...</span>
            </div>
          ) : studentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground text-center">
              <Users className="h-10 w-10 opacity-40" />
              <span className="text-sm font-medium">
                {sourceSectionId ? "No students enrolled in this section" : "Select a source section above"}
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground border-b mb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCount === studentList.length && studentList.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Select All ({selectedCount}/{studentList.length})</span>
                </label>
                <span>Individual Decision</span>
              </div>

              {studentList.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.selected}
                      onChange={() => toggleStudent(st.id)}
                      className="rounded border-gray-300"
                    />
                    <div>
                      <span className="font-medium block leading-tight">{st.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {st.admissionNumber}
                      </span>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    <Select
                      value={st.action}
                      onValueChange={(val: "PROMOTE" | "REPEAT" | "GRADUATE") =>
                        updateStudentAction(st.id, val)
                      }
                      disabled={!st.selected}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PROMOTE">Promote</SelectItem>
                        <SelectItem value="REPEAT">Repeat</SelectItem>
                        <SelectItem value="GRADUATE">Graduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => promoteMutation.mutate()}
            disabled={selectedCount === 0 || promoteMutation.isPending}
            className="gap-2"
          >
            {promoteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            Execute Promotion ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
