import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResultDto } from './dto/create-result.dto';
import { Prisma } from '@prisma/client';
import { RecordResultsDto } from './dto/record-results.dto';

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
    try {
      return await this.prisma.result.create({
        data: createResultDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Result already exists for this student, exam, and subject');
        }
      }
      throw error;
    }
  }

  async findAll(filters: { studentId?: string; examId?: string }) {
    return this.prisma.result.findMany({
      where: filters,
      include: {
        student: {
            include: { user: { include: { profile: true } } }
        },
        exam: true,
        subject: true
      }
    });
  }

  async findOne(id: string) {
    return this.prisma.result.findUnique({
      where: { id },
      include: {
        student: true,
        exam: true,
        subject: true
      }
    });
  }

  async update(id: string, data: Partial<CreateResultDto>) {
    return this.prisma.result.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.result.delete({
      where: { id },
    });
  }

  async recordBatch(recordResultsDto: RecordResultsDto) {
    const { examId, subjectId, scores } = recordResultsDto;

    // Validate Exam
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Validate Scores against Max Score
    for (const record of scores) {
      if (record.score > exam.maxScore) {
        throw new BadRequestException(`Score ${record.score} exceeds exam max score of ${exam.maxScore}`);
      }
    }

    // Process concurrently
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
          },
          create: {
            studentId: record.studentId,
            examId,
            subjectId,
            score: record.score,
            grade,
            remarks: record.remarks,
          },
        });
      })
    );

    return { message: 'Results recorded successfully' };
  }

  async getStudentResults(studentId: string) {
    const results = await this.prisma.result.findMany({
      where: { studentId },
      include: {
        exam: true,
        subject: true,
      },
      orderBy: {
        exam: { startDate: 'desc' }
      }
    });

    // Group by Exam
    const grouped = {};
    for (const result of results) {
      const examName = result.exam.name;
      if (!grouped[examName]) {
        grouped[examName] = {
            exam: result.exam,
            results: []
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