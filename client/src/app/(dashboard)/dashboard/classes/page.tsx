"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { AddClassSheet } from "@/components/classes/add-class-sheet";
import { AddSectionSheet } from "@/components/classes/add-section-sheet";
import { EditClassSheet } from "@/components/classes/edit-class-sheet";
import { EditSectionSheet } from "@/components/classes/edit-section-sheet";
import { DeleteClassDialog } from "@/components/classes/delete-class-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Users, Edit2, Trash2, MapPin } from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  _count: { sections: number };
}

interface SectionItem {
  id: string;
  name: string;
  capacity: number;
  classId: string;
  class: { id: string; name: string; code: string };
  defaultRoomId?: string | null;
  defaultRoom?: { id: string; name: string; type: string } | null;
  _count?: { students: number };
}

function groupSectionsByClassId(sections: SectionItem[]): Record<string, SectionItem[]> {
  return sections.reduce<Record<string, SectionItem[]>>((acc, section) => {
    const id = section.classId;
    if (!acc[id]) acc[id] = [];
    acc[id].push(section);
    return acc;
  }, {});
}

export default function ClassesPage() {
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState<ClassItem | null>(null);
  const [deleteClassOpen, setDeleteClassOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionItem | null>(null);
  const [editSectionOpen, setEditSectionOpen] = useState(false);

  const {
    data: classes,
    isLoading: classesLoading,
    isError: classesError,
  } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const res = await api.get<ClassItem[]>("/classes");
      return res.data;
    },
  });

  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const res = await api.get<SectionItem[]>("/sections");
      return res.data;
    },
  });

  const isLoading = classesLoading || sectionsLoading;
  const isError = classesError || sectionsError;
  const sectionsByClass = sections ? groupSectionsByClassId(sections) : {};

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
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
        <GraduationCap className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load classes. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Classes & Sections</h1>
        <div className="flex gap-2">
          <AddSectionSheet />
          <AddClassSheet />
        </div>
      </div>

      <EditClassSheet
        classItem={editClass}
        open={editClassOpen}
        onOpenChange={(open) => {
          setEditClassOpen(open);
          if (!open) setEditClass(null);
        }}
      />

      <DeleteClassDialog
        classItem={deleteClass}
        open={deleteClassOpen}
        onOpenChange={(open) => {
          setDeleteClassOpen(open);
          if (!open) setDeleteClass(null);
        }}
      />

      <EditSectionSheet
        section={editSection}
        open={editSectionOpen}
        onOpenChange={(open) => {
          setEditSectionOpen(open);
          if (!open) setEditSection(null);
        }}
      />

      {!classes || classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[300px] rounded-lg border border-dashed">
          <GraduationCap className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No classes found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const classSections = sectionsByClass[cls.id] ?? [];
            return (
              <Card key={cls.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0" />
                      <CardTitle className="text-lg">{cls.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{cls.code}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditClass(cls);
                          setEditClassOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setDeleteClass(cls);
                          setDeleteClassOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {classSections.length} section
                    {classSections.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {classSections.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        No sections yet
                      </p>
                      <AddSectionSheet
                        classItem={cls}
                        trigger={
                          <Button variant="outline" size="sm">
                            Add Section
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <>
                      {classSections.map((section) => {
                        const studentCount = section._count?.students ?? 0;
                        const usage =
                          section.capacity > 0
                            ? Math.min(
                                100,
                                Math.round((studentCount / section.capacity) * 100)
                              )
                            : 0;
                        return (
                          <div
                            key={section.id}
                            className="rounded-lg border p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {section.name}
                                </span>
                                {section.defaultRoom && (
                                  <span
                                    className="text-xs text-muted-foreground flex items-center gap-1"
                                    title={`Default room: ${section.defaultRoom.name}`}
                                  >
                                    <MapPin className="h-3 w-3" />
                                    {section.defaultRoom.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {studentCount} / {section.capacity}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditSection(section);
                                    setEditSectionOpen(true);
                                  }}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <Progress value={usage} className="h-2" />
                          </div>
                        );
                      })}
                      <AddSectionSheet
                        classItem={cls}
                        trigger={
                          <Button variant="outline" size="sm" className="w-full">
                            Add Section
                          </Button>
                        }
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
