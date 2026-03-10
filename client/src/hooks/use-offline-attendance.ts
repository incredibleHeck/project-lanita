"use client";

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  offlineDB, 
  type AttendanceStatus, 
  type CachedStudent,
  type CachedAttendance,
} from '@/lib/offline-db';
import { syncPendingAttendance } from '@/lib/sync-engine';

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface UseOfflineAttendanceOptions {
  allocationId: string;
  date: string;
  sectionId: string;
}

interface UseOfflineAttendanceReturn {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  markAttendance: (records: AttendanceRecord[]) => Promise<void>;
  getStudents: () => Promise<CachedStudent[]>;
  getExistingAttendance: () => Promise<Map<string, AttendanceRecord>>;
  syncNow: () => Promise<void>;
}

export function useOfflineAttendance({
  allocationId,
  date,
  sectionId,
}: UseOfflineAttendanceOptions): UseOfflineAttendanceReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await offlineDB.getPendingCount();
      setPendingCount(count);
    };
    updatePendingCount();

    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncNow stable; pendingCount intentionally excluded to avoid sync loops
  }, [isOnline]);

  const onlineMutation = useMutation({
    mutationFn: async (records: AttendanceRecord[]) => {
      const response = await api.post('/attendance/batch', {
        allocationId,
        date,
        records,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', allocationId, date] });
    },
  });

  const markAttendance = useCallback(async (records: AttendanceRecord[]) => {
    if (isOnline) {
      try {
        await onlineMutation.mutateAsync(records);
        
        const cachedRecords: CachedAttendance[] = records.map((r) => ({
          id: `${r.studentId}-${allocationId}-${date}`,
          studentId: r.studentId,
          allocationId,
          date,
          status: r.status,
          remarks: r.remarks,
          cachedAt: Date.now(),
        }));
        await offlineDB.cachedAttendance.bulkPut(cachedRecords);
      } catch (error) {
        if (!navigator.onLine) {
          await saveOffline(records);
        } else {
          throw error;
        }
      }
    } else {
      await saveOffline(records);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveOffline defined below, stable for this callback
  }, [isOnline, allocationId, date, onlineMutation]);

  const saveOffline = async (records: AttendanceRecord[]) => {
    const existing = await offlineDB.attendanceQueue
      .where({ allocationId, date })
      .first();

    if (existing) {
      await offlineDB.attendanceQueue.update(existing.id!, {
        records,
        syncStatus: 'pending',
        updatedAt: Date.now(),
      });
    } else {
      await offlineDB.attendanceQueue.add({
        allocationId,
        date,
        records,
        syncStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const cachedRecords: CachedAttendance[] = records.map((r) => ({
      id: `${r.studentId}-${allocationId}-${date}`,
      studentId: r.studentId,
      allocationId,
      date,
      status: r.status,
      remarks: r.remarks,
      cachedAt: Date.now(),
    }));
    await offlineDB.cachedAttendance.bulkPut(cachedRecords);
    
    const count = await offlineDB.getPendingCount();
    setPendingCount(count);
  };

  const getStudents = useCallback(async (): Promise<CachedStudent[]> => {
    if (isOnline) {
      try {
        const response = await api.get(`/students/section/${sectionId}`);
        const students: CachedStudent[] = response.data.map((s: {
          id: string;
          admissionNumber: string;
          userId: string;
          user: { profile?: { firstName?: string; lastName?: string } };
        }) => ({
          id: s.id,
          sectionId,
          admissionNumber: s.admissionNumber,
          firstName: s.user?.profile?.firstName || '',
          lastName: s.user?.profile?.lastName || '',
          userId: s.userId,
          cachedAt: Date.now(),
        }));
        await offlineDB.cachedStudents.bulkPut(students);
        return students;
      } catch {
        return offlineDB.getStudentsBySection(sectionId);
      }
    }
    return offlineDB.getStudentsBySection(sectionId);
  }, [isOnline, sectionId]);

  const getExistingAttendance = useCallback(async (): Promise<Map<string, AttendanceRecord>> => {
    const attendanceMap = new Map<string, AttendanceRecord>();

    const cachedAttendance = await offlineDB.getAttendanceForDate(allocationId, date);
    cachedAttendance.forEach((record) => {
      attendanceMap.set(record.studentId, {
        studentId: record.studentId,
        status: record.status,
        remarks: record.remarks,
      });
    });

    const pendingRecord = await offlineDB.attendanceQueue
      .where({ allocationId, date })
      .first();
    
    if (pendingRecord) {
      pendingRecord.records.forEach((record) => {
        attendanceMap.set(record.studentId, record);
      });
    }

    if (isOnline && cachedAttendance.length === 0 && !pendingRecord) {
      try {
        const response = await api.get(`/attendance/${allocationId}/${date}`);
        if (response.data?.records) {
          response.data.records.forEach((record: {
            studentId: string;
            status: AttendanceStatus;
            remarks?: string;
          }) => {
            attendanceMap.set(record.studentId, {
              studentId: record.studentId,
              status: record.status,
              remarks: record.remarks,
            });
          });

          const cachedRecords: CachedAttendance[] = response.data.records.map((r: {
            studentId: string;
            status: AttendanceStatus;
            remarks?: string;
          }) => ({
            id: `${r.studentId}-${allocationId}-${date}`,
            studentId: r.studentId,
            allocationId,
            date,
            status: r.status,
            remarks: r.remarks,
            cachedAt: Date.now(),
          }));
          await offlineDB.cachedAttendance.bulkPut(cachedRecords);
        }
      } catch {
        // Continue with local data
      }
    }

    return attendanceMap;
  }, [isOnline, allocationId, date]);

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    try {
      await syncPendingAttendance();
      const count = await offlineDB.getPendingCount();
      setPendingCount(count);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, queryClient]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    markAttendance,
    getStudents,
    getExistingAttendance,
    syncNow,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // navigator.onLine can be unreliable (e.g. Windows Chrome, VPN). Verify with a fetch.
  useEffect(() => {
    if (typeof window === 'undefined' || isOnline) return;

    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const checkConnection = (opts?: RequestInit) =>
      fetch(`${baseURL}/`, {
        method: 'GET',
        headers: { 'X-Tenant-ID': 'DEFAULT' },
        ...opts,
      }).then(() => setIsOnline(true));

    checkConnection({ signal: controller.signal })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));

    const interval = setInterval(() => {
      if (isOnline) return;
      checkConnection().catch(() => {});
    }, 15000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      controller.abort();
    };
  }, [isOnline]);

  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const count = await offlineDB.getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB not available
      }
    };
    updatePendingCount();

    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, pendingCount };
}
