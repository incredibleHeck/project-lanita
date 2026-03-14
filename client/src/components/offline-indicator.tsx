"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/use-offline-attendance';
import { syncPendingAttendance, getLastSyncInfo } from '@/lib/sync-engine';
import { Button } from '@/components/ui/button';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const pathname = usePathname();
  const { isOnline, pendingCount } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const updateSyncInfo = async () => {
      try {
        const info = await getLastSyncInfo();
        setFailedCount(info.failedCount);
      } catch {
        // IndexedDB not available
      }
    };
    updateSyncInfo();
    const interval = setInterval(updateSyncInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await syncPendingAttendance();
      const info = await getLastSyncInfo();
      setFailedCount(info.failedCount);
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show on login - user needs to sign in first; offline banner is confusing there
  if (pathname === '/login') return null;
  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  const pillContent = !isOnline ? (
    <>
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>Working Offline - Changes will sync later.</span>
    </>
  ) : failedCount > 0 ? (
    <>
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>Sync failed</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSync}
        disabled={isSyncing}
        className="h-7 px-2 -mr-1 text-inherit hover:bg-white/20"
      >
        {isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          'Retry'
        )}
      </Button>
    </>
  ) : (
    <>
      <RefreshCw className="h-4 w-4 shrink-0" />
      <span>{pendingCount} pending to sync</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSync}
        disabled={isSyncing}
        className="h-7 px-2 -mr-1 text-inherit hover:bg-white/20"
      >
        {isSyncing ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          'Sync'
        )}
      </Button>
    </>
  );

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        className
      )}
    >
      <div className="rounded-full px-4 py-2.5 flex items-center gap-2 bg-zinc-800 text-white text-sm font-medium shadow-lg">
        {pillContent}
      </div>
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOnlineStatus();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'px-4 py-2 text-center text-sm font-medium',
        isOnline ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-yellow-900'
      )}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Syncing {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          You are offline. Changes will sync when connected.
          {pendingCount > 0 && ` (${pendingCount} pending)`}
        </span>
      )}
    </div>
  );
}
