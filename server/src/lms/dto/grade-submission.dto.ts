import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GradeSubmissionDto {
  @ApiProperty({ description: 'Numeric grade', example: 85 })
  @IsNumber()
  @Min(0)
  grade: number;

  @ApiPropertyOptional({ description: 'Private feedback for the student' })
  @IsString()
  @IsOptional()
  feedback?: string;
}
