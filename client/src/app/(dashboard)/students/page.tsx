"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { getColumns, Student } from "@/components/students/columns";
import { DataTable } from "@/components/students/data-table";
import { AddStudentSheet } from "@/components/students/add-student-sheet";
import { EditStudentSheet } from "@/components/students/edit-student-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import Link from "next/link";
import { X } from "lucide-react";

interface StudentsResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function StudentsPage() {
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const columns = useMemo(
    () =>
      getColumns((student) => {
        setEditStudent(student);
        setEditSheetOpen(true);
      }),
    []
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["students", page, debouncedSearch, classId, sectionId],
    queryFn: async () => {
      const response = await axios.get<StudentsResponse>("/students", {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          classId: classId || undefined,
          sectionId: sectionId || undefined,
        },
      });
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });

  // Reset page to 1 when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const students = data?.data || [];
  const meta = data?.meta;

  const clearFilterUrl = "/students";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <AddStudentSheet />
      </div>

      <EditStudentSheet
        student={editStudent}
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open);
          if (!open) setEditStudent(null);
        }}
      />

      {(classId || sectionId) && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm py-1.5">
            {classId ? "Filtered by class" : "Filtered by section"}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link href={clearFilterUrl} className="flex items-center gap-1">
              <X className="h-4 w-4" />
              Clear filter
            </Link>
          </Button>
        </div>
      )}

      <div className="flex items-center">
        <Input
          placeholder="Search by name or ID..."
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
            Failed to load students. Please try again.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={students}
            page={page}
            pageCount={meta?.totalPages ?? 0}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}