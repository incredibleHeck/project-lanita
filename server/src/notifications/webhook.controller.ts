import { Controller, Post, Get, Body, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('webhooks')
export class WebhookController {
  constructor(private config: ConfigService) {}

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

  private async processStatusUpdate(value: any) {
    // Handle delivery/read status updates from WhatsApp
    // Can update NotificationLog.deliveredAt, readAt based on statuses
    if (value?.statuses) {
      for (const status of value.statuses) {
        // status.id = WhatsApp message ID
        // status.status = sent | delivered | read
        // Could update NotificationLog by whatsappMsgId
      }
    }
  }
}
