import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceBatchDto } from './dto/create-attendance-batch.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { ABACGuard } from '../common/guards/abac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ABAC } from '../common/decorators/abac.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard, ABACGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('batch')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ABAC('OWN_ALLOCATION')
  markRegister(@Body() createAttendanceBatchDto: CreateAttendanceBatchDto) {
    return this.attendanceService.markRegister(createAttendanceBatchDto);
  }

  @Get(':allocationId/:date')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAttendanceForDate(
    @Param('allocationId') allocationId: string,
    @Param('date') date: string,
  ) {
    return this.attendanceService.getAttendanceForDate(allocationId, date);
  }

  @Get('report')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ABAC('OWN_STUDENTS', 'OWN_CHILDREN')
  getReport(
    @Query('studentId') studentId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('useUserId') useUserId?: string,
  ) {
    return this.attendanceService.getReport(
      studentId,
      startDate,
      endDate,
      useUserId === 'true',
    );
  }
}
