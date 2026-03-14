"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Clipboard,
  Link as LinkIcon,
  Paperclip,
  Play,
  Users,
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
  const courseId = params.courseId as string;

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

  const teacherName = course.teacher?.profile
    ? `${course.teacher.profile.firstName} ${course.teacher.profile.lastName}`
    : "Teacher";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/student/courses" className="hover:underline">
          Courses
        </Link>
        <span>/</span>
        <span className="text-foreground">{course.name}</span>
      </div>

      {/* Hero Header — Google Classroom–style banner */}
      <div className="h-48 rounded-2xl p-6 relative overflow-hidden bg-[hsl(0,0%,16%)]">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 h-full flex flex-col justify-end">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {course.name}
          </h1>
          <p className="text-white/90 text-sm mt-1">
            Class / Section: {course.subject?.name ?? "—"}
          </p>
          <p className="text-white/80 text-sm mt-0.5">{teacherName}</p>
        </div>
      </div>

      <Tabs defaultValue="classwork" className="w-full">
        <TabsList className="w-full justify-start rounded-lg border border-border/60 bg-muted/50 p-1">
          <TabsTrigger value="classwork" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Classwork
          </TabsTrigger>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
        </TabsList>

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
                    type: (lesson.videoUrl ? "video" : "material") as const,
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
