import { IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}
