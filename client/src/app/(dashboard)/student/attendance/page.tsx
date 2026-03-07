"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarCheck, FileQuestion } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  subject: string;
}

interface AttendanceReport {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  presentPercentage: number;
  records: AttendanceRecord[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PRESENT":
      return { label: "Present", variant: "default" as const, className: "bg-green-500/90" };
    case "ABSENT":
      return { label: "Absent", variant: "destructive" as const, className: "" };
    case "LATE":
      return { label: "Late", variant: "secondary" as const, className: "bg-yellow-500/90 text-white" };
    case "EXCUSED":
      return { label: "Excused", variant: "outline" as const, className: "" };
    default:
      return { label: status, variant: "secondary" as const, className: "" };
  }
}

export default function StudentAttendancePage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentAttendanceContent />
    </RoleGuard>
  );
}

function StudentAttendanceContent() {
  const { user } = useAuth();

  const now = new Date();
  const startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  const endDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["attendance", "report", user?.id, startDate, endDate],
    queryFn: async () => {
      const response = await axios.get<AttendanceReport>(
        `/attendance/report?studentId=${user?.id}&startDate=${startDate}&endDate=${endDate}&useUserId=true`
      );
      return response.data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <FileQuestion className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load attendance. Please try again later.
        </p>
      </div>
    );
  }

  const records = data.records ?? [];
  const hasRecords = records.length > 0;

  if (!hasRecords) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-7 w-7" />
          My Attendance
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <CalendarCheck className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">No attendance records yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CalendarCheck className="h-7 w-7" />
        My Attendance
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => {
                const badge = getStatusBadge(r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell>
                      <Badge
                        variant={badge.variant}
                        className={cn(badge.className)}
                      >
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.remarks ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
