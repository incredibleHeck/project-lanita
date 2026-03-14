"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  AlertCircle,
  ArrowLeft,
  Award,
  CalendarCheck,
  Wallet,
  BookOpen,
  FileText,
  TrendingUp,
  Calendar,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Child {
  id: string;
  admissionNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  currentSection: {
    name: string;
    class: {
      name: string;
    };
  };
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
  todayStatus: string | null;
  recentGrades: Array<{
    subjectName: string;
    examName: string;
    score: number;
    grade: string | null;
    date: string;
  }>;
}

interface StatementInvoice {
  id: string;
  invoiceNumber: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: string;
  dueDate: string;
}

interface Statement {
  student: { id: string; admissionNumber: string; name: string };
  summary: { totalBilled: number; totalPaid: number; balance: number };
  invoices: StatementInvoice[];
}

type ActivityItem = {
  id: string;
  type: "grade" | "attendance" | "invoice";
  title: string;
  timestamp: string;
  icon: typeof Award;
};

export default function ParentChildDetailPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <ChildDetailContent />
    </RoleGuard>
  );
}

function ChildDetailContent() {
  const params = useParams();
  const router = useRouter();
  const studentUserId = params.id as string;

  const { data: childrenData } = useQuery({
    queryKey: ["parent", "children"],
    queryFn: async () => {
      const response = await axios.get<{ data: Child[] }>("/portal/parent/children");
      return response.data;
    },
  });

  const children = childrenData?.data ?? [];
  const currentChild = children.find((c) => c.user.id === studentUserId);
  const studentRecordId = currentChild?.id;

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ["student", "summary", studentUserId],
    queryFn: async () => {
      const response = await axios.get<StudentSummary>(`/portal/student/${studentUserId}/summary`);
      return response.data;
    },
    enabled: !!studentUserId,
  });

  const { data: statement } = useQuery({
    queryKey: ["billing", "statement", studentRecordId],
    queryFn: async () => {
      const response = await axios.get<Statement>(`/billing/statement/${studentRecordId}`);
      return response.data;
    },
    enabled: !!studentRecordId,
  });

  if (summaryLoading && !summary) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col gap-6 p-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (summaryError || !summary) {
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

  const overallGrade =
    summary.recentGrades.length > 0
      ? Math.round(
          summary.recentGrades.reduce((sum, g) => sum + g.score, 0) / summary.recentGrades.length
        )
      : null;

  const isPresentToday =
    summary.todayStatus === "PRESENT" || summary.todayStatus === "LATE" || summary.todayStatus === "EXCUSED";

  const balance = statement?.summary?.balance ?? 0;

  const activityItems: ActivityItem[] = [];
  summary.recentGrades.forEach((g, i) => {
    activityItems.push({
      id: `grade-${i}`,
      type: "grade",
      title: `${g.subjectName} - ${g.examName} graded`,
      timestamp: g.date,
      icon: Award,
    });
  });
  if (summary.todayStatus) {
    activityItems.push({
      id: "attendance",
      type: "attendance",
      title: isPresentToday ? "Arrived at School" : "Absent today",
      timestamp: new Date().toISOString(),
      icon: CalendarCheck,
    });
  }
  (statement?.invoices ?? []).slice(0, 3).forEach((inv, i) => {
    activityItems.push({
      id: `invoice-${i}`,
      type: "invoice",
      title: `Term Fee Invoice ${inv.invoiceNumber} generated`,
      timestamp: inv.dueDate,
      icon: Receipt,
    });
  });
  activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentActivity = activityItems.slice(0, 10);

  const cardClass =
    "rounded-2xl border border-border/50 bg-card shadow-sm shadow-black/5";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-6 p-6">
        {/* Header: Back + Child Selector */}
        <div className="flex items-center gap-4">
          <Link href="/parent/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-1 gap-4 overflow-x-auto pb-2 min-w-0 scrollbar-hide">
            {children.map((child) => {
              const isActive = child.user.id === studentUserId;
              const initials = child.user.profile
                ? `${child.user.profile.firstName[0]}${child.user.profile.lastName[0]}`
                : child.user.email.substring(0, 2).toUpperCase();
              return (
                <Link
                  key={child.id}
                  href={`/parent/child/${child.user.id}`}
                  className={cn(
                    "shrink-0 rounded-full transition-all",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cardClass}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Attendance</p>
              <p className={cn("text-2xl font-bold", getAttendanceColor(summary.attendancePercentage))}>
                {summary.attendancePercentage}%
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                This month
              </p>
              {isPresentToday ? (
                <Badge className="mt-2 bg-green-500/10 text-green-700 border-0">
                  Present Today
                </Badge>
              ) : summary.todayStatus ? (
                <Badge variant="secondary" className="mt-2">
                  {summary.todayStatus}
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-2">
                  Not recorded
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Overall Grade</p>
              {overallGrade != null ? (
                <>
                  <p className="text-2xl font-bold">{overallGrade}%</p>
                  <p className="text-xs text-muted-foreground mt-1">From recent exams</p>
                </>
              ) : (
                <p className="text-lg text-muted-foreground">No grades yet</p>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Next Event</p>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                No upcoming events
              </p>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Outstanding Balance</p>
              {balance > 0 ? (
                <>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(balance)}</p>
                  <Link href={`/parent/billing?childId=${summary.studentId}`}>
                    <Button variant="ghost" size="sm" className="mt-2 h-8 px-2">
                      Pay Now
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-lg text-muted-foreground">All Paid</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Deep Dive */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap pb-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                  <div className="relative border-l-2 border-muted pl-6 space-y-6">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted">
                          <item.icon className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <div className="rounded-xl bg-muted/30 p-4">
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDate(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academics" className="mt-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Grades
                </CardTitle>
                <CardDescription>Latest exam results</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.recentGrades.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No grades recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {summary.recentGrades.map((grade, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{grade.subjectName}</p>
                          <p className="text-xs text-muted-foreground">{grade.examName}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getGradeColor(grade.score)}>{grade.score}%</Badge>
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
            <Card className={cn(cardClass, "mt-6")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Report Card
                </CardTitle>
                <CardDescription>View, print, or download your child&apos;s report card</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/parent/child/${studentUserId}/report`}>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Attendance This Month
                </CardTitle>
                <CardDescription>
                  {summary.presentDays} out of {summary.totalAttendanceDays} days present
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={cn("text-2xl font-bold", getAttendanceColor(summary.attendancePercentage))}>
                    {summary.attendancePercentage}%
                  </span>
                </div>
                <Progress value={summary.attendancePercentage} className="h-2 rounded-full" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="mt-6">
            <Card className={cardClass}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Fees & Payments
                </CardTitle>
                <CardDescription>View and manage school fee payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statement && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Billed</p>
                      <p className="font-semibold">{formatCurrency(statement.summary.totalBilled)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount Paid</p>
                      <p className="font-semibold text-green-600">{formatCurrency(statement.summary.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className={cn("font-semibold", balance > 0 && "text-destructive")}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                  </div>
                )}
                <Link href={`/parent/billing?childId=${summary.studentId}`}>
                  <Button className="w-full sm:w-auto">
                    <Wallet className="mr-2 h-4 w-4" />
                    View Fees & Make Payment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
