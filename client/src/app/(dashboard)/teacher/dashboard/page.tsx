"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface SubjectAllocation {
  id: string;
  section: {
    id: string;
    name: string;
    class: {
      name: string;
      code: string;
    };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: {
    name: string;
  };
}

export default function TeacherDashboardPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherDashboardContent />
    </RoleGuard>
  );
}

function TeacherDashboardContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: allocations, isLoading } = useQuery({
    queryKey: ["allocations", "teacher", user?.id],
    queryFn: async () => {
      const response = await axios.get<SubjectAllocation[]>(
        `/allocations/teacher/${user?.id}`,
      );
      return response.data;
    },
    enabled: !!user?.id,
  });

  const displayName =
    user?.email?.split("@")[0]?.replace(/[._]/g, " ") || "Teacher";
  const classCount = allocations?.length ?? 0;

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {displayName}. Here&apos;s an overview of your teaching
          activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classCount}</div>
            <p className="text-xs text-muted-foreground">
              Class allocations this year
            </p>
            <Link href="/teacher/classes" className="mt-2 block">
              <Button variant="link" className="h-auto p-0">
                View classes <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Take attendance for your classes
            </p>
            <Link href="/teacher/classes" className="mt-2 block">
              <Button variant="outline" size="sm">
                Take Attendance
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Courses</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage LMS courses and content
            </p>
            <Link href="/teacher/courses" className="mt-2 block">
              <Button variant="outline" size="sm">
                Go to Courses
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {allocations && allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Quick access – Your classes
            </CardTitle>
            <CardDescription>
              Jump directly to take attendance for a class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allocations.slice(0, 6).map((allocation) => (
                <Link
                  key={allocation.id}
                  href={`/teacher/attendance/${allocation.id}`}
                >
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-start py-3"
                  >
                    <ClipboardList className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {allocation.subject.name} – {allocation.section.class.name}{" "}
                      {allocation.section.name}
                    </span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!allocations || allocations.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No classes assigned yet. Contact your administrator to get assigned
              to classes.
            </p>
            <Link href="/teacher/classes" className="mt-4">
              <Button>View My Classes</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
