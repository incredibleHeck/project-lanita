"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = "/dashboard" }: RoleGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        const defaultRedirect = getDefaultRedirectForRole(user.role);
        router.push(defaultRedirect);
        return;
      }

      queueMicrotask(() => setIsAuthorized(true));
    }
  }, [user, isLoading, allowedRoles, router, redirectTo]);

  if (isLoading || !isAuthorized) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}

function getDefaultRedirectForRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/teacher/classes";
    case "STUDENT":
      return "/student/dashboard";
    case "PARENT":
      return "/parent/dashboard";
    default:
      return "/dashboard";
  }
}
