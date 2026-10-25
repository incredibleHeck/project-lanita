import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ABACRule } from '../decorators/abac.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class ABACGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const abacRules = this.reflector.get<ABACRule[]>(
      'abac',
      context.getHandler(),
    );
    if (!abacRules || abacRules.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Admins and Super Admins bypass ABAC ownership constraints
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    for (const rule of abacRules) {
      const hasAccess = await this.evaluateRule(rule, user, request);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied: insufficient permission for this resource');
      }
    }

    return true;
  }

  private async evaluateRule(
    rule: ABACRule,
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    switch (rule.type) {
      case 'OWN_STUDENTS':
        return this.checkOwnStudents(user, request);
      case 'OWN_SECTIONS':
        return this.checkOwnSections(user, request);
      case 'OWN_CHILDREN':
        return this.checkOwnChildren(user, request);
      case 'OWN_ALLOCATION':
        return this.checkOwnAllocation(user, request);
      default:
        return true;
    }
  }

  private extractStudentId(request: Request): string | undefined {
    return (
      request.params?.['studentId'] ||
      (request.query?.['studentId'] as string) ||
      request.params?.['id'] ||
      request.body?.studentId
    );
  }

  private async checkOwnStudents(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    const studentId = this.extractStudentId(request);

    // If current user is a STUDENT, they can only access their own data
    if (user.role === 'STUDENT') {
      if (!studentId) return true;
      if (studentId === user.sub) return true;
      const ownRecord = await this.prisma.studentRecord.findFirst({
        where: { userId: user.sub },
      });
      return ownRecord?.id === studentId;
    }

    // If current user is a TEACHER, verify student is in their assigned section
    if (user.role === 'TEACHER') {
      if (!studentId) return true;

      const allocations = await this.prisma.subjectAllocation.findMany({
        where: { teacherId: user.sub },
        select: { sectionId: true },
      });
      const sectionIds = allocations.map((a) => a.sectionId);

      const student = await this.prisma.studentRecord.findFirst({
        where: {
          OR: [{ id: studentId }, { userId: studentId }],
          currentSectionId: { in: sectionIds },
        },
      });

      return !!student;
    }

    return true;
  }

  private async checkOwnSections(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const sectionId =
      request.params?.['sectionId'] ||
      (request.query?.['sectionId'] as string) ||
      request.body?.sectionId;
    if (!sectionId) return true;

    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: { teacherId: user.sub, sectionId },
    });

    return !!allocation;
  }

  private async checkOwnChildren(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    // If user is a STUDENT, verify they only access themselves
    if (user.role === 'STUDENT') {
      const studentId = this.extractStudentId(request);
      if (!studentId) return true;
      if (studentId === user.sub) return true;
      const ownRecord = await this.prisma.studentRecord.findFirst({
        where: { userId: user.sub },
      });
      return ownRecord?.id === studentId;
    }

    // If user is a PARENT, verify guardianship
    if (user.role === 'PARENT') {
      const studentId = this.extractStudentId(request);
      if (!studentId) return false;

      const student = await this.prisma.studentRecord.findFirst({
        where: {
          OR: [{ id: studentId }, { userId: studentId }],
          guardians: { some: { parent: { userId: user.sub } } },
        },
      });

      return !!student;
    }

    return true;
  }

  private async checkOwnAllocation(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const allocationId =
      request.params?.['allocationId'] ||
      (request.query?.['allocationId'] as string) ||
      request.body?.allocationId ||
      request.body?.subjectAllocationId;
    if (!allocationId) return true;

    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: { id: allocationId, teacherId: user.sub },
    });

    return !!allocation;
  }
}
