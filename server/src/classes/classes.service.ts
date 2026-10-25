import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto) {
    const schoolId = getTenantSchoolId();
    return this.prisma.class.create({
      data: {
        ...createClassDto,
        ...(schoolId && { schoolId }),
      },
    });
  }

  async findAll() {
    const schoolId = getTenantSchoolId();
    return this.prisma.class.findMany({
      where: {
        ...(schoolId && { schoolId }),
      },
      include: {
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, includeSections = false) {
    const schoolId = getTenantSchoolId();
    return this.prisma.class.findFirst({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      include: {
        sections: includeSections,
      },
    });
  }

  async update(id: string, data: Partial<CreateClassDto>) {
    const schoolId = getTenantSchoolId();
    return this.prisma.class.updateMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
      data,
    });
  }

  async remove(id: string) {
    const schoolId = getTenantSchoolId();
    return this.prisma.class.deleteMany({
      where: {
        id,
        ...(schoolId && { schoolId }),
      },
    });
  }
}
