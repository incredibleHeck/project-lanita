import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(private prisma: PrismaService) {}

  async create(createAcademicYearDto: CreateAcademicYearDto) {
    if (createAcademicYearDto.isCurrent) {
      return this.prisma.$transaction(async (tx) => {
        // Deactivate all others
        await tx.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });

        // Create new one as active
        return tx.academicYear.create({
          data: {
            ...createAcademicYearDto,
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
        startDate: new Date(createAcademicYearDto.startDate),
        endDate: new Date(createAcademicYearDto.endDate),
        isCurrent: false, // Explicitly false if not provided or false
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.academicYear.findMany({
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
    return this.prisma.academicYear.findUnique({
      where: { id },
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

    // Standard update
    return this.prisma.academicYear.update({
      where: { id },
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
    return this.prisma.academicYear.delete({
      where: { id },
    });
  }

  async setActive(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Deactivate all others
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
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
