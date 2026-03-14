import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { getInitialPassword } from '../common/utils/password.utils';
import * as argon2 from 'argon2';
import { AttendanceStatus, Gender, UserRole } from '@prisma/client';

export interface ParentDashboardChildSummary {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  attendanceRate: number;
  outstandingBalance: number;
  recentActivity: Array<{
    type: 'grade' | 'attendance';
    date: string;
    title: string;
    detail?: string;
  }>;
}

export interface ParentDashboardSummary {
  children: ParentDashboardChildSummary[];
}

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async create(createParentDto: CreateParentDto) {
    const { password, mustChange } = getInitialPassword(
      'PARENT',
      process.env.NODE_ENV === 'production',
    );
    const passwordHash = await argon2.hash(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // 1. Create User (PARENT)
        const newUser = await tx.user.create({
          data: {
            email: createParentDto.email,
            passwordHash,
            role: UserRole.PARENT,
            isActive: true,
            mustChangePassword: mustChange,
          },
        });

        // 2. Create Profile
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: createParentDto.firstName,
            lastName: createParentDto.lastName,
            contactNumber: createParentDto.phone,
            dob: new Date(), // Placeholder as DOB is required but not in DTO
            gender: Gender.OTHER, // Placeholder
            address: {}, // Placeholder
          },
        });

        // 3. Create Parent record
        const parentRecord = await tx.parent.create({
          data: { userId: newUser.id },
        });

        // 4. Link Students via StudentGuardian
        for (const admissionNumber of createParentDto.studentAdmissionNumbers) {
          const studentRecord = await tx.studentRecord.findUnique({
            where: { admissionNumber },
          });

          if (!studentRecord) {
            throw new NotFoundException(
              `Student with Admission Number ${admissionNumber} not found`,
            );
          }

          await tx.studentGuardian.create({
            data: {
              studentRecordId: studentRecord.id,
              parentId: parentRecord.id,
            },
          });
        }

        return newUser;
      });

      if (mustChange && password) {
        return { ...user, temporaryPassword: password };
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Propagate the specific error to trigger rollback (transaction aborts automatically)
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create parent');
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: UserRole.PARENT },
      include: {
        profile: true,
        parentProfile: {
          include: {
            studentGuardians: {
              include: {
                studentRecord: {
                  include: {
                    user: { include: { profile: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async getDashboardSummary(parentId: string): Promise<ParentDashboardSummary> {
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

    const parent = await this.prisma.parent.findUnique({
      where: { userId: parentId },
      include: {
        studentGuardians: {
          include: {
            studentRecord: {
              include: {
                user: { include: { profile: true } },
                currentSection: { include: { class: true } },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const children = parent.studentGuardians.map(
      (sg) => sg.studentRecord,
    ) as Array<{
      id: string;
      admissionNumber: string;
      userId: string;
      user: {
        profile: { firstName: string; lastName: string } | null;
      };
      currentSection: {
        name: string;
        class: { name: string };
      };
    }>;

    if (children.length === 0) {
      return { children: [] };
    }

    const studentIds = children.map((c) => c.id);
    const studentUserIds = children.map((c) => c.userId);

    const [
      monthlyAttendance,
      invoices,
      recentResults,
      recentAttendanceForActivity,
    ] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: {
          studentId: { in: studentIds },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { studentId: true, status: true },
      }),
      this.prisma.studentInvoice.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, totalAmount: true, amountPaid: true },
      }),
      this.prisma.result.findMany({
        where: { student: { userId: { in: studentUserIds } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          subject: true,
          exam: true,
          student: { select: { id: true } },
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { date: 'desc' },
        take: 25,
        select: {
          studentId: true,
          date: true,
          status: true,
          remarks: true,
        },
      }),
    ]);

    const attendanceByStudent = new Map<
      string,
      { present: number; total: number }
    >();
    for (const a of monthlyAttendance) {
      const existing = attendanceByStudent.get(a.studentId) ?? {
        present: 0,
        total: 0,
      };
      existing.total += 1;
      if (
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE
      ) {
        existing.present += 1;
      }
      attendanceByStudent.set(a.studentId, existing);
    }

    const balanceByStudent = new Map<string, number>();
    for (const inv of invoices) {
      const balance = inv.totalAmount.sub(inv.amountPaid).toNumber();
      if (balance > 0) {
        const existing = balanceByStudent.get(inv.studentId) ?? 0;
        balanceByStudent.set(inv.studentId, existing + balance);
      }
    }

    const activityByStudent = new Map<
      string,
      Array<{ type: 'grade' | 'attendance'; date: Date; title: string; detail?: string }>
    >();

    for (const r of recentResults) {
      const list = activityByStudent.get(r.student.id) ?? [];
      list.push({
        type: 'grade',
        date: r.createdAt,
        title: `${r.subject.name} - ${r.exam.name}`,
        detail: `Score: ${r.score}${r.grade ? ` (${r.grade})` : ''}`,
      });
      activityByStudent.set(r.student.id, list);
    }

    for (const a of recentAttendanceForActivity) {
      const list = activityByStudent.get(a.studentId) ?? [];
      list.push({
        type: 'attendance',
        date: a.date,
        title: `Attendance: ${a.status}`,
        detail: a.remarks ?? undefined,
      });
      activityByStudent.set(a.studentId, list);
    }

    const result: ParentDashboardChildSummary[] = children.map((child) => {
      const att = attendanceByStudent.get(child.id) ?? { present: 0, total: 0 };
      const attendanceRate =
        att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
      const outstandingBalance = balanceByStudent.get(child.id) ?? 0;
      const activities = activityByStudent.get(child.id) ?? [];
      activities.sort((x, y) => y.date.getTime() - x.date.getTime());
      const recentActivity = activities.slice(0, 5).map((a) => ({
        type: a.type as 'grade' | 'attendance',
        date: a.date.toISOString(),
        title: a.title,
        detail: a.detail,
      }));

      return {
        id: child.id,
        admissionNumber: child.admissionNumber,
        firstName: child.user.profile?.firstName ?? '',
        lastName: child.user.profile?.lastName ?? '',
        className: child.currentSection.class.name,
        sectionName: child.currentSection.name,
        attendanceRate,
        outstandingBalance,
        recentActivity,
      };
    });

    return { children: result };
  }
}
