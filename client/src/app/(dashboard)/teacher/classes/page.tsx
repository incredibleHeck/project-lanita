"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX, ClipboardList } from "lucide-react";
import Link from "next/link";

interface SubjectAllocation {
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
    startDate: string;
    endDate: string;
  };
}

export default function TeacherClassesPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherClassesContent />
    </RoleGuard>
  );
}

function TeacherClassesContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: allocations, isLoading, isError } = useQuery({
    queryKey: ["allocations", "teacher", user?.id],
    queryFn: async () => {
      const response = await axios.get<SubjectAllocation[]>(`/allocations/teacher/${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <CalendarX className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Failed to load your classes. Please try again.</p>
      </div>
    );
  }

  if (!allocations || allocations.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] rounded-lg border border-dashed">
          <CalendarX className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No classes assigned to you yet.</p>
          <p className="text-sm text-muted-foreground">Contact your administrator to get assigned to classes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allocations.map((allocation) => (
          <Card key={allocation.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">
                  {allocation.subject.name}
                </CardTitle>
                <Badge variant="secondary">{allocation.academicYear.name}</Badge>
              </div>
              <CardDescription>
                {allocation.section.class.name} - {allocation.section.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href={`/teacher/attendance/${allocation.id}`}>
                <Button className="w-full">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Take Attendance
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
