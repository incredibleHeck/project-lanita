import { Injectable, Logger, InternalServerErrorException, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface PaystackInitializeData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: PaystackInitializeData;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Initialize a Paystack transaction.
   *
   * Note: Paystack expects `amount` in the smallest currency unit (e.g. kobo/pesewas),
   * so callers should convert from major units before invoking this method if needed.
   */
  async initializeTransaction(
    amount: number,
    email: string,
    reference: string,
    callbackUrl: string,
  ): Promise<PaystackInitializeData> {
    const secretKey = this.config.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      throw new InternalServerErrorException('Payment provider is not configured');
    }

    const url = 'https://api.paystack.co/transaction/initialize';
    const payload = {
      email,
      amount,
      reference,
      callback_url: callbackUrl,
      channels: ['card', 'bank', 'mobile_money', 'bank_transfer', 'ussd'],
    };

    try {
      const response = await firstValueFrom(
        this.http.post<PaystackInitializeResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const body = response.data;

      if (!body?.status) {
        this.logger.error(
          `Paystack initialization failed: ${body?.message ?? 'Unknown error'}`,
        );
        throw new BadGatewayException(
          body?.message || 'Failed to initialize payment with Paystack',
        );
      }

      return body.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Error initializing payment with Paystack';

      this.logger.error(`Error calling Paystack initialize endpoint: ${message}`, error?.stack);
      throw new BadGatewayException('Error initializing payment with Paystack');
    }
  }
}

