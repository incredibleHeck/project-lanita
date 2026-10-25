import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async create(createSectionDto: CreateSectionDto) {
    const schoolId = getTenantSchoolId();

    const classExists = await this.prisma.class.findFirst({
      where: {
        id: createSectionDto.classId,
        ...(schoolId && { schoolId }),
      },
    });

    if (!classExists) {
      throw new NotFoundException(
        `Class with ID ${createSectionDto.classId} not found`,
      );
    }

    return this.prisma.section.create({
      data: {
        ...createSectionDto,
        ...(schoolId && { schoolId }),
      },
    });
  }

  async findAllByClass(classId: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.section.findMany({
      where: {
        classId,
        ...(schoolId && { schoolId }),
      },
      include: {
        defaultRoom: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    const schoolId = getTenantSchoolId();
    return this.prisma.section.findMany({
      where: {
        ...(schoolId && { schoolId }),
      },
      include: {
        class: true,
        defaultRoom: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.section.findFirst({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      include: { class: true, defaultRoom: true },
    });
  }

  async update(id: string, data: Partial<CreateSectionDto>) {
    const schoolId = getTenantSchoolId();
    return this.prisma.section.updateMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      data,
    });
  }

  async remove(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.section.deleteMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
    });
  }
}
