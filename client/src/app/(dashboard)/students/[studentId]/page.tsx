"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  User,
  Users,
  Wallet,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Student } from "@/components/students/columns";

interface StudentStatement {
  student: {
    id: string;
    admissionNumber: string;
    name: string;
  };
  summary: {
    totalBilled: number;
    totalPaid: number;
    balance: number;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    term: string;
    academicYear: string;
    totalAmount: number;
    amountPaid: number;
    balance: number;
    status: string;
    dueDate: string;
  }>;
}

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const { data: student, isLoading, isError } = useQuery<Student>({
    queryKey: ["students", studentId],
    queryFn: async () => {
      const res = await api.get(`/students/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });

  const recordId = student?.studentRecord ? studentId : undefined;

  const { data: statement, isLoading: statementLoading } = useQuery<StudentStatement>({
    queryKey: ["student-statement", recordId],
    queryFn: async () => {
      if (!recordId) throw new Error("No record id");
      const res = await api.get(`/billing/statement/${recordId}`);
      return res.data;
    },
    enabled: !!recordId,
    retry: false,
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

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Failed to load student data.</p>
        <Link href="/students">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
      </div>
    );
  }

  const firstName = student.profile?.firstName ?? "";
  const lastName = student.profile?.lastName ?? "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const sectionName = student.studentRecord?.currentSection?.name ?? "Unassigned";
  const className = student.studentRecord?.currentSection?.class?.name ?? "Unassigned";
  const address = student.profile?.address;
  const city = typeof address === "object" && address !== null && "city" in address
    ? String((address as { city?: unknown }).city ?? "")
    : "";
  const guardians = student.studentRecord?.guardians ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={student.profile?.avatarUrl ?? ""} alt={`${firstName} ${lastName}`} />
              <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {firstName} {lastName}
                </h1>
                <Badge variant={(student.isActive ?? true) ? "success" : "destructive-soft"}>
                  {(student.isActive ?? true) ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-sm">
                Adm: {student.studentRecord?.admissionNumber ?? "-"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Class: {className} &bull; Section: {sectionName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/students/${studentId}/report`}>
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              Official Report Card
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal & Academic Details
            </CardTitle>
            <CardDescription>Enrollment and identity profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{student.email ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admission Number</p>
                <p className="font-medium font-mono">{student.studentRecord?.admissionNumber ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Class Grade</p>
                <p className="font-medium">{className}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Assigned Section</p>
                <p className="font-medium">{sectionName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {student.profile?.dob ? formatDate(student.profile.dob) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium">{student.profile?.gender ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact Phone</p>
                <p className="font-medium">{student.profile?.contactNumber ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Residential City</p>
                <p className="font-medium">{city || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Billing Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Financial Billing Status
            </CardTitle>
            <CardDescription>Term balances and payment records</CardDescription>
          </CardHeader>
          <CardContent>
            {statementLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : statement ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center p-3 bg-muted/30 rounded-lg border">
                  <div>
                    <span className="text-xs text-muted-foreground block">Total Billed</span>
                    <span className="font-semibold text-sm">
                      {formatCurrency(statement.summary.totalBilled)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Amount Paid</span>
                    <span className="font-semibold text-sm text-green-600">
                      {formatCurrency(statement.summary.totalPaid)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Balance Due</span>
                    <span className={`font-semibold text-sm ${statement.summary.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(statement.summary.balance)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Invoices ({statement.invoices.length})
                  </span>
                  {statement.invoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No invoices generated for this student yet.</p>
                  ) : (
                    <div className="divide-y border rounded-md text-xs">
                      {statement.invoices.slice(0, 3).map((inv) => (
                        <div key={inv.id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-medium block">{inv.invoiceNumber}</span>
                            <span className="text-muted-foreground">{inv.term} ({inv.academicYear})</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium block">{formatCurrency(inv.totalAmount)}</span>
                            <Badge
                              variant={inv.status === "PAID" ? "success" : inv.status === "PARTIAL" ? "warning" : "pending"}
                              className="text-[10px] py-0 px-1.5"
                            >
                              {inv.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No financial statement available.</p>
            )}
          </CardContent>
        </Card>

        {/* Linked Guardians & Parents */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Linked Parents & Legal Guardians
            </CardTitle>
            <CardDescription>
              Emergency contacts and authorized financial guarantors
            </CardDescription>
          </CardHeader>
          <CardContent>
            {guardians.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No parents or guardians linked yet</p>
                <p className="text-xs mt-1">
                  Admins can link parent accounts using the Link Parent action.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {guardians.map((g) => {
                  const parentProfile = g.parent?.user?.profile;
                  const parentName = `${parentProfile?.firstName || ""} ${parentProfile?.lastName || ""}`.trim() || "Parent";
                  const phone = parentProfile?.contactNumber;
                  const email = g.parent?.user?.email;

                  return (
                    <div
                      key={g.id}
                      className="border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{parentName}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {g.relationship.toLowerCase()}
                        </Badge>
                      </div>

                      {phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-primary" />
                          <span>{phone}</span>
                        </div>
                      )}

                      {email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                          <span className="truncate">{email}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
