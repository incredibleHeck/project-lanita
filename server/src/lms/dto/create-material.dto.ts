import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

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
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  moduleId: string;

  @IsEnum(MaterialType)
  materialType: MaterialType;

  @IsString()
  @IsOptional()
  resourceUrl?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
