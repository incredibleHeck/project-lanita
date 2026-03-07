import { Controller, Get, Post, Body, Param, UseGuards, ForbiddenException, Request } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('allocations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createAllocationDto: CreateAllocationDto) {
    return this.allocationsService.create(createAllocationDto);
  }

  @Get('teacher/:teacherId')
  async findByTeacher(@Param('teacherId') teacherId: string, @Request() req) {
    const user = req.user;
    
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return this.allocationsService.findAllByTeacher(teacherId);
    }

    if (user.sub === teacherId || user.id === teacherId) {
       return this.allocationsService.findAllByTeacher(teacherId);
    }

    throw new ForbiddenException('You can only view your own schedule');
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.allocationsService.findOne(id);
  }
}
