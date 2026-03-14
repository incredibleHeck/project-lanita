"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap } from "lucide-react";

export interface ReportCardData {
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

interface ReportCardProps {
  report: ReportCardData;
}

export function ReportCard({ report }: ReportCardProps) {
  return (
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
          <p className="text-sm text-foreground mt-1">
            {report.exam} - {report.academicYear}
          </p>
        </div>
      </div>

      {/* Student Info Section */}
      <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-border print:border-border">
            <AvatarFallback className="text-xl bg-muted text-foreground">
              {report.student.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-foreground/80">Student Name</p>
            <p className="text-lg font-semibold">{report.student.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-foreground/80">Admission No.</p>
            <p className="font-medium">{report.student.admissionNumber}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/80">Class</p>
            <p className="font-medium">{report.student.class}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/80">Academic Year</p>
            <p className="font-medium">{report.academicYear}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/80">Term/Exam</p>
            <p className="font-medium">{report.exam}</p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="mb-6 pb-6 border-b border-border">
        <h3 className="text-sm font-semibold uppercase text-foreground mb-3">
          Attendance Summary
        </h3>
        <div className="flex gap-8">
          <div>
            <p className="text-sm text-foreground/80">Days Present</p>
            <p className="text-2xl font-bold text-green-600">
              {report.attendance.present}
            </p>
          </div>
          <div>
            <p className="text-sm text-foreground/80">Total Days</p>
            <p className="text-2xl font-bold">{report.attendance.total}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/80">Attendance Rate</p>
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
        <h3 className="text-sm font-semibold uppercase text-foreground mb-3">
          Academic Performance
        </h3>
        {report.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-foreground/80">
            <GraduationCap className="h-12 w-12 mb-2" />
            <p>No exam results recorded yet</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2 text-left font-semibold">
                  Subject
                </th>
                <th className="border border-border px-4 py-2 text-center font-semibold w-24">
                  Score
                </th>
                <th className="border border-border px-4 py-2 text-center font-semibold w-24">
                  Grade
                </th>
                <th className="border border-border px-4 py-2 text-left font-semibold">
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((result, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white" : "bg-muted/50"}
                >
                  <td className="border border-border px-4 py-2">
                    {result.subject}
                  </td>
                  <td className="border border-border px-4 py-2 text-center font-medium">
                    {result.score}
                  </td>
                  <td
                    className={`border border-border px-4 py-2 text-center font-bold ${getGradeColor(result.grade)}`}
                  >
                    {result.grade}
                  </td>
                  <td className="border border-border px-4 py-2 text-foreground">
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
        <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b border-border">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-foreground/80">Total Score</p>
              <p className="text-2xl font-bold">{report.summary.total}</p>
            </div>
            <div>
              <p className="text-sm text-foreground/80">Average Score</p>
              <p className="text-2xl font-bold text-blue-600">
                {report.summary.average.toFixed(1)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-foreground/80">Out of</p>
            <p className="text-2xl font-bold">{report.results.length * 100}</p>
          </div>
        </div>
      )}

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 mt-8 pt-8">
        <div>
          <div className="border-b border-black w-48 mb-2"></div>
          <p className="text-sm text-foreground">Class Teacher&apos;s Signature</p>
        </div>
        <div className="text-right">
          <div className="border-b border-black w-48 ml-auto mb-2"></div>
          <p className="text-sm text-foreground">Principal&apos;s Signature</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pt-4 border-t border-border">
        <p className="text-xs text-foreground/80">
          This is a computer-generated report card. For any queries, please
          contact the school administration.
        </p>
      </div>
    </Card>
  );
}
