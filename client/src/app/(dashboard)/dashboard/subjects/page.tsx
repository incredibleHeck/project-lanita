"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AddSubjectSheet } from "@/components/subjects/add-subject-sheet";
import { DeleteSubjectDialog } from "@/components/subjects/delete-subject-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Edit2, Trash2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  subjectType?: string;
  isElective?: boolean;
  color?: string;
  isExaminable?: boolean;
  isSingleResource?: boolean;
  usage?: { classCount: number; teacherCount: number };
}

export default function SubjectsPage() {
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: subjects, isLoading, isError } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await api.get<Subject[]>("/subjects");
      return res.data;
    },
  });

  function handleEdit(subject: Subject) {
    setEditSubject(subject);
    setEditSheetOpen(true);
  }

  function handleDelete(subject: Subject) {
    setDeleteSubject(subject);
    setDeleteDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
        <AddSubjectSheet />
      </div>

      <AddSubjectSheet
        subject={editSubject ?? undefined}
        open={editSheetOpen}
        onOpenChange={(open) => {
          setEditSheetOpen(open);
          if (!open) setEditSubject(null);
        }}
      />

      <DeleteSubjectDialog
        subject={deleteSubject}
        usage={deleteSubject?.usage}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteSubject(null);
        }}
      />

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
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!subjects || subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={<BookOpen />}
                      title="No subjects found"
                      description="Add your first subject to get started"
                      variant="table"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell>
                      <div
                        className="h-6 w-6 rounded-full shrink-0"
                        style={{
                          backgroundColor: subject.color ?? "#6366f1",
                        }}
                        title={subject.name}
                      />
                    </TableCell>
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
                    <TableCell className="text-muted-foreground text-sm">
                      {subject.usage ? (
                        <>
                          {subject.usage.classCount} class
                          {subject.usage.classCount !== 1 ? "es" : ""},{" "}
                          {subject.usage.teacherCount} teacher
                          {subject.usage.teacherCount !== 1 ? "s" : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(subject)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subject)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
