"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileText, Download, ArrowLeft } from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { ReportCard, type ReportCardData } from "@/components/reports/report-card";
import Link from "next/link";

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function ParentReportPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <ParentReportContent />
    </RoleGuard>
  );
}

function ParentReportContent() {
  const params = useParams();
  const studentUserId = params.id as string;
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  const { data: exams, isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["student", "summary", studentUserId],
    queryFn: async () => {
      const res = await api.get(`/portal/student/${studentUserId}/summary`);
      return res.data as { firstName: string; lastName: string };
    },
    enabled: !!studentUserId,
  });

  const childName = summary
    ? `${summary.firstName} ${summary.lastName}`.trim() || "Child"
    : "Child";

  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery<ReportCardData>({
    queryKey: ["report", "parent", studentUserId, selectedExamId],
    queryFn: async () => {
      const res = await api.get(`/reports/student/${studentUserId}`, {
        params: { examId: selectedExamId },
      });
      return res.data;
    },
    enabled: !!selectedExamId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (examsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[800px] max-w-4xl mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href={`/parent/child/${studentUserId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {childName}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Report Card</h1>
            <p className="text-sm text-muted-foreground">
              View and download your child&apos;s report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedExamId} onValueChange={setSelectedExamId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select an exam" />
            </SelectTrigger>
            <SelectContent>
              {exams?.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {report && (
            <>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {!selectedExamId && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="h-16 w-16 mb-4" />
          <p className="text-lg">Select an exam to view the report card</p>
          <Link href={`/parent/child/${studentUserId}`} className="mt-4">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {childName}
            </Button>
          </Link>
        </div>
      )}

      {selectedExamId && reportLoading && (
        <Card className="max-w-4xl mx-auto p-8">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>
      )}

      {reportError && (
        <div className="flex flex-col items-center justify-center py-20 text-destructive">
          <p>Failed to load report card. Please try again.</p>
          <Link href={`/parent/child/${studentUserId}`} className="mt-4">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {childName}
            </Button>
          </Link>
        </div>
      )}

      {report && <ReportCard report={report} />}
    </div>
  );
}
