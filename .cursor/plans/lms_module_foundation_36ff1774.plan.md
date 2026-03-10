---
name: LMS Module Foundation
overview: Add a new NestJS `LmsModule` under `server/src/lms` with module, controller, and service boilerplate that imports PrismaModule and TenantModule and injects PrismaService and TenantService into the service.
todos: []
isProject: false
---

# LMS Module Foundation Plan

## 1. Shell commands to generate boilerplate

Run from the **server** directory (`c:\Users\me\project-lanita\server`):

```bash
nest g module lms --no-spec
nest g controller lms --no-spec
nest g service lms --no-spec
```

- This creates `server/src/lms/lms.module.ts`, `lms.controller.ts`, and `lms.service.ts`. The CLI will automatically register the controller and service in the new module.
- **Note:** If `nest generate` adds `LmsModule` to `app.module.ts` automatically, you will still need to add the **imports** (PrismaModule, TenantModule) inside `LmsModule` and wire the service constructor as below. If it does not add `LmsModule` to `AppModule`, add it manually.

After generation, **register the LMS module in the app**: in [server/src/app.module.ts](server/src/app.module.ts), add `LmsModule` to the `imports` array (e.g. after `AnnouncementsModule`).

---

## 2. `server/src/lms/lms.module.ts`

- **Imports:** `PrismaModule` and `TenantModule` (same pattern as [server/src/common/tenant/tenant.module.ts](server/src/common/tenant/tenant.module.ts) and [server/src/announcements/announcements.module.ts](server/src/announcements/announcements.module.ts)).
- **Controllers:** `LmsController`.
- **Providers:** `LmsService`.
- **Exports:** optional `LmsService` if other modules will use it.

Example structure:

```ts
import { Module } from '@nestjs/common';
import { LmsController } from './lms.controller';
import { LmsService } from './lms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantModule } from '../common/tenant/tenant.module';

@Module({
  imports: [PrismaModule, TenantModule],
  controllers: [LmsController],
  providers: [LmsService],
  exports: [LmsService],
})
export class LmsModule {}
```

---

## 3. `server/src/lms/lms.service.ts`

- **Inject** `PrismaService` and `TenantService` in the constructor.
- **Tenant context:** This codebase uses `TenantService` (request-scoped), which exposes `schoolId` (and `school`) from the current request ([server/src/common/tenant/tenant.service.ts](server/src/common/tenant/tenant.service.ts)). There is no `tenantId`; use `tenantService.schoolId` for tenant scoping when you implement CRUD.
- **Scope:** Because `TenantService` is `Scope.REQUEST`, any service that injects it becomes request-scoped. Mark `LmsService` as request-scoped so DI is consistent:
  `@Injectable({ scope: Scope.REQUEST })`
- No CRUD methods yet; leave the class body minimal (e.g. a single placeholder method or empty).

Example:

```ts
import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/tenant/tenant.service';

@Injectable({ scope: Scope.REQUEST })
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}
}
```

**Alternative:** If you prefer to keep `LmsService` singleton (like [server/src/teachers/teachers.service.ts](server/src/teachers/teachers.service.ts)), you can avoid injecting `TenantService` and use `getTenantSchoolId()` from `../common/tenant/tenant.context` inside each method. The plan above follows your requirement to inject `TenantService`.

---

## 4. `server/src/lms/lms.controller.ts`

- **Path:** `@Controller('lms')` so routes are under `/lms`.
- **Inject** `LmsService` in the constructor.
- **Guards:** Follow existing patterns (e.g. [server/src/academic-year/academic-year.controller.ts](server/src/academic-year/academic-year.controller.ts)): `@UseGuards(AuthGuard('jwt'), RolesGuard)` and `@ApiTags('LMS')`, `@ApiBearerAuth()` if Swagger is used.
- **No CRUD endpoints yet**; only the controller shell.

Example:

```ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LmsService } from './lms.service';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('LMS')
@ApiBearerAuth()
@Controller('lms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}
}
```

---

## 5. Summary and file checklist


| Step | Action                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------- |
| 1    | Run the three `nest g` commands in `server`.                                                      |
| 2    | Edit `lms.module.ts`: add `PrismaModule` and `TenantModule` to `imports`.                         |
| 3    | Edit `lms.service.ts`: inject `PrismaService` and `TenantService`, set `Scope.REQUEST`.           |
| 4    | Edit `lms.controller.ts`: set `@Controller('lms')`, add guards and Swagger decorators if desired. |
| 5    | Add `LmsModule` to `app.module.ts` `imports` if not added by the CLI.                             |


No DTOs or CRUD implementation in this phase; the LMS Prisma models (Course, CourseModule, Lesson, Assignment, Submission) can be used in the service once you add endpoints.