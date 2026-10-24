import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(createExamDto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        name: createExamDto.name,
        startDate: new Date(createExamDto.startDate),
        endDate: new Date(createExamDto.endDate),
        maxScore: createExamDto.maxScore ?? 100,
        academicYearId: createExamDto.academicYearId,
        termId: createExamDto.termId,
      },
      include: {
        academicYear: true,
        term: true,
      },
    });
  }

  async findAll() {
    return this.prisma.exam.findMany({
      orderBy: {
        startDate: 'desc',
      },
      include: {
        academicYear: true,
        term: true,
        _count: {
          select: { results: true },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        academicYear: true,
        term: true,
        results: {
          include: {
            student: {
              include: {
                user: { include: { profile: true } },
              },
            },
            subject: true,
          },
        },
      },
    });
  }

  async update(id: string, data: Partial<CreateExamDto>) {
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.academicYearId && { academicYearId: data.academicYearId }),
        ...(data.termId !== undefined && { termId: data.termId }),
      },
      include: {
        academicYear: true,
        term: true,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.exam.delete({
      where: { id },
    });
  }
}
