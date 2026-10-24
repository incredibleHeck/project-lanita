"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";
import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { StreamPostCard, type StreamAnnouncement } from "@/components/lms/stream-post-card";
import { AddModuleDialog } from "@/components/lms/add-module-dialog";
import { AddLessonDialog } from "@/components/lms/add-lesson-dialog";
import { AddAssignmentDialog } from "@/components/lms/add-assignment-dialog";
import { AddMaterialDialog } from "@/components/lms/add-material-dialog";
import {
  Award,
  AlertTriangle,
  Bold,
  BookOpen,
  Calendar,
  ChevronDown,
  Clipboard,
  Copy,
  FileText,
  Folder,
  HardDrive,
  Image,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  MessageSquare,
  MoreVertical,
  Palette,
  Paperclip,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RemoveFormatting,
  Settings,
  Strikethrough,
  Underline,
  Upload,
  Users,
  Video,
  X,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl?: string | null;
  orderIndex: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
  resourceUrl: string | null;
  order: number;
}

interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
  materials: Material[];
  assignments: Assignment[];
}

interface Course {
  id: string;
  name: string;
  code: string | null;
  classCode: string | null;
  meetLink: string | null;
  theme: string | null;
  description: string | null;
  subject: { id: string; name: string; code: string | null };
  teacher: { id: string; profile: { firstName: string; lastName: string } } | null;
  modules: CourseModule[];
}

const HERO_THEMES: Record<string, string> = {
  blue: "from-blue-600 to-blue-400",
  green: "from-emerald-600 to-emerald-400",
  purple: "from-purple-600 to-purple-400",
  orange: "from-orange-600 to-orange-400",
  slate: "from-slate-600 to-slate-400",
  rose: "from-rose-600 to-rose-400",
  code: "bg-slate-900",
} as const;
const THEME_OPTIONS = ["blue", "green", "purple", "orange", "slate", "rose", "code"] as const;

function MeetCard({
  courseId,
  meetLink,
  onUpdated,
}: {
  courseId: string;
  meetLink?: string;
  onUpdated: () => void;
}) {
  const { mutate: updateMeetLink, isPending } = useMutation({
    mutationFn: async (url: string) => {
      await api.patch(`/lms/courses/${courseId}`, { meetLink: url });
    },
    onSuccess: () => {
      onUpdated();
      toast.success("Meet link saved");
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to save link");
    },
  });

  const handleAddLink = () => {
    const url = window.prompt("Paste your Google Meet or Zoom link:");
    if (url?.trim()) updateMeetLink(url.trim());
  };

  return (
    <Card className="rounded-lg border border-border/60 shadow-sm bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Meet</span>
        </div>
        {meetLink ? (
          <Button variant="secondary" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0" asChild>
            <a href={meetLink} target="_blank" rel="noopener noreferrer">
              Join
            </a>
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            onClick={handleAddLink}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Add Link"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MaterialItemRow({
  type,
  title,
  subtitle,
  onEdit,
  onDelete,
  gradeHref,
  isDeleting,
}: {
  type: "material" | "video" | "assignment" | "link";
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
  gradeHref?: string;
  isDeleting?: boolean;
}) {
  const iconConfig =
    type === "assignment"
      ? { bg: "bg-green-500/20", icon: Clipboard, iconColor: "text-green-600" }
      : type === "video"
        ? { bg: "bg-red-500/20", icon: Play, iconColor: "text-red-600" }
        : type === "link"
          ? { bg: "bg-green-500/20", icon: LinkIcon, iconColor: "text-green-600" }
          : { bg: "bg-blue-500/20", icon: Paperclip, iconColor: "text-blue-600" };

  const Icon = iconConfig.icon;

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors group">
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${iconConfig.bg} ${iconConfig.iconColor}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {gradeHref && (
            <DropdownMenuItem asChild>
              <Link href={gradeHref}>Grade</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function TeacherCourseDetailPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherCourseDetailContent />
    </RoleGuard>
  );
}

type ClassworkItemKind = "lesson" | "material" | "assignment";

function TeacherCourseDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = tabFromUrl === "classwork" || tabFromUrl === "people" || tabFromUrl === "grades" ? tabFromUrl : "stream";
  const queryClient = useQueryClient();

  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Create post (Stream tab) — announcement dialog + inline expanded box
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamAttachments, setStreamAttachments] = useState<Array<{ url: string; name?: string }>>([]);
  const [attachments, setAttachments] = useState<
    Array<{ id: string; type: "file" | "link" | "drive" | "youtube"; name: string; url?: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogFileInputRef = useRef<HTMLInputElement>(null);
  const [dialogAttachments, setDialogAttachments] = useState<
    Array<{ id: string; type: "file" | "link" | "drive" | "youtube"; name: string; url?: string }>
  >([]);

  // Customize hero (theme)
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("blue");

  // TipTap rich text editor for inline announcement composer
  const editor = useEditor({
    extensions: [StarterKit, UnderlineExtension],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[120px] p-3",
      },
    },
  });

  // Force re-render when editor selection/content changes so toolbar isActive stays in sync
  const [, setEditorUpdate] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const fn = () => setEditorUpdate((n) => n + 1);
    editor.on("transaction", fn);
    return () => {
      editor.off("transaction", fn);
    };
  }, [editor]);

  // TipTap editor for the Announcement dialog (modal)
  const dialogEditor = useEditor({
    extensions: [StarterKit, UnderlineExtension],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[160px] p-3",
      },
    },
  });
  const [, setDialogEditorUpdate] = useState(0);
  useEffect(() => {
    if (!dialogEditor) return;
    const fn = () => setDialogEditorUpdate((n) => n + 1);
    dialogEditor.on("transaction", fn);
    return () => {
      dialogEditor.off("transaction", fn);
    };
  }, [dialogEditor]);

  const deleteMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: ClassworkItemKind }) => {
      // Use POST .../delete to avoid "Cannot DELETE" when server or proxy doesn't support DELETE
      if (kind === "lesson") return api.post(`/lms/lessons/${id}/delete`);
      if (kind === "material") return api.post(`/lms/materials/${id}/delete`);
      return api.post(`/lms/assignments/${id}/delete`);
    },
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] });
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to delete");
    },
  });

  const handleDelete = (id: string, kind: ClassworkItemKind, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id, kind });
  };

  const createPostMutation = useMutation({
    mutationFn: async (payload: { courseId: string; content: string; attachments?: Array<{ url: string; name?: string }> }) => {
      const { data } = await api.post("/announcements", payload);
      return data;
    },
    onSuccess: () => {
      setStreamContent("");
      setStreamAttachments([]);
      setAttachments([]);
      setDialogAttachments([]);
      setAnnouncementDialogOpen(false);
      setIsExpanded(false);
      editor?.commands.clearContent();
      dialogEditor?.commands.clearContent();
      queryClient.invalidateQueries({ queryKey: ["lms", "stream", courseId] });
      toast.success("Posted to stream");
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to post");
    },
  });

  /** Check if HTML content is effectively empty (e.g. <p></p>, <p><br></p>) */
  const isEmptyContent = (html: string) => {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  };

  const handlePost = () => {
    const content = (editor?.getHTML() ?? "").trim();
    const hasText = !isEmptyContent(content);
    const hasAttachments = attachments.length > 0;
    const isEmpty = !hasText && !hasAttachments;
    if (isEmpty || createPostMutation.isPending) return;
    const payloadAttachments =
      attachments.length > 0
        ? attachments
            .filter((a) => a.url)
            .map((a) => ({ url: a.url!, name: a.name }))
        : undefined;
    createPostMutation.mutate({
      courseId,
      content: content || "<p></p>",
      attachments: payloadAttachments,
    });
  };

  const handleDialogPost = () => {
    const content = (dialogEditor?.getHTML() ?? "").trim();
    const hasText = !isEmptyContent(content);
    const hasAttachments = dialogAttachments.length > 0;
    const isEmpty = !hasText && !hasAttachments;
    if (isEmpty || createPostMutation.isPending) return;
    const payloadAttachments =
      dialogAttachments.length > 0
        ? dialogAttachments
            .filter((a) => a.url)
            .map((a) => ({ url: a.url!, name: a.name }))
        : undefined;
    createPostMutation.mutate({
      courseId,
      content: content || "<p></p>",
      attachments: payloadAttachments,
    });
  };

  const updateThemeMutation = useMutation({
    mutationFn: async (theme: string) => {
      await api.patch(`/lms/courses/${courseId}`, { theme });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] });
      setCustomizeOpen(false);
      toast.success("Theme saved");
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? "Failed to save theme");
    },
  });

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["lms", "course", courseId],
    queryFn: async () => {
      const response = await api.get<Course>(
        `/lms/courses/${courseId}/classwork`,
      );
      return response.data;
    },
    enabled: !!courseId,
  });

  const { data: streamPosts = [], isLoading: streamLoading } = useQuery({
    queryKey: ["lms", "stream", courseId],
    queryFn: async () => {
      const response = await api.get<StreamAnnouncement[]>(
        `/announcements?courseId=${courseId}`,
      );
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

  const teacherName = course.teacher?.profile
    ? `${course.teacher.profile.firstName} ${course.teacher.profile.lastName}`
    : "Teacher";

  const now = new Date();
  const allAssignments = sortedModules.flatMap((m) => m.assignments ?? []);
  const upcomingAssignments = allAssignments
    .filter((a) => a.dueDate && new Date(a.dueDate) > now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/teacher/courses" className="hover:underline">
          Courses
        </Link>
        <span>/</span>
        <span className="text-foreground">{course.name}</span>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="flex items-center justify-between border-b border-border">
          <TabsList className="h-12 w-auto justify-start gap-0 rounded-none border-0 bg-transparent p-0 shadow-none">
            <TabsTrigger
              value="stream"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Stream
            </TabsTrigger>
            <TabsTrigger
              value="classwork"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Classwork
            </TabsTrigger>
            <TabsTrigger
              value="people"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              People
            </TabsTrigger>
            <TabsTrigger
              value="grades"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Grades
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Calendar">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <AlertTriangle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <TabsContent value="stream" className="mt-6">
          {/* Stream Hero Banner — theme from course.theme; "code" = dark + code snippets */}
          {(() => {
            const theme = course.theme ?? "blue";
            const isCodeTheme = theme === "code";
            return (
              <div
                className={cn(
                  "relative h-[220px] rounded-xl overflow-hidden",
                  isCodeTheme ? "bg-slate-900" : cn("bg-gradient-to-r", HERO_THEMES[theme] ?? HERO_THEMES.blue),
                )}
              >
                {isCodeTheme && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-wrap justify-center gap-x-10 gap-y-2 text-slate-600 font-mono text-xl md:text-2xl">
                        <span>eat()</span>
                        <span>sleep()</span>
                        <span>code()</span>
                        <span>repeat()</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-4 font-mono text-slate-500 text-xs space-y-0.5">
                      <div>package.json</div>
                      <div>README.md</div>
                    </div>
                  </>
                )}
                <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-white">{course.name}</h2>
                  {!isCodeTheme && (
                    <Dialog
                      open={customizeOpen}
                      onOpenChange={(open) => {
                        setCustomizeOpen(open);
                        if (open) setSelectedTheme(course.theme ?? "blue");
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="shrink-0 bg-white/20 text-white hover:bg-white/30 border-0">
                          <Palette className="h-4 w-4 mr-1.5" />
                          Customize
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Customize banner</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">Choose a theme for the course hero.</p>
                        <div className="grid grid-cols-3 gap-3 py-2">
                          {THEME_OPTIONS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTheme(t)}
                              className={cn(
                                "h-12 w-full rounded-full border-2 transition-all",
                                t === "code" ? "bg-slate-900 text-white" : cn("bg-gradient-to-r", t === "blue" && "from-blue-600 to-blue-400", t === "green" && "from-emerald-600 to-emerald-400", t === "purple" && "from-purple-600 to-purple-400", t === "orange" && "from-orange-600 to-orange-400", t === "slate" && "from-slate-600 to-slate-400", t === "rose" && "from-rose-600 to-rose-400"),
                                selectedTheme === t ? "border-foreground ring-2 ring-offset-2 ring-foreground/30" : "border-transparent hover:opacity-90",
                              )}
                              aria-label={`Theme ${t}`}
                            >
                              {t === "code" ? "Code" : ""}
                            </button>
                          ))}
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button onClick={() => updateThemeMutation.mutate(selectedTheme)} disabled={updateThemeMutation.isPending}>
                            {updateThemeMutation.isPending ? "Saving…" : "Save"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end">
                  <p className="text-sm text-white/80">{course.subject?.name ?? "—"}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white shrink-0" aria-label="Info">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
                {isCodeTheme && (
                  <Dialog open={customizeOpen} onOpenChange={(open) => { setCustomizeOpen(open); if (open) setSelectedTheme(course.theme ?? "blue"); }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="absolute top-4 right-4 bg-white/10 text-white hover:bg-white/20 border-0">
                        <Palette className="h-4 w-4 mr-1.5" />
                        Customize
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader><DialogTitle>Customize banner</DialogTitle></DialogHeader>
                      <p className="text-sm text-muted-foreground">Choose a theme for the course hero.</p>
                      <div className="grid grid-cols-3 gap-3 py-2">
                        {THEME_OPTIONS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedTheme(t)}
                            className={cn(
                              "h-12 w-full rounded-full border-2 transition-all",
                              t === "code" ? "bg-slate-900 text-white" : cn("bg-gradient-to-r", t === "blue" && "from-blue-600 to-blue-400", t === "green" && "from-emerald-600 to-emerald-400", t === "purple" && "from-purple-600 to-purple-400", t === "orange" && "from-orange-600 to-orange-400", t === "slate" && "from-slate-600 to-slate-400", t === "rose" && "from-rose-600 to-rose-400"),
                              selectedTheme === t ? "border-foreground ring-2 ring-offset-2 ring-foreground/30" : "border-transparent hover:opacity-90",
                            )}
                            aria-label={`Theme ${t}`}
                          >
                            {t === "code" ? "Code" : ""}
                          </button>
                        ))}
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button onClick={() => updateThemeMutation.mutate(selectedTheme)} disabled={updateThemeMutation.isPending}>
                          {updateThemeMutation.isPending ? "Saving…" : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            );
          })()}

          {/* Master Grid: 2-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
            {/* Left column: Class code + Upcoming + Meet */}
            <div className="col-span-1 md:col-span-3 space-y-4">
              {/* Class code card */}
              {(course.classCode ?? course.code) && (
                <Card className="rounded-lg border border-border/60 shadow-sm bg-muted/30">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Class code</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            const code = course.classCode ?? course.code ?? "";
                            void navigator.clipboard.writeText(code);
                            toast.success("Class code copied");
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex items-center gap-2">
                    <span className="text-lg font-bold tracking-tight">{course.classCode ?? course.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        const code = course.classCode ?? course.code ?? "";
                        void navigator.clipboard.writeText(code);
                        toast.success("Class code copied");
                      }}
                      aria-label="Copy class code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Card */}
              <Card className="rounded-lg border border-border/60 shadow-sm bg-muted/30">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base font-semibold">Upcoming</CardTitle>
                  <Link
                    href={`/teacher/courses/${courseId}?tab=classwork`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View all
                  </Link>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {upcomingAssignments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No work due soon
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {upcomingAssignments.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/teacher/courses/${courseId}/assignments/${a.id}`}
                            className="text-sm font-medium text-foreground hover:underline block truncate"
                          >
                            {a.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Due {a.dueDate ? format(new Date(a.dueDate), "EEE, MMM d 'at' h:mm a") : "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Meet Card */}
              <MeetCard courseId={courseId} meetLink={course.meetLink ?? undefined} onUpdated={() => queryClient.invalidateQueries({ queryKey: ["lms", "course", courseId] })} />
            </div>

            {/* Right column: Action bar + Create Post + Stream feed */}
            <div className="col-span-1 md:col-span-9 space-y-4">
              {/* Action bar: New announcement + Repost */}
              <div className="flex items-center gap-2">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setAnnouncementDialogOpen(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  New announcement
                </Button>
                <Button variant="outline" className="text-primary border-border hover:bg-muted/50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Repost
                </Button>
              </div>

              {/* Inline Create Post box: pill (collapsed) or Card (expanded) */}
              {!isExpanded ? (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="w-full flex items-center gap-3 text-left rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors border-0"
                >
                  <Avatar className="h-10 w-10 shrink-0 rounded-full">
                    <AvatarFallback className="bg-muted text-foreground text-sm">
                      {course.teacher?.profile?.firstName && course.teacher?.profile?.lastName
                        ? `${course.teacher.profile.firstName[0]}${course.teacher.profile.lastName[0]}`
                        : "T"}
                    </AvatarFallback>
                  </Avatar>
                  <span>Announce something to your class</span>
                </button>
              ) : (
                <Card className="p-4 shadow-md rounded-xl border border-slate-200">
                  {/* Top row: audience selectors */}
                  <div className="flex gap-3 mb-4">
                    <Select value={courseId} onValueChange={() => {}}>
                      <SelectTrigger
                        className="w-fit min-w-0 max-w-[240px] rounded-full bg-slate-100 hover:bg-slate-200 border-0 text-sm font-medium text-foreground shadow-none focus:ring-0 [&_svg]:opacity-70"
                        aria-label="Course"
                      >
                        <SelectValue placeholder="Course">
                          <span className="truncate">{course.name}</span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={courseId}>{course.name}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value="all-students" onValueChange={() => {}}>
                      <SelectTrigger
                        className="w-fit min-w-0 rounded-full bg-slate-100 hover:bg-slate-200 border-0 text-sm font-medium text-foreground shadow-none focus:ring-0 [&_svg]:opacity-70"
                        aria-label="Audience"
                      >
                        <SelectValue>All students</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-students">All students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Input container: Material Design filled look — TipTap editor */}
                  <div className="bg-slate-50 rounded-t-md border-b-2 border-slate-800 p-3 mb-3">
                    {editor ? (
                      <EditorContent editor={editor} />
                    ) : (
                      <div className="min-h-[120px] p-3 text-muted-foreground text-sm">
                        Loading editor…
                      </div>
                    )}
                    {/* Formatting toolbar */}
                    <div className="flex items-center gap-1 pt-2 border-t border-slate-200 mt-2">
                      <button
                        type="button"
                        className={cn(
                          "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                          editor?.isActive("bold") && "bg-slate-200"
                        )}
                        aria-label="Bold"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        disabled={!editor}
                      >
                        <Bold size={18} className="text-slate-600" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                          editor?.isActive("italic") && "bg-slate-200"
                        )}
                        aria-label="Italic"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        disabled={!editor}
                      >
                        <Italic size={18} className="text-slate-600" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                          editor?.isActive("underline") && "bg-slate-200"
                        )}
                        aria-label="Underline"
                        onClick={() => editor?.chain().focus().toggleUnderline().run()}
                        disabled={!editor}
                      >
                        <Underline size={18} className="text-slate-600" />
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                          editor?.isActive("bulletList") && "bg-slate-200"
                        )}
                        aria-label="Bullet list"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        disabled={!editor}
                      >
                        <List size={18} className="text-slate-600" />
                      </button>
                      <button
                        type="button"
                        className="p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors"
                        aria-label="Remove formatting"
                        onClick={() =>
                          editor?.chain().focus().unsetAllMarks().clearNodes().run()
                        }
                        disabled={!editor}
                      >
                        <RemoveFormatting size={18} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                  {/* Attachment staging area */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 p-3 border-t border-slate-100">
                      {attachments.map((att) => {
                        const Icon =
                          att.type === "file"
                            ? FileText
                            : att.type === "link"
                              ? LinkIcon
                              : att.type === "drive"
                                ? HardDrive
                                : Youtube;
                        return (
                          <Card
                            key={att.id}
                            className="w-48 p-2 flex items-center justify-between border-slate-200 bg-white shrink-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="size-4 shrink-0 text-slate-600" />
                              <span className="text-sm truncate w-32" title={att.name}>
                                {att.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-slate-500 hover:text-slate-700"
                              aria-label="Remove attachment"
                              onClick={() =>
                                setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                              }
                            >
                              <X className="size-3.5" />
                            </Button>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  {/* Attachments + Actions row */}
                  <div className="flex items-center justify-between mt-4">
                    {/* Left: attachment icon buttons + hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="*/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        const newAttachments = Array.from(files).map((file) => ({
                          id: crypto.randomUUID(),
                          type: "file" as const,
                          name: file.name,
                          url: URL.createObjectURL(file),
                        }));
                        setAttachments((prev) => [...prev, ...newAttachments]);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Drive"
                        onClick={() => {
                          const url = window.prompt("Paste file or Drive link");
                          if (url?.trim())
                            setAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "drive",
                                name: "Drive",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <HardDrive className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Video"
                        onClick={() => {
                          const url = window.prompt("Paste video URL");
                          if (url?.trim())
                            setAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "youtube",
                                name: "Video",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <Youtube className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Upload"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Link"
                        onClick={() => {
                          const url = window.prompt("Paste link URL");
                          if (url?.trim())
                            setAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "link",
                                name: "Link",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <LinkIcon className="size-5" />
                      </Button>
                    </div>
                    {/* Right: Cancel + Post split-button */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-slate-600 hover:bg-slate-100"
                        onClick={() => {
                          setIsExpanded(false);
                          setStreamContent("");
                          setStreamAttachments([]);
                          setAttachments([]);
                          editor?.commands.clearContent();
                        }}
                      >
                        Cancel
                      </Button>
                      <div className="flex rounded-md overflow-hidden shadow-sm">
                        <Button
                          type="button"
                          disabled={
                            ((editor?.getText()?.trim() ?? "").length === 0 &&
                              attachments.length === 0) ||
                            createPostMutation.isPending
                          }
                          className="rounded-l-md rounded-r-none bg-blue-600 hover:bg-blue-700 text-white border-0 px-4"
                          onClick={handlePost}
                        >
                          {createPostMutation.isPending ? "Posting…" : "Post"}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-r-md rounded-l-none h-9 w-9 px-2 bg-blue-600 hover:bg-blue-700 text-white border-l border-blue-700"
                              aria-label="Post options"
                            >
                              <ChevronDown className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>Post and schedule (coming soon)</DropdownMenuItem>
                            <DropdownMenuItem disabled>Save as draft (coming soon)</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Announcement dialog — matches reference modal */}
              <Dialog
                open={announcementDialogOpen}
                onOpenChange={(open) => {
                  setAnnouncementDialogOpen(open);
                  if (!open) setDialogAttachments([]);
                }}
              >
                <DialogContent className="max-w-xl rounded-lg shadow-lg p-0 gap-0">
                  <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl font-bold">Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 space-y-4">
                    {/* For: dropdown + All students */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">For</span>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:bg-muted/50">
                          <span className="truncate">{course.name.length > 20 ? `${course.name.slice(0, 18)}...` : course.name}</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                        <Button variant="secondary" size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                          <Users className="h-4 w-4 mr-1.5" />
                          All students
                        </Button>
                      </div>
                    </div>
                    {/* TipTap editor + formatting toolbar */}
                    <div className="space-y-2">
                      {dialogEditor ? (
                        <EditorContent editor={dialogEditor} />
                      ) : (
                        <div className="min-h-[160px] p-3 text-muted-foreground text-sm border-b border-border">
                          Loading editor…
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 py-1">
                        <button
                          type="button"
                          className={cn(
                            "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                            dialogEditor?.isActive("bold") && "bg-slate-200"
                          )}
                          aria-label="Bold"
                          onClick={() => dialogEditor?.chain().focus().toggleBold().run()}
                          disabled={!dialogEditor}
                        >
                          <Bold className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                            dialogEditor?.isActive("italic") && "bg-slate-200"
                          )}
                          aria-label="Italic"
                          onClick={() => dialogEditor?.chain().focus().toggleItalic().run()}
                          disabled={!dialogEditor}
                        >
                          <Italic className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                            dialogEditor?.isActive("underline") && "bg-slate-200"
                          )}
                          aria-label="Underline"
                          onClick={() => dialogEditor?.chain().focus().toggleUnderline().run()}
                          disabled={!dialogEditor}
                        >
                          <Underline className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors",
                            dialogEditor?.isActive("bulletList") && "bg-slate-200"
                          )}
                          aria-label="Bullet list"
                          onClick={() => dialogEditor?.chain().focus().toggleBulletList().run()}
                          disabled={!dialogEditor}
                        >
                          <List className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 hover:bg-slate-200 rounded cursor-pointer text-slate-600 transition-colors"
                          aria-label="Remove formatting"
                          onClick={() =>
                            dialogEditor?.chain().focus().unsetAllMarks().clearNodes().run()
                          }
                          disabled={!dialogEditor}
                        >
                          <RemoveFormatting className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Attachment staging area — above bottom toolbar, below text editor */}
                    {dialogAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-3 p-3 border-t border-slate-100">
                        {dialogAttachments.map((att) => {
                          const Icon =
                            att.type === "file"
                              ? FileText
                              : att.type === "link"
                                ? LinkIcon
                                : att.type === "drive"
                                  ? HardDrive
                                  : Youtube;
                          return (
                            <Card
                              key={att.id}
                              className="w-48 p-2 flex items-center justify-between border-slate-200 bg-white shrink-0"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="size-4 shrink-0 text-slate-600" />
                                <span className="text-sm truncate w-32" title={att.name}>
                                  {att.name}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-slate-500 hover:text-slate-700"
                                aria-label="Remove attachment"
                                onClick={() =>
                                  setDialogAttachments((prev) => prev.filter((a) => a.id !== att.id))
                                }
                              >
                                <X className="size-3.5" />
                              </Button>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                    {/* Attachments row: icon buttons + hidden file input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={dialogFileInputRef}
                        className="hidden"
                        multiple
                        accept="*/*"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          const newAttachments = Array.from(files).map((file) => ({
                            id: crypto.randomUUID(),
                            type: "file" as const,
                            name: file.name,
                            url: URL.createObjectURL(file),
                          }));
                          setDialogAttachments((prev) => [...prev, ...newAttachments]);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-border"
                        aria-label="Drive"
                        onClick={() => {
                          const url = window.prompt("Paste file or Drive link");
                          if (url?.trim())
                            setDialogAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "drive",
                                name: "Drive",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <HardDrive className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-border"
                        aria-label="Video"
                        onClick={() => {
                          const url = window.prompt("Paste video URL");
                          if (url?.trim())
                            setDialogAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "youtube",
                                name: "Video",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <Youtube className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-border"
                        aria-label="Upload"
                        onClick={() => dialogFileInputRef.current?.click()}
                      >
                        <Upload className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full border border-border"
                        aria-label="Link"
                        onClick={() => {
                          const url = window.prompt("Paste link URL");
                          if (url?.trim())
                            setDialogAttachments((prev) => [
                              ...prev,
                              {
                                id: crypto.randomUUID(),
                                type: "link",
                                name: "Link",
                                url: url.trim(),
                              },
                            ]);
                        }}
                      >
                        <LinkIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter className="px-6 py-4 border-t border-border flex-row justify-end gap-2">
                    <Button
                      variant="ghost"
                      className="text-primary hover:bg-primary/10"
                      onClick={() => {
                        dialogEditor?.commands.clearContent();
                        setDialogAttachments([]);
                        setAnnouncementDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <div className="flex items-center rounded-md border border-border overflow-hidden">
                      <Button
                        disabled={
                          ((dialogEditor?.getText()?.trim() ?? "").length === 0 &&
                            dialogAttachments.length === 0) ||
                          createPostMutation.isPending
                        }
                        className="rounded-r-none bg-slate-200 text-slate-800 hover:bg-slate-300 border-0 disabled:opacity-50"
                        onClick={handleDialogPost}
                      >
                        {createPostMutation.isPending ? "Posting…" : "Post"}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none border-l border-border bg-slate-200 text-slate-800 hover:bg-slate-300" aria-label="Post options">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>Post and schedule (coming soon)</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            {/* Stream feed */}
            {streamLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="py-6">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : streamPosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-16 px-6">
                <MessageSquare className="h-14 w-14 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center max-w-sm">
                  This is where you can talk with your class.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {streamPosts.map((post) => {
                  const p = post as StreamAnnouncement;
                  const linkHref =
                    p.isSystemPost && p.linkedEntityId
                      ? p.linkedEntityType === "ASSIGNMENT"
                        ? `/teacher/courses/${courseId}/assignments/${p.linkedEntityId}`
                        : `/teacher/courses/${courseId}`
                      : undefined;
                  return (
                    <StreamPostCard
                      key={post.id}
                      post={p}
                      courseId={courseId}
                      linkHref={linkHref}
                    />
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="classwork" className="mt-6">
          {/* Create action — top left, pill button + dropdown */}
          <div className="flex justify-start mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    const firstMod = sortedModules[0];
                    if (firstMod) openAssignmentDialog(firstMod.id);
                    else setModuleDialogOpen(true);
                  }}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Assignment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMaterialDialogOpen(true)}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Material
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setModuleDialogOpen(true)}>
                  <Folder className="mr-2 h-4 w-4" />
                  Module / Topic
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Module (topic) layout — vertical list */}
          {sortedModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-lg border border-dashed border-border">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No modules yet. Add your first module to build the curriculum.</p>
              <Button size="lg" className="rounded-full" onClick={() => setModuleDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {sortedModules.map((mod, idx) => {
                const sortedLessons = [...(mod.lessons ?? [])].sort(
                  (a, b) => a.orderIndex - b.orderIndex
                );
                const sortedMaterials = [...(mod.materials ?? [])].sort(
                  (a, b) => a.order - b.order
                );
                const materialItems: Array<{
                  id: string;
                  kind: ClassworkItemKind;
                  type: "material" | "video" | "assignment" | "link";
                  title: string;
                  subtitle: string;
                  gradeHref?: string;
                }> = [
                  ...sortedLessons.map((lesson) => ({
                    id: lesson.id,
kind: "lesson" as const,
                    type: (lesson.videoUrl ? "video" : "material") as "video" | "material",
                    title: lesson.title,
                    subtitle: "Added recently",
                  })),
                  ...sortedMaterials.map((m) => ({
                    id: m.id,
                    kind: "material" as const,
                    type:
                      m.materialType === "YOUTUBE"
                        ? ("video" as const)
                        : m.materialType === "LINK"
                          ? ("link" as const)
                          : ("material" as const),
                    title: m.title,
                    subtitle: m.resourceUrl ? "Link" : "Added recently",
                  })),
                  ...(mod.assignments ?? []).map((a) => ({
                    id: a.id,
                    kind: "assignment" as const,
                    type: "assignment" as const,
                    title: a.title,
                    subtitle: a.dueDate
                      ? `Due ${format(new Date(a.dueDate), "MMM d, yyyy")}`
                      : "No due date",
                    gradeHref: `/teacher/courses/${courseId}/assignments/${a.id}`,
                  })),
                ];

                return (
                  <div key={mod.id}>
                    <h2 className="font-bold text-2xl border-b-2 border-foreground pb-2 mb-4">
                      Week {idx + 1}: {mod.title}
                    </h2>
                    <div className="space-y-1">
                      {materialItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">
                          No materials yet.
                        </p>
                      ) : (
                        materialItems.map((item) => (
                          <MaterialItemRow
                            key={item.id}
                            type={item.type}
                            title={item.title}
                            subtitle={item.subtitle}
                            onEdit={() => {}}
                            onDelete={() => handleDelete(item.id, item.kind, item.title)}
                            gradeHref={item.gradeHref}
                            isDeleting={deleteMutation.isPending}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="people" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <p className="text-sm text-muted-foreground">Student list will appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <p className="text-sm text-muted-foreground">Grades and submissions will appear here.</p>
          </div>
        </TabsContent>
      </Tabs>

      <AddModuleDialog
        courseId={courseId}
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
      />

      <AddMaterialDialog
        courseId={courseId}
        modules={sortedModules.map((m) => ({ id: m.id, title: m.title }))}
        open={materialDialogOpen}
        onOpenChange={setMaterialDialogOpen}
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
