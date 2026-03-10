import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  score: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
