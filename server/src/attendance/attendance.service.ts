import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async markRegister(createAttendanceBatchDto: CreateAttendanceBatchDto) {
    const { subjectAllocationId, date, records } = createAttendanceBatchDto;

    // Validate Allocation Exists
    const allocation = await this.prisma.subjectAllocation.findUnique({
      where: { id: subjectAllocationId },
    });

    if (!allocation) {
      throw new NotFoundException('Subject Allocation not found');
    }

    const attendanceDate = new Date(date);

    // Process records concurrently
    await Promise.all(
      records.map((record) =>
        this.prisma.attendanceRecord.upsert({
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
        }),
      ),
    );

    return { message: 'Attendance marked successfully' };
  }

  async getReport(studentId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    const total = records.length;
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

    const percentage = total > 0 ? ((present + late) / total) * 100 : 0; // Late counts as present? Usually separate or partial. I'll just return raw counts and a simple present percentage.
    // Or stricter: Present only.
    // I'll return (present / total) * 100 as strictly present percentage.
    // Or (present + late) often considered "attended".
    // I'll return the breakdown so frontend can calculate as needed, but provide a basic "presentPercentage" (present only).

    return {
      total,
      present,
      absent,
      late,
      excused,
      presentPercentage: total > 0 ? (present / total) * 100 : 0,
    };
  }
}
