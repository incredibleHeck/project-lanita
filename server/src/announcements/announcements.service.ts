import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(dto: CreateAnnouncementDto, authorId: string) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        scope: dto.scope,
        scopeId: dto.scopeId,
        isPinned: dto.isPinned ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        authorId,
      },
      include: { author: { include: { profile: true } } },
    });

    if (dto.notifyWhatsApp) {
      await this.notifyRecipients(announcement);
    }

    return announcement;
  }

  private async notifyRecipients(announcement: {
    id: string;
    title: string;
    content: string;
    scope: string;
    scopeId: string | null;
  }) {
    const schoolName = 'Lanita School';
    const content = `${announcement.title}: ${announcement.content.slice(0, 200)}`;

    if (announcement.scope === 'SCHOOL_WIDE') {
      const parents = await this.prisma.user.findMany({
        where: { role: 'PARENT', isActive: true },
        select: { id: true },
      });
      for (const parent of parents) {
        await this.notificationService.sendAnnouncement(
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
              include: { parent: true },
            })
          : await this.prisma.studentRecord.findMany({
              where: {
                currentSection: { classId: announcement.scopeId },
              },
              include: { parent: true },
            });

      const parentIds = new Set(
        students.map((s) => s.parentId).filter(Boolean) as string[],
      );
      for (const parentId of parentIds) {
        await this.notificationService.sendAnnouncement(
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
      scopeConditions.push({ scope: 'CLASS' as const, scopeId: { in: classIds } });
    }
    if (sectionIds.length > 0) {
      scopeConditions.push({ scope: 'SECTION' as const, scopeId: { in: sectionIds } });
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
        where: { parentId: userId },
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
