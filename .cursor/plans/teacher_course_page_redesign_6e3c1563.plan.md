---
name: Teacher Course Page Redesign
overview: The teacher course detail page at `client/src/app/(dashboard)/teacher/courses/[courseId]/page.tsx` already implements most of the requested Google Classroom-style layout. This plan documents the current state and outlines minor refinements to fully align with the spec.
todos: []
isProject: false
---

# Teacher Course Page Redesign Plan

## Current State

The page at `[client/src/app/(dashboard)/teacher/courses/[courseId]/page.tsx](client/src/app/(dashboard)`/teacher/courses/[courseId]/page.tsx) **already implements** the requested layout:


| Requirement                                           | Status  | Implementation                                               |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Hero Header (h-48, rounded-2xl, p-6, overflow-hidden) | Done    | Lines 136–155                                                |
| Course Name (large, bold, white)                      | Done    | `text-3xl font-bold text-primary-foreground`                 |
| Class/Section                                         | Partial | Shows `subject.name` (Subject) — schema has no Class/Section |
| Teacher name                                          | Done    | `course.teacher.profile.firstName/lastName`                  |
| Tabbed Navigation (Stream, Classwork, People, Grades) | Done    | Lines 157–323                                                |
| Default "Classwork"                                   | Done    | `defaultValue="classwork"`                                   |
| Stream placeholder + fake input                       | Done    | Lines 177–189                                                |


---

## Refinements to Apply

### 1. Hero Header — Class/Section Label

The Prisma `Course` model has `subject` and `academicYear` but no `class` or `section` field. Options:

- **Option A (recommended):** Keep showing Subject and add a clear label: `Subject: {subject.name}` or `Class: {subject.name}` so it reads as "Class/Section" context.
- **Option B:** Extend the API to include `academicYear` in the course response and display `{subject.name} • {academicYear.name}` for richer context.

### 2. Hero Header — Muted Primary Background

The theme uses `--color-primary: hsl(0 0% 9%)` (near-black). For a "muted primary" in a pure white/black theme:

- Use a softer gray, e.g. `bg-[hsl(0,0%,18%)]` or `bg-[hsl(0,0%,22%)]`, instead of `bg-primary`.
- Keep the existing subtle SVG pattern overlay for depth.
- Ensure text remains white (`text-white` or `text-primary-foreground`) for contrast.

### 3. Stream Tab — Feed Post Creator Polish

The placeholder is functional. To better match a feed post creator:

- Wrap in a card with a top section for an avatar placeholder (circle) and the input.
- Use a layout similar to: `[Avatar] [Input area with placeholder "Announce something to your class..."]`.
- Add a subtle bottom bar (e.g. "Post" button disabled/gray) to complete the feed-post look.

---

## Implementation Summary

**Files to modify:** `[client/src/app/(dashboard)/teacher/courses/[courseId]/page.tsx](client/src/app/(dashboard)`/teacher/courses/[courseId]/page.tsx)

**Changes:**

1. **Hero:** Replace `bg-primary` with `bg-[hsl(0,0%,18%)]` (or similar muted gray). Add "Subject:" or "Class:" label before `course.subject?.name` if desired.
2. **Stream tab:** Restructure the placeholder into an avatar + input layout and add a disabled "Post" button for a feed-post feel.
3. **Optional:** If `academicYear` is needed in the hero, update `findOneCourse` in `[server/src/lms/lms.service.ts](server/src/lms/lms.service.ts)` to include `academicYear: true` in the `include` and extend the `Course` interface on the client.

---

## Data Model Note

The `Course` model in `[server/prisma/schema.prisma](server/prisma/schema.prisma)` (lines 694–715) has:

- `subject` (Subject)
- `teacher` (User)
- `academicYear` (AcademicYear, optional)

There is no `class` or `section` relation. Using Subject (and optionally Academic Year) is the closest available representation for "Class/Section" until schema changes.