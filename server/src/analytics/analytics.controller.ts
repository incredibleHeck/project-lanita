import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AnalyticsService, AtRiskStudent } from './analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('at-risk')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAtRiskStudents(): Promise<AtRiskStudent[]> {
    return this.analyticsService.getAtRiskStudents();
  }
}
