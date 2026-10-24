import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@Controller('messaging')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Get('threads')
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  getThreads(@Request() req: any) {
    return this.messagingService.getThreadsForUser(req.user.sub);
  }

  @Get('threads/:threadId')
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  getThread(@Param('threadId') threadId: string, @Request() req: any) {
    return this.messagingService.getThreadMessages(threadId, req.user.sub);
  }

  @Post('threads/:threadId/messages')
  @Roles(UserRole.TEACHER, UserRole.PARENT)
  sendMessage(
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.messagingService.sendMessage(
      threadId,
      req.user.sub,
      dto.content,
    );
  }

  @Post('threads')
  @Roles(UserRole.TEACHER, UserRole.PARENT, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createThread(@Body() dto: CreateThreadDto, @Request() req: any) {
    const isParent = req.user.role === UserRole.PARENT;
    const teacherId = isParent ? dto.teacherId : req.user.sub;
    const parentId = isParent ? req.user.sub : dto.parentId;

    if (!teacherId || !parentId) {
      throw new BadRequestException('Both teacher and parent must be specified');
    }

    return this.messagingService.getOrCreateThread(
      teacherId,
      parentId,
      dto.studentId,
    );
  }
}
