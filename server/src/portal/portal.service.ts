import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

export interface StudentDashboardSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  attendancePercentage: number;
  totalAttendanceDays: number;
  presentDays: number;
  todayStatus: AttendanceStatus | null;
  recentGrades: Array<{
    subjectName: string;
    examName: string;
    score: number;
    grade: string | null;
    date: string;
  }>;
}

@Injectable()
export class PortalService {
  constructor(private prisma: PrismaService) {}

  async getStudentDashboard(
    studentUserId: string,
  ): Promise<StudentDashboardSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [studentRecord, monthlyAttendance, todayAttendance, recentResults] =
      await Promise.all([
        this.prisma.studentRecord.findUnique({
          where: { userId: studentUserId },
          include: {
            user: {
              include: {
                profile: true,
              },
            },
            currentSection: {
              include: {
                class: true,
              },
            },
          },
        }),

        this.prisma.attendanceRecord.findMany({
          where: {
            student: { userId: studentUserId },
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),

        this.prisma.attendanceRecord.findFirst({
          where: {
            student: { userId: studentUserId },
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),

        this.prisma.result.findMany({
          where: {
            student: { userId: studentUserId },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            subject: true,
            exam: true,
          },
        }),
      ]);

    if (!studentRecord) {
      throw new NotFoundException('Student record not found');
    }

    const totalAttendanceDays = monthlyAttendance.length;
    const presentDays = monthlyAttendance.filter(
      (a) =>
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE,
    ).length;
    const attendancePercentage =
      totalAttendanceDays > 0
        ? Math.round((presentDays / totalAttendanceDays) * 100)
        : 0;

    return {
      studentId: studentRecord.id,
      firstName: studentRecord.user.profile?.firstName || '',
      lastName: studentRecord.user.profile?.lastName || '',
      email: studentRecord.user.email,
      admissionNumber: studentRecord.admissionNumber,
      className: studentRecord.currentSection.class.name,
      sectionName: studentRecord.currentSection.name,
      attendancePercentage,
      totalAttendanceDays,
      presentDays,
      todayStatus: todayAttendance?.status || null,
      recentGrades: recentResults.map((r) => ({
        subjectName: r.subject.name,
        examName: r.exam.name,
        score: r.score,
        grade: r.grade,
        date: r.createdAt.toISOString(),
      })),
    };
  }

  async verifyParentAccess(
    parentUserId: string,
    studentUserId: string,
  ): Promise<boolean> {
    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { userId: studentUserId },
    });

    if (!studentRecord) {
      return false;
    }

    return studentRecord.parentId === parentUserId;
  }

  async getParentChildren(parentUserId: string) {
    const children = await this.prisma.studentRecord.findMany({
      where: { parentId: parentUserId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        currentSection: {
          include: {
            class: true,
          },
        },
      },
    });

    return {
      data: children,
    };
  }
}
