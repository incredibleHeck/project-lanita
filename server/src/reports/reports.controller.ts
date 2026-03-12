import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PortalService } from '../portal/portal.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly portalService: PortalService,
  ) {}

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  async generateStudentReport(
    @Param('studentId') studentId: string,
    @Query('examId') examId: string,
    @Query('includeAiComment') includeAiComment?: string,
    @Request() req?: { user?: { sub: string; role?: string } },
  ) {
    const user = req?.user;
    if (user?.role === UserRole.PARENT) {
      const hasAccess = await this.portalService.verifyParentAccess(
        user.sub,
        studentId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You can only view reports for your own children',
        );
      }
    }

    return this.reportsService.generateStudentReport(
      studentId,
      examId,
      includeAiComment === 'true',
    );
  }

  @Post('student/:studentId/ai-comment')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  generateAiComment(
    @Param('studentId') studentId: string,
    @Query('examId') examId: string,
  ) {
    return this.reportsService.generateAiComment(studentId, examId);
  }
}
