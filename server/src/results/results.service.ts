import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResultDto } from './dto/create-result.dto';
import { Prisma } from '@prisma/client';
import { RecordResultsDto } from './dto/record-results.dto';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class ResultsService {
  constructor(private prisma: PrismaService) {}

  private calculateGrade(score: number): string {
    if (score >= 90) return 'A*';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  async create(createResultDto: CreateResultDto) {
    const schoolId = getTenantSchoolId();
    try {
      return await this.prisma.result.create({
        data: {
          ...createResultDto,
          ...(schoolId && { schoolId }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Result already exists for this student, exam, and subject',
          );
        }
      }
      throw error;
    }
  }

  async findAll(filters: { studentId?: string; examId?: string; subjectId?: string }) {
    const schoolId = getTenantSchoolId();
    return this.prisma.result.findMany({
      where: {
        ...filters,
        ...(schoolId && { schoolId }),
      },
      include: {
        student: {
          include: { user: { include: { profile: true } } },
        },
        exam: true,
        subject: true,
      },
    });
  }

  async findOne(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.result.findFirst({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      include: {
        student: true,
        exam: true,
        subject: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateResultDto>) {
    const schoolId = getTenantSchoolId();
    return this.prisma.result.updateMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      data,
    });
  }

  async remove(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.result.deleteMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
    });
  }

  async recordBatch(recordResultsDto: RecordResultsDto) {
    const schoolId = getTenantSchoolId();
    const { examId, subjectId, scores } = recordResultsDto;

    // Validate Exam
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        ...(schoolId && { schoolId }),
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Validate Scores against Max Score
    for (const record of scores) {
      if (record.score > exam.maxScore) {
        throw new BadRequestException(
          `Score ${record.score} exceeds exam max score of ${exam.maxScore}`,
        );
      }
    }

    // Process concurrently in transaction
    await this.prisma.$transaction(
      scores.map((record) => {
        const grade = this.calculateGrade(record.score);
        return this.prisma.result.upsert({
          where: {
            studentId_examId_subjectId: {
              studentId: record.studentId,
              examId,
              subjectId,
            },
          },
          update: {
            score: record.score,
            grade,
            remarks: record.remarks,
            ...(schoolId && { schoolId }),
          },
          create: {
            studentId: record.studentId,
            examId,
            subjectId,
            score: record.score,
            grade,
            remarks: record.remarks,
            ...(schoolId && { schoolId }),
          },
        });
      }),
    );

    return { message: 'Results recorded successfully' };
  }

  async getStudentResults(studentId: string, useUserId = false) {
    const schoolId = getTenantSchoolId();
    const where = useUserId
      ? { student: { userId: studentId }, ...(schoolId && { schoolId }) }
      : { studentId, ...(schoolId && { schoolId }) };

    const results = await this.prisma.result.findMany({
      where,
      include: {
        exam: true,
        subject: true,
      },
      orderBy: {
        exam: { startDate: 'desc' },
      },
    });

    // Group by Exam
    const grouped: Record<string, { exam: any; results: any[] }> = {};
    for (const result of results) {
      const examName = result.exam.name;
      if (!grouped[examName]) {
        grouped[examName] = {
          exam: result.exam,
          results: [],
        };
      }
      grouped[examName].results.push({
        subject: result.subject.name,
        score: result.score,
        grade: result.grade,
        remarks: result.remarks,
      });
    }

    return grouped;
  }
}
