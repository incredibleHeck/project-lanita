import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingScheduler } from './billing.scheduler';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaystackService } from './paystack.service';

@Module({
  imports: [HttpModule, NotificationsModule],
  controllers: [BillingController, PaystackWebhookController],
  providers: [BillingService, BillingScheduler, PaystackService],
  exports: [PaystackService],
})
export class BillingModule {}
