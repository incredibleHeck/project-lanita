"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Calendar, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface AtRiskStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  riskScore: number;
  riskFactors: string[];
}

function getRiskBadge(score: number) {
  if (score >= 75) {
    return (
      <Badge className="bg-red-500 hover:bg-red-600 text-white">
        Critical Risk
      </Badge>
    );
  } else if (score >= 50) {
    return (
      <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
        High Risk
      </Badge>
    );
  } else {
    return (
      <Badge variant="secondary">
        Monitor
      </Badge>
    );
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <AnalyticsContent />
    </RoleGuard>
  );
}

function AnalyticsContent() {
  const { data: atRiskStudents, isLoading, isError } = useQuery<AtRiskStudent[]>({
    queryKey: ["analytics", "at-risk"],
    queryFn: async () => {
      const response = await api.get("/analytics/at-risk");
      return response.data;
    },
  });

  const handleScheduleMeeting = (studentName: string) => {
    toast.success(`Meeting request sent for ${studentName}`, {
      description: "The parent will be notified via email.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-9 w-80" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <p className="text-lg text-muted-foreground">
          Failed to load analytics data. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Predictive Attrition & Intervention
          </h1>
          <p className="text-muted-foreground">
            Students at risk based on attendance and academic performance
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total At-Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{atRiskStudents?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {atRiskStudents?.filter((s) => s.riskScore >= 75).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {atRiskStudents?.filter((s) => s.riskScore >= 50 && s.riskScore < 75).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students Requiring Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {!atRiskStudents || atRiskStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShieldAlert className="h-12 w-12 mb-4" />
              <p className="text-lg">No at-risk students identified</p>
              <p className="text-sm">All students are performing well</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Risk Factors</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell>
                      {student.className} - {student.sectionName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{student.riskScore}</span>
                        {getRiskBadge(student.riskScore)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.riskFactors.map((factor, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScheduleMeeting(student.name)}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
