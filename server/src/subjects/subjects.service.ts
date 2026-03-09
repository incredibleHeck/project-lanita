import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createSubjectDto: CreateSubjectDto) {
    try {
      const { subjectType, preferredRoomIds, ...rest } = createSubjectDto;
      return await this.prisma.subject.create({
        data: {
          ...rest,
          subjectType: subjectType ?? 'CORE',
          isElective: subjectType === 'ELECTIVE',
          preferredRoomIds: preferredRoomIds ?? undefined,
          color: rest.color ?? '#6366f1',
          isExaminable: rest.isExaminable ?? true,
          isSingleResource: rest.isSingleResource ?? false,
        },
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
    const subjects = await this.prisma.subject.findMany({
      include: {
        requiredRoom: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    const usageRows = await this.prisma.$queryRaw<
      { subjectId: string; classCount: number; teacherCount: number }[]
    >`
      SELECT "subjectId",
        COUNT(DISTINCT "sectionId")::int as "classCount",
        COUNT(DISTINCT "teacherId")::int as "teacherCount"
      FROM "SubjectAllocation"
      GROUP BY "subjectId"
    `;
    const usageMap = new Map(
      usageRows.map((r) => [
        r.subjectId,
        { classCount: r.classCount, teacherCount: r.teacherCount },
      ]),
    );
    return subjects.map((s) => ({
      ...s,
      usage: usageMap.get(s.id) ?? { classCount: 0, teacherCount: 0 },
    }));
  }

  async findOne(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
      include: { requiredRoom: true },
    });
  }

  async getSubjectUsage(id: string) {
    const allocations = await this.prisma.subjectAllocation.findMany({
      where: { subjectId: id },
      select: {
        sectionId: true,
        teacherId: true,
      },
    });
    const uniqueSections = new Set(allocations.map((a) => a.sectionId));
    const uniqueTeachers = new Set(allocations.map((a) => a.teacherId));
    return {
      classCount: uniqueSections.size,
      teacherCount: uniqueTeachers.size,
    };
  }

  async update(id: string, data: Partial<CreateSubjectDto>) {
    const { subjectType, preferredRoomIds, ...rest } = data;
    const dataToUpdate: Prisma.SubjectUpdateInput = {
      ...rest,
      ...(subjectType !== undefined && {
        subjectType,
        isElective: subjectType === 'ELECTIVE',
      }),
      ...(preferredRoomIds !== undefined && { preferredRoomIds }),
    };
    return this.prisma.subject.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    return this.prisma.subject.delete({
      where: { id },
    });
  }
}
