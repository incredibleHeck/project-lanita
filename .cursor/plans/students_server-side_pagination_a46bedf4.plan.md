---
name: Students Server-side Pagination
overview: Refactor `GET /students` to use the shared `PaginationQueryDto` and return `PaginatedResult<UserEntity>` while keeping existing filters (classId/sectionId/search), using Prisma `skip`/`take` and `$transaction` to fetch data + total count with tenant scoping preserved via the Prisma tenant extension.
todos: []
isProject: false
---

# Students Server-side Pagination Plan

## Current state

- **Controller** `[server/src/students/students.controller.ts](server/src/students/students.controller.ts)` currently parses `page`/`limit` manually as strings and passes `{ classId, sectionId, page, limit, search }` to the service.
- **Service** `[server/src/students/students.service.ts](server/src/students/students.service.ts)` already computes `skip`/`take` and runs `findMany` + `count`, but:
  - It uses `Promise.all` instead of Prisma `$transaction`.
  - It returns meta `{ total, page, lastPage }` which **does not match** the standardized pagination interface.
- **Standard DTO/interface already exist:**
  - `[server/src/common/dto/pagination-query.dto.ts](server/src/common/dto/pagination-query.dto.ts)` exports `PaginationQueryDto`.
  - `[server/src/common/interfaces/paginated-result.interface.ts](server/src/common/interfaces/paginated-result.interface.ts)` exports `PaginatedResult<T>` and `PaginationMeta`.
- **Multi-tenancy:** Prisma tenant extension includes `'User'` in `TENANT_MODELS` ([server/src/prisma/prisma-tenant.extension.ts](server/src/prisma/prisma-tenant.extension.ts)), so `this.prisma.user.findMany/count` will automatically add `schoolId` to `where` based on request tenant context.

## 1. Add a students-specific query DTO

Create `[server/src/students/dto/students-query.dto.ts](server/src/students/dto/students-query.dto.ts)`:

- `export class StudentsQueryDto extends PaginationQueryDto`
- Add optional filters (validated):
  - `classId?: string` (`@IsOptional()`, `@IsUUID()`)
  - `sectionId?: string` (`@IsOptional()`, `@IsUUID()`)
  - `search?: string` (`@IsOptional()`, `@IsString()`)

This keeps your existing filters while standardizing pagination parsing/validation.

## 2. Controller: accept `@Query()` DTO

Update `[server/src/students/students.controller.ts](server/src/students/students.controller.ts)`:

- Replace the current `findAll(@Query('...') ...)` signature with:
  - `findAll(@Query() query: StudentsQueryDto)`
- Pass the full `query` object to `studentsService.findAll(query)`.

## 3. Service: implement paginated Prisma query with `$transaction`

Update `[server/src/students/students.service.ts](server/src/students/students.service.ts)`:

- Change signature to accept `StudentsQueryDto` (or a compatible type) and return `Promise<PaginatedResult<UserEntity>>`.
- Compute:
  - `page = dto.page ?? 1`
  - `limit = dto.limit ?? 10`
  - `skip = (page - 1) * limit`
- Build the same `whereClause` as today (role + optional classId/sectionId + OR search conditions).
- Use Prisma `$transaction` to fetch count + page data:
  - `const [total, users] = await this.prisma.$transaction([   this.prisma.user.count({ where: whereClause }),   this.prisma.user.findMany({ where: whereClause, skip, take: limit, include: ..., orderBy: ... }), ]);`
- Return **exactly** `PaginatedResult<UserEntity>`:
  - `data: users.map((u) => new UserEntity(u))`
  - `meta: { total, page, limit, totalPages: Math.ceil(total / limit) }`

## 4. Tenant scoping

- Do **not** add a manual `schoolId` condition in `whereClause`.
- Tenant isolation remains enforced automatically because `User` is tenant-scoped in the Prisma extension.

## 5. Verification

- Run lints on the edited files.
- Spot-check that `GET /students?page=2&limit=20&search=ann&classId=...` returns:
  - `data.length <= limit`
  - `meta.totalPages === Math.ceil(meta.total / meta.limit)`
  - Same filtered results as before, just paginated.

## File summary

- **Add**: `[server/src/students/dto/students-query.dto.ts](server/src/students/dto/students-query.dto.ts)`
- **Edit**: `[server/src/students/students.controller.ts](server/src/students/students.controller.ts)`
- **Edit**: `[server/src/students/students.service.ts](server/src/students/students.service.ts)`

