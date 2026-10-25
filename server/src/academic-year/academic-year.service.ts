import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class AcademicYearService {
  constructor(private prisma: PrismaService) {}

  async create(createAcademicYearDto: CreateAcademicYearDto) {
    const schoolId = getTenantSchoolId();

    if (createAcademicYearDto.isCurrent) {
      return this.prisma.$transaction(async (tx) => {
        // Deactivate all others for THIS school
        await tx.academicYear.updateMany({
          where: {
            isCurrent: true,
            ...(schoolId && { schoolId }),
          },
          data: { isCurrent: false },
        });

        // Create new one as active
        return tx.academicYear.create({
          data: {
            ...createAcademicYearDto,
            ...(schoolId && { schoolId }),
            startDate: new Date(createAcademicYearDto.startDate),
            endDate: new Date(createAcademicYearDto.endDate),
            isCurrent: true,
          },
          include: {
            terms: {
              orderBy: { startDate: 'asc' },
            },
          },
        });
      });
    }

    // Standard creation if not current
    return this.prisma.academicYear.create({
      data: {
        ...createAcademicYearDto,
        ...(schoolId && { schoolId }),
        startDate: new Date(createAcademicYearDto.startDate),
        endDate: new Date(createAcademicYearDto.endDate),
        isCurrent: false,
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
    });
  }

  async findAll() {
    const schoolId = getTenantSchoolId();
    return this.prisma.academicYear.findMany({
      where: {
        ...(schoolId && { schoolId }),
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.academicYear.findFirst({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });
  }

  async update(id: string, updateAcademicYearDto: UpdateAcademicYearDto) {
    // If updating isCurrent to true, handle transaction
    if (updateAcademicYearDto.isCurrent === true) {
      return this.setActive(id);
    }

    const schoolId = getTenantSchoolId();
    return this.prisma.academicYear.update({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      data: {
        ...updateAcademicYearDto,
        startDate: updateAcademicYearDto.startDate
          ? new Date(updateAcademicYearDto.startDate)
          : undefined,
        endDate: updateAcademicYearDto.endDate
          ? new Date(updateAcademicYearDto.endDate)
          : undefined,
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });
  }

  async remove(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.academicYear.deleteMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
    });
  }

  async setActive(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.$transaction(async (tx) => {
      // Deactivate all others for this school
      await tx.academicYear.updateMany({
        where: {
          isCurrent: true,
          ...(schoolId && { schoolId }),
        },
        data: { isCurrent: false },
      });

      // Set targeted one as active
      return tx.academicYear.update({
        where: { id },
        data: { isCurrent: true },
        include: {
          terms: {
            orderBy: {
              startDate: 'asc',
            },
          },
        },
      });
    });
  }
}
