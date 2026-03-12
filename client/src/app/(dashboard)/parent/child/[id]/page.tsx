"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  AlertCircle,
  ArrowLeft,
  Award,
  CalendarCheck,
  Wallet,
  BookOpen,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

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
  todayStatus: string | null;
  recentGrades: Array<{
    subjectName: string;
    examName: string;
    score: number;
    grade: string | null;
    date: string;
  }>;
}

export default function ParentChildDetailPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <ChildDetailContent />
    </RoleGuard>
  );
}

function ChildDetailContent() {
  const params = useParams();
  const studentUserId = params.id as string;

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["student", "summary", studentUserId],
    queryFn: async () => {
      const response = await axios.get<StudentSummary>(`/portal/student/${studentUserId}/summary`);
      return response.data;
    },
    enabled: !!studentUserId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-32" />
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
        <p className="text-lg text-muted-foreground">Failed to load student data.</p>
        <Link href="/parent/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Children
          </Button>
        </Link>
      </div>
    );
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getGradeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    if (score >= 40) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/parent/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {summary.firstName} {summary.lastName}
            </h1>
            <p className="text-muted-foreground">{summary.admissionNumber}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="font-medium">{summary.className}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Section</p>
              <p className="font-medium">{summary.sectionName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium truncate">{summary.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today&apos;s Status</p>
              {summary.todayStatus ? (
                <Badge
                  variant={
                    summary.todayStatus === "PRESENT"
                      ? "default"
                      : summary.todayStatus === "LATE"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {summary.todayStatus}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Not recorded</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              Attendance This Month
            </CardTitle>
            <CardDescription>
              {summary.presentDays} out of {summary.totalAttendanceDays} days present
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                <span className={getAttendanceColor(summary.attendancePercentage)}>
                  {summary.attendancePercentage}%
                </span>
              </span>
            </div>
            <Progress value={summary.attendancePercentage} className="h-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Grades
            </CardTitle>
            <CardDescription>Latest exam results</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentGrades.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No grades recorded yet</p>
            ) : (
              <div className="space-y-3">
                {summary.recentGrades.slice(0, 5).map((grade, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{grade.subjectName}</p>
                      <p className="text-xs text-muted-foreground">{grade.examName}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getGradeColor(grade.score)}>
                        {grade.score}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(grade.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Card
          </CardTitle>
          <CardDescription>View, print, or download your child&apos;s report card</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/parent/child/${studentUserId}/report`}>
            <Button className="w-full sm:w-auto">
              <FileText className="mr-2 h-4 w-4" />
              View Report
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Fees & Payments
          </CardTitle>
          <CardDescription>View and manage school fee payments</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/parent/billing?childId=${summary.studentId}`}>
            <Button className="w-full sm:w-auto">
              <Wallet className="mr-2 h-4 w-4" />
              View Fees & Make Payment
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
