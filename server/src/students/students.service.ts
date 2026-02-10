import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
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
          },
        });

        // Step C: Create StudentRecord
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

  async findAll(filters: { classId?: string; sectionId?: string }) {
    const whereClause: any = {
      role: UserRole.STUDENT,
    };

    if (filters.sectionId) {
      whereClause.studentRecord = {
        currentSectionId: filters.sectionId,
      };
    } else if (filters.classId) {
      whereClause.studentRecord = {
        currentSection: {
          classId: filters.classId,
        },
      };
    }

    return this.prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        studentRecord: {
          include: {
            currentSection: true,
          },
        },
      },
      orderBy: {
        lastName: 'asc', // Or createdAt
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
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