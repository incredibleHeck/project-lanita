"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ClipboardList,
  ExternalLink,
  FileDown,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Play,
  Plus,
  Send,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Material {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
  resourceUrl: string | null;
  order: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
  submission: { id: string; createdAt: string } | null;
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1).split("/")[0];
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function MaterialTypeIcon({ type }: { type: string }) {
  if (type === "YOUTUBE")
    return <Youtube className="h-5 w-5 text-red-600" />;
  if (type === "LINK") return <LinkIcon className="h-5 w-5 text-green-600" />;
  return <Paperclip className="h-5 w-5 text-blue-600" />;
}

export default function StudentMaterialViewerPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentMaterialViewerContent />
    </RoleGuard>
  );
}

function getAssignmentStatus(
  assignment: Assignment,
): "Assigned" | "Turned In" | "Missing" {
  if (assignment.submission) return "Turned In";
  if (assignment.dueDate && new Date(assignment.dueDate) < new Date())
    return "Missing";
  return "Assigned";
}

function StudentMaterialViewerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const materialId = params.materialId as string;
  const kind = searchParams.get("kind");

  const isAssignment = kind === "assignment";

  const { data: material, isLoading, isError } = useQuery({
    queryKey: ["lms", "material", materialId],
    queryFn: async () => {
      const response = await api.get<Material>(`/lms/materials/${materialId}`);
      return response.data;
    },
    enabled: !!materialId && !isAssignment,
  });

  const { data: assignment, isLoading: assignmentLoading, isError: assignmentError } = useQuery({
    queryKey: ["lms", "assignment", materialId],
    queryFn: async () => {
      const response = await api.get<Assignment>(`/lms/assignments/${materialId}`);
      return response.data;
    },
    enabled: !!materialId && isAssignment,
  });

  const isLoadingAny = isAssignment ? assignmentLoading : isLoading;
  const isErrorAny = isAssignment ? assignmentError : isError;
  const data = isAssignment ? assignment : material;

  if (isLoadingAny) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isErrorAny || !data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Link href={`/student/courses/${courseId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
        </Link>
        <p className="text-muted-foreground">This could not be loaded.</p>
      </div>
    );
  }

  if (isAssignment && assignment) {
    return (
      <AssignmentView
        assignment={assignment}
        courseId={courseId}
        materialId={materialId}
      />
    );
  }

  if (material) {
    return (
      <MaterialView material={material} courseId={courseId} />
    );
  }

  return null;
}

function AssignmentView({
  assignment,
  courseId,
  materialId,
}: {
  assignment: Assignment;
  courseId: string;
  materialId: string;
}) {
  const status = getAssignmentStatus(assignment);
  const queryClient = useQueryClient();

  const [showAddWorkForm, setShowAddWorkForm] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionContent, setSubmissionContent] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fileUrl: submissionUrl?.trim() || undefined,
        content: submissionContent?.trim() || undefined,
      };
      return api.post(
        `/lms/assignments/${assignment.id}/submissions`,
        payload,
      );
    },
    onSuccess: () => {
      toast.success("Your work has been turned in.");
      setShowAddWorkForm(false);
      setSubmissionUrl("");
      setSubmissionContent("");
      queryClient.invalidateQueries({ queryKey: ["lms", "assignment", materialId] });
      queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] });
    },
    onError: (
      error: Error & { response?: { data?: { message?: string }; status?: number } },
    ) => {
      if (error.response?.status === 409) {
        toast.error("You have already submitted this assignment");
      } else {
        toast.error(
          error.response?.data?.message ?? "Failed to turn in. Please try again.",
        );
      }
    },
  });

  const hasWork = !!(submissionUrl?.trim() || submissionContent?.trim());
  const canTurnIn = !assignment.submission && hasWork && !mutation.isPending;

  const handleTurnIn = () => {
    if (!canTurnIn) return;
    if (!hasWork) {
      toast.error("Add work before turning in.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href={`/student/courses/${courseId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center rounded-full bg-muted p-1.5">
            <ClipboardList className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold truncate">{assignment.title}</h1>
        </div>
      </div>

      {/* Grid: 2/3 content, 1/3 Your Work — single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {/* Main content — assignment details */}
        <div className="md:col-span-2 min-w-0 flex flex-col gap-4">
          {assignment.dueDate && (
            <p className="text-sm text-muted-foreground">
              Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
              {assignment.maxScore != null && ` • ${assignment.maxScore} pts`}
            </p>
          )}
          {assignment.description && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Instructions
              </h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {assignment.description}
              </p>
            </div>
          )}
        </div>

        {/* Your Work panel — below content on mobile */}
        <div className="md:col-span-1">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-base">Your Work</CardTitle>
              <CardDescription className="sr-only">Submission status</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <Badge
                  variant={
                    status === "Turned In"
                      ? "success"
                      : status === "Missing"
                        ? "destructive-soft"
                        : "secondary"
                  }
                >
                  {status}
                </Badge>
              </div>

              {assignment.submission ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-green-600">
                    You turned in your work.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted on{" "}
                    {format(
                      new Date(assignment.submission.createdAt),
                      "MMM d, yyyy",
                    )}
                  </p>
                </div>
              ) : showAddWorkForm ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      File link
                    </label>
                    <Input
                      type="url"
                      placeholder="Paste a link (e.g. Google Drive, Dropbox)"
                      value={submissionUrl}
                      onChange={(e) => setSubmissionUrl(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Notes
                    </label>
                    <Textarea
                      placeholder="Add a short note or your answer..."
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      className="mt-1.5 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  <p className="text-sm text-muted-foreground text-center">
                    No file added yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowAddWorkForm(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add work
                  </Button>
                </div>
              )}

              <Button
                className="w-full gap-2"
                disabled={!canTurnIn}
                onClick={handleTurnIn}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Turning in...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Turn In
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MaterialView({
  material,
  courseId,
}: {
  material: Material;
  courseId: string;
}) {
  const embedUrl = material.resourceUrl
    ? getYouTubeEmbedUrl(material.resourceUrl)
    : null;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href={`/student/courses/${courseId}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center rounded-full bg-muted p-1.5">
            <MaterialTypeIcon type={material.materialType} />
          </div>
          <h1 className="text-xl font-semibold truncate">{material.title}</h1>
        </div>
      </div>

      {/* Dynamic content area */}
      <div className="w-full flex justify-center">
        {material.materialType === "YOUTUBE" && embedUrl && (
          <div className="aspect-video w-full max-w-4xl rounded-lg overflow-hidden border border-border bg-black">
            <iframe
              src={embedUrl}
              title={material.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}

        {material.materialType === "YOUTUBE" && !embedUrl && (
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Video link
              </CardTitle>
              <CardDescription>
                No embed available. You can open the link in a new tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {material.resourceUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(material.resourceUrl!, "_blank", "noopener,noreferrer")}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open video
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {material.materialType === "LINK" && (
          <Card className="w-full max-w-4xl cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                External Link
              </CardTitle>
              <CardDescription>
                Open this resource in a new tab.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() =>
                  material.resourceUrl &&
                  window.open(material.resourceUrl, "_blank", "noopener,noreferrer")
                }
                disabled={!material.resourceUrl}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open link
              </Button>
            </CardContent>
          </Card>
        )}

        {material.materialType === "FILE" && (
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Download File
              </CardTitle>
              <CardDescription>
                Download this file to your device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {material.resourceUrl ? (
                <Button asChild className="gap-2">
                  <a
                    href={material.resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileDown className="h-4 w-4" />
                    Download file
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No file link available yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      {material.description && (
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-foreground mb-2">
            Description
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {material.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
