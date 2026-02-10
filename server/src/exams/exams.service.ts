import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(createExamDto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        ...createExamDto,
        startDate: new Date(createExamDto.startDate),
        endDate: new Date(createExamDto.endDate),
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
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateExamDto>) {
    return this.prisma.exam.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.exam.delete({
      where: { id },
    });
  }
}
