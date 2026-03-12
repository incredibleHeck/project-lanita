import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { getTenantSchoolId } from '../tenant/tenant.context';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const auditMetadata = this.reflector.get<{ entityType: string }>(
      'audit',
      context.getHandler(),
    );

    const oldValues = request['auditOldValues'];

    return next.handle().pipe(
      tap(async (response) => {
        const metadata = auditMetadata || request['auditMetadata'];
        if (!metadata || !user) return;

        const schoolId = getTenantSchoolId() || request['schoolId'];
        if (!schoolId) return;

        const reqMetadata = request['auditMetadata'] as
          | { entityId?: string }
          | undefined;
        const entityId =
          reqMetadata?.entityId ||
          request.params?.['id'] ||
          request.params?.['studentId'] ||
          response?.id;

        if (!entityId) return;

        const action = this.mapMethodToAction(method);

        try {
          await this.prisma.auditLog.create({
            data: {
              schoolId,
              userId: user.sub,
              userEmail: user.email ?? 'unknown',
              action,
              entityType: metadata.entityType,
              entityId,
              oldValues: oldValues ?? undefined,
              newValues: response
                ? JSON.parse(JSON.stringify(response))
                : undefined,
              ipAddress: request.ip,
              userAgent: request.headers?.['user-agent'],
            },
          });
        } catch (err) {
          // Log but don't fail the request
          console.error('Audit log failed:', err);
        }
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return 'UPDATE';
    }
  }
}
