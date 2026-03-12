import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AnalyticsService, AtRiskStudent } from './analytics.service';
import {
  AtRiskQueryDto,
  getEffectiveLimit,
} from './dto/at-risk-query.dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('at-risk')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAtRiskStudents(
    @Query('useML') useML?: string,
    @Query() query?: AtRiskQueryDto,
  ): Promise<AtRiskStudent[]> {
    return this.analyticsService.getAtRiskStudents(
      useML === 'true',
      getEffectiveLimit(query?.limit),
    );
  }
}
