import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto) {
    try {
      return await this.prisma.subject.create({
        data: createSubjectDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Subject code already exists');
        }
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.subject.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Partial<CreateSubjectDto>) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.subject.delete({
      where: { id },
    });
  }
}
