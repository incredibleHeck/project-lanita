"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StreamPostCard, type StreamAnnouncement } from "@/components/lms/stream-post-card";
import {
  BookOpen,
  Clipboard,
  Link as LinkIcon,
  MessageSquare,
  Paperclip,
  Play,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl?: string | null;
  orderIndex: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
  resourceUrl: string | null;
  order: number;
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
  materials: Material[];
  assignments: Assignment[];
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  subject: { id: string; name: string; code: string | null };
  teacher: { id: string; profile: { firstName: string; lastName: string } } | null;
  modules: CourseModule[];
}

type ItemKind = "material" | "lesson" | "assignment";

function StudentMaterialItemRow({
  type,
  title,
  subtitle,
  href,
}: {
  type: "material" | "video" | "assignment" | "link";
  title: string;
  subtitle: string;
  href: string;
}) {
  const iconConfig =
    type === "assignment"
      ? { bg: "bg-green-500/20", icon: Clipboard, iconColor: "text-green-600" }
      : type === "video"
        ? { bg: "bg-red-500/20", icon: Play, iconColor: "text-red-600" }
        : type === "link"
          ? { bg: "bg-green-500/20", icon: LinkIcon, iconColor: "text-green-600" }
          : { bg: "bg-blue-500/20", icon: Paperclip, iconColor: "text-blue-600" };

  const Icon = iconConfig.icon;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors group block"
    >
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${iconConfig.bg} ${iconConfig.iconColor}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </Link>
  );
}

export default function StudentCoursePage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentCourseContent />
    </RoleGuard>
  );
}

function StudentCourseContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = tabFromUrl === "classwork" || tabFromUrl === "people" ? tabFromUrl : "stream";

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: async () => {
      const response = await api.get<Course>(
        `/lms/courses/${courseId}/classwork`,
      );
      return response.data;
    },
    enabled: !!courseId,
  });

  const { data: streamPosts = [], isLoading: streamLoading } = useQuery({
    queryKey: ["lms", "stream", courseId],
    queryFn: async () => {
      const response = await api.get<StreamAnnouncement[]>(
        `/announcements?courseId=${courseId}`,
      );
      return response.data;
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load course. It may not exist or you may not have access.
        </p>
        <Link href="/student/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  const sortedModules = [...(course.modules || [])].sort(
    (a, b) => a.order - b.order,
  );

  const now = new Date();
  const allAssignments = sortedModules.flatMap((m) => (m.assignments ?? []));
  const upcomingAssignments = allAssignments
    .filter((a) => a.dueDate && new Date(a.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/student/courses" className="hover:underline">
          Courses
        </Link>
        <span>/</span>
        <span className="text-foreground">{course.name}</span>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start rounded-lg border border-border/60 bg-muted/50 p-1">
          <TabsTrigger value="stream" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Stream
          </TabsTrigger>
          <TabsTrigger value="classwork" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classwork
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stream" className="mt-6">
          {/* Stream Hero Banner (no Customize, no Class code) */}
          <div className="relative h-[240px] rounded-xl overflow-hidden bg-gradient-to-r from-blue-600 to-blue-400">
            <div className="absolute bottom-4 left-6">
              <h2 className="text-3xl font-bold text-white">{course.name}</h2>
              <p className="text-lg text-white/90 mt-1">
                {course.subject?.name ?? "—"}
              </p>
            </div>
          </div>

          {/* Master Grid: 2-column layout (same as teacher) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
            {/* Left column: Meet + Upcoming cards */}
            <div className="col-span-1 md:col-span-3 space-y-4">
              {/* Meet Card */}
              <Card className="rounded-lg border border-border/60 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Meet</span>
                  </div>
                  <Button variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0" asChild>
                    <Link href="#">Join</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Upcoming Card */}
              <Card className="rounded-lg border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold">Upcoming</CardTitle>
                  <Link
                    href={`/student/courses/${courseId}?tab=classwork`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View all
                  </Link>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {upcomingAssignments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Woohoo, no work due in soon!
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {upcomingAssignments.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/student/courses/${courseId}/materials/${a.id}?kind=assignment`}
                            className="text-sm font-medium text-foreground hover:underline block truncate"
                          >
                            {a.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Due {a.dueDate ? format(new Date(a.dueDate), "EEE, MMM d 'at' h:mm a") : "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column: Feed only (no Create Post) */}
            <div className="col-span-1 md:col-span-9">
              {streamLoading ? (
                <div className="space-y-0">
                  {[1, 2].map((i) => (
                    <Card key={i} className="py-6 mb-4">
                      <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : streamPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-16 px-6">
                  <MessageSquare className="h-14 w-14 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center max-w-sm">
                    No posts yet. Your teacher may post announcements here.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {streamPosts.map((post) => {
                    const linkHref =
                      post.isSystemPost && post.linkedEntityId
                        ? post.linkedEntityType === "ASSIGNMENT"
                          ? `/student/courses/${courseId}/materials/${post.linkedEntityId}?kind=assignment`
                          : `/student/courses/${courseId}/materials/${post.linkedEntityId}`
                        : undefined;
                    return (
                      <StreamPostCard
                        key={post.id}
                        post={post}
                        courseId={courseId}
                        linkHref={linkHref}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="classwork" className="mt-6">
          {sortedModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-lg border border-dashed border-border">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No classwork yet. Check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {sortedModules.map((mod, idx) => {
                const sortedLessons = [...(mod.lessons ?? [])].sort(
                  (a, b) => a.orderIndex - b.orderIndex,
                );
                const sortedMaterials = [...(mod.materials ?? [])].sort(
                  (a, b) => a.order - b.order,
                );
                const materialItems: Array<{
                  id: string;
                  kind: ItemKind;
                  type: "material" | "video" | "assignment" | "link";
                  title: string;
                  subtitle: string;
                }> = [
                  ...sortedLessons.map((lesson) => ({
                    id: lesson.id,
                    kind: "lesson" as const,
type: (lesson.videoUrl ? "video" : "material") as "video" | "material",
                    title: lesson.title,
                    subtitle: "Added recently",
                  })),
                  ...sortedMaterials.map((m) => ({
                    id: m.id,
                    kind: "material" as const,
                    type:
                      m.materialType === "YOUTUBE"
                        ? ("video" as const)
                        : m.materialType === "LINK"
                          ? ("link" as const)
                          : ("material" as const),
                    title: m.title,
                    subtitle: m.resourceUrl ? "Link" : "Added recently",
                  })),
                  ...(mod.assignments ?? []).map((a) => ({
                    id: a.id,
                    kind: "assignment" as const,
                    type: "assignment" as const,
                    title: a.title,
                    subtitle: a.dueDate
                      ? `Due ${format(new Date(a.dueDate), "MMM d, yyyy")}`
                      : "No due date",
                  })),
                ];

                return (
                  <div key={mod.id}>
                    <h2 className="font-bold text-2xl border-b-2 border-foreground pb-2 mb-4">
                      Week {idx + 1}: {mod.title}
                    </h2>
                    <div className="space-y-1">
                      {materialItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No materials yet.
                        </p>
                      ) : (
                        materialItems.map((item) => (
                          <StudentMaterialItemRow
                            key={`${item.kind}-${item.id}`}
                            type={item.type}
                            title={item.title}
                            subtitle={item.subtitle}
                            href={`/student/courses/${courseId}/materials/${item.id}${item.kind === "assignment" ? "?kind=assignment" : ""}`}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Classmates will appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
