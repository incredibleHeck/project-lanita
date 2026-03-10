"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Search, Users } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";

interface Student {
  id: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
  studentRecord?: {
    admissionNumber: string;
    currentSection?: {
      name: string;
      class?: {
        name: string;
      };
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

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useQuery({
    queryKey: ["students", "reports", debouncedSearch],
    queryFn: async () => {
      const response = await axios.get<StudentsResponse>("/students", {
        params: {
          limit: 20,
          search: debouncedSearch || undefined,
        },
      });
      return response.data;
    },
  });

  const students = data?.data || [];

  const getInitials = (student: Student) => {
    if (student.profile) {
      return `${student.profile.firstName[0]}${student.profile.lastName[0]}`.toUpperCase();
    }
    return "?";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Student Reports</h1>
      </div>

      <p className="text-muted-foreground">
        Search for a student to view and print their report card.
      </p>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-16 w-16 mb-4" />
          <p className="text-lg">
            {search ? "No students found matching your search" : "Start typing to search for students"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(student)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {student.profile?.firstName} {student.profile?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {student.studentRecord?.admissionNumber || "No admission number"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.studentRecord?.currentSection?.class?.name} -{" "}
                      {student.studentRecord?.currentSection?.name}
                    </p>
                  </div>
                  <Link href={`/students/${student.id}/report`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
