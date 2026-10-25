import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Admin audit log of all system notifications' })
  getNotificationLogs(
    @Query('recipientId') recipientId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.notificationLog.findMany({
      where: {
        ...(recipientId && { recipientId }),
        ...(status && { status: status as NotificationStatus }),
      },
      take: limit ? parseInt(limit, 10) : 50,
      orderBy: { createdAt: 'desc' },
      include: { recipient: { include: { profile: true } } },
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user notification inbox' })
  async getMyNotifications(
    @Request() req: { user: { sub: string } },
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const take = limit ? parseInt(limit, 10) : 30;

    const [items, unreadCount] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { recipientId: userId },
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationLog.count({
        where: {
          recipientId: userId,
          readAt: null,
          status: { not: NotificationStatus.FAILED },
        },
      }),
    ]);

    return {
      items,
      unreadCount,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { sub: string } },
  ) {
    const userId = req.user.sub;
    const existing = await this.prisma.notificationLog.findFirst({
      where: { id, recipientId: userId },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notificationLog.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllAsRead(@Request() req: { user: { sub: string } }) {
    const userId = req.user.sub;
    const now = new Date();

    const result = await this.prisma.notificationLog.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: now,
      },
    });

    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }
}
