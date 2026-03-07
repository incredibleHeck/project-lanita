import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { tenantStorage } from './tenant.context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantCode = this.extractTenantCode(req);

    if (!tenantCode) {
      const defaultSchoolId = this.config.get<string>('DEFAULT_SCHOOL_ID');
      if (defaultSchoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: defaultSchoolId },
        });
        if (school && school.isActive) {
          req['schoolId'] = school.id;
          req['school'] = school;
          return tenantStorage.run({ schoolId: school.id }, () => next());
        }
      }
      throw new UnauthorizedException('Tenant not specified');
    }

    const school = await this.prisma.school.findUnique({
      where: { code: tenantCode },
    });

    if (!school || !school.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    req['schoolId'] = school.id;
    req['school'] = school;
    return tenantStorage.run({ schoolId: school.id }, () => next());
  }

  private extractTenantCode(req: Request): string | null {
    // Option 1: Header (X-Tenant-ID)
    const headerTenant = req.headers['x-tenant-id'];
    if (headerTenant) {
      return String(headerTenant).trim().toUpperCase();
    }

    // Option 2: Subdomain (presec.lanita.com)
    const host = req.headers.host || '';
    const parts = host.split('.');
    const subdomain = parts.length > 2 ? parts[0] : null;
    if (subdomain && !['www', 'api', 'localhost'].includes(subdomain.toLowerCase())) {
      return subdomain.toUpperCase();
    }

    // Option 3: From JWT (after auth) - when schoolCode/schoolId added to JWT payload
    const user = req['user'] as { schoolCode?: string; schoolId?: string } | undefined;
    if (user?.schoolCode) {
      return String(user.schoolCode).toUpperCase();
    }

    return null;
  }
}
