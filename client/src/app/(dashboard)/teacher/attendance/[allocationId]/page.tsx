"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Loader2, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface Allocation {
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

interface Student {
  id: string;
  isActive: boolean;
  profile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  studentRecord?: {
    id: string;
    admissionNumber: string;
    currentSection?: {
      name: string;
    } | null;
  } | null;
}

interface StudentsResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

const statusColors: Record<AttendanceStatus, string> = {
  PRESENT: "text-green-600 border-green-600 data-[state=checked]:bg-green-600",
  ABSENT: "text-red-600 border-red-600 data-[state=checked]:bg-red-600",
  LATE: "text-yellow-600 border-yellow-600 data-[state=checked]:bg-yellow-600",
  EXCUSED: "text-blue-600 border-blue-600 data-[state=checked]:bg-blue-600",
};

export default function AttendancePage({ params }: { params: Promise<{ allocationId: string }> }) {
  const { allocationId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const { data: allocation, isLoading: allocationLoading } = useQuery({
    queryKey: ["allocation", allocationId],
    queryFn: async () => {
      const response = await axios.get<Allocation>(`/allocations/${allocationId}`);
      return response.data;
    },
  });

  const sectionId = allocation?.section?.id;

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", "section", sectionId],
    queryFn: async () => {
      const response = await axios.get<StudentsResponse>("/students", {
        params: { sectionId, limit: 100 },
      });
      return response.data;
    },
    enabled: !!sectionId,
  });

  const students = useMemo(
    () => studentsData?.data || [],
    [studentsData?.data]
  );

  useEffect(() => {
    if (students.length > 0 && attendanceRecords.length === 0) {
      const initialRecords: AttendanceRecord[] = students.map((student) => ({
        studentId: student.studentRecord?.id || student.id,
        status: "PRESENT" as AttendanceStatus,
      }));
      queueMicrotask(() => setAttendanceRecords(initialRecords));
    }
  }, [students, attendanceRecords.length]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) =>
      prev.map((record) =>
        record.studentId === studentId ? { ...record, status } : record
      )
    );
  };

  const getStudentStatus = (studentId: string): AttendanceStatus => {
    const record = attendanceRecords.find((r) => r.studentId === studentId);
    return record?.status || "PRESENT";
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        subjectAllocationId: allocationId,
        date: date.toISOString(),
        records: attendanceRecords,
      };
      return axios.post("/attendance/batch", payload);
    },
    onSuccess: () => {
      toast.success("Attendance saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      router.push("/teacher/classes");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || "Failed to save attendance";
      toast.error(message);
    },
  });

  const isLoading = allocationLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/teacher/classes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {allocation?.subject.name} - {allocation?.section.class.name} {allocation?.section.name}
            </h1>
            <p className="text-sm text-muted-foreground">{allocation?.academicYear.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || students.length === 0}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Register
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="min-h-[400px] rounded-lg border border-dashed">
          <EmptyState
            icon={<Users />}
            title="No students found"
            description="No students are enrolled in this section"
          />
        </div>
      ) : (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const studentRecordId = student.studentRecord?.id || student.id;
                const firstName = student.profile?.firstName || "";
                const lastName = student.profile?.lastName || "";
                const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
                const currentStatus = getStudentStatus(studentRecordId);

                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Avatar className="h-24 w-24">
                        <AvatarImage
                          src={student.profile?.avatarUrl || ""}
                          alt={`${firstName} ${lastName}`}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {firstName} {lastName}
                    </TableCell>
                    <TableCell>{student.studentRecord?.admissionNumber || "-"}</TableCell>
                    <TableCell>
                      <RadioGroup
                        value={currentStatus}
                        onValueChange={(value) => updateStatus(studentRecordId, value as AttendanceStatus)}
                        className="flex items-center justify-center gap-3"
                      >
                        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((status) => (
                          <div key={status} className="flex items-center">
                            <RadioGroupItem
                              value={status}
                              id={`${student.id}-${status}`}
                              className={cn("h-5 w-5", statusColors[status])}
                            />
                            <Label
                              htmlFor={`${student.id}-${status}`}
                              className={cn(
                                "ml-1 text-xs cursor-pointer",
                                currentStatus === status ? statusColors[status].split(" ")[0] : "text-muted-foreground"
                              )}
                            >
                              {status.charAt(0)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
