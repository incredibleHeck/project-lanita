"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileText, GraduationCap } from "lucide-react";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface ReportData {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    class: string;
  };
  academicYear: string;
  exam: string;
  attendance: {
    present: number;
    total: number;
    percentage: number;
  };
  results: {
    subject: string;
    score: number;
    grade: string;
  }[];
  summary: {
    total: number;
    average: number;
  };
}

function getGradeRemark(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Satisfactory";
    case "E":
      return "Needs Improvement";
    case "F":
      return "Fail";
    default:
      return "-";
  }
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-green-600";
    case "B":
      return "text-blue-600";
    case "C":
      return "text-yellow-600";
    case "D":
      return "text-orange-600";
    case "E":
    case "F":
      return "text-red-600";
    default:
      return "";
  }
}

export default function ReportCardPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  const { data: exams, isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: async () => {
      const res = await api.get("/exams");
      return res.data;
    },
  });

  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery<ReportData>({
    queryKey: ["report", studentId, selectedExamId],
    queryFn: async () => {
      const res = await api.get(`/reports/student/${studentId}`, {
        params: { examId: selectedExamId },
      });
      return res.data;
    },
    enabled: !!selectedExamId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (examsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[800px] max-w-4xl mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Report Card</h1>
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
        </div>
        {report && (
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        )}
      </div>

      {!selectedExamId && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FileText className="h-16 w-16 mb-4" />
          <p className="text-lg">Select an exam to view the report card</p>
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
        </div>
      )}

      {report && (
        <Card className="max-w-4xl mx-auto p-8 bg-white text-black print:shadow-none print:border-none print:p-0 print:bg-white">
          {/* School Header */}
          <div className="text-center border-b-2 border-black pb-6 mb-6">
            <h1 className="text-3xl font-serif font-bold tracking-wide">
              HeckTeck International School
            </h1>
            <p className="text-sm mt-1">
              123 Education Avenue, Knowledge City, KC 12345
            </p>
            <p className="text-sm">
              Tel: (123) 456-7890 | Email: info@hecktech.edu
            </p>
            <div className="mt-4">
              <h2 className="text-xl font-semibold uppercase tracking-widest">
                Terminal Report Card
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {report.exam} - {report.academicYear}
              </p>
            </div>
          </div>

          {/* Student Info Section */}
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-300">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-gray-300 print:border-gray-400">
                <AvatarFallback className="text-xl bg-gray-100 text-gray-700">
                  {report.student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="text-lg font-semibold">{report.student.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Admission No.</p>
                <p className="font-medium">{report.student.admissionNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Class</p>
                <p className="font-medium">{report.student.class}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Academic Year</p>
                <p className="font-medium">{report.academicYear}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Term/Exam</p>
                <p className="font-medium">{report.exam}</p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="mb-6 pb-6 border-b border-gray-300">
            <h3 className="text-sm font-semibold uppercase text-gray-600 mb-3">
              Attendance Summary
            </h3>
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-gray-500">Days Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.attendance.present}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Days</p>
                <p className="text-2xl font-bold">{report.attendance.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Attendance Rate</p>
                <p
                  className={`text-2xl font-bold ${
                    report.attendance.percentage >= 90
                      ? "text-green-600"
                      : report.attendance.percentage >= 75
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {report.attendance.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Grades Table */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase text-gray-600 mb-3">
              Academic Performance
            </h3>
            {report.results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <GraduationCap className="h-12 w-12 mb-2" />
                <p>No exam results recorded yet</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                      Subject
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold w-24">
                      Score
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold w-24">
                      Grade
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((result, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-300 px-4 py-2">
                        {result.subject}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {result.score}
                      </td>
                      <td
                        className={`border border-gray-300 px-4 py-2 text-center font-bold ${getGradeColor(
                          result.grade
                        )}`}
                      >
                        {result.grade}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-gray-600">
                        {getGradeRemark(result.grade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary Footer */}
          {report.results.length > 0 && (
            <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-gray-300">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-gray-500">Total Score</p>
                  <p className="text-2xl font-bold">{report.summary.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Score</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {report.summary.average.toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Out of</p>
                <p className="text-2xl font-bold">
                  {report.results.length * 100}
                </p>
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-8">
            <div>
              <div className="border-b border-black w-48 mb-2"></div>
              <p className="text-sm text-gray-600">Class Teacher&apos;s Signature</p>
            </div>
            <div className="text-right">
              <div className="border-b border-black w-48 ml-auto mb-2"></div>
              <p className="text-sm text-gray-600">Principal&apos;s Signature</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This is a computer-generated report card. For any queries, please
              contact the school administration.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
