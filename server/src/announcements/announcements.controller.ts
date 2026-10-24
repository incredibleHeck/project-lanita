import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UsePipes,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { StreamBodyPipe } from './stream-body.pipe';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course (stream tab)' })
  @ApiQuery({ name: 'scope', required: false })
  getAnnouncements(
    @Request() req: any,
    @Query('scope') scope?: string,
    @Query('courseId') courseId?: string,
  ) {
    if (courseId) {
      return this.announcementsService.getByCourseId(courseId);
    }
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return this.announcementsService.getAll(scope);
    }
    return this.announcementsService.getForUser(req.user.sub, req.user.role);
  }

  @Post()
  @UsePipes(StreamBodyPipe)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER)
  create(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    return this.announcementsService.create(dto, req.user.sub);
  }

  @Get(':id/comments')
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.getComments(id);
  }

  @Post(':id/comments')
  createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
  ) {
    return this.announcementsService.createComment(id, req.user.sub, dto);
  }
}
