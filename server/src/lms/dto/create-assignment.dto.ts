import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxScore?: number;

  /** Link to assignment document (PDF, Google Doc, etc.) or file URL when upload is available */
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsUrl({ require_tld: false })
  attachmentUrl?: string;

  /** Google Form URL for the assignment */
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsUrl({ require_tld: false })
  formUrl?: string;
}
