import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTermDto } from './dto/create-term.dto';

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTermDto) {
    return this.prisma.term.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
        academicYearId: dto.academicYearId,
      },
      include: { academicYear: true },
    });
  }

  async findAll(academicYearId?: string) {
    const where = academicYearId ? { academicYearId } : {};
    return this.prisma.term.findMany({
      where,
      include: { academicYear: true },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const term = await this.prisma.term.findUnique({
      where: { id },
      include: { academicYear: true, exams: true },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }

  async update(id: string, data: Partial<CreateTermDto>) {
    return this.prisma.term.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.isCurrent !== undefined && { isCurrent: data.isCurrent }),
      },
      include: { academicYear: true },
    });
  }

  async setActive(id: string) {
    const term = await this.prisma.term.findUnique({ where: { id } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    await this.prisma.$transaction([
      this.prisma.term.updateMany({
        where: { academicYearId: term.academicYearId },
        data: { isCurrent: false },
      }),
      this.prisma.term.update({
        where: { id },
        data: { isCurrent: true },
      }),
    ]);

    return this.findOne(id);
  }

  async remove(id: string) {
    return this.prisma.term.delete({ where: { id } });
  }
}
