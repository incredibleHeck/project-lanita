import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ResultScoreDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class RecordResultsDto {
  @IsUUID()
  @IsNotEmpty()
  examId: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultScoreDto)
  scores: ResultScoreDto[];
}
