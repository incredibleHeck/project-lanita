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
  // Accessible by Admin and the Teacher themselves
  // We can't easily express "Self or Admin" with simple Roles decorator.
  // We need custom logic inside method.
  async findByTeacher(@Param('teacherId') teacherId: string, @Request() req) {
    const user = req.user;
    
    // Allow Admins
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return this.allocationsService.findAllByTeacher(teacherId);
    }

    // Allow Self
    if (user.sub === teacherId || user.id === teacherId) { // Check which field holds ID (usually sub in JWT)
       return this.allocationsService.findAllByTeacher(teacherId);
    }

    throw new ForbiddenException('You can only view your own schedule');
  }
}
