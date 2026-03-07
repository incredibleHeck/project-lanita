import { Controller, Get, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@ApiBearerAuth()
@Controller('portal')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('parent/children')
  @Roles(UserRole.PARENT)
  async getParentChildren(@Request() req) {
    return this.portalService.getParentChildren(req.user.sub);
  }

  @Get('student/:studentId/summary')
  @Roles(UserRole.STUDENT, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getStudentSummary(@Param('studentId') studentId: string, @Request() req) {
    const user = req.user;

    if (user.role === UserRole.STUDENT) {
      if (user.sub !== studentId) {
        throw new ForbiddenException('You can only view your own dashboard');
      }
    }

    if (user.role === UserRole.PARENT) {
      const hasAccess = await this.portalService.verifyParentAccess(user.sub, studentId);
      if (!hasAccess) {
        throw new ForbiddenException('You can only view your children\'s dashboard');
      }
    }

    return this.portalService.getStudentDashboard(studentId);
  }
}
