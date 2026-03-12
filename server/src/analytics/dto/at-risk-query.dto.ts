import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DEFAULT_AT_RISK_LIMIT = 200;
const MAX_AT_RISK_LIMIT = 500;

export const getEffectiveLimit = (limit?: number): number =>
  Math.min(limit ?? DEFAULT_AT_RISK_LIMIT, MAX_AT_RISK_LIMIT);

export class AtRiskQueryDto {
  @ApiPropertyOptional({
    description: 'Max number of students to analyze for at-risk (capped at 500)',
    default: 200,
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? DEFAULT_AT_RISK_LIMIT)
  @IsInt()
  @Min(1)
  @Max(MAX_AT_RISK_LIMIT)
  limit?: number = DEFAULT_AT_RISK_LIMIT;
}
