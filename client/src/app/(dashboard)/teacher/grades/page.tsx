"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  CheckCircle2,
  FileSpreadsheet,

  Save,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface Allocation {
  id: string;
  section: {
    id: string;
    name: string;
    class: {
      name: string;
    };
  };
  subject: {
    id: string;
    name: string;
  };
  academicYear: {
    name: string;
  };
}

interface Exam {
  id: string;
  name: string;
  maxScore: number;
}

interface StudentInRoster {
  id: string; // studentRecord id
  admissionNumber: string;
  userId: string;
  user?: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface ExistingResult {
  id: string;
  studentId: string;
  score: number;
  grade?: string | null;
  remarks?: string | null;
}

interface MarkEntry {
  score: string;
  remarks: string;
}

export default function TeacherGradesEntryPage() {
  return (
    <RoleGuard allowedRoles={["TEACHER", "ADMIN", "SUPER_ADMIN"]}>
      <TeacherGradesContent />
    </RoleGuard>
  );
}

function TeacherGradesContent() {
  const searchParams = useSearchParams();
  const initialAllocationId = searchParams.get("allocationId") || "";
  const initialExamId = searchParams.get("examId") || "";

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAllocationId, setSelectedAllocationId] = useState(initialAllocationId);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [marksState, setMarksState] = useState<Record<string, MarkEntry>>({});

  // 1. Fetch Teacher's Subject Allocations
  const { data: allocations = [] } = useQuery<Allocation[]>({
    queryKey: ["teacher-allocations", user?.id],
    queryFn: async () => {
      const res = await api.get(`/allocations/teacher/${user?.id}`);
      return res.data;
    },
    enabled: !!user?.id,
  });

  // 2. Fetch Available Exams
  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data;
    },
  });

  const selectedAllocation = allocations.find((a) => a.id === selectedAllocationId);
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  // 3. Fetch Enrolled Students for the Selected Section
  const sectionId = selectedAllocation?.section.id;
  const { data: students = [], isLoading: studentsLoading } = useQuery<StudentInRoster[]>({
    queryKey: ["students-by-section", sectionId],
    queryFn: async () => {
      const res = await api.get(`/students/section/${sectionId}`);
      return res.data;
    },
    enabled: !!sectionId,
  });

  // 4. Fetch Any Existing Results for this Exam and Subject
  const subjectId = selectedAllocation?.subject.id;
  const { data: existingResults = [] } = useQuery<ExistingResult[]>({
    queryKey: ["existing-results", selectedExamId, subjectId],
    queryFn: async () => {
      const res = await api.get(`/results`, {
        params: { examId: selectedExamId, subjectId },
      });
      return res.data;
    },
    enabled: !!selectedExamId && !!subjectId,
  });

  // Pre-populate marks state when existing results or student roster loads
  useEffect(() => {
    if (!students.length) return;

    const initialMarks: Record<string, MarkEntry> = {};
    const resultMap = new Map<string, ExistingResult>();
    existingResults.forEach((r) => resultMap.set(r.studentId, r));

    students.forEach((s) => {
      const existing = resultMap.get(s.id);
      initialMarks[s.id] = {
        score: existing !== undefined ? String(existing.score) : "",
        remarks: existing?.remarks || "",
      };
    });

    const timer = setTimeout(() => {
      setMarksState(initialMarks);
    }, 0);
    return () => clearTimeout(timer);
  }, [students, existingResults]);

  // Compute Grade letter from percentage
  const calculateGrade = (scoreNum: number, maxScore: number): { letter: string; color: string } => {
    if (isNaN(scoreNum) || maxScore <= 0) return { letter: "—", color: "bg-slate-100 text-slate-700" };
    const pct = (scoreNum / maxScore) * 100;
    if (pct >= 80) return { letter: "A", color: "bg-green-100 text-green-800 border-green-300" };
    if (pct >= 70) return { letter: "B", color: "bg-blue-100 text-blue-800 border-blue-300" };
    if (pct >= 60) return { letter: "C", color: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    if (pct >= 50) return { letter: "D", color: "bg-orange-100 text-orange-800 border-orange-300" };
    return { letter: "F", color: "bg-red-100 text-red-800 border-red-300" };
  };

  // Class Statistics
  const stats = useMemo(() => {
    if (!selectedExam) return null;
    const scoresEntered = Object.values(marksState)
      .map((m) => parseFloat(m.score))
      .filter((s) => !isNaN(s));

    if (!scoresEntered.length) {
      return {
        total: students.length,
        graded: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passRate: 0,
      };
    }

    const sum = scoresEntered.reduce((a, b) => a + b, 0);
    const avg = sum / scoresEntered.length;
    const max = Math.max(...scoresEntered);
    const min = Math.min(...scoresEntered);
    const passingCount = scoresEntered.filter((s) => (s / selectedExam.maxScore) * 100 >= 50).length;
    const passRate = Math.round((passingCount / scoresEntered.length) * 100);

    return {
      total: students.length,
      graded: scoresEntered.length,
      average: avg.toFixed(1),
      highest: max,
      lowest: min,
      passRate,
    };
  }, [marksState, students, selectedExam]);

  // Save Batch Mutation
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !subjectId) throw new Error("Exam and Subject required");

      const scorePayloads = Object.entries(marksState)
        .filter(([, entry]) => entry.score.trim() !== "")
        .map(([studentId, entry]) => ({
          studentId,
          score: parseFloat(entry.score),
          remarks: entry.remarks.trim() || undefined,
        }));

      if (!scorePayloads.length) {
        throw new Error("Please enter at least one student score before saving.");
      }

      const res = await api.post("/results/batch", {
        examId: selectedExamId,
        subjectId,
        scores: scorePayloads,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully saved marks for ${data.length} students!`);
      queryClient.invalidateQueries({ queryKey: ["existing-results"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || "Failed to save marks");
    },
  });

  const handleScoreChange = (studentId: string, value: string) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: value,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value,
      },
    }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Grade Entry & Marks Sheet</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Record, calculate, and submit student assessment marks for your assigned classes.
          </p>
        </div>

        {selectedAllocation && selectedExam && students.length > 0 && (
          <Button
            size="lg"
            className="gap-2 shadow-sm"
            onClick={() => saveBatchMutation.mutate()}
            disabled={saveBatchMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {saveBatchMutation.isPending ? "Submitting Marks..." : "Save Marks Sheet"}
          </Button>
        )}
      </div>

      {/* Selectors Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Class & Subject *</label>
              <Select value={selectedAllocationId} onValueChange={setSelectedAllocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose one of your assigned classes" />
                </SelectTrigger>
                <SelectContent>
                  {allocations.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.section.class.name} - {a.section.name} &bull; {a.subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Examination Period *</label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an examination" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} (Max: {e.maxScore} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection State Prompt */}
      {(!selectedAllocationId || !selectedExamId) && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground bg-muted/10">
          <FileSpreadsheet className="h-14 w-14 mx-auto mb-3 opacity-30 text-primary" />
          <h3 className="text-lg font-semibold">No Class or Exam Selected</h3>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Please choose a class allocation and an examination period above to open the student marks entry table.
          </p>
        </div>
      )}

      {/* Statistics Header (when class & exam selected) */}
      {selectedAllocation && selectedExam && stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Roster Progress</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {stats.graded} / {stats.total}
                  </h3>
                </div>
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Class Average</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.average} / {selectedExam.maxScore}</h3>
                </div>
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pass Rate (&ge;50%)</p>
                  <h3 className="text-2xl font-bold mt-1">{stats.passRate}%</h3>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Highest / Lowest</p>
                  <h3 className="text-2xl font-bold mt-1">
                    {stats.highest} / {stats.lowest}
                  </h3>
                </div>
                <Award className="h-6 w-6 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Marks Sheet Table */}
      {selectedAllocation && selectedExam && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {selectedAllocation.section.class.name} {selectedAllocation.section.name} &bull; {selectedAllocation.subject.name}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Grading Scale: Max {selectedExam.maxScore} Points. Scores update grades and student report cards automatically.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No students enrolled in this section.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-[160px]">Score (/{selectedExam.maxScore})</TableHead>
                    <TableHead className="w-[100px] text-center">Grade</TableHead>
                    <TableHead>Teacher Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, idx) => {
                    const entry = marksState[student.id] || { score: "", remarks: "" };
                    const numScore = parseFloat(entry.score);
                    const gradeInfo = !isNaN(numScore) ? calculateGrade(numScore, selectedExam.maxScore) : { letter: "—", color: "bg-muted text-muted-foreground" };
                    const isExceeding = !isNaN(numScore) && numScore > selectedExam.maxScore;

                    const fullName = student.user?.profile
                      ? `${student.user.profile.firstName || ""} ${student.user.profile.lastName || ""}`.trim()
                      : "Student";

                    return (
                      <TableRow key={student.id} className={isExceeding ? "bg-red-50" : ""}>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {fullName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              max={selectedExam.maxScore}
                              step="0.5"
                              placeholder="0.0"
                              value={entry.score}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className={`h-9 font-semibold ${isExceeding ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                            />
                            {isExceeding && (
                              <p className="text-xs text-red-600">Exceeds {selectedExam.maxScore}!</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-bold px-3 py-1 ${gradeInfo.color}`}>
                            {gradeInfo.letter}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Optional notes or student feedback..."
                            value={entry.remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
