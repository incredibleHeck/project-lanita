"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeacherProfile {
  firstName?: string;
  lastName?: string;
}

interface TeacherAllocation {
  subject?: { name: string };
  section?: { name: string; class?: { name: string } };
}

interface Teacher {
  id: string;
  email: string;
  profile?: TeacherProfile;
  teacherAllocations?: TeacherAllocation[];
}

interface TeachersResponse {
  data: Teacher[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export default function TeachersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teachers", page, debouncedSearch],
    queryFn: async () => {
      const response = await api.get<TeachersResponse>("/teachers", {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const teachers = data?.data || [];
  const meta = data?.meta;

  const getTeacherName = (teacher: Teacher) => {
    const first = teacher.profile?.firstName ?? "";
    const last = teacher.profile?.lastName ?? "";
    const name = [first, last].filter(Boolean).join(" ");
    return name || "—";
  };

  const getSubjectNames = (teacher: Teacher) => {
    const allocations = teacher.teacherAllocations ?? [];
    const names = [...new Set(allocations.map((a) => a.subject?.name).filter(Boolean))] as string[];
    return names;
  };

  const getClassNames = (teacher: Teacher) => {
    const allocations = teacher.teacherAllocations ?? [];
    const names = allocations
      .map((a) => a.section?.name ?? a.section?.class?.name)
      .filter(Boolean) as string[];
    return [...new Set(names)];
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
      </div>

      <div className="flex items-center">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border shadow-sm">
        {isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="p-4 text-center text-red-500">
            Failed to load teachers. Please try again.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Classes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {getTeacherName(teacher)}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getSubjectNames(teacher).length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          getSubjectNames(teacher).map((name) => (
                            <Badge key={name} variant="secondary">
                              {name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getClassNames(teacher).length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          getClassNames(teacher).map((name) => (
                            <Badge key={name} variant="outline">
                              {name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <div className="text-sm text-gray-500">
            Page {page} of {meta.lastPage}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
            disabled={page === meta.lastPage || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
