import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassDto: CreateClassDto) {
    return this.prisma.class.create({
      data: createClassDto,
    });
  }

  async findAll() {
    return this.prisma.class.findMany({
      include: {
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, includeSections = false) {
    return this.prisma.class.findUnique({
      where: { id },
      include: {
        sections: includeSections,
      },
    });
  }

  async update(id: string, data: Partial<CreateClassDto>) {
    return this.prisma.class.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.class.delete({
      where: { id },
    });
  }
}
