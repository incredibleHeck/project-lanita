import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;
}
