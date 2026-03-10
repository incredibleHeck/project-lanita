"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CourseProgress {
  totalAssignments: number;
  completedAssignments: number;
}

interface Profile {
  firstName: string;
  lastName: string;
}

interface Teacher {
  id: string;
  profile: Profile | null;
}

interface Subject {
  id: string;
  name: string;
}

interface StudentCourseItem {
  id: string;
  name: string;
  description: string | null;
  subject: Subject;
  teacher: Teacher | null;
  progress: CourseProgress;
}

export default function StudentCoursesPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentCoursesContent />
    </RoleGuard>
  );
}

function StudentCoursesContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ["lms", "student", "courses", user?.id],
    queryFn: async () => {
      const response = await axios.get<StudentCourseItem[]>(
        "/lms/student/courses"
      );
      return response.data;
    },
    enabled: !!user?.id,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !courses) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load courses.
        </p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          No courses assigned to your class yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground">
          Courses for your enrolled subjects
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const teacherName = course.teacher?.profile
            ? `${course.teacher.profile.firstName} ${course.teacher.profile.lastName}`
            : "No teacher assigned";
          const total = course.progress.totalAssignments;
          const completed = course.progress.completedAssignments;
          const progressValue = total ? (completed / total) * 100 : 0;
          const description = course.description
            ? course.description.length > 120
              ? `${course.description.slice(0, 120)}...`
              : course.description
            : null;

          return (
            <Card key={course.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-2">{course.name}</CardTitle>
                <CardDescription>
                  {course.subject.name} · {teacherName}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Assignments</span>
                    <span>
                      {completed} of {total} completed
                    </span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="default">
                  <Link href={`/student/courses/${course.id}`}>
                    Go to Course
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
