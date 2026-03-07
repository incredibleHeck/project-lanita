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

    for (const rule of abacRules) {
      const hasAccess = await this.evaluateRule(rule, user, request);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
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

  private async checkOwnStudents(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const studentId =
      request.params['studentId'] ||
      request.params['id'] ||
      request.body?.studentId;
    if (!studentId) return true;

    const allocations = await this.prisma.subjectAllocation.findMany({
      where: { teacherId: user.sub },
      select: { sectionId: true },
    });
    const sectionIds = allocations.map((a) => a.sectionId);

    const student = await this.prisma.studentRecord.findFirst({
      where: {
        id: studentId,
        currentSectionId: { in: sectionIds },
      },
    });

    return !!student;
  }

  private async checkOwnSections(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const sectionId =
      request.params['sectionId'] || request.body?.sectionId;
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
    if (user.role !== 'PARENT') return true;

    const studentId =
      request.params['studentId'] ||
      request.params['id'] ||
      request.body?.studentId;
    if (!studentId) return true;

    const student = await this.prisma.studentRecord.findFirst({
      where: { id: studentId, parentId: user.sub },
    });

    return !!student;
  }

  private async checkOwnAllocation(
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const allocationId =
      request.params['allocationId'] ||
      request.body?.allocationId ||
      request.body?.subjectAllocationId;
    if (!allocationId) return true;

    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: { id: allocationId, teacherId: user.sub },
    });

    return !!allocation;
  }
}
