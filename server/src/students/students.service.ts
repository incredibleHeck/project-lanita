import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserEntity } from '../common/entities/user.entity';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private async generateAdmissionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `STU-${year}`;

    // Find the last student record for this year
    const lastStudent = await this.prisma.studentRecord.findFirst({
      where: {
        admissionNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        admissionNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastStudent) {
      const parts = lastStudent.admissionNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
    }

    return `${prefix}-${sequence.toString().padStart(3, '0')}`;
  }

  async create(createStudentDto: CreateStudentDto) {
    const admissionNumber = await this.generateAdmissionNumber();
    const defaultPassword = 'Student@123';
    const passwordHash = await argon2.hash(defaultPassword);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Step A: Create User
        const user = await tx.user.create({
          data: {
            email: createStudentDto.email,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
          },
        });

        // Step B: Create Profile
        await tx.profile.create({
          data: {
            userId: user.id,
            firstName: createStudentDto.firstName,
            lastName: createStudentDto.lastName,
            middleName: createStudentDto.middleName,
            dob: new Date(createStudentDto.dob),
            gender: createStudentDto.gender,
            contactNumber: createStudentDto.contactNumber,
            address: createStudentDto.address,
            ...(createStudentDto.avatarUrl && { avatarUrl: createStudentDto.avatarUrl }),
          },
        });

        // Step C: Create StudentRecord
        if (!createStudentDto.sectionId) {
          throw new Error('Section ID is required');
        }
        await tx.studentRecord.create({
          data: {
            userId: user.id,
            admissionNumber,
            enrollmentDate: new Date(createStudentDto.admissionDate),
            currentSectionId: createStudentDto.sectionId,
          },
        });

        return user;
      });
      
      return this.findOne(user.id);

    } catch (error) {
       if (error.code === 'P2002') {
           throw new ConflictException('Email already exists');
       }
       throw new InternalServerErrorException('Failed to create student');
    }
  }

  async findAll(filters: { classId?: string; sectionId?: string; page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      role: UserRole.STUDENT,
    };

    if (filters.sectionId) {
      whereClause.studentRecord = {
        ...whereClause.studentRecord,
        currentSectionId: filters.sectionId,
      };
    } else if (filters.classId) {
      whereClause.studentRecord = {
        ...whereClause.studentRecord,
        currentSection: {
          classId: filters.classId,
        },
      };
    }

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
        {
          studentRecord: {
            admissionNumber: { contains: search, mode: 'insensitive' },
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
          studentRecord: {
            include: {
              currentSection: true,
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        studentRecord: {
          include: {
            currentSection: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Student not found');
    }
    return new UserEntity(user);
  }

  async update(id: string, dto: UpdateStudentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, studentRecord: true },
    });

    if (!user) {
      throw new NotFoundException('Student not found');
    }

    if (user.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = {};
      if (dto.email !== undefined) userUpdate.email = dto.email;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id },
          data: userUpdate,
        });
      }

      const profileUpdate: Record<string, unknown> = {};
      if (dto.firstName !== undefined) profileUpdate.firstName = dto.firstName;
      if (dto.lastName !== undefined) profileUpdate.lastName = dto.lastName;
      if (dto.middleName !== undefined) profileUpdate.middleName = dto.middleName;
      if (dto.dob !== undefined) profileUpdate.dob = new Date(dto.dob);
      if (dto.gender !== undefined) profileUpdate.gender = dto.gender;
      if (dto.contactNumber !== undefined) profileUpdate.contactNumber = dto.contactNumber;
      if (dto.address !== undefined) profileUpdate.address = dto.address;
      if (dto.avatarUrl !== undefined) profileUpdate.avatarUrl = dto.avatarUrl;

      if (Object.keys(profileUpdate).length > 0 && user.profile) {
        await tx.profile.update({
          where: { userId: id },
          data: profileUpdate,
        });
      }

      if (dto.sectionId !== undefined && user.studentRecord) {
        await tx.studentRecord.update({
          where: { id: user.studentRecord.id },
          data: { currentSectionId: dto.sectionId },
        });
      }
    });

    return this.findOne(id);
  }

  async assignSection(studentUserId: string, sectionId: string) {
    // Validate Section Exists
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    // Find Student Record via User ID (assuming studentUserId is User ID)
    // Or is it StudentRecord ID? 
    // "GET /students/:id" usually refers to User ID in this context as findAll returns Users.
    // I'll assume User ID.
    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { userId: studentUserId },
    });

    if (!studentRecord) {
      throw new NotFoundException('Student record not found for this user');
    }

    return this.prisma.studentRecord.update({
      where: { id: studentRecord.id },
      data: {
        currentSectionId: sectionId,
      },
      include: {
        currentSection: true
      }
    });
  }
}