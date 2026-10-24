import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Prisma } from '@prisma/client';
import { AnnouncementsService } from '../announcements/announcements.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly announcementsService: AnnouncementsService,
  ) {}

  async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ url: string }> {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size must be under ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: PDF, Word, images (JPEG, PNG, GIF, WebP), plain text.',
      );
    }
    const safeExt = this.getExtensionFromMime(file.mimetype);
    if (!safeExt) {
      throw new BadRequestException('Invalid or unsupported file type');
    }
    const filename = `${randomUUID()}${safeExt}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    return { url: `/uploads/${filename}` };
  }

  private getExtensionFromMime(mimetype: string): string {
    const map: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'text/plain': '.txt',
    };
    return map[mimetype] || '';
  }

  private generateClassCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createCourse(dto: CreateCourseDto) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const classCode = this.generateClassCode();
    return this.prisma.course.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code,
        classCode,
        description: dto.description,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        academicYearId: dto.academicYearId,
      },
    });
  }

  async updateCourse(courseId: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...(dto.meetLink !== undefined && { meetLink: dto.meetLink || null }),
        ...(dto.theme !== undefined && { theme: dto.theme || null }),
      },
    });
  }

  async findAllCourses() {
    return this.prisma.course.findMany({
      include: {
        subject: true,
        academicYear: true,
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
        academicYear: true,
        teacher: { include: { profile: true } },
        modules: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: { orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }] },
            materials: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
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

  async createMaterial(
    courseId: string,
    moduleId: string,
    dto: CreateMaterialDto,
    authorId?: string,
  ) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const courseModule = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    const data: Prisma.MaterialUncheckedCreateInput = {
      schoolId,
      moduleId,
      title: dto.title.trim(),
      description: dto.description?.trim() || undefined,
      materialType: dto.materialType as 'FILE' | 'YOUTUBE' | 'LINK',
      resourceUrl: dto.resourceUrl?.trim() || undefined,
      order: dto.order ?? 0,
    };
    const material = await this.prisma.material.create({ data });
    if (authorId) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { profile: { select: { firstName: true } } },
      });
      const name = author?.profile?.firstName ?? 'Someone';
      await this.announcementsService.createSystemPost(
        courseId,
        authorId,
        `${name} posted a new material: ${material.title}`,
        material.id,
        'MATERIAL',
      );
    }
    return material;
  }

  async deleteMaterial(materialId: string) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const material = await this.prisma.material.findFirst({
      where: { id: materialId, schoolId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    await this.prisma.material.delete({ where: { id: materialId } });
    return { success: true };
  }

  async deleteAssignment(assignmentId: string) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }

  async deleteLesson(lessonId: string) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, schoolId },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  async getCourseClasswork(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
      include: {
        subject: true,
        academicYear: true,
        teacher: { include: { profile: true } },
        modules: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: {
              orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
            },
            materials: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            },
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

  async createAssignment(
    moduleId: string,
    dto: CreateAssignmentDto,
    authorId?: string,
  ) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      throw new BadRequestException('Tenant context is required');
    }
    const courseModule = await this.prisma.courseModule.findFirst({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    const assignment = await this.prisma.assignment.create({
      data: {
        schoolId,
        moduleId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxScore: dto.maxScore,
        attachmentUrl: dto.attachmentUrl?.trim() || undefined,
        formUrl: dto.formUrl?.trim() || undefined,
      },
    });
    if (authorId) {
      const author = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { profile: { select: { firstName: true } } },
      });
      const name = author?.profile?.firstName ?? 'Someone';
      await this.announcementsService.createSystemPost(
        courseModule.courseId,
        authorId,
        `${name} posted a new assignment: ${assignment.title}`,
        assignment.id,
        'ASSIGNMENT',
      );
    }
    return assignment;
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

    if (!dto.content?.trim() && !dto.fileUrl?.trim()) {
      throw new BadRequestException(
        'Either content or fileUrl is required',
      );
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
          content: dto.content?.trim() || undefined,
          fileUrl: dto.fileUrl?.trim() || undefined,
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

    // Submission is considered "GRADED" when score/gradedAt/gradedById are set (no separate status column)
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.grade,
        feedback: dto.feedback ?? undefined,
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
        academicYear: true,
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
        materials: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        assignments: true,
      },
    });
    if (!courseModule) {
      throw new NotFoundException('Module not found');
    }
    return courseModule;
  }

  async getMaterialById(materialId: string) {
    const material = await this.prisma.material.findFirst({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }

  async getLessonById(lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    return lesson;
  }

  async getAssignmentById(
    assignmentId: string,
    studentUserId?: string,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    let submission: { id: string; createdAt: string } | null = null;
    if (studentUserId) {
      const studentRecord = await this.prisma.studentRecord.findFirst({
        where: { userId: studentUserId },
      });
      if (studentRecord) {
        const sub = await this.prisma.submission.findFirst({
          where: {
            assignmentId,
            studentId: studentRecord.id,
          },
          select: { id: true, createdAt: true },
        });
        if (sub) {
          submission = {
            id: sub.id,
            createdAt: sub.createdAt.toISOString(),
          };
        }
      }
    }

    return {
      ...assignment,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      submission,
    };
  }

  async getAssignmentSubmissionsForGrading(assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId },
      include: {
        module: {
          include: {
            course: {
              include: {
                section: {
                  include: {
                    students: {
                      include: {
                        user: {
                          include: { profile: true },
                        },
                      },
                      orderBy: { admissionNumber: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const section = assignment.module?.course?.section;
    if (!section) {
      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate?.toISOString() ?? null,
          maxScore: assignment.maxScore,
        },
        courseId: assignment.module?.course?.id ?? null,
        students: [],
      };
    }

    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true },
    });
    const submissionByStudentId = new Map(
      submissions.map((s) => [s.studentId, s]),
    );

    const students = section.students.map((student) => {
      const sub = submissionByStudentId.get(student.id);
      let status: 'Turned In' | 'Graded' | 'Missing' = 'Missing';
      if (sub) {
        status = sub.gradedAt ? 'Graded' : 'Turned In';
      }
      const profile = student.user?.profile;
      const name = profile
        ? `${profile.firstName} ${profile.lastName}`.trim() || 'Student'
        : 'Student';
      return {
        id: student.id,
        userId: student.userId,
        name,
        avatarUrl: profile?.avatarUrl ?? null,
        status,
        submission: sub
          ? {
              id: sub.id,
              content: sub.content,
              fileUrl: sub.fileUrl,
              score: sub.score,
              feedback: sub.feedback,
              gradedAt: sub.gradedAt?.toISOString() ?? null,
            }
          : null,
      };
    });

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate?.toISOString() ?? null,
        maxScore: assignment.maxScore,
      },
      courseId: assignment.module?.course?.id ?? null,
      students,
    };
  }
}
