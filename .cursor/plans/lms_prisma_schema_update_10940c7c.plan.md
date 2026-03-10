---
name: LMS Prisma schema update
overview: Add five LMS models (Course, CourseModule, Lesson, Assignment, Submission) to the Prisma schema with tenantId (linked to School), correct relations to existing Teacher/User, Subject, and StudentRecord, and Cascade deletes where appropriate. Existing models must be updated with inverse relations.
todos: []
isProject: false
---

# LMS Prisma Schema Update

## Current schema conventions (from [server/prisma/schema.prisma](server/prisma/schema.prisma))

- **Tenant**: The app uses **School** as tenant; there is no `Tenant` model. All tenant-scoped models use `schoolId` and `school` relation. Per your requirement we will use the field name `**tenantId`** and relate it to **School** (`tenant School @relation(...)`).
- **IDs**: `@id @default(uuid()) @db.Uuid` on all models.
- **Timestamps**: `createdAt` and `updatedAt` on most models; we will add them to all new LMS models.
- **Teacher**: No separate `Teacher` model; teachers are **User** with role `TEACHER`. So `Course.teacherId` will reference **User**.
- **Student**: Students are represented by **StudentRecord** (enrollment record with `userId`). So `Submission.studentId` will reference **StudentRecord**.

## Changes required

### 1. Add inverse relations on existing models

These edits are required so Prisma can resolve the new relations. Add the following to the **School** model (after `auditLogs`):

```prisma
  courses         Course[]
  courseModules   CourseModule[]
  lessons        Lesson[]
  assignments    Assignment[]
  submissions    Submission[]
```

Add to the **User** model (e.g. after `announcements`):

```prisma
  coursesTaught  Course[]
```

Add to the **Subject** model (e.g. after `timetableSlots`):

```prisma
  courses        Course[]
```

Add to the **StudentRecord** model (e.g. after `messageThreads`):

```prisma
  submissions    Submission[]
```

### 2. Block to append at the end of the file

Append the following after the last model (`Announcement`) in [server/prisma/schema.prisma](server/prisma/schema.prisma):

```prisma
// --- LMS ---

model Course {
  id          String   @id @default(uuid()) @db.Uuid
  title       String
  description String?
  tenantId    String   @db.Uuid
  tenant      School   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  teacherId   String   @db.Uuid
  teacher     User     @relation(fields: [teacherId], references: [id])
  subjectId   String   @db.Uuid
  subject     Subject  @relation(fields: [subjectId], references: [id])
  modules     CourseModule[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@index([teacherId])
  @@index([subjectId])
}

model CourseModule {
  id         String   @id @default(uuid()) @db.Uuid
  title      String
  orderIndex Int      @default(0)
  courseId   String   @db.Uuid
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  tenantId   String   @db.Uuid
  tenant     School   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  lessons    Lesson[]
  assignments Assignment[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([courseId])
  @@index([tenantId])
}

model Lesson {
  id         String       @id @default(uuid()) @db.Uuid
  title      String
  content    String       @db.Text
  videoUrl   String?
  orderIndex Int          @default(0)
  moduleId   String       @db.Uuid
  module     CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  tenantId   String       @db.Uuid
  tenant     School       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([moduleId])
  @@index([tenantId])
}

model Assignment {
  id          String       @id @default(uuid()) @db.Uuid
  title       String
  description String       @db.Text
  dueDate     DateTime
  maxScore    Float
  moduleId    String       @db.Uuid
  module      CourseModule @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  tenantId    String       @db.Uuid
  tenant      School       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  submissions Submission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([moduleId])
  @@index([tenantId])
}

model Submission {
  id           String        @id @default(uuid()) @db.Uuid
  content      String?       @db.Text
  fileUrl      String?
  score        Float?
  gradedAt     DateTime?
  assignmentId String        @db.Uuid
  assignment   Assignment    @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId    String        @db.Uuid
  student      StudentRecord @relation(fields: [studentId], references: [id], onDelete: Cascade)
  tenantId     String        @db.Uuid
  tenant       School        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([assignmentId])
  @@index([studentId])
  @@index([tenantId])
}
```

## Relation and cascade summary


| Parent        | Child                                                | onDelete           |
| ------------- | ---------------------------------------------------- | ------------------ |
| School        | Course, CourseModule, Lesson, Assignment, Submission | Cascade            |
| Course        | CourseModule                                         | Cascade            |
| CourseModule  | Lesson, Assignment                                   | Cascade            |
| Assignment    | Submission                                           | Cascade            |
| StudentRecord | Submission                                           | Cascade            |
| User          | Course (teacher)                                     | (default Restrict) |
| Subject       | Course                                               | (default Restrict) |


`User` and `Subject` are left with default (Restrict) so deleting a teacher or subject does not delete courses; you can switch to `onDelete: SetNull` and make `Course.teacherId`/`Course.subjectId` optional if you prefer soft removal.

## After applying

- Run `npx prisma validate` (from `server/`) to confirm the schema.
- When ready, run `npx prisma migrate dev --name add_lms_models` to generate and apply the migration (you said not to generate the migration yet; this is for later).

