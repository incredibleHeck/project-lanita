import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class InitializePaystackDto {
  @IsUUID()
  @IsNotEmpty()
  invoiceId: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  callbackUrl: string;
}
