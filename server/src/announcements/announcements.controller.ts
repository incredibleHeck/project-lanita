import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  getForUser(@Request() req: any, @Query('scope') scope?: string) {
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return this.announcementsService.getAll(scope);
    }
    return this.announcementsService.getForUser(req.user.sub, req.user.role);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  create(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    return this.announcementsService.create(dto, req.user.sub);
  }
}
