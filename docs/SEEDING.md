# Database Seeding

The seed script creates demo data: default school, admin user, academic year, classes, teachers, students, and sample records. It is **destructive**—it deletes all existing data before inserting.

## When to Run Seed

### Dev / Demo

Run seed manually when you need fresh demo data:

```bash
# With Docker
docker exec -it lanita-server npx prisma db seed

# Locally (with database running)
cd server && npx prisma db seed
```

### Production

**Do not run seed in production** with existing data. The seed wipes all tables and replaces them with demo content.

### First-Time Setup (Empty Database)

If you have a brand-new empty database and need the default school and admin (admin@heckteck.com / Admin@123), run seed **once** before going live:

```bash
docker exec -it lanita-server npx prisma db seed
```

After that, never run it again. Create additional schools and users via the application.

## What the Seed Creates

- Default School (code: DEFAULT)
- Super Admin: admin@heckteck.com
- Academic year, classes, sections, subjects
- Sample teachers, students, parents (with faker data)
- Sample attendance, results, invoices

## Automatic Seeding (Removed)

The server container no longer runs seed on startup. This was removed to prevent data loss on every deploy. See [MEDIUM-3](.cursor/plans/medium-3_seed_on_every_start_f932f1db.plan.md) for details.
