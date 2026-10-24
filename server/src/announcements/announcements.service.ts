import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnnouncementScope, UserRole } from '@prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationService } from '../notifications/notification.service';
import { getTenantSchoolId } from '../common/tenant/tenant.context';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateAnnouncementDto, authorId: string) {
    const isCourseStream = !!dto.courseId;
    let schoolId: string | undefined;
    if (dto.courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId },
        select: { schoolId: true },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
      schoolId = course.schoolId;
    } else {
      schoolId = getTenantSchoolId() ?? undefined;
    }

    const attachmentsJson =
      dto.attachments?.length &&
      Array.isArray(dto.attachments) &&
      dto.attachments.every((a) => a && typeof a.url === 'string')
        ? (dto.attachments as { url: string; name?: string }[])
        : undefined;

    const announcement = await this.prisma.announcement.create({
      data: {
        title: isCourseStream ? '' : (dto.title ?? ''),
        content: dto.content,
        scope: isCourseStream ? AnnouncementScope.SCHOOL_WIDE : (dto.scope ?? AnnouncementScope.SCHOOL_WIDE),
        scopeId: dto.scopeId,
        courseId: dto.courseId,
        schoolId,
        isPinned: dto.isPinned ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        attachments: attachmentsJson ?? undefined,
        authorId,
      },
      include: { author: { include: { profile: true } } },
    });

    if (dto.notifyWhatsApp && !isCourseStream) {
      await this.notifyRecipients(announcement);
    }

    return announcement;
  }

  /**
   * Create a system-generated stream post (e.g. when a new assignment or material is created).
   * Sets isSystemPost: true and optional linkedEntityId + linkedEntityType for navigation.
   */
  async createSystemPost(
    courseId: string,
    authorId: string,
    content: string,
    linkedEntityId?: string,
    linkedEntityType?: 'ASSIGNMENT' | 'MATERIAL',
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
      select: { schoolId: true },
    });
    if (!course) {
      this.logger.warn(`createSystemPost: course not found ${courseId}`);
      return null;
    }
    return this.prisma.announcement.create({
      data: {
        title: '',
        content,
        scope: AnnouncementScope.SCHOOL_WIDE,
        courseId,
        schoolId: course.schoolId,
        authorId,
        isSystemPost: true,
        linkedEntityId: linkedEntityId ?? undefined,
        linkedEntityType: linkedEntityType ?? undefined,
      },
      include: { author: { include: { profile: true } } },
    });
  }

  /** Fetch all announcements for a course (stream tab), ordered by createdAt desc, with author details */
  async getByCourseId(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return this.prisma.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: { select: { comments: true } },
      },
    });
  }

  /** Create a comment on an announcement (class comment) */
  async createComment(
    announcementId: string,
    authorId: string,
    dto: CreateCommentDto,
  ) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return this.prisma.announcementComment.create({
      data: {
        announcementId,
        authorId,
        content: dto.content,
      },
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /** Get comments for an announcement, chronological order, with author details */
  async getComments(announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return this.prisma.announcementComment.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  private async notifyRecipients(announcement: {
    id: string;
    title: string;
    content: string;
    scope: string;
    scopeId: string | null;
  }) {
    const schoolId = getTenantSchoolId();
    if (!schoolId) {
      this.logger.warn(
        'Cannot send announcement notifications: tenant context (schoolId) is missing',
      );
      return;
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    const schoolName = school?.name ?? 'School';
    const content = `${announcement.title}: ${announcement.content.slice(0, 200)}`;

    if (announcement.scope === 'SCHOOL_WIDE') {
      const parents = await this.prisma.user.findMany({
        where: { role: 'PARENT', isActive: true },
        select: { id: true },
      });
      for (const parent of parents) {
        await this.notificationService.sendAnnouncement(
          schoolId,
          parent.id,
          schoolName,
          content,
        );
      }
    } else if (announcement.scopeId) {
      const students =
        announcement.scope === 'SECTION'
          ? await this.prisma.studentRecord.findMany({
              where: { currentSectionId: announcement.scopeId },
              include: {
                guardians: { include: { parent: { include: { user: true } } } },
              },
            })
          : await this.prisma.studentRecord.findMany({
              where: {
                currentSection: { classId: announcement.scopeId },
              },
              include: {
                guardians: { include: { parent: { include: { user: true } } } },
              },
            });

      const parentIds = new Set(
        students.flatMap((s) =>
          s.guardians.map((g) => g.parent.userId),
        ),
      );
      for (const parentId of parentIds) {
        await this.notificationService.sendAnnouncement(
          schoolId,
          parentId,
          schoolName,
          content,
        );
      }
    }
  }

  async getForUser(userId: string, role: UserRole) {
    const { classIds, sectionIds } = await this.getRelevantScopeIds(
      userId,
      role,
    );

    const now = new Date();

    const scopeConditions: any[] = [{ scope: 'SCHOOL_WIDE' }];
    if (classIds.length > 0) {
      scopeConditions.push({
        scope: 'CLASS' as const,
        scopeId: { in: classIds },
      });
    }
    if (sectionIds.length > 0) {
      scopeConditions.push({
        scope: 'SECTION' as const,
        scopeId: { in: sectionIds },
      });
    }

    return this.prisma.announcement.findMany({
      where: {
        AND: [
          { OR: scopeConditions },
          { publishAt: { lte: now } },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
      include: { author: { include: { profile: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }],
    });
  }

  private async getRelevantScopeIds(
    userId: string,
    role: UserRole,
  ): Promise<{ classIds: string[]; sectionIds: string[] }> {
    const classIds: string[] = [];
    const sectionIds: string[] = [];

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const classes = await this.prisma.class.findMany({
        select: { id: true },
      });
      const sections = await this.prisma.section.findMany({
        select: { id: true },
      });
      return {
        classIds: classes.map((c) => c.id),
        sectionIds: sections.map((s) => s.id),
      };
    }

    if (role === 'STUDENT') {
      const student = await this.prisma.studentRecord.findUnique({
        where: { userId },
        include: { currentSection: true },
      });
      if (student?.currentSection) {
        classIds.push(student.currentSection.classId);
        sectionIds.push(student.currentSection.id);
      }
    }

    if (role === 'PARENT') {
      const children = await this.prisma.studentRecord.findMany({
        where: {
          guardians: { some: { parent: { userId } } },
        },
        include: { currentSection: true },
      });
      for (const child of children) {
        if (child.currentSection) {
          classIds.push(child.currentSection.classId);
          sectionIds.push(child.currentSection.id);
        }
      }
    }

    if (role === 'TEACHER') {
      const allocations = await this.prisma.subjectAllocation.findMany({
        where: { teacherId: userId },
        include: { section: true },
      });
      for (const a of allocations) {
        classIds.push(a.section.classId);
        sectionIds.push(a.section.id);
      }
    }

    return {
      classIds: [...new Set(classIds)],
      sectionIds: [...new Set(sectionIds)],
    };
  }

  async getAll(scope?: string) {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        ...(scope && scope !== 'ALL' && { scope: scope as any }),
        publishAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { author: { include: { profile: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }],
    });
  }
}
