import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private attendanceService: AttendanceService,
  ) {}

  async generateStudentReport(studentId: string, examId: string) {
    // 1. Fetch Exam and Academic Year details
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { academicYear: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // 2. Fetch Student Record (by UserId)
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

    // 3. Parallel Fetch: Attendance & Results
    const [attendanceReport, results] = await Promise.all([
      // Attendance for the Academic Year (Term)
      this.attendanceService.getReport(
        studentRecord.id, // Use Record ID
        exam.academicYear.startDate.toISOString(),
        exam.endDate.toISOString(),
      ),
      // Results for this Exam
      this.prisma.result.findMany({
        where: {
          studentId: studentRecord.id, // Use Record ID
          examId: examId,
        },
        include: {
          subject: true,
        },
      }),
    ]);

    // 4. Calculate Aggregates
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

    // 5. Construct Response
    return {
      student: {
        id: studentRecord.user.id,
        name: `${studentRecord.user.profile.firstName} ${studentRecord.user.profile.lastName}`,
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
      },
    };
  }
}