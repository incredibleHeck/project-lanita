import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SubjectType } from '@prisma/client';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(SubjectType)
  @IsOptional()
  subjectType?: SubjectType;

  @IsString()
  @IsOptional()
  description?: string;
}
