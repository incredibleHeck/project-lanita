---
name: Platform Hardening V2.4
overview: Implement enterprise-grade platform features including multi-tenancy for serving multiple schools, attribute-based access control, comprehensive audit logging, test suite, and CI/CD pipeline with GitHub Actions.
todos:
  - id: school-model
    content: Add School model and schoolId to all relevant tables in Prisma schema
    status: completed
  - id: tenant-middleware
    content: Create tenant middleware to extract and validate schoolId from requests
    status: completed
  - id: prisma-extension
    content: Create Prisma extension for automatic tenant filtering on all queries
    status: completed
  - id: abac-guard
    content: Implement ABAC guard with rules for OWN_STUDENTS, OWN_SECTIONS, OWN_CHILDREN
    status: completed
  - id: abac-decorator
    content: Create @ABAC() decorator and apply to controllers needing fine-grained access
    status: completed
  - id: audit-schema
    content: Add AuditLog model to schema with before/after JSON fields
    status: completed
  - id: audit-interceptor
    content: Create audit interceptor to capture mutations with old/new values
    status: completed
  - id: unit-tests
    content: Write unit tests for critical services (auth, billing, attendance)
    status: completed
  - id: integration-tests
    content: Write integration tests for controllers with test database
    status: completed
  - id: e2e-tests
    content: Write E2E tests for critical flows (enrollment, attendance, grading)
    status: completed
  - id: github-actions
    content: Create CI/CD workflow with lint, test, build, and deploy jobs
    status: completed
  - id: migration-script
    content: Create migration script to add schoolId to existing tables with backfill
    status: completed
isProject: false
---

# V2.4: Platform Hardening

## Overview

Transform Lanita from a single-school application to an enterprise-grade, multi-tenant platform with fine-grained access control, audit trails, comprehensive testing, and automated deployment.

```mermaid
flowchart TD
    subgraph multi_tenant [Multi-Tenancy]
        Request[Incoming Request] --> TenantMiddleware[Tenant Middleware]
        TenantMiddleware -->|"Extract schoolId"| TenantContext[Tenant Context]
        TenantContext --> PrismaMiddleware[Prisma Middleware]
        PrismaMiddleware -->|"Auto-filter by schoolId"| DB[(Database)]
    end
    
    subgraph abac [Access Control]
        AuthGuard[Auth Guard] --> RolesGuard[Roles Guard]
        RolesGuard --> ABACGuard[ABAC Guard]
        ABACGuard -->|"Check resource ownership"| Controller[Controller]
    end
    
    subgraph audit [Audit Logging]
        Mutation[Data Mutation] --> AuditInterceptor[Audit Interceptor]
        AuditInterceptor --> AuditLog[(Audit Log)]
    end
    
    subgraph cicd [CI/CD]
        Push[Git Push] --> GHA[GitHub Actions]
        GHA --> Lint[Lint]
        Lint --> Test[Test]
        Test --> Build[Build]
        Build --> Deploy[Deploy to VPS]
    end
```

---

## Phase 1: Multi-Tenancy Architecture

### 1.1 Approach: Row-Level Security with schoolId

We'll use the "discriminator column" approach where every table has a `schoolId` field. This is simpler to implement than schema-per-tenant and scales well.

### 1.2 Schema Updates

**File:** `server/prisma/schema.prisma`

Add `School` model and `schoolId` to all relevant tables:

```prisma
model School {
  id          String   @id @default(uuid()) @db.Uuid
  name        String
  code        String   @unique  // e.g., "PRESEC", "ACHIMOTA"
  address     Json?
  contactEmail String?
  contactPhone String?
  logoUrl     String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users         User[]
  academicYears AcademicYear[]
  classes       Class[]
  subjects      Subject[]
  feeStructures FeeStructure[]
}

// Update User model
model User {
  id        String  @id @default(uuid()) @db.Uuid
  schoolId  String  @db.Uuid
  school    School  @relation(fields: [schoolId], references: [id])
  // ... existing fields ...
  
  @@index([schoolId])
}

// Update Class model
model Class {
  id        String  @id @default(uuid()) @db.Uuid
  schoolId  String  @db.Uuid
  school    School  @relation(fields: [schoolId], references: [id])
  // ... existing fields ...
  
  @@index([schoolId])
}

// Similarly update: AcademicYear, Subject, Section, StudentRecord, 
// AttendanceRecord, Exam, Result, FeeStructure, StudentInvoice, Payment,
// Announcement, MessageThread, NotificationLog, TimetableSlot, Room
```

### 1.3 Tenant Context Service

**File:** `server/src/common/tenant/tenant.service.ts`

```typescript
import { Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  constructor(@Inject(REQUEST) private request: Request) {}

  get schoolId(): string {
    return this.request['schoolId'];
  }

  get school(): School {
    return this.request['school'];
  }
}
```

### 1.4 Tenant Middleware

**File:** `server/src/common/tenant/tenant.middleware.ts`

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from subdomain, header, or JWT
    const tenantCode = this.extractTenantCode(req);
    
    if (!tenantCode) {
      throw new UnauthorizedException('Tenant not specified');
    }

    const school = await this.prisma.school.findUnique({
      where: { code: tenantCode },
    });

    if (!school || !school.isActive) {
      throw new UnauthorizedException('Invalid or inactive tenant');
    }

    req['schoolId'] = school.id;
    req['school'] = school;
    next();
  }

  private extractTenantCode(req: Request): string | null {
    // Option 1: Subdomain (presec.lanita.com)
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain.toUpperCase();
    }

    // Option 2: Header (X-Tenant-ID)
    const headerTenant = req.headers['x-tenant-id'];
    if (headerTenant) {
      return String(headerTenant).toUpperCase();
    }

    // Option 3: From JWT (after auth)
    if (req['user']?.schoolId) {
      return req['user'].schoolCode;
    }

    return null;
  }
}
```

### 1.5 Prisma Extension for Auto-Filtering

**File:** `server/src/prisma/prisma.service.ts`

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private tenantService: TenantService) {
    super();
  }

  // Create tenant-scoped client
  get tenantClient() {
    const schoolId = this.tenantService.schoolId;
    
    return this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query }) {
            args.where = { ...args.where, schoolId };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, schoolId };
            return query(args);
          },
          async create({ args, query }) {
            args.data = { ...args.data, schoolId };
            return query(args);
          },
          async update({ args, query }) {
            args.where = { ...args.where, schoolId };
            return query(args);
          },
          async delete({ args, query }) {
            args.where = { ...args.where, schoolId };
            return query(args);
          },
        },
      },
    });
  }
}
```

---

## Phase 2: Attribute-Based Access Control (ABAC)

### 2.1 ABAC Guard

**File:** `server/src/common/guards/abac.guard.ts`

```typescript
@Injectable()
export class ABACGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const abacRules = this.reflector.get<ABACRule[]>('abac', context.getHandler());
    if (!abacRules || abacRules.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    for (const rule of abacRules) {
      const hasAccess = await this.evaluateRule(rule, user, request);
      if (!hasAccess) return false;
    }

    return true;
  }

  private async evaluateRule(
    rule: ABACRule,
    user: JwtPayload,
    request: Request,
  ): Promise<boolean> {
    switch (rule.type) {
      case 'OWN_STUDENTS':
        return this.checkOwnStudents(user, request);
      case 'OWN_SECTIONS':
        return this.checkOwnSections(user, request);
      case 'OWN_CHILDREN':
        return this.checkOwnChildren(user, request);
      default:
        return true;
    }
  }

  private async checkOwnStudents(user: JwtPayload, request: Request): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const studentId = request.params.studentId || request.body.studentId;
    if (!studentId) return true;

    // Get teacher's allocated sections
    const allocations = await this.prisma.subjectAllocation.findMany({
      where: { teacherId: user.sub },
      select: { sectionId: true },
    });
    const sectionIds = allocations.map(a => a.sectionId);

    // Check if student is in teacher's sections
    const student = await this.prisma.studentRecord.findFirst({
      where: {
        id: studentId,
        currentSectionId: { in: sectionIds },
      },
    });

    return !!student;
  }

  private async checkOwnSections(user: JwtPayload, request: Request): Promise<boolean> {
    if (user.role !== 'TEACHER') return true;

    const sectionId = request.params.sectionId || request.body.sectionId;
    if (!sectionId) return true;

    const allocation = await this.prisma.subjectAllocation.findFirst({
      where: { teacherId: user.sub, sectionId },
    });

    return !!allocation;
  }

  private async checkOwnChildren(user: JwtPayload, request: Request): Promise<boolean> {
    if (user.role !== 'PARENT') return true;

    const studentId = request.params.studentId || request.body.studentId;
    if (!studentId) return true;

    const student = await this.prisma.studentRecord.findFirst({
      where: { id: studentId, parentId: user.sub },
    });

    return !!student;
  }
}
```

### 2.2 ABAC Decorator

**File:** `server/src/common/decorators/abac.decorator.ts`

```typescript
export type ABACRuleType = 'OWN_STUDENTS' | 'OWN_SECTIONS' | 'OWN_CHILDREN';

export interface ABACRule {
  type: ABACRuleType;
}

export const ABAC = (...rules: ABACRuleType[]) =>
  SetMetadata('abac', rules.map(type => ({ type })));
```

### 2.3 Usage Example

**File:** `server/src/results/results.controller.ts`

```typescript
@Get('student/:studentId')
@Roles(UserRole.TEACHER, UserRole.PARENT, UserRole.ADMIN)
@ABAC('OWN_STUDENTS', 'OWN_CHILDREN')  // Teachers: own students, Parents: own children
getStudentResults(@Param('studentId') studentId: string) {
  return this.resultsService.getStudentResults(studentId);
}
```

---

## Phase 3: Audit Logging

### 3.1 Audit Log Model

**File:** `server/prisma/schema.prisma`

```prisma
model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  schoolId    String   @db.Uuid
  userId      String   @db.Uuid
  userEmail   String
  action      AuditAction
  entityType  String   // "User", "StudentRecord", "Result", etc.
  entityId    String   @db.Uuid
  oldValues   Json?    // Before state
  newValues   Json?    // After state
  ipAddress   String?
  userAgent   String?
  timestamp   DateTime @default(now())

  @@index([schoolId, timestamp])
  @@index([entityType, entityId])
  @@index([userId])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  EXPORT
}
```

### 3.2 Audit Interceptor

**File:** `server/src/common/interceptors/audit.interceptor.ts`

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const oldValues = request['auditOldValues']; // Set by service before mutation

    return next.handle().pipe(
      tap(async (response) => {
        const auditMetadata = request['auditMetadata'];
        if (!auditMetadata) return;

        await this.prisma.auditLog.create({
          data: {
            schoolId: request['schoolId'],
            userId: user?.sub,
            userEmail: user?.email,
            action: this.mapMethodToAction(method),
            entityType: auditMetadata.entityType,
            entityId: auditMetadata.entityId || response?.id,
            oldValues: oldValues || null,
            newValues: response || null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          },
        });
      }),
    );
  }

  private mapMethodToAction(method: string): AuditAction {
    switch (method) {
      case 'POST': return 'CREATE';
      case 'PUT':
      case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return 'UPDATE';
    }
  }
}
```

### 3.3 Audit Decorator

**File:** `server/src/common/decorators/audit.decorator.ts`

```typescript
export const Audit = (entityType: string) =>
  SetMetadata('audit', { entityType });
```

### 3.4 Audit Service for Old Values

**File:** `server/src/common/audit/audit.service.ts`

```typescript
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async captureOldValues(
    request: Request,
    entityType: string,
    entityId: string,
  ) {
    const modelName = entityType.toLowerCase();
    const oldRecord = await this.prisma[modelName].findUnique({
      where: { id: entityId },
    });

    request['auditOldValues'] = oldRecord;
    request['auditMetadata'] = { entityType, entityId };
  }
}
```

---

## Phase 4: Comprehensive Test Suite

### 4.1 Test Structure

```
server/
├── src/
└── test/
    ├── unit/
    │   ├── auth/
    │   │   └── auth.service.spec.ts
    │   ├── students/
    │   │   └── students.service.spec.ts
    │   └── billing/
    │       └── billing.service.spec.ts
    ├── integration/
    │   ├── auth.controller.spec.ts
    │   ├── students.controller.spec.ts
    │   └── billing.controller.spec.ts
    ├── e2e/
    │   ├── enrollment.e2e-spec.ts
    │   ├── attendance.e2e-spec.ts
    │   └── grading.e2e-spec.ts
    └── fixtures/
        ├── users.fixture.ts
        └── students.fixture.ts
```

### 4.2 Unit Test Example

**File:** `server/test/unit/billing/billing.service.spec.ts`

```typescript
describe('BillingService', () => {
  let service: BillingService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockDeep<PrismaClient>() },
      ],
    }).compile();

    service = module.get(BillingService);
    prisma = module.get(PrismaService);
  });

  describe('recordPayment', () => {
    it('should throw BadRequestException if payment exceeds balance', async () => {
      prisma.studentInvoice.findUnique.mockResolvedValue({
        id: '1',
        totalAmount: new Decimal(1000),
        amountPaid: new Decimal(800),
        status: 'PARTIAL',
      } as any);

      await expect(
        service.recordPayment({
          invoiceId: '1',
          amount: 300, // Exceeds remaining 200
          method: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update status to PAID when fully paid', async () => {
      // ... test implementation
    });
  });
});
```

### 4.3 Integration Test Example

**File:** `server/test/integration/students.controller.spec.ts`

```typescript
describe('StudentsController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get(PrismaService);
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /students', () => {
    it('should create a student with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newstudent@test.com',
          firstName: 'Test',
          lastName: 'Student',
          sectionId: testSectionId,
        })
        .expect(201);

      expect(response.body.email).toBe('newstudent@test.com');
    });
  });
});
```

### 4.4 E2E Test Example

**File:** `server/test/e2e/enrollment.e2e-spec.ts`

```typescript
describe('Student Enrollment Flow (E2E)', () => {
  it('should complete full enrollment process', async () => {
    // 1. Admin creates student
    const student = await createStudent(adminToken, studentData);
    
    // 2. Admin assigns to section
    await assignToSection(adminToken, student.id, sectionId);
    
    // 3. Generate invoice
    await generateInvoice(adminToken, termId, classId);
    
    // 4. Student can login
    const studentToken = await login(student.email, 'Student@123');
    
    // 5. Student can view dashboard
    const dashboard = await getStudentDashboard(studentToken);
    expect(dashboard.student.id).toBe(student.id);
    
    // 6. Parent linked and can view child
    const parentToken = await login('parent@test.com', 'Parent@123');
    const children = await getParentChildren(parentToken);
    expect(children).toContainEqual(expect.objectContaining({ id: student.id }));
  });
});
```

---

## Phase 5: CI/CD Pipeline

### 5.1 GitHub Actions Workflow

**File:** `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: |
            server/package-lock.json
            client/package-lock.json

      - name: Install dependencies (server)
        run: npm ci
        working-directory: server

      - name: Install dependencies (client)
        run: npm ci
        working-directory: client

      - name: Lint server
        run: npm run lint
        working-directory: server

      - name: Lint client
        run: npm run lint
        working-directory: client

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: lanita_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: server

      - name: Generate Prisma Client
        run: npx prisma generate
        working-directory: server

      - name: Run migrations
        run: npx prisma migrate deploy
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lanita_test

      - name: Run unit tests
        run: npm run test
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lanita_test

      - name: Run integration tests
        run: npm run test:integration
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lanita_test

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/lanita_test

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push server image
        uses: docker/build-push-action@v5
        with:
          context: ./server
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push client image
        uses: docker/build-push-action@v5
        with:
          context: ./client
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/lanita
            
            # Pull latest images
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }}
            docker pull ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }}
            
            # Update docker-compose with new image tags
            export SERVER_IMAGE=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/server:${{ github.sha }}
            export CLIENT_IMAGE=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/client:${{ github.sha }}
            
            # Deploy with zero-downtime
            docker-compose up -d --no-deps server client
            
            # Run migrations
            docker-compose exec -T server npx prisma migrate deploy
            
            # Health check
            sleep 10
            curl -f http://localhost:3001/health || exit 1
            
            # Cleanup old images
            docker image prune -f

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 5.2 Package.json Test Scripts

**File:** `server/package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:unit": "jest --testPathPattern=test/unit",
    "test:integration": "jest --testPathPattern=test/integration --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand"
  }
}
```

---

## File Structure Summary

```
server/
├── src/
│   └── common/
│       ├── tenant/
│       │   ├── tenant.module.ts
│       │   ├── tenant.service.ts
│       │   └── tenant.middleware.ts
│       ├── guards/
│       │   └── abac.guard.ts
│       ├── decorators/
│       │   ├── abac.decorator.ts
│       │   └── audit.decorator.ts
│       ├── interceptors/
│       │   └── audit.interceptor.ts
│       └── audit/
│           └── audit.service.ts
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
└── prisma/
    └── schema.prisma (updates)

.github/
└── workflows/
    └── ci-cd.yml
```

---

## Migration Strategy

### Database Migration for Multi-Tenancy

1. Create School table and seed default school
2. Add schoolId column to all tables (nullable initially)
3. Backfill schoolId with default school ID
4. Make schoolId NOT NULL
5. Add indexes and foreign keys

```sql
-- Step 1: Create School
INSERT INTO "School" (id, name, code) 
VALUES ('default-school-uuid', 'Default School', 'DEFAULT');

-- Step 2-4: For each table
ALTER TABLE "User" ADD COLUMN "schoolId" UUID;
UPDATE "User" SET "schoolId" = 'default-school-uuid';
ALTER TABLE "User" ALTER COLUMN "schoolId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" 
  FOREIGN KEY ("schoolId") REFERENCES "School"("id");
CREATE INDEX "User_schoolId_idx" ON "User"("schoolId");
```

---

## Environment Variables

```env
# Multi-tenancy
DEFAULT_SCHOOL_ID=xxx
TENANT_HEADER=X-Tenant-ID

# CI/CD
VPS_HOST=your-vps-ip
VPS_USER=deploy
SLACK_WEBHOOK=https://hooks.slack.com/...
```

