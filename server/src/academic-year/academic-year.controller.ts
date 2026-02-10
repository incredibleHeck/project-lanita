import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AccessTokenGuard } from '../auth/guards/accessToken.guard'; // Wait, I need to check where AccessTokenGuard is.
// Ah, usually user creates it or uses AuthGuard('jwt').
// Turn 5 context: "Context: We need to configure Passport Strategies...".
// Turn 6 context: "Create Decorator... Create Guard... RolesGuard".
// AccessTokenGuard is usually just `AuthGuard('jwt')`.
// I'll define it locally or assume standard location if not created.
// I'll create a simple one or use AuthGuard('jwt') directly in controller.
// Using AuthGuard('jwt') is cleaner if I haven't created a specific class.
// But RolesGuard was created in Turn 6.
// I'll check if I created AccessTokenGuard. No.
// So I'll use AuthGuard('jwt').
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('academic-year')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.academicYearService.create(createAcademicYearDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findAll() {
    return this.academicYearService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findOne(@Param('id') id: string) {
    return this.academicYearService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateAcademicYearDto: UpdateAcademicYearDto) {
    return this.academicYearService.update(id, updateAcademicYearDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.academicYearService.remove(id);
  }

  @Patch(':id/set-active')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  setActive(@Param('id') id: string) {
    return this.academicYearService.setActive(id);
  }
}
