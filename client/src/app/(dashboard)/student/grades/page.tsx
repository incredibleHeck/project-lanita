"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultItem {
  subject: string;
  score: number;
  grade: string | null;
  remarks: string | null;
}

type GroupedResults = Record<
  string,
  { exam: { name: string; maxScore: number }; results: ResultItem[] }
>;

export default function StudentGradesPage() {
  return (
    <RoleGuard allowedRoles={["STUDENT"]}>
      <StudentGradesContent />
    </RoleGuard>
  );
}

function StudentGradesContent() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["results", "student", user?.id],
    queryFn: async () => {
      const response = await axios.get<GroupedResults>(
        `/results/student/${user?.id}?useUserId=true`
      );
      return response.data;
    },
    enabled: !!user?.id,
  });

  const getGradeBadgeClass = (grade: string | null) => {
    if (!grade) return "";
    switch (grade.charAt(0).toUpperCase()) {
      case "A":
        return "bg-green-500/90";
      case "B":
        return "bg-blue-500/90";
      case "C":
        return "bg-yellow-500/90";
      case "D":
        return "bg-orange-500/90";
      default:
        return "bg-red-500/90";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <FileQuestion className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">
          Failed to load grades. Please try again later.
        </p>
      </div>
    );
  }

  const examNames = Object.keys(data);
  const hasResults = examNames.length > 0;

  if (!hasResults) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-7 w-7" />
          My Grades
        </h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Award className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">No grades recorded yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Award className="h-7 w-7" />
        My Grades
      </h1>

      <div className="space-y-6">
        {examNames.map((examName) => {
          const group = data[examName];
          const results = group.results;

          return (
            <Card key={examName}>
              <CardHeader>
                <CardTitle className="text-lg">{examName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, idx) => (
                      <TableRow key={`${r.subject}-${idx}`}>
                        <TableCell>
                          <span className="font-medium">{r.subject}</span>
                        </TableCell>
                        <TableCell>
                          {r.score}
                          {group.exam?.maxScore != null && (
                            <span className="text-muted-foreground text-sm">
                              /{group.exam.maxScore}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.grade ? (
                            <Badge
                              className={cn(
                                "text-white",
                                getGradeBadgeClass(r.grade)
                              )}
                            >
                              {r.grade}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.remarks ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
