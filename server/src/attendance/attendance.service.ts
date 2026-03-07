import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async markRegister(createAttendanceBatchDto: CreateAttendanceBatchDto) {
    const { subjectAllocationId, date, records, offlineTimestamp } = createAttendanceBatchDto;

    const allocation = await this.prisma.subjectAllocation.findUnique({
      where: { id: subjectAllocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Subject Allocation not found');
    }

    const attendanceDate = new Date(date);

    const results = await Promise.all(
      records.map(async (record) => {
        const existingRecord = await this.prisma.attendanceRecord.findUnique({
          where: {
            studentId_allocationId_date: {
              studentId: record.studentId,
              allocationId: subjectAllocationId,
              date: attendanceDate,
            },
          },
        });

        if (existingRecord && offlineTimestamp) {
          const serverTimestamp = existingRecord.updatedAt.getTime();
          
          if (offlineTimestamp <= serverTimestamp) {
            this.logger.debug(
              `Skipping update for student ${record.studentId}: server record is newer ` +
              `(offline: ${offlineTimestamp}, server: ${serverTimestamp})`,
            );
            return { studentId: record.studentId, action: 'skipped', reason: 'server_newer' };
          }
        }

        await this.prisma.attendanceRecord.upsert({
          where: {
            studentId_allocationId_date: {
              studentId: record.studentId,
              allocationId: subjectAllocationId,
              date: attendanceDate,
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks,
          },
          create: {
            studentId: record.studentId,
            allocationId: subjectAllocationId,
            date: attendanceDate,
            status: record.status,
            remarks: record.remarks,
          },
        });

        return { studentId: record.studentId, action: 'updated' };
      }),
    );

    const updated = results.filter((r) => r.action === 'updated').length;
    const skipped = results.filter((r) => r.action === 'skipped').length;

    for (const record of records) {
      if (
        record.status === AttendanceStatus.ABSENT ||
        record.status === AttendanceStatus.LATE
      ) {
        try {
          const student = await this.prisma.studentRecord.findUnique({
            where: { id: record.studentId },
            include: {
              parent: true,
              user: { include: { profile: true } },
            },
          });
          if (student?.parent) {
            const studentName = `${student.user.profile?.firstName || ''} ${student.user.profile?.lastName || ''}`.trim();
            await this.notificationService.sendAttendanceAlert(
              student.parent.id,
              studentName || 'Your child',
              record.status,
              attendanceDate.toISOString().split('T')[0],
            );
          }
        } catch (err) {
          this.logger.warn(`Failed to send attendance alert: ${err}`);
        }
      }
    }

    return {
      message: 'Attendance marked successfully',
      updated,
      skipped,
      isOfflineSync: !!offlineTimestamp,
    };
  }

  async getAttendanceForDate(allocationId: string, date: string) {
    const attendanceDate = new Date(date);
    
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        allocationId,
        date: attendanceDate,
      },
      include: {
        student: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    });

    return {
      allocationId,
      date,
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks,
        studentName: `${r.student.user.profile?.firstName || ''} ${r.student.user.profile?.lastName || ''}`.trim(),
        admissionNumber: r.student.admissionNumber,
      })),
    };
  }

  async getReport(
    studentId: string | undefined,
    startDate: string,
    endDate: string,
    useUserId = false,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const where: {
      studentId?: string;
      student?: { userId: string };
      date: { gte: Date; lte: Date };
    } = {
      date: { gte: start, lte: end },
    };
    if (studentId) {
      if (useUserId) {
        where.student = { userId: studentId };
      } else {
        where.studentId = studentId;
      }
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        allocation: {
          include: {
            subject: true,
            section: { include: { class: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // When studentId is provided, return aggregated stats and records
    if (studentId) {
      const total = records.length;
      const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
      const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
      const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
      const excused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
      return {
        total,
        present,
        absent,
        late,
        excused,
        presentPercentage: total > 0 ? (present / total) * 100 : 0,
        records: records.map((r) => ({
          id: r.id,
          date: r.date,
          status: r.status,
          remarks: r.remarks,
          subject: r.allocation?.subject?.name ?? '—',
        })),
      };
    }

    // Admin overview: return records for client-side aggregation
    return { records };
  }
}
