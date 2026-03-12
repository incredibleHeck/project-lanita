"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, GraduationCap, Eye, FileText } from "lucide-react";
import Link from "next/link";

interface Child {
  id: string;
  admissionNumber: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  currentSection: {
    name: string;
    class: {
      name: string;
    };
  };
}

interface ChildrenResponse {
  data: Child[];
}

export default function ParentDashboardPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <ParentDashboardContent />
    </RoleGuard>
  );
}

function ParentDashboardContent() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: childrenData, isLoading, isError } = useQuery({
    queryKey: ["parent", "children", user?.id],
    queryFn: async () => {
      const response = await axios.get<ChildrenResponse>("/portal/parent/children");
      return response.data;
    },
    enabled: !!user?.id,
  });

  const children = childrenData?.data || [];

  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Failed to load children data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8" />
        <h1 className="text-3xl font-bold tracking-tight">My Children</h1>
      </div>

      {children.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 min-h-[300px]">
          <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
            <Users className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No children linked to your account.</p>
            <p className="text-sm text-muted-foreground">Contact the school administration to link your children.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {child.user.profile?.firstName} {child.user.profile?.lastName}
                      </CardTitle>
                      <CardDescription>{child.admissionNumber}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Class</span>
                    <Badge variant="secondary">
                      {child.currentSection.class.name} - {child.currentSection.name}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Link href={`/parent/child/${child.user.id}`} className="flex-1">
                    <Button className="w-full" variant="outline">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/parent/child/${child.user.id}/report`} className="flex-1">
                    <Button className="w-full" variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      View Report
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
