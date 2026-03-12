import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { AttendanceStatus, UserRole, InvoiceStatus } from '@prisma/client';
import { firstValueFrom } from 'rxjs';

const DEFAULT_AT_RISK_LIMIT = 200;
const MAX_AT_RISK_LIMIT = 500;

export interface AtRiskStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  mlPrediction?: boolean;
}

interface MLStudentFeatures {
  student_id: string;
  attendance_rate: number;
  average_grade: number;
  grade_trend: number;
  absence_streak: number;
  late_count: number;
  fee_payment_status: number;
  parent_engagement: number;
  days_since_enrollment: number;
}

interface MLPrediction {
  student_id: string;
  risk_score: number;
  risk_level: string;
  contributing_factors: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  async getDashboardStats() {
    const [totalStudents, totalTeachers, currentYear, classes] =
      await Promise.all([
        this.prisma.user.count({
          where: { role: UserRole.STUDENT, isActive: true },
        }),
        this.prisma.user.count({
          where: { role: UserRole.TEACHER, isActive: true },
        }),
        this.prisma.academicYear.findFirst({ where: { isCurrent: true } }),
        this.prisma.class.findMany({
          include: {
            sections: {
              include: { _count: { select: { students: true } } },
            },
          },
          orderBy: { name: 'asc' },
        }),
      ]);

    const distributionByClass = classes.map((cls) => ({
      name: cls.name,
      value: cls.sections.reduce((sum, s) => sum + s._count.students, 0),
    }));

    const weeklyAttendance = await this.getWeeklyAttendance();

    return {
      totalStudents,
      totalTeachers,
      currentTerm: currentYear?.name || 'N/A',
      weeklyAttendance,
      distributionByClass,
    };
  }

  private async getWeeklyAttendance() {
    const today = new Date();
    const days: Date[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(today);

    while (days.length < 5) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        days.unshift(new Date(d));
      }
      d.setDate(d.getDate() - 1);
    }

    const results: Array<{ day: string; present: number; absent: number }> = [];
    for (const day of days) {
      const startOfDay = new Date(day);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(day);
      endOfDay.setHours(23, 59, 59, 999);

      const records = await this.prisma.attendanceRecord.findMany({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        select: { status: true },
      });

      const present = records.filter(
        (r) =>
          r.status === AttendanceStatus.PRESENT ||
          r.status === AttendanceStatus.LATE,
      ).length;
      const absent = records.filter(
        (r) => r.status === AttendanceStatus.ABSENT,
      ).length;

      results.push({
        day: dayNames[day.getDay()],
        present,
        absent,
      });
    }

    return results;
  }

  async getAtRiskStudents(
    useML = false,
    limit?: number,
  ): Promise<AtRiskStudent[]> {
    const effectiveLimit = Math.min(
      limit ?? DEFAULT_AT_RISK_LIMIT,
      MAX_AT_RISK_LIMIT,
    );
    if (useML) {
      try {
        return await this.getAtRiskStudentsML(effectiveLimit);
      } catch (error) {
        this.logger.warn(
          `ML prediction failed, falling back to rule-based: ${error}`,
        );
        return this.getAtRiskStudentsRuleBased(effectiveLimit);
      }
    }
    return this.getAtRiskStudentsRuleBased(effectiveLimit);
  }

  async getAtRiskStudentsML(limit = DEFAULT_AT_RISK_LIMIT): Promise<AtRiskStudent[]> {
    const mlServiceUrl = this.config.get<string>('ML_SERVICE_URL');
    if (!mlServiceUrl) {
      this.logger.warn('ML_SERVICE_URL not configured');
      return this.getAtRiskStudentsRuleBased(limit);
    }

    const currentDate = new Date();
    const startOfCurrentTerm = new Date(currentDate.getFullYear(), 0, 1);
    const schoolId = getTenantSchoolId();
    const whereClause = schoolId ? { schoolId } : {};

    const students = await this.prisma.studentRecord.findMany({
      where: whereClause,
      take: Math.min(limit, MAX_AT_RISK_LIMIT),
      orderBy: { enrollmentDate: 'desc' },
      include: {
        user: { include: { profile: true } },
        currentSection: { include: { class: true } },
        attendance: {
          where: { date: { gte: startOfCurrentTerm, lte: currentDate } },
        },
        results: {
          include: { subject: true, exam: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    const features: MLStudentFeatures[] = students.map((student) => {
      const attendanceRate = this.calculateAttendanceRate(student.attendance);
      const { averageGrade, gradeTrend } = this.calculateGradeMetrics(
        student.results,
      );
      const absenceStreak = this.calculateAbsenceStreak(student.attendance);
      const lateCount = student.attendance.filter(
        (a) => a.status === AttendanceStatus.LATE,
      ).length;
      const feeStatus = this.calculateFeeStatus(student.invoices);
      const parentEngagement = this.calculateParentEngagement(student);
      const daysSinceEnrollment = Math.floor(
        (currentDate.getTime() - new Date(student.enrollmentDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      return {
        student_id: student.user.id,
        attendance_rate: attendanceRate,
        average_grade: averageGrade,
        grade_trend: gradeTrend,
        absence_streak: absenceStreak,
        late_count: lateCount,
        fee_payment_status: feeStatus,
        parent_engagement: parentEngagement,
        days_since_enrollment: daysSinceEnrollment,
      };
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ predictions: MLPrediction[] }>(
          `${mlServiceUrl}/predict/batch`,
          { students: features },
        ),
      );

      const predictions = response.data.predictions;
      const studentMap = new Map(students.map((s) => [s.user.id, s]));

      const atRiskStudents: AtRiskStudent[] = predictions
        .filter((p) => p.risk_level !== 'LOW')
        .map((prediction) => {
          const student = studentMap.get(prediction.student_id)!;
          const firstName = student.user.profile?.firstName || '';
          const lastName = student.user.profile?.lastName || '';

          return {
            studentId: prediction.student_id,
            name: `${firstName} ${lastName}`.trim() || student.user.email,
            admissionNumber: student.admissionNumber,
            className: student.currentSection?.class?.name || 'Unknown',
            sectionName: student.currentSection?.name || 'Unknown',
            riskScore: Math.round(prediction.risk_score * 100),
            riskLevel: prediction.risk_level,
            riskFactors: prediction.contributing_factors,
            mlPrediction: true,
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore);

      return atRiskStudents;
    } catch (error) {
      this.logger.error(`ML service call failed: ${error}`);
      throw error;
    }
  }

  private async getAtRiskStudentsRuleBased(
    limit = DEFAULT_AT_RISK_LIMIT,
  ): Promise<AtRiskStudent[]> {
    const currentDate = new Date();
    const startOfCurrentTerm = new Date(currentDate.getFullYear(), 0, 1);
    const schoolId = getTenantSchoolId();
    const whereClause = schoolId ? { schoolId } : {};

    const students = await this.prisma.studentRecord.findMany({
      where: whereClause,
      take: Math.min(limit, MAX_AT_RISK_LIMIT),
      orderBy: { enrollmentDate: 'desc' },
      include: {
        user: { include: { profile: true } },
        currentSection: { include: { class: true } },
        attendance: {
          where: { date: { gte: startOfCurrentTerm, lte: currentDate } },
        },
        results: {
          include: { subject: true, exam: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const atRiskStudents: AtRiskStudent[] = [];

    for (const student of students) {
      let riskScore = 0;
      const riskFactors: string[] = [];

      const totalAttendanceRecords = student.attendance.length;
      if (totalAttendanceRecords > 0) {
        const presentCount = student.attendance.filter(
          (a) =>
            a.status === AttendanceStatus.PRESENT ||
            a.status === AttendanceStatus.LATE,
        ).length;
        const attendancePercentage =
          (presentCount / totalAttendanceRecords) * 100;

        if (attendancePercentage < 70) {
          riskScore += 50;
          riskFactors.push(
            `Low Attendance (${attendancePercentage.toFixed(1)}%)`,
          );
        } else if (attendancePercentage < 85) {
          riskScore += 30;
          riskFactors.push(
            `Low Attendance (${attendancePercentage.toFixed(1)}%)`,
          );
        }
      }

      const failingSubjects = new Set<string>();
      for (const result of student.results) {
        if (result.score < 50) {
          const subjectName = result.subject.name;

          if (!failingSubjects.has(subjectName)) {
            failingSubjects.add(subjectName);
            riskScore += 15;
            riskFactors.push(`Failing ${subjectName}`);

            const isCoreSubject =
              subjectName.toLowerCase().includes('math') ||
              subjectName.toLowerCase().includes('english');
            if (isCoreSubject) {
              riskScore += 10;
            }
          }
        }
      }

      riskScore = Math.min(riskScore, 100);

      if (riskScore > 0) {
        const firstName = student.user.profile?.firstName || '';
        const lastName = student.user.profile?.lastName || '';

        let riskLevel = 'LOW';
        if (riskScore > 70) riskLevel = 'HIGH';
        else if (riskScore > 40) riskLevel = 'MEDIUM';

        atRiskStudents.push({
          studentId: student.user.id,
          name: `${firstName} ${lastName}`.trim() || student.user.email,
          admissionNumber: student.admissionNumber,
          className: student.currentSection?.class?.name || 'Unknown',
          sectionName: student.currentSection?.name || 'Unknown',
          riskScore,
          riskLevel,
          riskFactors,
          mlPrediction: false,
        });
      }
    }

    atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);
    return atRiskStudents;
  }

  private calculateAttendanceRate(
    attendance: Array<{ status: AttendanceStatus }>,
  ): number {
    if (attendance.length === 0) return 100;
    const presentCount = attendance.filter(
      (a) =>
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE,
    ).length;
    return (presentCount / attendance.length) * 100;
  }

  private calculateGradeMetrics(
    results: Array<{ score: number; createdAt: Date }>,
  ): { averageGrade: number; gradeTrend: number } {
    if (results.length === 0) {
      return { averageGrade: 0, gradeTrend: 0 };
    }

    const averageGrade =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;

    if (results.length < 2) {
      return { averageGrade, gradeTrend: 0 };
    }

    const sorted = [...results].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const half = Math.floor(sorted.length / 2);
    const olderAvg =
      sorted.slice(0, half).reduce((s, r) => s + r.score, 0) / half;
    const newerAvg =
      sorted.slice(half).reduce((s, r) => s + r.score, 0) /
      (sorted.length - half);

    return { averageGrade, gradeTrend: newerAvg - olderAvg };
  }

  private calculateAbsenceStreak(
    attendance: Array<{ status: AttendanceStatus; date: Date }>,
  ): number {
    if (attendance.length === 0) return 0;

    const sorted = [...attendance].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    let maxStreak = 0;
    let currentStreak = 0;

    for (const record of sorted) {
      if (record.status === AttendanceStatus.ABSENT) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }

  private calculateFeeStatus(
    invoices: Array<{ status: InvoiceStatus }>,
  ): number {
    if (invoices.length === 0) return 2;

    const latestInvoice = invoices[0];
    switch (latestInvoice.status) {
      case InvoiceStatus.OVERDUE:
        return 0;
      case InvoiceStatus.PENDING:
      case InvoiceStatus.PARTIAL:
        return 1;
      case InvoiceStatus.PAID:
        return 2;
      default:
        return 2;
    }
  }

  private calculateParentEngagement(student: {
    parentId?: string | null;
  }): number {
    if (!student.parentId) return 0;
    return 50;
  }
}
