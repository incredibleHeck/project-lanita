"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  terms?: Term[];
}

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  maxScore: number;
  academicYearId: string;
  termId?: string | null;
  academicYear?: AcademicYear;
  term?: Term | null;
  _count?: {
    results: number;
  };
}

export default function ExamsManagementPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN", "TEACHER"]}>
      <ExamsContent />
    </RoleGuard>
  );
}

function ExamsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("all");
  const [examName, setExamName] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxScore, setMaxScore] = useState(100);

  // Queries
  const { data: exams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get<Exam[]>("/exams");
      return res.data;
    },
  });

  const { data: academicYears = [] } = useQuery<AcademicYear[]>({
    queryKey: ["academic-years"],
    queryFn: async () => {
      const res = await api.get<AcademicYear[]>("/academic-year");
      return res.data;
    },
  });

  const selectedYear = academicYears.find((y) => y.id === academicYearId);
  const availableTerms = selectedYear?.terms || [];

  // Mutations
  const createExamMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: examName.trim(),
        academicYearId,
        termId: termId || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxScore: Number(maxScore),
      };
      const res = await api.post("/exams", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Exam scheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to schedule exam");
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exams/${id}`);
    },
    onSuccess: () => {
      toast.success("Exam deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete exam");
    },
  });

  const resetForm = () => {
    setExamName("");
    setAcademicYearId("");
    setTermId("");
    setStartDate("");
    setEndDate("");
    setMaxScore(100);
  };

  const filteredExams = exams.filter((e) => {
    if (selectedYearFilter === "all") return true;
    return e.academicYearId === selectedYearFilter;
  });

  const now = new Date();
  const activeExamsCount = exams.filter((e) => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    return now >= start && now <= end;
  }).length;

  const totalResultsRecorded = exams.reduce((sum, e) => sum + (e._count?.results || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Examinations & Assessments</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage academic examination schedules, term assessments, and marks sheets.
          </p>
        </div>

        {isAdmin && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Schedule Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule New Examination</DialogTitle>
                <DialogDescription>
                  Define exam session dates, weightage, and target academic term.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="examName">Exam Title *</Label>
                  <Input
                    id="examName"
                    placeholder="e.g. Term 1 Mid-Term Examination"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year *</Label>
                    <Select value={academicYearId} onValueChange={(val) => {
                      setAcademicYearId(val);
                      setTermId("");
                    }}>
                      <SelectTrigger id="academicYear">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.name} {y.isCurrent && "(Current)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="term">Term / Semester</Label>
                    <Select value={termId} onValueChange={setTermId} disabled={!academicYearId}>
                      <SelectTrigger id="term">
                        <SelectValue placeholder={availableTerms.length ? "Select term" : "No terms found"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTerms.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxScore">Maximum Possible Score *</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    min="1"
                    max="1000"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard score scale (typically 100 for percentage grading).
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createExamMutation.mutate()}
                  disabled={!examName || !academicYearId || !startDate || !endDate || createExamMutation.isPending}
                >
                  {createExamMutation.isPending ? "Scheduling..." : "Create Exam"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all academic sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Assessment Periods</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeExamsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently open for marks submission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recorded Scores</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResultsRecorded}</div>
            <p className="text-xs text-muted-foreground mt-1">Total student marks on file</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="w-[240px]">
          <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Academic Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Years</SelectItem>
              {academicYears.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name} {y.isCurrent && "★"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Examinations</CardTitle>
          <CardDescription>
            Click &ldquo;Enter Marks&rdquo; to record student scores and teacher assessments for any exam.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No examinations scheduled</p>
              <p className="text-sm mt-1">
                {isAdmin ? "Click 'Schedule Exam' above to create your first examination period." : "Your school administrator has not created any exams yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam Title</TableHead>
                  <TableHead>Academic Year / Term</TableHead>
                  <TableHead>Assessment Window</TableHead>
                  <TableHead className="text-center">Max Score</TableHead>
                  <TableHead className="text-center">Marks Entered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => {
                  const start = new Date(exam.startDate);
                  const end = new Date(exam.endDate);
                  const isActive = now >= start && now <= end;

                  return (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          <span>{exam.name}</span>
                          {isActive && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Live
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm">{exam.academicYear?.name || "—"}</div>
                          {exam.term && (
                            <div className="text-xs text-muted-foreground">{exam.term.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(start, "MMM d, yyyy")} &ndash; {format(end, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {exam.maxScore} pts
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {exam._count?.results || 0} scores
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/teacher/grades?examId=${exam.id}`}>
                            <Button size="sm" variant="default" className="gap-1 h-8">
                              <Edit className="h-3.5 w-3.5" />
                              Enter Marks
                            </Button>
                          </Link>

                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${exam.name}"?`)) {
                                  deleteExamMutation.mutate(exam.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
