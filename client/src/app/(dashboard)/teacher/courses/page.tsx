"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { AddCourseSheet } from "@/components/lms/add-course-sheet";

interface Course {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  subjectId: string;
  teacherId?: string | null;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  teacher?: { id: string } | null;
  modules?: { id: string }[];
}

export default function TeacherCoursesPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherCoursesContent />
    </RoleGuard>
  );
}

function TeacherCoursesContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ["lms", "courses"],
    queryFn: async () => {
      const response = await api.get<Course[]>("/lms/courses");
      return response.data;
    },
    enabled: !!user?.id,
  });

  const myCourses = courses?.filter((c) => c.teacherId === user?.id) ?? [];

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Failed to load your courses. Please try again.</p>
      </div>
    );
  }

  if (myCourses.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <AddCourseSheet />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] rounded-lg border border-dashed">
          <BookOpen className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No courses yet.</p>
          <p className="text-sm text-muted-foreground">Add your first course to get started.</p>
          <AddCourseSheet />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <AddCourseSheet />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {myCourses.map((course) => (
          <Link key={course.id} href={`/teacher/courses/${course.id}`}>
            <Card className="flex flex-col h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{course.name}</CardTitle>
                <CardDescription>
                  {course.subject.name}
                  {course.description ? ` · ${course.description.slice(0, 60)}${course.description.length > 60 ? "…" : ""}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="text-sm text-muted-foreground">
                  {course.modules?.length ?? 0} module{(course.modules?.length ?? 0) !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
