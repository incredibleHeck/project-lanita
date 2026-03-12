import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Query DTO for GET /students: pagination (page, limit) plus optional filters.
 */
export class StudentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by section ID' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Search by first name, last name, or admission number',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
