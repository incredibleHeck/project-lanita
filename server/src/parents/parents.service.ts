import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { getInitialPassword } from '../common/utils/password.utils';
import * as argon2 from 'argon2';
import { Gender, UserRole } from '@prisma/client';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async create(createParentDto: CreateParentDto) {
    const { password, mustChange } = getInitialPassword(
      'PARENT',
      process.env.NODE_ENV === 'production',
    );
    const passwordHash = await argon2.hash(password);

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // 1. Create User (PARENT)
        const newUser = await tx.user.create({
          data: {
            email: createParentDto.email,
            passwordHash,
            role: UserRole.PARENT,
            isActive: true,
            mustChangePassword: mustChange,
          },
        });

        // 2. Create Profile
        await tx.profile.create({
          data: {
            userId: newUser.id,
            firstName: createParentDto.firstName,
            lastName: createParentDto.lastName,
            contactNumber: createParentDto.phone,
            dob: new Date(), // Placeholder as DOB is required but not in DTO
            gender: Gender.OTHER, // Placeholder
            address: {}, // Placeholder
          },
        });

        // 3. Link Students
        for (const admissionNumber of createParentDto.studentAdmissionNumbers) {
          const studentRecord = await tx.studentRecord.findUnique({
            where: { admissionNumber },
          });

          if (!studentRecord) {
            throw new NotFoundException(
              `Student with Admission Number ${admissionNumber} not found`,
            );
          }

          // Link the student to this parent
          await tx.studentRecord.update({
            where: { id: studentRecord.id },
            data: {
              parentId: newUser.id,
            },
          });
        }

        return newUser;
      });

      if (mustChange && password) {
        return { ...user, temporaryPassword: password };
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Propagate the specific error to trigger rollback (transaction aborts automatically)
      }
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create parent');
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: UserRole.PARENT },
      include: {
        profile: true,
        children: {
          // Relation defined in User model (children StudentRecord[])
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });
  }
}
