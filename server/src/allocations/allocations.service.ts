import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AllocationsService {
  constructor(private prisma: PrismaService) {}

  async create(createAllocationDto: CreateAllocationDto) {
    const { sectionId, subjectId, teacherId, academicYearId } = createAllocationDto;

    // 1. Validate Teacher Role
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('User is not a TEACHER');
    }

    // 2. Validate Academic Year
    let targetYearId = academicYearId;
    if (!targetYearId) {
      const activeYear = await this.prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      if (!activeYear) {
        throw new NotFoundException('No active academic year found');
      }
      targetYearId = activeYear.id;
    } else {
        const yearExists = await this.prisma.academicYear.findUnique({ where: { id: targetYearId } });
        if (!yearExists) throw new NotFoundException('Academic Year not found');
    }

    // 3. Check for existing allocation (One teacher per subject per section per year)
    // Actually, prompt says "If a teacher is already assigned...". This implies uniqueness.
    const existingAllocation = await this.prisma.subjectAllocation.findUnique({
      where: {
        sectionId_subjectId_academicYearId: {
          sectionId,
          subjectId,
          academicYearId: targetYearId,
        },
      },
    });

    if (existingAllocation) {
      throw new ConflictException('Subject is already allocated in this section for this academic year');
    }

    // Action: Create
    return this.prisma.subjectAllocation.create({
      data: {
        sectionId,
        subjectId,
        teacherId,
        academicYearId: targetYearId,
      },
      include: {
        section: true,
        subject: true,
        teacher: {
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        },
        academicYear: true
      },
    });
  }

  async findAllByTeacher(teacherId: string) {
    return this.prisma.subjectAllocation.findMany({
      where: { teacherId },
      include: {
        section: {
            select: {
                id: true,
                name: true,
                class: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            }
        },
        subject: {
            select: {
                id: true,
                name: true,
                code: true
            }
        },
        academicYear: {
            select: {
                name: true,
                startDate: true,
                endDate: true
            }
        }
      },
      orderBy: {
        createdAt: 'desc' // or by academic year
      }
    });
  }
}
