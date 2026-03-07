import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

export interface AtRiskStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  riskScore: number;
  riskFactors: string[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAtRiskStudents(): Promise<AtRiskStudent[]> {
    const currentDate = new Date();
    const startOfCurrentTerm = new Date(currentDate.getFullYear(), 0, 1);

    const students = await this.prisma.studentRecord.findMany({
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
        attendance: {
          where: {
            date: {
              gte: startOfCurrentTerm,
              lte: currentDate,
            },
          },
        },
        results: {
          include: {
            subject: true,
            exam: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    const atRiskStudents: AtRiskStudent[] = [];

    for (const student of students) {
      let riskScore = 0;
      const riskFactors: string[] = [];

      // Factor 1: Attendance
      const totalAttendanceRecords = student.attendance.length;
      if (totalAttendanceRecords > 0) {
        const presentCount = student.attendance.filter(
          (a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE,
        ).length;
        const attendancePercentage = (presentCount / totalAttendanceRecords) * 100;

        if (attendancePercentage < 70) {
          riskScore += 50;
          riskFactors.push(`Low Attendance (${attendancePercentage.toFixed(1)}%)`);
        } else if (attendancePercentage < 85) {
          riskScore += 30;
          riskFactors.push(`Low Attendance (${attendancePercentage.toFixed(1)}%)`);
        }
      }

      // Factor 2: Academic Performance
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

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      // Only include students with risk
      if (riskScore > 0) {
        const firstName = student.user.profile?.firstName || '';
        const lastName = student.user.profile?.lastName || '';

        atRiskStudents.push({
          studentId: student.user.id,
          name: `${firstName} ${lastName}`.trim() || student.user.email,
          admissionNumber: student.admissionNumber,
          className: student.currentSection?.class?.name || 'Unknown',
          sectionName: student.currentSection?.name || 'Unknown',
          riskScore,
          riskFactors,
        });
      }
    }

    // Sort by risk score descending
    atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);

    return atRiskStudents;
  }
}
