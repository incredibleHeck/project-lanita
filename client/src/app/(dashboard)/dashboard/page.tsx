"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserCheck, Calendar, Clock } from "lucide-react";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { DistributionChart } from "@/components/dashboard/distribution-chart";

interface Student {
  id: string;
  email: string;
  createdAt: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  currentTerm: string;
  recentStudents: Student[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "STUDENT" || user?.role === "TEACHER" || user?.role === "PARENT") return;

    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch data in parallel
        const [studentsRes, academicYearRes] = await Promise.all([
          api.get("/students"),
          api.get("/academic-year"),
        ]);

        const studentsResponse = studentsRes.data;
        const students: Student[] = studentsResponse.data || [];
        const totalStudents = studentsResponse.meta?.total || students.length;
        const academicYears: AcademicYear[] = academicYearRes.data;

        // Find current academic year
        const currentYear = academicYears.find((year) => year.isCurrent);

        // Get recent students (last 5 by creation date)
        const recentStudents = [...students]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        setStats({
          totalStudents,
          totalTeachers: 5, // From seed data - would need a teachers endpoint
          currentTerm: currentYear?.name || "N/A",
          recentStudents,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [authLoading, user]);

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

  if (authLoading || user?.role === "STUDENT" || user?.role === "TEACHER" || user?.role === "PARENT") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your school.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Students */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        {/* Active Teachers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalTeachers}</div>
            )}
            <p className="text-xs text-muted-foreground">Teaching staff</p>
          </CardContent>
        </Card>

        {/* Current Term */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Term</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{stats?.currentTerm}</div>
            )}
            <p className="text-xs text-muted-foreground">Academic year</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <AttendanceChart />
        <DistributionChart />
      </div>

      {/* Recent Activity */}
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
          ) : stats?.recentStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students found.
            </p>
          ) : (
            <div className="space-y-4">
              {stats?.recentStudents.map((student) => (
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
