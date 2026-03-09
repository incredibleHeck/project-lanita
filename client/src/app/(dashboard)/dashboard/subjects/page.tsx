"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AddSubjectSheet } from "@/components/subjects/add-subject-sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  subjectType?: string;
  isElective?: boolean;
}

export default function SubjectsPage() {
  const { data: subjects, isLoading, isError } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get<Subject[]>("/subjects");
      return res.data;
    },
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <AddSubjectSheet />
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
            Failed to load subjects. Please try again.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!subjects || subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                      No subjects found. Add your first subject to get started.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{subject.code}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {subject.description || "—"}
                    </TableCell>
                    <TableCell>
                      {subject.subjectType === "ELECTIVE" ? (
                        <Badge variant="outline">Elective</Badge>
                      ) : subject.subjectType === "OPTIONAL" ? (
                        <Badge variant="secondary">Optional</Badge>
                      ) : (
                        <Badge variant="default">Core</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
