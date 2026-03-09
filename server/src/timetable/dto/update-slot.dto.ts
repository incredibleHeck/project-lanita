import { IsInt, IsOptional, Min, Max } from 'class-validator';

export class UpdateSlotDto {
  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  dayOfWeek?: number;

  @IsInt()
  @Min(1)
  @Max(8)
  @IsOptional()
  periodNumber?: number;
}
