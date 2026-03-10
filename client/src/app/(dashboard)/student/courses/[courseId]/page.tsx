"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StudentSubmissionForm } from "@/components/lms/student-submission-form";
import { format } from "date-fns";
import { AlertCircle, BookOpen, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import Link from "next/link";

interface Profile {
  firstName: string;
  lastName: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
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
  description: string | null;
  subject: { id: string; name: string };
  teacher: { id: string; profile: Profile } | null;
  modules: CourseModule[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    const youtubeMatch =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(
        trimmed
      );
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function LessonView({
  lesson,
}: {
  lesson: { id: string; title: string; content: string | null; videoUrl: string | null };
}) {
  const embedUrl = lesson.videoUrl ? getYouTubeEmbedUrl(lesson.videoUrl) : null;
  const isOtherVideo =
    lesson.videoUrl && !embedUrl && /^https?:\/\//i.test(lesson.videoUrl.trim());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      {lesson.content && (
        <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
          {lesson.content}
        </div>
      )}
      {embedUrl && (
        <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
          <iframe
            src={embedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      )}
      {isOtherVideo && (
        <div className="aspect-video w-full max-w-2xl overflow-hidden rounded-lg border bg-muted">
          <video
            src={lesson.videoUrl!}
            controls
            className="size-full"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}

function AssignmentView({
  assignment,
}: {
  assignment: Assignment;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {assignment.title}
      </h1>
      {assignment.description && (
        <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
          {assignment.description}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {assignment.dueDate && (
          <span>
            Due: {format(new Date(assignment.dueDate), "PPP")}
          </span>
        )}
        {assignment.maxScore != null && (
          <span>Max score: {assignment.maxScore}</span>
        )}
      </div>
      <div className="border-t pt-6">
        <h2 className="mb-4 text-lg font-medium">Submit your work</h2>
        <StudentSubmissionForm assignmentId={assignment.id} />
      </div>
    </div>
  );
}

function CourseContent({
  courseId,
  course,
  itemParam,
}: {
  courseId: string;
  course: Course;
  itemParam: string | null;
}) {
  const router = useRouter();
  const [itemType, itemId] = useMemo(() => {
    if (!itemParam) return [null, null];
    const parts = itemParam.split("-");
    if (parts.length < 2) return [null, null];
    const type = parts[0];
    const id = parts.slice(1).join("-");
    return [type, id] as const;
  }, [itemParam]);

  const { lesson, assignment } = useMemo(() => {
    let lesson: Lesson | null = null;
    let assignment: Assignment | null = null;
    for (const mod of course.modules) {
      if (itemType === "lesson" && itemId) {
        const found = mod.lessons.find((l) => l.id === itemId);
        if (found) {
          lesson = found;
          break;
        }
      }
      if (itemType === "assignment" && itemId) {
        const found = mod.assignments.find((a) => a.id === itemId);
        if (found) {
          assignment = found;
          break;
        }
      }
    }
    return { lesson, assignment };
  }, [course.modules, itemType, itemId]);

  useEffect(() => {
    if (itemParam || !course.modules?.length) return;
    const firstModule = course.modules[0];
    const firstLesson = firstModule?.lessons?.[0];
    const firstAssignment = firstModule?.assignments?.[0];
    const firstId = firstLesson
      ? `lesson-${firstLesson.id}`
      : firstAssignment
        ? `assignment-${firstAssignment.id}`
        : null;
    if (firstId) {
      router.replace(`/student/courses/${courseId}?item=${firstId}`, {
        scroll: false,
      });
    }
  }, [courseId, course.modules, itemParam, router]);

  if (!itemParam) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
        <BookOpen className="size-12" />
        <p>Select a lesson or assignment from the sidebar.</p>
      </div>
    );
  }

  if (lesson) {
    return <LessonView lesson={lesson} />;
  }
  if (assignment) {
    return <AssignmentView assignment={assignment} />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
      <FileQuestion className="size-12" />
      <p>Select a lesson or assignment from the sidebar.</p>
    </div>
  );
}

function StudentCourseContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const itemParam = searchParams.get("item");

  const {
    data: course,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: async () => {
      const res = await axios.get<Course>(`/lms/courses/${courseId}`);
      return res.data;
    },
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <aside className="w-80 shrink-0 border-r bg-muted/30 p-4">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </aside>
        <main className="flex-1 overflow-auto p-6">
          <Skeleton className="mb-4 h-10 w-3/4" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          Failed to load course. Please try again.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasAnyItems = course.modules?.some(
    (m) => (m.lessons?.length ?? 0) > 0 || (m.assignments?.length ?? 0) > 0
  );

  if (!hasAnyItems) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <BookOpen className="size-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          This course has no lessons or assignments yet.
        </p>
        <Button variant="outline" asChild>
          <Link href="/student/courses">Back to courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <aside className="w-80 shrink-0 border-r bg-muted/30">
        <ScrollArea className="h-full">
          <div className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Content
            </h2>
            <Accordion type="multiple" className="w-full" defaultValue={course.modules.map((m) => m.id)}>
              {course.modules.map((mod) => {
                const lessons = mod.lessons ?? [];
                const assignments = mod.assignments ?? [];
                const sortedLessons = [...lessons].sort(
                  (a, b) => a.orderIndex - b.orderIndex
                );
                return (
                  <AccordionItem key={mod.id} value={mod.id}>
                    <AccordionTrigger className="text-left">
                      {mod.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-0.5 pl-1">
                        {sortedLessons.map((l) => (
                          <li key={l.id}>
                            <Link
                              href={`/student/courses/${courseId}?item=lesson-${l.id}`}
                              className={cn(
                                "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                                itemParam === `lesson-${l.id}`
                                  ? "bg-accent font-medium"
                                  : ""
                              )}
                            >
                              <span className="mr-1.5 inline-block size-4 shrink-0 text-muted-foreground">
                                <BookOpen className="size-3.5" />
                              </span>
                              {l.title}
                            </Link>
                          </li>
                        ))}
                        {assignments.map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/student/courses/${courseId}?item=assignment-${a.id}`}
                              className={cn(
                                "block rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                                itemParam === `assignment-${a.id}`
                                  ? "bg-accent font-medium"
                                  : ""
                              )}
                            >
                              <span className="mr-1.5 inline-block size-4 shrink-0 text-muted-foreground">
                                <FileQuestion className="size-3.5" />
                              </span>
                              {a.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </ScrollArea>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <CourseContent
          courseId={courseId}
          course={course}
          itemParam={itemParam}
        />
      </main>
    </div>
  );
}

export default function StudentCoursePage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentCourseContent />
    </RoleGuard>
  );
}
