import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService, type TemplateComponent } from './whatsapp.service';

export interface WhatsAppJobData {
  recipientId: string;
  recipientType: 'PARENT' | 'TEACHER' | 'STUDENT';
  phone: string;
  templateName: string;
  components: TemplateComponent[];
}

@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppService,
  ) {}

  @Process('send-whatsapp')
  async handleWhatsAppNotification(job: Job<WhatsAppJobData>) {
    const { recipientId, recipientType, phone, templateName, components } =
      job.data;

    const log = await this.prisma.notificationLog.create({
      data: {
        recipientId,
        recipientType: recipientType || 'PARENT',
        channel: 'WHATSAPP',
        templateName,
        content: JSON.stringify(components),
        status: 'PENDING',
      },
    });

    const result = await this.whatsapp.sendTemplate(
      phone,
      templateName,
      'en',
      components,
    );

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        whatsappMsgId: result.messageId ?? undefined,
        sentAt: result.success ? new Date() : undefined,
        errorMessage: result.error,
      },
    });
  }
}
