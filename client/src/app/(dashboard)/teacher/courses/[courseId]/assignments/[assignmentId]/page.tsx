"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ExternalLink, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface SubmissionInfo {
  id: string;
  content: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
}

interface StudentRow {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: "Turned In" | "Graded" | "Missing";
  submission: SubmissionInfo | null;
}

interface GradingData {
  assignment: {
    id: string;
    title: string;
    dueDate: string | null;
    maxScore: number | null;
  };
  courseId: string | null;
  students: StudentRow[];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function TeacherAssignmentGradingPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherAssignmentGradingContent />
    </RoleGuard>
  );
}

function TeacherAssignmentGradingContent() {
  const params = useParams();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;
  const queryClient = useQueryClient();

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lms", "assignment-submissions", assignmentId],
    queryFn: async () => {
      const response = await api.get<GradingData>(
        `/lms/assignments/${assignmentId}/submissions`,
      );
      return response.data;
    },
    enabled: !!assignmentId,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({
      submissionId,
      grade,
      feedback,
    }: {
      submissionId: string;
      grade: number;
      feedback?: string;
    }) => {
      return api.patch(`/lms/submissions/${submissionId}/grade`, {
        grade,
        feedback: feedback?.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Grade returned.");
      queryClient.invalidateQueries({
        queryKey: ["lms", "assignment-submissions", assignmentId],
      });
      setGradeInput("");
      setFeedbackInput("");
    },
    onError: (
      err: Error & { response?: { data?: { message?: string } } },
    ) => {
      toast.error(err.response?.data?.message ?? "Failed to save grade.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Link href={`/teacher/courses/${courseId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Classwork
          </Button>
        </Link>
        <p className="text-muted-foreground">
          Failed to load this assignment.
        </p>
      </div>
    );
  }

  const assignment = data.assignment;
  const students = data.students ?? [];
  const turnedInCount = students.filter(
    (s) => s.status === "Turned In" || s.status === "Graded",
  ).length;
  const totalCount = students.length;
  const activeStudent = activeStudentId
    ? students.find((s) => s.id === activeStudentId)
    : null;

  const maxScore = assignment.maxScore ?? 100;
  const handleReturnGrade = () => {
    if (!activeStudent?.submission) return;
    const num = Number(gradeInput);
    if (Number.isNaN(num) || num < 0 || num > maxScore) {
      toast.error(`Enter a grade between 0 and ${maxScore}`);
      return;
    }
    gradeMutation.mutate({
      submissionId: activeStudent.submission.id,
      grade: num,
      feedback: feedbackInput.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <Link href={`/teacher/courses/${courseId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Classwork
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {assignment.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {assignment.dueDate && (
            <span>
              Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
            </span>
          )}
          <span className="font-medium text-foreground">
            {turnedInCount} / {totalCount} Turned In
          </span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[480px]">
        {/* Left: Student list */}
        <div className="lg:col-span-1 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Students</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {students.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No students in this class.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {students.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStudentId(student.id);
                        setGradeInput(
                          student.submission?.score != null
                            ? String(student.submission.score)
                            : "",
                        );
                        setFeedbackInput(
                          student.submission?.feedback ?? "",
                        );
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        activeStudentId === student.id
                          ? "bg-muted border-l-2 border-l-foreground"
                          : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {student.avatarUrl ? (
                          <AvatarImage
                            src={student.avatarUrl}
                            alt={student.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs bg-muted text-foreground">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {student.name}
                        </p>
                        <Badge
                          variant={
                            student.status === "Graded"
                              ? "secondary"
                              : student.status === "Turned In"
                                ? "success"
                                : "destructive-soft"
                          }
                          className="text-xs mt-0.5"
                        >
                          {student.status}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Grading panel */}
        <div className="lg:col-span-2 border border-border rounded-xl bg-card overflow-hidden flex flex-col">
          {!activeStudent ? (
            <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-sm">
              Select a student to view and grade their work.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {activeStudent.name}
                </h2>
                <Badge
                  variant={
                    activeStudent.status === "Graded"
                      ? "secondary"
                      : activeStudent.status === "Turned In"
                        ? "success"
                        : "destructive-soft"
                  }
                >
                  {activeStudent.status}
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {!activeStudent.submission ? (
                  <p className="text-sm text-muted-foreground">
                    No submission yet.
                  </p>
                ) : (
                  <>
                    {activeStudent.submission.fileUrl && (
                      <div>
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto gap-2"
                          onClick={() =>
                            window.open(
                              activeStudent.submission!.fileUrl!,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open work in new tab
                        </Button>
                      </div>
                    )}
                    {activeStudent.submission.content && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">
                          Submission
                        </h3>
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {activeStudent.submission.content}
                          </p>
                        </div>
                      </div>
                    )}
                    {!activeStudent.submission.fileUrl &&
                      !activeStudent.submission.content && (
                        <p className="text-sm text-muted-foreground">
                          No content or link submitted.
                        </p>
                      )}

                    <div className="space-y-4 pt-4 border-t border-border">
                      <div>
                        <label
                          htmlFor="grade-input"
                          className="text-sm font-semibold text-foreground block mb-1.5"
                        >
                          Grade (out of {maxScore})
                        </label>
                        <Input
                          id="grade-input"
                          type="number"
                          min={0}
                          max={maxScore}
                          step={0.5}
                          placeholder="0"
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          className="max-w-[120px] bg-white border-border"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="feedback-input"
                          className="text-sm font-semibold text-foreground block mb-1.5"
                        >
                          Private feedback
                        </label>
                        <Textarea
                          id="feedback-input"
                          placeholder="Optional feedback for the student..."
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          className="min-h-[100px] resize-none bg-white border-border"
                        />
                      </div>
                      <Button
                        className="w-full gap-2"
                        onClick={handleReturnGrade}
                        disabled={gradeMutation.isPending}
                      >
                        {gradeMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Return Grade
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
