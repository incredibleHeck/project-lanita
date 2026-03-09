import { Controller, Get, Post, Body, Query, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createTeacherDto: CreateTeacherDto) {
    return this.teachersService.create(createTeacherDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateTeacherDto: UpdateTeacherDto) {
    return this.teachersService.update(id, updateTeacherDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.teachersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.teachersService.findOne(id);
  }
}
