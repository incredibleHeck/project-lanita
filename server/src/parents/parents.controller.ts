import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Parents')
@ApiBearerAuth()
@Controller('parents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createParentDto: CreateParentDto) {
    return this.parentsService.create(createParentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.parentsService.findAll();
  }

  @Get('dashboard/:parentId')
  @Roles(UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getDashboard(
    @Param('parentId') parentId: string,
    @Request() req: { user: { sub: string; role: string } },
  ) {
    if (
      req.user.role === UserRole.PARENT &&
      req.user.sub !== parentId
    ) {
      throw new ForbiddenException('Access denied to this dashboard');
    }
    return this.parentsService.getDashboardSummary(parentId);
  }
}
