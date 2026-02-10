import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateResultDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsNotEmpty()
  examId: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsNumber()
  @Min(0)
  // Max validation depends on exam maxScore, but handled in logic ideally.
  score: number;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
