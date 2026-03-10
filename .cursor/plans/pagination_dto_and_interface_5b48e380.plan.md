---
name: Pagination DTO and interface
overview: Add a reusable PaginationQueryDto (with class-transformer for query param coercion) and a generic PaginatedResult interface to standardize pagination across the NestJS backend.
todos: []
isProject: false
---

# Pagination DTO and Interface

## Current state

- **ValidationPipe**: [main.ts](server/src/main.ts) uses `transform: true` and `whitelist: true`, so class-transformer and class-validator run on incoming requests.
- **Existing pagination**: Controllers (e.g. [students.controller.ts](server/src/students/students.controller.ts), [billing.controller.ts](server/src/billing/billing.controller.ts)) manually parse `@Query('page')` and `@Query('limit')` as strings and pass to services. Services (e.g. [students.service.ts](server/src/students/students.service.ts), [billing.service.ts](server/src/billing/billing.service.ts)) return `{ data, meta: { total, page, lastPage } }` with inconsistent shapes (some omit `limit`, some use `lastPage` instead of `totalPages`).
- **Dependencies**: [package.json](server/package.json) includes `class-transformer` and `class-validator`. DTOs use `@Type` from class-transformer (e.g. [create-attendance-batch.dto.ts](server/src/attendance/dto/create-attendance-batch.dto.ts)) and `@IsInt`, `@Min`, `@IsOptional` from class-validator (e.g. [generate-timetable.dto.ts](server/src/timetable/dto/generate-timetable.dto.ts)).

## 1. Create `server/src/common/dto/pagination-query.dto.ts`

- **Purpose**: Reusable DTO for `page` and `limit` query params. Query params arrive as strings; use `@Type(() => Number)` to coerce to numbers.
- **Properties**:
  - `page`: optional, number, min 1, default 1. Use `@Transform(({ value }) => value ?? 1)` so missing values become 1.
  - `limit`: optional, number, min 1, default 10. Use `@Transform(({ value }) => value ?? 10)`.
- **Decorators**: `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)` on both. `@Transform` from class-transformer for defaults.
- **Swagger**: Add `@ApiPropertyOptional` with description and example for each field for API docs.
- **Documentation**: JSDoc block for the class and each property explaining usage and defaults.

Example structure:

```ts
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Reusable pagination query parameters.
 * Use with @Query() in controllers to parse page and limit from query strings.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 1)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => value ?? 10)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
```

Note: `@Transform` runs before validation; when the query omits the param, `value` is undefined and we substitute the default. The `= 1` and `= 10` on the property provide TypeScript defaults for when the DTO is constructed directly.

## 2. Create `server/src/common/interfaces/paginated-result.interface.ts`

- **Purpose**: Generic interface for paginated API responses so all endpoints return a consistent shape.
- **Shape**:
  - `data: T[]` – array of items for the current page
  - `meta`: object with `total` (number), `page` (number), `limit` (number), `totalPages` (number)
- **Documentation**: JSDoc for the interface and each property. Document that `totalPages` is `Math.ceil(total / limit)`.

Example:

```ts
/**
 * Metadata for a paginated response.
 */
export interface PaginationMeta {
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Standard paginated API response.
 * @typeParam T - Type of each item in the data array
 */
export interface PaginatedResult<T> {
  /** Items for the current page */
  data: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}
```

## 3. Optional: helper for skip/take

Consider adding a small helper (e.g. in the same DTO file or a separate util) to compute Prisma `skip` and `take` from the DTO:

```ts
export function getPaginationParams(dto: PaginationQueryDto) {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 10;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
```

This is optional; the plan focuses on the DTO and interface. Controllers can extend `PaginationQueryDto` for endpoints that need pagination plus other filters (e.g. `class PaginatedStudentsQueryDto extends PaginationQueryDto { @IsOptional() classId?: string; }`).

## File summary


| Action | File                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- |
| Create | `server/src/common/dto/pagination-query.dto.ts` – DTO with page, limit, validation, defaults             |
| Create | `server/src/common/interfaces/paginated-result.interface.ts` – `PaginatedResult<T>` and `PaginationMeta` |


## Usage example (for future refactoring)

Controllers can adopt the DTO and interface as follows:

```ts
// Controller
@Get()
findAll(@Query() query: PaginationQueryDto) {
  return this.studentsService.findAll(query);
}

// Service - return type
async findAll(dto: PaginationQueryDto): Promise<PaginatedResult<UserEntity>> {
  const { page = 1, limit = 10 } = dto;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([...]);
  return {
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}
```

No changes to existing controllers or services are required in this plan; the new files are ready for gradual adoption.