import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  grade: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
