import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  ValidateIf,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementScope } from '@prisma/client';

/** Single attachment item for stream posts (file URL or link) */
export class AttachmentItemDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateAnnouncementDto {
  @ApiPropertyOptional({ description: 'For course stream: the course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Title; optional for stream posts (defaults to empty)' })
  @ValidateIf((o) => !o.courseId)
  @Transform(({ value, obj }) =>
    obj.courseId ? undefined : (value === '' || value === null ? undefined : value),
  )
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: 'HTML or plain text; min 1 char for stream, 20 for school-wide' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Content is required' })
  @ValidateIf((o) => !o.courseId)
  @MinLength(20, { message: 'Content must be at least 20 characters' })
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ enum: AnnouncementScope, description: 'Required when courseId is not set' })
  @ValidateIf((o) => !o.courseId)
  @Transform(({ value, obj }) =>
    obj.courseId ? undefined : (value === '' || value === null ? undefined : value),
  )
  @IsOptional()
  @IsEnum(AnnouncementScope)
  scope?: AnnouncementScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({ description: 'Attachments (file URLs or links) for stream posts' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentItemDto)
  attachments?: AttachmentItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyWhatsApp?: boolean;
}
