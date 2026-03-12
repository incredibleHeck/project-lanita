import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
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
  @IsOptional()
  middleName?: string;

  @IsDateString()
  @IsNotEmpty()
  dob: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsObject()
  @IsNotEmpty()
  address: any;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsDateString()
  @IsNotEmpty()
  admissionDate: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
