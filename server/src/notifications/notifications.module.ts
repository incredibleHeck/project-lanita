import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { NotificationProcessor } from './notification.processor';
import { WhatsAppService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController, WebhookController],
  providers: [NotificationService, NotificationProcessor, WhatsAppService],
  exports: [NotificationService],
})
export class NotificationsModule {}
