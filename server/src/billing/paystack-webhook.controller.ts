import {
  Controller,
  Post,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { BillingService } from './billing.service';

interface PaystackWebhookPayload {
  event: string;
  data?: {
    reference?: string;
    channel?: string;
  };
}

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@SkipThrottle()
@Controller('billing/paystack')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly billingService: BillingService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Req() req: RequestWithRawBody) {
    const signature = req.headers['x-paystack-signature'] as string;
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body || {}));
    const computedHash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    if (computedHash !== signature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = req.body as PaystackWebhookPayload;

    if (payload.event === 'charge.success') {
      const reference = payload.data?.reference;
      const channel = payload.data?.channel ?? 'mobile_money';

      if (reference) {
        try {
          await this.billingService.processChargeSuccess(reference, channel);
        } catch (err) {
          this.logger.error(
            `Failed to process charge.success for reference ${reference}`,
            err,
          );
        }
      }
    }

    return { received: true };
  }
}
