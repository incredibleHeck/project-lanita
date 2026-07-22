import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateParentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  studentAdmissionNumbers: string[];

  /** Explicit consent to receive WhatsApp school notifications. */
  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;
}
