import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Gender } from '@prisma/client';

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
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  occupation?: string;

  @IsString()
  @IsOptional()
  employer?: string;

  @IsString()
  @IsOptional()
  secondaryContactName?: string;

  @IsString()
  @IsOptional()
  secondaryContactPhone?: string;
}

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
  address: Record<string, unknown>;

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

  // StudentRecord extended fields
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  studentRecordGender?: string;

  @IsString()
  @IsOptional()
  studentRecordAddress?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergies?: string[];

  @IsString()
  @IsOptional()
  medicalConditions?: string;

  @IsString()
  @IsOptional()
  previousSchool?: string;

  @IsString()
  @IsOptional()
  specialNeeds?: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateParentDto)
  parent?: CreateParentDto;
}
