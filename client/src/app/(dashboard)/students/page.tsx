"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { columns, Student } from "@/components/students/columns";
import { DataTable } from "@/components/students/data-table";
import { AddStudentSheet } from "@/components/students/add-student-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

interface StudentsResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["students", page, debouncedSearch],
    queryFn: async () => {
      const response = await axios.get<StudentsResponse>("/students", {
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

  // Reset page to 1 when search changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const students = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <AddStudentSheet />
      </div>

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
          <DataTable columns={columns} data={students} />
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