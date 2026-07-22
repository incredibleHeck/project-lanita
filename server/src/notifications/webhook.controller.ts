import { Controller, Post, Get, Body, Query, Res, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
}

@SkipThrottle()
@ApiExcludeController()
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Get('whatsapp')
  verifyWebhook(@Query() query: Record<string, string>, @Res() res: Response) {
    const verifyToken = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  @Post('whatsapp')
  async handleWhatsAppWebhook(@Body() body: any, @Res() res: Response) {
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            await this.processStatusUpdate(change.value);
          }
        }
      }
    }
    return res.sendStatus(200);
  }

  private async processStatusUpdate(value: {
    statuses?: WhatsAppStatus[];
  }) {
    if (!value?.statuses?.length) return;

    for (const status of value.statuses) {
      if (!status.id || !status.status) continue;

      const deliveredAt =
        status.status === 'delivered' || status.status === 'read'
          ? new Date(
              status.timestamp
                ? Number(status.timestamp) * 1000
                : Date.now(),
            )
          : undefined;
      const readAt =
        status.status === 'read'
          ? new Date(
              status.timestamp
                ? Number(status.timestamp) * 1000
                : Date.now(),
            )
          : undefined;

      try {
        const updated = await this.prisma.notificationLog.updateMany({
          where: { whatsappMsgId: status.id },
          data: {
            ...(deliveredAt && { deliveredAt }),
            ...(readAt && { readAt }),
            ...(status.status === 'failed' && {
              status: 'FAILED',
              errorMessage: 'WhatsApp delivery failed',
            }),
          },
        });
        if (updated.count === 0) {
          this.logger.debug(
            `No NotificationLog for WhatsApp message ${status.id}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to update delivery status for ${status.id}: ${err}`,
        );
      }
    }
  }
}
