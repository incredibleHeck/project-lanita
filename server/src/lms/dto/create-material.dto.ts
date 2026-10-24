import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum MaterialType {
  FILE = 'FILE',
  YOUTUBE = 'YOUTUBE',
  LINK = 'LINK',
}

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @IsEnum(MaterialType, { message: 'materialType must be FILE, YOUTUBE, or LINK' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  materialType: MaterialType;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  resourceUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
