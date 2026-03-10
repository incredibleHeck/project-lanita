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
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const updateSyncInfo = async () => {
      try {
        const info = await getLastSyncInfo();
        setLastSyncTime(info.lastSyncTime);
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
      setLastSyncTime(info.lastSyncTime);
      setFailedCount(info.failedCount);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return null;
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Don't show on login - user needs to sign in first; offline banner is confusing there
  if (pathname === '/login') return null;
  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50',
        className
      )}
    >
      <div
        className={cn(
          'rounded-lg shadow-lg border p-4',
          !isOnline
            ? 'bg-yellow-50 border-yellow-200'
            : failedCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'rounded-full p-2',
              !isOnline
                ? 'bg-yellow-100'
                : failedCount > 0
                ? 'bg-red-100'
                : 'bg-blue-100'
            )}
          >
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-yellow-600" />
            ) : failedCount > 0 ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <RefreshCw className="h-5 w-5 text-blue-600" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                'font-medium text-sm',
                !isOnline
                  ? 'text-yellow-800'
                  : failedCount > 0
                  ? 'text-red-800'
                  : 'text-blue-800'
              )}
            >
              {!isOnline
                ? 'You are offline'
                : failedCount > 0
                ? `${failedCount} sync failed`
                : `${pendingCount} pending to sync`}
            </p>
            <p
              className={cn(
                'text-xs mt-0.5',
                !isOnline
                  ? 'text-yellow-600'
                  : failedCount > 0
                  ? 'text-red-600'
                  : 'text-blue-600'
              )}
            >
              {!isOnline
                ? 'Changes will sync when connected'
                : failedCount > 0
                ? 'Tap retry to try again'
                : lastSyncTime
                ? `Last synced: ${formatLastSync(lastSyncTime)}`
                : 'Ready to sync'}
            </p>
          </div>

          {isOnline && (pendingCount > 0 || failedCount > 0) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={isSyncing}
              className={cn(
                'shrink-0',
                failedCount > 0
                  ? 'text-red-700 hover:bg-red-100'
                  : 'text-blue-700 hover:bg-blue-100'
              )}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Sync'
              )}
            </Button>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 bg-current/10 rounded-full h-1.5">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    !isOnline ? 'bg-yellow-500' : 'bg-blue-500'
                  )}
                  style={{ width: '0%' }}
                />
              </div>
              <span className={!isOnline ? 'text-yellow-600' : 'text-blue-600'}>
                {pendingCount} record{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
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
