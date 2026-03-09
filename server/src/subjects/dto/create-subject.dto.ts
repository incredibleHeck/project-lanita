import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { SubjectType } from '@prisma/client';
import { RoomType } from '@prisma/client';

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

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (e.g. #6366f1)' })
  color?: string;

  @IsBoolean()
  @IsOptional()
  isExaminable?: boolean;

  @IsBoolean()
  @IsOptional()
  isSingleResource?: boolean;

  @IsUUID()
  @IsOptional()
  requiredRoomId?: string;

  @IsEnum(RoomType)
  @IsOptional()
  requiredRoomType?: RoomType;

  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredRoomIds?: string[];
}
