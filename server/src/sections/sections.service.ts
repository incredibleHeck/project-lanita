import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  async create(createSectionDto: CreateSectionDto) {
    // Verify classId exists
    const classExists = await this.prisma.class.findUnique({
      where: { id: createSectionDto.classId },
    });

    if (!classExists) {
      throw new NotFoundException(`Class with ID ${createSectionDto.classId} not found`);
    }

    return this.prisma.section.create({
      data: createSectionDto,
    });
  }

  async findAllByClass(classId: string) {
    return this.prisma.section.findMany({
      where: { classId },
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.section.findMany({
      include: {
        class: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.section.findUnique({
      where: { id },
      include: { class: true },
    });
  }

  async update(id: string, data: Partial<CreateSectionDto>) {
    return this.prisma.section.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.section.delete({
      where: { id },
    });
  }
}
