"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AddModuleDialog } from "@/components/lms/add-module-dialog";
import { AddLessonDialog } from "@/components/lms/add-lesson-dialog";
import { AddAssignmentDialog } from "@/components/lms/add-assignment-dialog";
import { BookOpen, FileText, Plus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  orderIndex: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
  assignments: Assignment[];
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  subject: { id: string; name: string; code: string | null };
  teacher: { id: string; profile: { firstName: string; lastName: string } } | null;
  modules: CourseModule[];
}

export default function TeacherCourseDetailPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherCourseDetailContent />
    </RoleGuard>
  );
}

function TeacherCourseDetailContent() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: async () => {
      const response = await api.get<Course>(`/lms/courses/${courseId}`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const openLessonDialog = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setLessonDialogOpen(true);
  };

  const openAssignmentDialog = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setAssignmentDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load course. It may not exist or you may not have access.
        </p>
        <Link href="/teacher/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  const sortedModules = [...(course.modules || [])].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/teacher/courses" className="hover:underline">
            Courses
          </Link>
          <span>/</span>
          <span className="text-foreground">{course.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
            {course.subject && (
              <p className="text-muted-foreground mt-1">
                {course.subject.name}
                {course.teacher?.profile && (
                  <span className="ml-2">
                    • {course.teacher.profile.firstName} {course.teacher.profile.lastName}
                  </span>
                )}
              </p>
            )}
          </div>
          <Button onClick={() => setModuleDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {sortedModules.map((mod) => (
          <AccordionItem key={mod.id} value={mod.id}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-2">
                {mod.title}
                <span className="text-sm font-normal text-muted-foreground">
                  ({mod.lessons?.length ?? 0} lessons, {mod.assignments?.length ?? 0} assignments)
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {mod.description && (
                <p className="text-muted-foreground text-sm mb-4">{mod.description}</p>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Lessons
                  </h4>
                  <ul className="space-y-2 pl-6">
                    {(mod.lessons ?? []).length === 0 ? (
                      <li className="text-sm text-muted-foreground">
                        No lessons yet.
                      </li>
                    ) : (
                      (mod.lessons ?? [])
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((lesson) => (
                          <li key={lesson.id} className="text-sm">
                            {lesson.title}
                          </li>
                        ))
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Assignments
                  </h4>
                  <ul className="space-y-2 pl-6">
                    {(mod.assignments ?? []).length === 0 ? (
                      <li className="text-sm text-muted-foreground">
                        No assignments yet.
                      </li>
                    ) : (
                      (mod.assignments ?? []).map((assignment) => (
                        <li key={assignment.id} className="text-sm">
                          {assignment.title}
                          {assignment.dueDate && (
                            <span className="text-muted-foreground ml-2">
                              (Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")})
                            </span>
                          )}
                          {assignment.maxScore != null && (
                            <span className="text-muted-foreground ml-2">
                              • {assignment.maxScore} pts
                            </span>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLessonDialog(mod.id)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Lesson
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAssignmentDialog(mod.id)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Assignment
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {sortedModules.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-lg border border-dashed">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No modules yet. Add your first module to build the curriculum.</p>
          <Button onClick={() => setModuleDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </div>
      )}

      <AddModuleDialog
        courseId={courseId}
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
      />

      {activeModuleId && (
        <>
          <AddLessonDialog
            moduleId={activeModuleId}
            courseId={courseId}
            open={lessonDialogOpen}
            onOpenChange={setLessonDialogOpen}
          />
          <AddAssignmentDialog
            moduleId={activeModuleId}
            courseId={courseId}
            open={assignmentDialogOpen}
            onOpenChange={setAssignmentDialogOpen}
          />
        </>
      )}
    </div>
  );
}
