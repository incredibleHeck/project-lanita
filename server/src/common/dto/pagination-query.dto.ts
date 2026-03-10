import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Reusable pagination query parameters for list endpoints.
 * Use with @Query() in controllers to parse page and limit from query strings.
 * Query params arrive as strings; @Type and @Transform coerce them to numbers
 * and apply defaults when omitted.
 */
export class PaginationQueryDto {
  /**
   * Page number (1-based). Defaults to 1 when omitted.
   */
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 1)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page. Defaults to 10 when omitted.
   */
  @ApiPropertyOptional({
    description: 'Items per page',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 10)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
