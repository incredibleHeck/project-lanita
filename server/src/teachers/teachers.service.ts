import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../common/entities/user.entity';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    const whereClause: {
      role: UserRole;
      isActive: boolean;
      OR?: Array<{ profile: { firstName?: { contains: string; mode: 'insensitive' }; lastName?: { contains: string; mode: 'insensitive' } } }>;
    } = {
      role: UserRole.TEACHER,
      isActive: true,
    };

    if (search) {
      whereClause.OR = [
        {
          profile: {
            firstName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          profile: {
            lastName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          profile: true,
          teacherAllocations: {
            include: {
              section: {
                include: {
                  class: true,
                },
              },
              subject: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    const lastPage = Math.ceil(total / limit);

    return {
      data: data.map((user) => new UserEntity(user)),
      meta: {
        total,
        page,
        lastPage,
      },
    };
  }

  async create(dto: CreateTeacherDto) {
    const schoolId = getTenantSchoolId();
    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        ...(schoolId && { schoolId }),
      },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const defaultPassword = 'Teacher@123';
    const passwordHash = await argon2.hash(defaultPassword);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          ...(schoolId && { schoolId }),
          email: dto.email,
          passwordHash,
          role: UserRole.TEACHER,
          isActive: true,
        },
      });

      await tx.profile.create({
        data: {
          userId: newUser.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          dob: new Date(dto.dob),
          gender: dto.gender,
          contactNumber: dto.contactNumber,
          address: dto.address ?? {},
          ...(dto.avatarUrl && { avatarUrl: dto.avatarUrl }),
        },
      });

      return newUser;
    });

    const created = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    return new UserEntity(created!);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        teacherAllocations: {
          include: {
            section: {
              include: {
                class: true,
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Teacher not found');
    }

    if (user.role !== UserRole.TEACHER) {
      throw new NotFoundException('Teacher not found');
    }

    return new UserEntity(user);
  }
}
