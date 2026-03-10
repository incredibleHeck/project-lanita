import api from '@/lib/axios';
import { offlineDB, type SyncStatus } from '@/lib/offline-db';
const SYNC_BATCH_SIZE = 10;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: Array<{ id: number; error: string }>;
}

export async function syncPendingAttendance(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (!navigator.onLine) {
    return { ...result, success: false };
  }

  const pending = await offlineDB.attendanceQueue
    .where('syncStatus')
    .anyOf(['pending', 'failed'])
    .limit(SYNC_BATCH_SIZE)
    .toArray();

  for (const record of pending) {
    try {
      await offlineDB.attendanceQueue.update(record.id!, {
        syncStatus: 'syncing' as SyncStatus,
        updatedAt: Date.now(),
      });

      await api.post('/attendance/batch', {
        allocationId: record.allocationId,
        date: record.date,
        records: record.records,
        offlineTimestamp: record.createdAt,
      });

      await offlineDB.attendanceQueue.update(record.id!, {
        syncStatus: 'synced' as SyncStatus,
        updatedAt: Date.now(),
      });

      result.synced++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await offlineDB.attendanceQueue.update(record.id!, {
        syncStatus: 'failed' as SyncStatus,
        errorMessage,
        updatedAt: Date.now(),
      });

      result.failed++;
      result.errors.push({ id: record.id!, error: errorMessage });
    }
  }

  await offlineDB.clearSyncedRecords();

  await offlineDB.setLastSyncTime(Date.now());

  result.success = result.failed === 0;
  return result;
}

export async function syncAllPendingData(): Promise<void> {
  let hasMore = true;
  
  while (hasMore) {
    const pending = await offlineDB.attendanceQueue
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count();
    
    if (pending === 0) {
      hasMore = false;
    } else {
      await syncPendingAttendance();
    }
  }
}

export async function retryFailedSyncs(): Promise<SyncResult> {
  await offlineDB.attendanceQueue
    .where('syncStatus')
    .equals('failed')
    .modify({ syncStatus: 'pending' as SyncStatus });

  return syncPendingAttendance();
}

export async function getPendingSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
}> {
  const [pending, syncing, failed, synced] = await Promise.all([
    offlineDB.attendanceQueue.where('syncStatus').equals('pending').count(),
    offlineDB.attendanceQueue.where('syncStatus').equals('syncing').count(),
    offlineDB.attendanceQueue.where('syncStatus').equals('failed').count(),
    offlineDB.attendanceQueue.where('syncStatus').equals('synced').count(),
  ]);

  return { pending, syncing, failed, synced };
}

export async function clearFailedRecords(): Promise<void> {
  await offlineDB.attendanceQueue
    .where('syncStatus')
    .equals('failed')
    .delete();
}

export function setupAutoSync(intervalMs: number = 30000): () => void {
  const sync = async () => {
    if (navigator.onLine) {
      await syncPendingAttendance();
    }
  };

  const handleOnline = () => {
    sync();
  };

  window.addEventListener('online', handleOnline);
  const interval = setInterval(sync, intervalMs);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}

export async function getLastSyncInfo(): Promise<{
  lastSyncTime: number | null;
  pendingCount: number;
  failedCount: number;
}> {
  const [lastSyncTime, pendingCount, failedCount] = await Promise.all([
    offlineDB.getLastSyncTime(),
    offlineDB.attendanceQueue.where('syncStatus').equals('pending').count(),
    offlineDB.attendanceQueue.where('syncStatus').equals('failed').count(),
  ]);

  return { lastSyncTime, pendingCount, failedCount };
}
