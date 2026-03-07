import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(private prisma: PrismaService) {}

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getNotificationLogs(
    @Query('recipientId') recipientId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.notificationLog.findMany({
      where: {
        ...(recipientId && { recipientId }),
        ...(status && { status: status as any }),
      },
      take: limit ? parseInt(limit, 10) : 50,
      orderBy: { createdAt: 'desc' },
      include: { recipient: { include: { profile: true } } },
    });
  }
}
