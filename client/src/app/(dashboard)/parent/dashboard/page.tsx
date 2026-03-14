"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle } from "lucide-react";

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
  const router = useRouter();
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

  useEffect(() => {
    if (!authLoading && !isLoading && children.length > 0) {
      router.replace(`/parent/child/${children[0].user.id}`);
    }
  }, [authLoading, isLoading, children, router]);

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

  if (children.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 min-h-[400px]">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8" />
        <h1 className="text-3xl font-bold tracking-tight">My Children</h1>
      </div>

      <Card className="flex flex-col items-center justify-center gap-4 min-h-[300px] rounded-2xl border border-border/50 shadow-sm shadow-black/5">
        <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
          <Users className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">No children linked to your account.</p>
          <p className="text-sm text-muted-foreground text-center">
            Contact the school administration to link your children.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
