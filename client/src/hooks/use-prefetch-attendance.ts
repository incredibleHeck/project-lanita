"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/axios';
import {
  offlineDB,
  type CachedStudent,
  type CachedSection,
  type CachedAllocation,
  type CachedAttendance,
} from '@/lib/offline-db';

interface PrefetchStatus {
  isLoading: boolean;
  progress: number;
  lastPrefetch: number | null;
  error: string | null;
}

interface TeacherAllocation {
  id: string;
  subject: { id: string; name: string };
  section: {
    id: string;
    name: string;
    class: { id: string; name: string };
  };
}

interface SectionStudent {
  id: string;
  admissionNumber: string;
  userId: string;
  user: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export function usePrefetchAttendance() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PrefetchStatus>({
    isLoading: false,
    progress: 0,
    lastPrefetch: null,
    error: null,
  });

  const prefetchTeacherData = useCallback(async () => {
    if (!user?.id || user?.role !== 'TEACHER') return;
    if (!navigator.onLine) return;

    setStatus((s) => ({ ...s, isLoading: true, progress: 0, error: null }));

    try {
      setStatus((s) => ({ ...s, progress: 10 }));
      const allocationsResponse = await api.get<TeacherAllocation[]>(
        `/teachers/${user.id}/allocations`
      );
      const allocations = allocationsResponse.data || [];

      if (allocations.length === 0) {
        setStatus((s) => ({
          ...s,
          isLoading: false,
          progress: 100,
          lastPrefetch: Date.now(),
        }));
        return;
      }

      const cachedAllocations: CachedAllocation[] = allocations.map((a) => ({
        id: a.id,
        subjectId: a.subject.id,
        subjectName: a.subject.name,
        sectionId: a.section.id,
        sectionName: a.section.name,
        className: a.section.class.name,
        teacherId: user.id,
        cachedAt: Date.now(),
      }));
      await offlineDB.cachedAllocations.bulkPut(cachedAllocations);

      setStatus((s) => ({ ...s, progress: 30 }));

      const uniqueSections = [...new Set(allocations.map((a) => a.section.id))];
      const cachedSections: CachedSection[] = allocations
        .filter((a, i, arr) => arr.findIndex((x) => x.section.id === a.section.id) === i)
        .map((a) => ({
          id: a.section.id,
          name: a.section.name,
          classId: a.section.class.id,
          className: a.section.class.name,
          cachedAt: Date.now(),
        }));
      await offlineDB.cachedSections.bulkPut(cachedSections);

      setStatus((s) => ({ ...s, progress: 50 }));

      const totalSections = uniqueSections.length;
      let processedSections = 0;

      for (const sectionId of uniqueSections) {
        try {
          const studentsResponse = await api.get<SectionStudent[]>(
            `/students/section/${sectionId}`
          );
          const students = studentsResponse.data || [];

          const cachedStudents: CachedStudent[] = students.map((s) => ({
            id: s.id,
            sectionId,
            admissionNumber: s.admissionNumber,
            firstName: s.user?.profile?.firstName || '',
            lastName: s.user?.profile?.lastName || '',
            userId: s.userId,
            cachedAt: Date.now(),
          }));
          await offlineDB.cachedStudents.bulkPut(cachedStudents);
        } catch (error) {
          console.warn(`Failed to fetch students for section ${sectionId}:`, error);
        }

        processedSections++;
        const progress = 50 + Math.round((processedSections / totalSections) * 40);
        setStatus((s) => ({ ...s, progress }));
      }

      setStatus((s) => ({ ...s, progress: 95 }));

      const today = new Date().toISOString().split('T')[0];
      for (const allocation of allocations.slice(0, 5)) {
        try {
          const attendanceResponse = await api.get<{
            records: Array<{
              studentId: string;
              status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
              remarks?: string;
            }>;
          }>(`/attendance/${allocation.id}/${today}`);

          if (attendanceResponse.data?.records) {
            const cachedRecords: CachedAttendance[] = attendanceResponse.data.records.map(
              (r) => ({
                id: `${r.studentId}-${allocation.id}-${today}`,
                studentId: r.studentId,
                allocationId: allocation.id,
                date: today,
                status: r.status,
                remarks: r.remarks,
                cachedAt: Date.now(),
              })
            );
            await offlineDB.cachedAttendance.bulkPut(cachedRecords);
          }
        } catch {
          // Ignore errors for attendance prefetch
        }
      }

      await offlineDB.setLastSyncTime(Date.now());

      setStatus({
        isLoading: false,
        progress: 100,
        lastPrefetch: Date.now(),
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to prefetch data';
      setStatus((s) => ({
        ...s,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'TEACHER' && navigator.onLine) {
      const checkAndPrefetch = async () => {
        const lastSync = await offlineDB.getLastSyncTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (!lastSync || lastSync < oneHourAgo) {
          prefetchTeacherData();
        } else {
          setStatus((s) => ({ ...s, lastPrefetch: lastSync }));
        }
      };

      checkAndPrefetch();
    }
  }, [user?.role, prefetchTeacherData]);

  return {
    ...status,
    prefetch: prefetchTeacherData,
  };
}

export function usePrefetchStatus() {
  const [lastPrefetch, setLastPrefetch] = useState<number | null>(null);
  const [cachedCounts, setCachedCounts] = useState({
    students: 0,
    sections: 0,
    allocations: 0,
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [students, sections, allocations, lastSync] = await Promise.all([
          offlineDB.cachedStudents.count(),
          offlineDB.cachedSections.count(),
          offlineDB.cachedAllocations.count(),
          offlineDB.getLastSyncTime(),
        ]);
        setCachedCounts({ students, sections, allocations });
        setLastPrefetch(lastSync);
      } catch {
        // IndexedDB not available
      }
    };
    loadCounts();
  }, []);

  return { lastPrefetch, cachedCounts };
}
