import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LmsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCourse(dto: CreateCourseDto) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    return this.prisma.course.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        academicYearId: dto.academicYearId,
      },
    });
  }

  async findAllCourses() {
    return this.prisma.course.findMany({
      include: {
        subject: true,
        teacher: { include: { profile: true } },
        modules: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneCourse(id: string) {
    const course = await this.prisma.course.findFirst({
      where: { id },
      include: {
        subject: true,
        teacher: { include: { profile: true } },
        modules: {
          include: {
            lessons: { orderBy: { orderIndex: 'asc' } },
            assignments: true,
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async createCourseModule(courseId: string, dto: CreateModuleDto) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return this.prisma.courseModule.create({
      data: {
        schoolId,
        courseId,
        title: dto.title,
        description: dto.description,
        order: dto.order ?? 0,
      },
    });
  }

  async createLesson(moduleId: string, dto: CreateLessonDto) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const courseModule = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    return this.prisma.lesson.create({
      data: {
        schoolId,
        moduleId,
        title: dto.title,
        content: dto.content,
        orderIndex: dto.order ?? 0,
      },
    });
  }

  async createAssignment(moduleId: string, dto: CreateAssignmentDto) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const courseModule = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    return this.prisma.assignment.create({
      data: {
        schoolId,
        moduleId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxScore: dto.maxScore,
      },
    });
  }

  async submitAssignment(
    assignmentId: string,
    studentUserId: string,
    dto: SubmitAssignmentDto,
  ) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const studentRecord = await this.prisma.studentRecord.findFirst({
      where: { userId: studentUserId },
    });
    if (!studentRecord) {
      throw new NotFoundException('Student record not found');
    }

    const existing = await this.prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId: studentRecord.id,
      },
    });
    if (existing) {
      throw new ConflictException('You have already submitted this assignment');
    }

    try {
      return await this.prisma.submission.create({
        data: {
          schoolId,
          assignmentId,
          studentId: studentRecord.id,
          content: dto.content,
          fileUrl: dto.fileUrl,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You have already submitted this assignment',
          );
        }
      }
      throw error;
    }
  }

  async gradeSubmission(
    submissionId: string,
    dto: GradeSubmissionDto,
    graderUserId: string,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        gradedAt: new Date(),
        gradedById: graderUserId,
      },
    });
  }

  async getCoursesForStudent(studentUserId: string) {
    const studentRecord = await this.prisma.studentRecord.findFirst({
      where: { userId: studentUserId },
    });
    if (!studentRecord) {
      throw new NotFoundException('Student record not found');
    }

    const allocations = await this.prisma.subjectAllocation.findMany({
      where: { sectionId: studentRecord.currentSectionId },
      select: { subjectId: true },
    });
    const subjectIds = [...new Set(allocations.map((a) => a.subjectId))];
    if (subjectIds.length === 0) {
      return [];
    }

    const courses = await this.prisma.course.findMany({
      where: { subjectId: { in: subjectIds } },
      include: {
        subject: true,
        teacher: { include: { profile: true } },
        modules: { include: { assignments: { select: { id: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      courses.map(async (course) => {
        const assignmentIds = course.modules.flatMap((m) =>
          m.assignments.map((a) => a.id),
        );
        const totalAssignments = assignmentIds.length;
        let completedAssignments = 0;
        if (assignmentIds.length > 0) {
          completedAssignments = await this.prisma.submission.count({
            where: {
              studentId: studentRecord.id,
              assignmentId: { in: assignmentIds },
            },
          });
        }
        const { modules, ...courseRest } = course;
        return {
          ...courseRest,
          progress: { totalAssignments, completedAssignments },
        };
      }),
    );
    return result;
  }

  async getModuleWithContent(moduleId: string) {
    const courseModule = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' },
        },
        assignments: true,
      },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    return courseModule;
  }
}
