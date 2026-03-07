"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, UserCheck, Calendar, Clock } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { DistributionChart } from "@/components/dashboard/distribution-chart";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  currentTerm: string;
  weeklyAttendance: Array<{ day: string; present: number; absent: number }>;
  distributionByClass: Array<{ name: string; value: number }>;
}

interface Student {
  id: string;
  email: string;
  createdAt: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      switch (user.role) {
        case "STUDENT":
          router.push("/student/dashboard");
          return;
        case "TEACHER":
          router.push("/teacher/classes");
          return;
        case "PARENT":
          router.push("/parent/dashboard");
          return;
      }
    }
  }, [user, authLoading, router]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["analytics", "dashboard"],
    queryFn: async () => {
      const res = await api.get<DashboardStats>("/analytics/dashboard");
      return res.data;
    },
    enabled: isAdmin,
  });

  const { data: recentStudentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", "recent"],
    queryFn: async () => {
      const res = await api.get("/students", { params: { page: 1, limit: 5 } });
      return res.data;
    },
    enabled: isAdmin,
  });

  const isLoading = statsLoading || studentsLoading;
  const recentStudents: Student[] = recentStudentsData?.data || [];

  const getInitials = (student: Student) => {
    if (student.profile) {
      return `${student.profile.firstName[0]}${student.profile.lastName[0]}`.toUpperCase();
    }
    return student.email.substring(0, 2).toUpperCase();
  };

  const getName = (student: Student) => {
    if (student.profile) {
      return `${student.profile.firstName} ${student.profile.lastName}`;
    }
    return student.email;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your school.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalStudents ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalTeachers ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Teaching staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Term</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{stats?.currentTerm ?? "N/A"}</div>
            )}
            <p className="text-xs text-muted-foreground">Academic year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AttendanceChart
          data={stats?.weeklyAttendance}
          isLoading={statsLoading}
        />
        <DistributionChart
          data={stats?.distributionByClass}
          isLoading={statsLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students found.
            </p>
          ) : (
            <div className="space-y-4">
              {recentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(student)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getName(student)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.email}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(student.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
