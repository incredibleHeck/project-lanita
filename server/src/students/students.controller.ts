import { Controller, Get, Post, Body, Param, UseGuards, Query, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { ABACGuard } from '../common/guards/abac.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ABAC } from '../common/decorators/abac.decorator';
import { UserRole } from '@prisma/client';
import { IsUUID, IsNotEmpty } from 'class-validator';

class AssignSectionDto {
  @IsUUID()
  @IsNotEmpty()
  sectionId: string;
}

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(AuthGuard('jwt'), RolesGuard, ABACGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  findAll(
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll({
      classId,
      sectionId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.PARENT)
  @ABAC('OWN_STUDENTS', 'OWN_CHILDREN')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id/assign-section')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignSection(@Param('id') id: string, @Body() body: AssignSectionDto) {
    return this.studentsService.assignSection(id, body.sectionId);
  }
}