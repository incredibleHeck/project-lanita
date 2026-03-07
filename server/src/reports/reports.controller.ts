import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  generateStudentReport(
    @Param('studentId') studentId: string,
    @Query('examId') examId: string,
    @Query('includeAiComment') includeAiComment?: string,
  ) {
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
