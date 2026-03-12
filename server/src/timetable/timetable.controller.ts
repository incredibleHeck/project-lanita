import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, RoomType } from '@prisma/client';
import { TimetableService } from './timetable.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  generateTimetable(@Body() dto: GenerateTimetableDto) {
    return this.timetableService.generateTimetable(dto);
  }

  @Post('save')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  saveTimetable(
    @Query('academicYearId') academicYearId: string,
    @Body() body: { slots: any[] },
  ) {
    return this.timetableService.saveTimetable(academicYearId, body.slots);
  }

  @Patch('slots/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateSlot(@Param('id') id: string, @Body() dto: UpdateSlotDto) {
    return this.timetableService.updateSlot(id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  getAllSlots(@Query('academicYearId') academicYearId: string) {
    return this.timetableService.getAllTimetableSlots(academicYearId);
  }

  @Get('section/:sectionId')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
  )
  getSectionTimetable(
    @Param('sectionId') sectionId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.getTimetableBySection(
      sectionId,
      academicYearId,
    );
  }

  @Get('teacher/:teacherId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  getTeacherTimetable(
    @Param('teacherId') teacherId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.timetableService.getTimetableByTeacher(
      teacherId,
      academicYearId,
    );
  }

  @Get('rooms')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getRooms() {
    return this.timetableService.getRooms();
  }

  @Post('rooms')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRoom(
    @Body()
    body: {
      name: string;
      capacity: number;
      type: RoomType;
      building?: string;
      floor?: number;
    },
  ) {
    return this.timetableService.createRoom(body);
  }

  @Patch('rooms/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateRoom(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      capacity: number;
      type: RoomType;
      building: string;
      floor: number;
    }>,
  ) {
    return this.timetableService.updateRoom(id, body);
  }

  @Delete('rooms/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteRoom(@Param('id') id: string) {
    return this.timetableService.deleteRoom(id);
  }
}
