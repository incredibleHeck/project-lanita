"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    } else {
      queueMicrotask(() => setIsAuthenticated(true));
    }
    queueMicrotask(() => setIsLoading(false));
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - hidden on mobile and when printing */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-background print:hidden">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex-1 md:pl-64 print:pl-0">
        <Header className="print:hidden" />
        <main className="p-4 md:p-6 lg:p-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
