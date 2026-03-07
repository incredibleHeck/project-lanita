import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface PendingAttendance {
  id?: number;
  allocationId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
  syncStatus: SyncStatus;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CachedStudent {
  id: string;
  sectionId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  userId: string;
  cachedAt: number;
}

export interface CachedSection {
  id: string;
  name: string;
  classId: string;
  className: string;
  cachedAt: number;
}

export interface CachedAllocation {
  id: string;
  subjectId: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  className: string;
  teacherId: string;
  cachedAt: number;
}

export interface CachedAttendance {
  id: string;
  studentId: string;
  allocationId: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  cachedAt: number;
}

export interface SyncMeta {
  key: string;
  value: string | number | boolean;
  updatedAt: number;
}

export class OfflineDB extends Dexie {
  attendanceQueue!: Table<PendingAttendance, number>;
  cachedStudents!: Table<CachedStudent, string>;
  cachedSections!: Table<CachedSection, string>;
  cachedAllocations!: Table<CachedAllocation, string>;
  cachedAttendance!: Table<CachedAttendance, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('LanitaOfflineDB');
    
    this.version(1).stores({
      attendanceQueue: '++id, allocationId, date, syncStatus, createdAt',
      cachedStudents: 'id, sectionId, admissionNumber',
      cachedSections: 'id, classId',
      cachedAllocations: 'id, sectionId, teacherId',
      cachedAttendance: 'id, studentId, allocationId, date, [allocationId+date]',
      syncMeta: 'key',
    });
  }

  async getPendingCount(): Promise<number> {
    return this.attendanceQueue
      .where('syncStatus')
      .anyOf(['pending', 'failed'])
      .count();
  }

  async clearSyncedRecords(): Promise<void> {
    await this.attendanceQueue
      .where('syncStatus')
      .equals('synced')
      .delete();
  }

  async getStudentsBySection(sectionId: string): Promise<CachedStudent[]> {
    return this.cachedStudents
      .where('sectionId')
      .equals(sectionId)
      .toArray();
  }

  async getAttendanceForDate(allocationId: string, date: string): Promise<CachedAttendance[]> {
    return this.cachedAttendance
      .where('[allocationId+date]')
      .equals([allocationId, date])
      .toArray();
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    await this.syncMeta.put({
      key: 'lastSyncTime',
      value: timestamp,
      updatedAt: Date.now(),
    });
  }

  async getLastSyncTime(): Promise<number | null> {
    const meta = await this.syncMeta.get('lastSyncTime');
    return meta ? (meta.value as number) : null;
  }

  async clearAllCaches(): Promise<void> {
    await Promise.all([
      this.cachedStudents.clear(),
      this.cachedSections.clear(),
      this.cachedAllocations.clear(),
      this.cachedAttendance.clear(),
    ]);
  }
}

export const offlineDB = new OfflineDB();
