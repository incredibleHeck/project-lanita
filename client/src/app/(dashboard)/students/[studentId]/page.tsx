"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, FileText, User } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Student } from "@/components/students/columns";

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
  const sectionName = student.studentRecord?.currentSection?.name ?? "-";
  const className = student.studentRecord?.currentSection?.class?.name ?? "-";
  const address = student.profile?.address;
  const city = typeof address === "object" && address !== null && "city" in address
    ? String((address as { city?: unknown }).city ?? "")
    : "";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={student.profile?.avatarUrl ?? ""} alt={`${firstName} ${lastName}`} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {firstName} {lastName}
            </h1>
            <p className="text-muted-foreground">
              {student.studentRecord?.admissionNumber ?? "-"}
            </p>
            <Badge variant={(student.isActive ?? true) ? "success" : "destructive-soft"} className="mt-1">
              {(student.isActive ?? true) ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Information
          </CardTitle>
          <CardDescription>Profile and contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium truncate">{student.email ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Number</p>
              <p className="font-medium">{student.studentRecord?.admissionNumber ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="font-medium">{className}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Section</p>
              <p className="font-medium">{sectionName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {student.profile?.dob ? formatDate(student.profile.dob) : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{student.profile?.gender ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <p className="font-medium">{student.profile?.contactNumber ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{city || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Card
          </CardTitle>
          <CardDescription>View and print the student&apos;s report card</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/students/${studentId}/report`}>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              View Report Card
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
