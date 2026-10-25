import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(createExamDto: CreateExamDto) {
    const schoolId = getTenantSchoolId();
    return this.prisma.exam.create({
      data: {
        name: createExamDto.name,
        startDate: new Date(createExamDto.startDate),
        endDate: new Date(createExamDto.endDate),
        maxScore: createExamDto.maxScore ?? 100,
        academicYearId: createExamDto.academicYearId,
        termId: createExamDto.termId,
        ...(schoolId && { schoolId }),
      },
      include: {
        academicYear: true,
        term: true,
      },
    });
  }

  async findAll() {
    const schoolId = getTenantSchoolId();
    return this.prisma.exam.findMany({
      where: {
        ...(schoolId && { schoolId }),
      },
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
    const schoolId = getTenantSchoolId();
    return this.prisma.exam.findFirst({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
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
    const schoolId = getTenantSchoolId();
    return this.prisma.exam.updateMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.maxScore !== undefined && { maxScore: data.maxScore }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.academicYearId && { academicYearId: data.academicYearId }),
        ...(data.termId !== undefined && { termId: data.termId }),
      },
    });
  }

  async remove(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.exam.deleteMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
    });
  }
}
