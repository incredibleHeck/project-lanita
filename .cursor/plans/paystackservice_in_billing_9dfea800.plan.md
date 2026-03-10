---
name: PaystackService in Billing
overview: Add a dedicated PaystackService in the billing module that uses NestJS HttpService and ConfigService to call Paystack's transaction/initialize API, and register it in BillingModule.
todos: []
isProject: false
---

# PaystackService in Billing Module

## Current state

- **Billing module:** [server/src/billing/billing.module.ts](server/src/billing/billing.module.ts) imports `NotificationsModule`, declares `BillingController`, `BillingService`, and `BillingScheduler`. No `HttpModule` or Paystack yet.
- **Config:** `ConfigModule` is global in [server/src/app.module.ts](server/src/app.module.ts), so `ConfigService` is available in any module without importing `ConfigModule` again.
- **HTTP pattern:** [server/src/analytics/analytics.service.ts](server/src/analytics/analytics.service.ts) injects `HttpService` from `@nestjs/axios` and uses `firstValueFrom(this.httpService.post(...))` to turn the Observable into a Promise. Same pattern will be used for Paystack.

## 1. Create PaystackService

**File:** [server/src/billing/paystack.service.ts](server/src/billing/paystack.service.ts)

- **Decorator:** `@Injectable()` (default singleton).
- **Constructor:** Inject `HttpService` from `@nestjs/axios` and `ConfigService` from `@nestjs/config`. Read the secret with `this.config.get<string>('PAYSTACK_SECRET_KEY')` (no default; missing key should be handled when calling the API or in a guard).
- **Method:** `initializeTransaction(amount: number, email: string, reference: string, callbackUrl: string)`:
  - **URL:** `POST https://api.paystack.co/transaction/initialize`.
  - **Headers:** `Authorization: Bearer <PAYSTACK_SECRET_KEY>`, `Content-Type: application/json`.
  - **Body:** Paystack expects `amount` in the **smallest currency unit** (e.g. kobo for NGN, pesewas for GHS). The plan assumes the backend passes amount in that subunit; if your app uses major units (e.g. GHS), multiply by 100 before sending (document or parameterize currency/unit in the method).
  - **Payload:** `{ email, amount, reference, callback_url: callbackUrl }` (Paystack uses snake_case for `callback_url`).
  - Use `this.httpService.post<PaystackInitializeResponse>(url, body, { headers })` and return `firstValueFrom(...)` so the method returns a Promise. Handle errors (e.g. map Axios errors to a suitable Nest exception or rethrow) and return the response (e.g. `data.data.authorization_url` and `reference` for the caller).
- **Typing:** Define a minimal interface for the response (e.g. `{ status: boolean; message: string; data: { authorization_url: string; access_code: string; reference: string } }`) so the return type is clear.

**Dependencies:** `@nestjs/axios` and `rxjs` (for `firstValueFrom`) are already used in the project (e.g. analytics). No new packages required.

## 2. Register in BillingModule

**File:** [server/src/billing/billing.module.ts](server/src/billing/billing.module.ts)

- Add `HttpModule` to `imports` (from `@nestjs/axios`). Optionally use `HttpModule.register({ timeout: 10000, maxRedirects: 0 })` or similar if you want explicit defaults.
- Add `PaystackService` to `providers`.
- Export `PaystackService` from the module only if other modules (e.g. a future payments module) need to inject it; otherwise keep it internal to billing.

Example structure:

```ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingScheduler } from './billing.scheduler';
import { PaystackService } from './paystack.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [HttpModule, NotificationsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduler, PaystackService],
  exports: [PaystackService], // optional
})
export class BillingModule {}
```

## 3. Environment variable

- Add `PAYSTACK_SECRET_KEY` to [server/.env.example](server/.env.example) (or root `.env.example` if that is the single source of truth) with a placeholder so deployers know to set it. The service will read it at runtime via `ConfigService`; if the key is missing, the Paystack API will return 401 and the service can throw or let the caller handle it.

## File summary


| Action | File                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create | [server/src/billing/paystack.service.ts](server/src/billing/paystack.service.ts) — PaystackService with `initializeTransaction`, ConfigService, HttpService, firstValueFrom |
| Edit   | [server/src/billing/billing.module.ts](server/src/billing/billing.module.ts) — import HttpModule, add PaystackService to providers (and optionally exports)                 |
| Edit   | [server/.env.example](server/.env.example) or project `.env.example` — add `PAYSTACK_SECRET_KEY`                                                                            |


## Amount units

Paystack expects **amount in the smallest currency unit** (e.g. 10000 = 100.00 GHS). The method signature uses `amount: number`; the caller is responsible for passing the value in the correct unit. If your app stores amounts in major units, multiply by 100 (or the appropriate factor) before calling `initializeTransaction`, or add an optional parameter/documentation to make the contract explicit.