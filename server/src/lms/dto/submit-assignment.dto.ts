import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}
