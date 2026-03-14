import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsQueryDto } from './dto/students-query.dto';
import { UserEntity } from '../common/entities/user.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { getInitialPassword } from '../common/utils/password.utils';
import * as argon2 from 'argon2';
import { Gender, UserRole } from '@prisma/client';

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
    const { password, mustChange } = getInitialPassword(
      'STUDENT',
      process.env.NODE_ENV === 'production',
    );
    const passwordHash = await argon2.hash(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Step A: Create User (Student)
        const user = await tx.user.create({
          data: {
            email: createStudentDto.email,
            passwordHash,
            role: UserRole.STUDENT,
            isActive: true,
            mustChangePassword: mustChange,
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
            ...(createStudentDto.avatarUrl && {
              avatarUrl: createStudentDto.avatarUrl,
            }),
          },
        });

        // Step C: Create StudentRecord with extended fields
        if (!createStudentDto.sectionId) {
          throw new Error('Section ID is required');
        }

        const studentRecordData = {
          userId: user.id,
          admissionNumber,
          enrollmentDate: new Date(createStudentDto.admissionDate),
          currentSectionId: createStudentDto.sectionId,
          dateOfBirth: createStudentDto.dateOfBirth
            ? new Date(createStudentDto.dateOfBirth)
            : new Date(createStudentDto.dob),
          gender: createStudentDto.studentRecordGender ?? undefined,
          address: createStudentDto.studentRecordAddress
            ? createStudentDto.studentRecordAddress
            : typeof createStudentDto.address === 'string'
              ? createStudentDto.address
              : JSON.stringify(createStudentDto.address),
          bloodGroup: createStudentDto.bloodGroup ?? undefined,
          allergies: createStudentDto.allergies ?? [],
          medicalConditions: createStudentDto.medicalConditions ?? undefined,
          previousSchool: createStudentDto.previousSchool ?? undefined,
          specialNeeds: createStudentDto.specialNeeds ?? undefined,
        };

        const studentRecord = await tx.studentRecord.create({
          data: studentRecordData,
        });

        // Step D: Parent handling
        let parentIdToLink: string | null = null;

        if (createStudentDto.parentId) {
          // Link to existing parent
          const parent = await tx.parent.findUnique({
            where: { id: createStudentDto.parentId },
          });
          if (!parent) {
            throw new NotFoundException('Parent not found');
          }
          parentIdToLink = parent.id;
        } else if (createStudentDto.parent) {
          // Create new parent and link
          const parentDto = createStudentDto.parent;
          const { password: parentPassword } = getInitialPassword(
            'PARENT',
            process.env.NODE_ENV === 'production',
          );
          const parentPasswordHash = await argon2.hash(parentPassword);

          const parentUser = await tx.user.create({
            data: {
              email: parentDto.email,
              passwordHash: parentPasswordHash,
              role: UserRole.PARENT,
              isActive: true,
              mustChangePassword: true,
            },
          });

          await tx.profile.create({
            data: {
              userId: parentUser.id,
              firstName: parentDto.firstName,
              lastName: parentDto.lastName,
              middleName: parentDto.middleName,
              contactNumber: parentDto.contactNumber || '0000000000',
              dob: new Date(),
              gender: Gender.OTHER,
              address: {},
            },
          });

          const newParent = await tx.parent.create({
            data: {
              userId: parentUser.id,
              relationship: parentDto.relationship,
              whatsappNumber: parentDto.whatsappNumber,
              occupation: parentDto.occupation,
              employer: parentDto.employer,
              secondaryContactName: parentDto.secondaryContactName,
              secondaryContactPhone: parentDto.secondaryContactPhone,
            },
          });
          parentIdToLink = newParent.id;
        }

        if (parentIdToLink) {
          await tx.studentGuardian.create({
            data: {
              studentRecordId: studentRecord.id,
              parentId: parentIdToLink,
            },
          });
        }

        return user;
      });

      const result = await this.findOne(user.id);
      if (mustChange && password) {
        return { ...result, temporaryPassword: password };
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create student');
    }
  }

  async findAll(dto: StudentsQueryDto): Promise<PaginatedResult<UserEntity>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      role: UserRole.STUDENT,
    };

    if (dto.sectionId) {
      whereClause.studentRecord = {
        ...whereClause.studentRecord,
        currentSectionId: dto.sectionId,
      };
    } else if (dto.classId) {
      whereClause.studentRecord = {
        ...whereClause.studentRecord,
        currentSection: {
          classId: dto.classId,
        },
      };
    }

    if (dto.search) {
      whereClause.OR = [
        {
          profile: {
            firstName: { contains: dto.search, mode: 'insensitive' },
          },
        },
        {
          profile: {
            lastName: { contains: dto.search, mode: 'insensitive' },
          },
        },
        {
          studentRecord: {
            admissionNumber: { contains: dto.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereClause }),
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
    ]);

    return {
      data: users.map((user) => new UserEntity(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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
            currentSection: { include: { class: true } },
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
      if (dto.middleName !== undefined)
        profileUpdate.middleName = dto.middleName;
      if (dto.dob !== undefined) profileUpdate.dob = new Date(dto.dob);
      if (dto.gender !== undefined) profileUpdate.gender = dto.gender;
      if (dto.contactNumber !== undefined)
        profileUpdate.contactNumber = dto.contactNumber;
      if (dto.address !== undefined) profileUpdate.address = dto.address;
      if (dto.avatarUrl !== undefined) profileUpdate.avatarUrl = dto.avatarUrl;

      if (Object.keys(profileUpdate).length > 0 && user.profile) {
        await tx.profile.update({
          where: { userId: id },
          data: profileUpdate,
        });
      }

      const studentRecordUpdate: Record<string, unknown> = {};
      if (dto.sectionId !== undefined)
        studentRecordUpdate.currentSectionId = dto.sectionId;
      if (dto.admissionDate !== undefined)
        studentRecordUpdate.enrollmentDate = new Date(dto.admissionDate);
      if (dto.bloodGroup !== undefined)
        studentRecordUpdate.bloodGroup = dto.bloodGroup;
      if (dto.allergies !== undefined)
        studentRecordUpdate.allergies = Array.isArray(dto.allergies)
          ? dto.allergies
          : dto.allergies
            ? [dto.allergies]
            : [];
      if (dto.medicalConditions !== undefined)
        studentRecordUpdate.medicalConditions = dto.medicalConditions;
      if (dto.previousSchool !== undefined)
        studentRecordUpdate.previousSchool = dto.previousSchool;
      if (dto.specialNeeds !== undefined)
        studentRecordUpdate.specialNeeds = dto.specialNeeds;
      if (dto.studentRecordAddress !== undefined)
        studentRecordUpdate.address = dto.studentRecordAddress;

      if (
        Object.keys(studentRecordUpdate).length > 0 &&
        user.studentRecord
      ) {
        await tx.studentRecord.update({
          where: { id: user.studentRecord.id },
          data: studentRecordUpdate,
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
        currentSection: true,
      },
    });
  }

  async linkParent(studentUserId: string, parentId: string) {
    // parentId can be Parent.id or User.id (for backward compatibility)
    const parent =
      (await this.prisma.parent.findUnique({
        where: { id: parentId },
      })) ??
      (await this.prisma.parent.findUnique({
        where: { userId: parentId },
      }));

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const studentRecord = await this.prisma.studentRecord.findUnique({
      where: { userId: studentUserId },
    });
    if (!studentRecord) {
      throw new NotFoundException('Student record not found');
    }

    await this.prisma.studentGuardian.upsert({
      where: {
        studentRecordId_parentId: {
          studentRecordId: studentRecord.id,
          parentId: parent.id,
        },
      },
      create: {
        studentRecordId: studentRecord.id,
        parentId: parent.id,
      },
      update: {},
    });

    return this.prisma.studentRecord.findUnique({
      where: { id: studentRecord.id },
      include: { guardians: { include: { parent: true } }, currentSection: true },
    });
  }
}
