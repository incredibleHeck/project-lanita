import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AiService, StudentReportContext } from '../ai/ai.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
    private aiService: AiService,
  ) {}

  async generateStudentReport(studentId: string, examId: string, includeAiComment = false) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { academicYear: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { userId: studentId },
      include: {
        user: { include: { profile: true } },
        currentSection: { include: { class: true } },
      },
    });

    if (!studentRecord) {
      throw new NotFoundException('Student record not found');
    }

    const [attendanceReport, results, classResults] = await Promise.all([
      this.attendanceService.getReport(
        studentRecord.id,
        exam.academicYear.startDate.toISOString(),
        exam.endDate.toISOString(),
      ),
      this.prisma.result.findMany({
        where: {
          studentId: studentRecord.id,
          examId: examId,
        },
        include: {
          subject: true,
        },
      }),
      this.prisma.result.findMany({
        where: {
          examId: examId,
          student: {
            currentSectionId: studentRecord.currentSectionId,
          },
        },
        include: {
          student: true,
        },
      }),
    ]);

    let totalScore = 0;
    const formattedResults = results.map((result) => {
      totalScore += result.score;
      return {
        subject: result.subject.name,
        score: result.score,
        grade: result.grade,
      };
    });

    const averageScore = results.length > 0 ? totalScore / results.length : 0;

    const { rank, totalStudents } = this.calculateRank(
      studentRecord.id,
      classResults,
    );

    const strongestSubject = this.getStrongestSubject(formattedResults);
    const weakestSubject = this.getWeakestSubject(formattedResults);
    const trend = await this.calculateTrend(studentRecord.id, examId, exam.academicYearId);

    let aiComment: string | undefined;
    if (includeAiComment) {
      const studentName = `${studentRecord.user.profile?.firstName ?? ''} ${studentRecord.user.profile?.lastName ?? ''}`.trim();
      
      const context: StudentReportContext = {
        studentName,
        rank,
        totalStudents,
        average: averageScore,
        trend,
        attendanceRate: attendanceReport.presentPercentage ?? 0,
        strongestSubject: strongestSubject || 'N/A',
        weakestSubject: weakestSubject || 'N/A',
        subjectGrades: formattedResults.map((r) => ({
          subject: r.subject,
          score: r.score,
          grade: r.grade || 'N/A',
        })),
      };

      aiComment = await this.aiService.generateReportComment(context);
    }

    return {
      student: {
        id: studentRecord.user.id,
        name: `${studentRecord.user.profile?.firstName ?? ''} ${studentRecord.user.profile?.lastName ?? ''}`,
        admissionNumber: studentRecord.admissionNumber,
        class: `${studentRecord.currentSection.class.name} - ${studentRecord.currentSection.name}`,
      },
      academicYear: exam.academicYear.name,
      exam: exam.name,
      attendance: {
        present: attendanceReport.present,
        total: attendanceReport.total,
        percentage: attendanceReport.presentPercentage,
      },
      results: formattedResults,
      summary: {
        total: totalScore,
        average: parseFloat(averageScore.toFixed(2)),
        rank,
        totalInClass: totalStudents,
      },
      aiComment,
    };
  }

  async generateAiComment(studentId: string, examId: string): Promise<string> {
    const report = await this.generateStudentReport(studentId, examId, true);
    return report.aiComment || '';
  }

  private calculateRank(
    studentId: string,
    classResults: Array<{ studentId: string; score: number }>,
  ): { rank: number; totalStudents: number } {
    const studentAverages = new Map<string, { total: number; count: number }>();

    for (const result of classResults) {
      const existing = studentAverages.get(result.studentId) || { total: 0, count: 0 };
      existing.total += result.score;
      existing.count += 1;
      studentAverages.set(result.studentId, existing);
    }

    const sortedAverages = Array.from(studentAverages.entries())
      .map(([id, data]) => ({
        studentId: id,
        average: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.average - a.average);

    const rank = sortedAverages.findIndex((s) => s.studentId === studentId) + 1;
    return { rank: rank || 1, totalStudents: sortedAverages.length };
  }

  private getStrongestSubject(results: Array<{ subject: string; score: number }>): string | null {
    if (results.length === 0) return null;
    const sorted = [...results].sort((a, b) => b.score - a.score);
    return sorted[0].subject;
  }

  private getWeakestSubject(results: Array<{ subject: string; score: number }>): string | null {
    if (results.length === 0) return null;
    const sorted = [...results].sort((a, b) => a.score - b.score);
    return sorted[0].subject;
  }

  private async calculateTrend(
    studentId: string,
    currentExamId: string,
    academicYearId: string,
  ): Promise<'improving' | 'stable' | 'declining'> {
    const previousExams = await this.prisma.exam.findMany({
      where: {
        academicYearId,
        id: { not: currentExamId },
      },
      orderBy: { startDate: 'desc' },
      take: 1,
    });

    if (previousExams.length === 0) {
      return 'stable';
    }

    const [currentResults, previousResults] = await Promise.all([
      this.prisma.result.findMany({
        where: { studentId, examId: currentExamId },
      }),
      this.prisma.result.findMany({
        where: { studentId, examId: previousExams[0].id },
      }),
    ]);

    const currentAvg = this.calculateAverage(currentResults);
    const previousAvg = this.calculateAverage(previousResults);

    const difference = currentAvg - previousAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private calculateAverage(results: Array<{ score: number }>): number {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.score, 0);
    return total / results.length;
  }
}