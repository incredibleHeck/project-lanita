"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { setupAutoSync } from "@/lib/sync-engine";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { OfflineIndicator } from "@/components/offline-indicator";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: (failureCount, error) => {
          if (!navigator.onLine) return false;
          return failureCount < 3;
        },
      },
    },
  }));

  useEffect(() => {
    const cleanup = setupAutoSync(30000);
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PWAInstallPrompt />
      <OfflineIndicator />
    </QueryClientProvider>
  );
}