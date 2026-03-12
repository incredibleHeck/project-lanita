import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Academic Years')
@ApiBearerAuth()
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
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  findAll() {
    return this.academicYearService.findAll();
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  findOne(@Param('id') id: string) {
    return this.academicYearService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateAcademicYearDto: UpdateAcademicYearDto,
  ) {
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
