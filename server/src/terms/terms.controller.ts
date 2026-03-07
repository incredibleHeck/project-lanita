import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';

@ApiTags('Terms')
@ApiBearerAuth()
@Controller('terms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateTermDto) {
    return this.termsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findAll(@Query('academicYearId') academicYearId?: string) {
    return this.termsService.findAll(academicYearId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  findOne(@Param('id') id: string) {
    return this.termsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateTermDto>) {
    return this.termsService.update(id, dto);
  }

  @Patch(':id/set-active')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  setActive(@Param('id') id: string) {
    return this.termsService.setActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.termsService.remove(id);
  }
}
