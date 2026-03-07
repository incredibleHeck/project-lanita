"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, CalendarCheck, Award, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentGrade {
  subjectName: string;
  examName: string;
  score: number;
  grade: string | null;
  date: string;
}

interface StudentSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  attendancePercentage: number;
  totalAttendanceDays: number;
  presentDays: number;
  todayStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | null;
  recentGrades: RecentGrade[];
}

export default function StudentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentDashboardContent />
    </RoleGuard>
  );
}

function StudentDashboardContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["portal", "student", user?.id],
    queryFn: async () => {
      const response = await axios.get<StudentSummary>(`/portal/student/${user?.id}/summary`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return { label: "Not Marked", variant: "secondary" as const };
    switch (status) {
      case "PRESENT":
        return { label: "Present", variant: "default" as const, className: "bg-green-500" };
      case "ABSENT":
        return { label: "Absent", variant: "destructive" as const };
      case "LATE":
        return { label: "Late", variant: "default" as const, className: "bg-yellow-500" };
      case "EXCUSED":
        return { label: "Excused", variant: "default" as const, className: "bg-blue-500" };
      default:
        return { label: status, variant: "secondary" as const };
    }
  };

  const getGradeBadgeColor = (grade: string | null) => {
    if (!grade) return "";
    switch (grade.charAt(0).toUpperCase()) {
      case "A":
        return "bg-green-500";
      case "B":
        return "bg-blue-500";
      case "C":
        return "bg-yellow-500";
      case "D":
        return "bg-orange-500";
      default:
        return "bg-red-500";
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(summary.todayStatus);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            Welcome back, {summary.firstName}!
          </CardTitle>
          <CardDescription className="text-base">
            {summary.className} - Section {summary.sectionName} | Admission No: {summary.admissionNumber}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Monthly Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Attendance Rate</span>
                <span className="font-bold">{summary.attendancePercentage}%</span>
              </div>
              <Progress
                value={summary.attendancePercentage}
                className={cn("h-3", getAttendanceColor(summary.attendancePercentage))}
              />
              <p className="text-xs text-muted-foreground">
                {summary.presentDays} of {summary.totalAttendanceDays} days present this month
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm">Today&apos;s Status:</span>
              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Grades Widget */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recentGrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No exams recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.recentGrades.map((grade, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{grade.subjectName}</p>
                      <p className="text-xs text-muted-foreground truncate">{grade.examName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{grade.score}</span>
                      {grade.grade && (
                        <Badge className={getGradeBadgeColor(grade.grade)}>
                          {grade.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
