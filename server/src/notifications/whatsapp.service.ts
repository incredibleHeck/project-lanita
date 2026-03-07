import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface TemplateComponent {
  type: string;
  parameters: Array<{ type: string; text: string }>;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly isConfigured: boolean;

  constructor(
    private config: ConfigService,
    private http: HttpService,
  ) {
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.isConfigured = !!(this.phoneNumberId && this.accessToken);
    if (!this.isConfigured) {
      this.logger.warn('WhatsApp API not configured - notifications will be logged only');
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode = 'en',
    components: TemplateComponent[] = [],
  ): Promise<WhatsAppResponse> {
    if (!this.isConfigured) {
      this.logger.log(`[Demo] Would send WhatsApp template "${templateName}" to ${to}`);
      return { success: true, messageId: `demo-${Date.now()}` };
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message || error.message || 'Unknown error';
      this.logger.error(`WhatsApp send failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('233')) {
      cleaned = '233' + cleaned;
    }
    return cleaned;
  }
}
