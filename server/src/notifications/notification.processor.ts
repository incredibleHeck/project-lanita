import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService, type TemplateComponent } from './whatsapp.service';
import { tenantStorage } from '../common/tenant/tenant.context';

export interface WhatsAppJobData {
  schoolId: string;
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
    const { schoolId, recipientId, recipientType, phone, templateName, components } =
      job.data;

    return tenantStorage.run({ schoolId }, async () => {
      const log = await this.prisma.notificationLog.create({
        data: {
          schoolId,
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
    });
  }
}
