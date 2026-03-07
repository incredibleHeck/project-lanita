import { IsUUID, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateTimetableDto {
  @ApiProperty({ description: 'Academic Year ID' })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({ description: 'Periods per day', default: 8 })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(12)
  periodsPerDay?: number = 8;

  @ApiProperty({ description: 'Days per week', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number = 5;

  @ApiProperty({ description: 'Timeout in seconds', default: 60 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  timeoutSeconds?: number = 60;
}
