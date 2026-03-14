---
name: Classwork Tab UI Redesign
overview: Redesign the Classwork tab in the teacher course detail page with a prominent Create dropdown, a vertical module list layout, and material items with type-specific icons and action menus.
todos: []
isProject: false
---

# Classwork Tab UI Redesign

## Target File

[client/src/app/(dashboard)/teacher/courses/[courseId]/page.tsx](client/src/app/(dashboard)/teacher/courses/[courseId]/page.tsx)

## Current State

- Classwork tab uses an Accordion for modules
- "Add Module" button on the right; "Add Lesson" / "Add Assignment" per module
- Lessons and assignments shown in separate lists per module

## Changes

### 1. Create Action (Top Left)

Replace the existing "Add Module" button with a **+ Create** dropdown:

- **Button**: `Button` component, `size="lg"`, `className="rounded-full"` (pill shape)
- **DropdownMenu**: Wrap the button in `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`
- **Menu items** (in order):
  - Assignment (Clipboard icon)
  - Material (BookOpen icon)
  - Link (Link icon)
  - File (Paperclip icon)
  - `DropdownMenuSeparator`
  - Module / Topic (Folder icon)

Wire each item to existing dialogs where applicable:
- Assignment → `setAssignmentDialogOpen(true)` (requires selecting a module; can default to first or show module picker)
- Module / Topic → `setModuleDialogOpen(true)`
- Material, Link, File → placeholder handlers for now (no dialogs exist yet)

**Imports to add**: `Clipboard`, `Link`, `Paperclip`, `Folder`, `MoreVertical` from `lucide-react`; `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu`

### 2. Module Layout

Replace the Accordion with a **vertical list**:

- Each module: `<div>` with header
- **Header styling**: `font-bold text-xl border-b-2 border-foreground pb-2 mb-4`
- Example title format: `Week N: {module.title}` or use `mod.title` as-is (e.g. "Week 1: Introduction to Algebra")

### 3. Material Items

Under each module header, render a flat list of items combining lessons and assignments:

- **Item row**: `flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors`
- **Left**: Circular icon container (e.g. `h-10 w-10 rounded-full flex items-center justify-center`):
  - **File/Material**: Blue (`bg-blue-500/20` or `bg-blue-100`), `FileText` icon
  - **Video**: Red (`bg-red-500/20`), `Play` icon (for lessons with `videoUrl` if present)
  - **Assignment**: Green (`bg-green-500/20`), `Clipboard` icon
- **Center**: Item title + muted timestamp (e.g. `format(lesson.updatedAt, "MMM d")` or a placeholder like "Added 2 days ago" if no date)
- **Right**: `DropdownMenu` with `MoreVertical` trigger; items: Edit, Delete (handlers can be no-op for now)

**Data mapping**:
- Lessons → type "material" or "file" (use "material" for text, "file" if `videoUrl` exists)
- Assignments → type "assignment"

Sort combined items by `orderIndex` (lessons) and append assignments, or interleave by a common order field if available.

### 4. Empty State

When no modules exist, keep the empty state but align the Create button with the new dropdown (top left).

## File Edits Summary

| Section | Action |
|--------|--------|
| Imports | Add DropdownMenu components, Clipboard, Link, Paperclip, Folder, MoreVertical, Play |
| Classwork TabsContent | Replace "Add Module" + Accordion with Create dropdown + vertical module list |
| Module block | Use `border-b-2 border-foreground pb-2 mb-4` for headers |
| Material list | Build `MaterialItem` rows with icon, title, timestamp, MoreVertical menu |
| Create handlers | Assignment → open assignment dialog (with `activeModuleId`); Module → open module dialog; others → `console.log` or toast for now |

## Visual Structure

```
[+ Create ▼]   (top left, pill button)

Week 1: Introduction to Algebra
─────────────────────────────────
  [🔵]  Lesson: Variables and Expressions    2 days ago    [⋮]
  [🟢]  Assignment: Problem Set 1            Due Dec 15    [⋮]
  [🔴]  Video: Intro to Algebra              Added today   [⋮]

Week 2: Linear Equations
─────────────────────────────────
  ...
```
