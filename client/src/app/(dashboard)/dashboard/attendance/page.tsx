"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardCheck,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
} from "lucide-react";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
  student: {
    admissionNumber: string;
    user?: {
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
    } | null;
  };
  allocation: {
    subject?: { name: string } | null;
    section?: {
      name: string;
      class?: { name: string } | null;
    } | null;
  };
}

interface ReportResponse {
  records?: AttendanceRecord[];
  total?: number;
  present?: number;
  absent?: number;
  late?: number;
  excused?: number;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function AttendanceOverviewPage() {
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["attendance", "report", selectedDate],
    queryFn: async () => {
      const response = await api.get<ReportResponse>("/attendance/report", {
        params: {
          startDate: selectedDate,
          endDate: selectedDate,
        },
      });
      return response.data;
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    if ("records" in data && Array.isArray(data.records)) {
      const records = data.records as AttendanceRecord[];
      const total = records.length;
      const present = records.filter((r) => r.status === "PRESENT").length;
      const absent = records.filter((r) => r.status === "ABSENT").length;
      const late = records.filter((r) => r.status === "LATE").length;
      const excused = records.filter((r) => r.status === "EXCUSED").length;
      return { total, present, absent, late, excused };
    }
    if (
      typeof data.total === "number" &&
      typeof data.present === "number" &&
      typeof data.absent === "number" &&
      typeof data.late === "number" &&
      typeof data.excused === "number"
    ) {
      return {
        total: data.total,
        present: data.present,
        absent: data.absent,
        late: data.late,
        excused: data.excused,
      };
    }
    return null;
  }, [data]);

  const records = useMemo(() => {
    if (!data || !("records" in data) || !Array.isArray(data.records)) {
      return [];
    }
    return data.records as AttendanceRecord[];
  }, [data]);

  const getStudentName = (record: AttendanceRecord) => {
    const profile = record.student?.user?.profile;
    if (profile) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    return record.student?.admissionNumber ?? "—";
  };

  const getStatusBadgeVariant = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return "default";
      case "ABSENT":
        return "destructive";
      case "LATE":
        return "secondary";
      case "EXCUSED":
        return "outline";
      default:
        return "outline";
    }
  };

  const statCards = [
    {
      label: "Total Records",
      value: stats?.total ?? 0,
      icon: ClipboardCheck,
    },
    {
      label: "Present",
      value: stats?.present ?? 0,
      icon: UserCheck,
    },
    {
      label: "Absent",
      value: stats?.absent ?? 0,
      icon: UserX,
    },
    {
      label: "Late",
      value: stats?.late ?? 0,
      icon: Clock,
    },
    {
      label: "Excused",
      value: stats?.excused ?? 0,
      icon: AlertCircle,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Attendance Overview
        </h1>
        <div className="flex items-center gap-2">
          <label htmlFor="attendance-date" className="text-sm font-medium">
            Date
          </label>
          <Input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">
              Failed to load attendance data
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please try again later or check your connection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {statCards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {records.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class / Section</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {getStudentName(record)}
                        </TableCell>
                        <TableCell>
                          {record.allocation?.section?.class?.name ?? "—"} /{" "}
                          {record.allocation?.section?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          {record.allocation?.subject?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.remarks ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && stats?.total === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mb-4 opacity-50" />
                <p>No attendance records for this date.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
