/**
 * Migration script: Backfill schoolId for existing rows with NULL schoolId.
 *
 * Run with: npx ts-node prisma/scripts/backfill-school-id.ts
 * Or: npm run db:backfill-school (add script to package.json)
 *
 * Prerequisites:
 * - DATABASE_URL must be set
 * - School table and schoolId columns must exist (run prisma db push or migrate first)
 *
 * Strategy:
 * 1. Create default School if not exists
 * 2. Backfill schoolId with default school ID for rows where schoolId IS NULL
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_SCHOOL_CODE = 'DEFAULT';
const DEFAULT_SCHOOL_NAME = 'Default School';

async function main() {
  console.log('Starting schoolId backfill migration...');

  // 1. Ensure default school exists
  let defaultSchool = await prisma.school.findFirst({
    where: { code: DEFAULT_SCHOOL_CODE },
  });

  if (!defaultSchool) {
    defaultSchool = await prisma.school.create({
      data: {
        name: DEFAULT_SCHOOL_NAME,
        code: DEFAULT_SCHOOL_CODE,
        isActive: true,
      },
    });
    console.log(`Created default school: ${defaultSchool.id}`);
  } else {
    console.log(`Default school exists: ${defaultSchool.id}`);
  }

  const schoolId = defaultSchool.id;

  // 2. Backfill each model using Prisma updateMany
  const updates: Array<{ model: string; result: { count: number } }> = [];

  const userResult = await prisma.user.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'User', result: userResult });

  const academicYearResult = await prisma.academicYear.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'AcademicYear', result: academicYearResult });

  const classResult = await prisma.class.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Class', result: classResult });

  const subjectResult = await prisma.subject.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Subject', result: subjectResult });

  const sectionResult = await prisma.section.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Section', result: sectionResult });

  const studentRecordResult = await prisma.studentRecord.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'StudentRecord', result: studentRecordResult });

  const attendanceRecordResult = await prisma.attendanceRecord.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'AttendanceRecord', result: attendanceRecordResult });

  const examResult = await prisma.exam.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Exam', result: examResult });

  const resultResult = await prisma.result.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Result', result: resultResult });

  const feeStructureResult = await prisma.feeStructure.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'FeeStructure', result: feeStructureResult });

  const studentInvoiceResult = await prisma.studentInvoice.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'StudentInvoice', result: studentInvoiceResult });

  const paymentResult = await prisma.payment.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Payment', result: paymentResult });

  const roomResult = await prisma.room.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Room', result: roomResult });

  const timetableSlotResult = await prisma.timetableSlot.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'TimetableSlot', result: timetableSlotResult });

  const notificationLogResult = await prisma.notificationLog.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'NotificationLog', result: notificationLogResult });

  const messageThreadResult = await prisma.messageThread.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'MessageThread', result: messageThreadResult });

  const announcementResult = await prisma.announcement.updateMany({
    where: { schoolId: null },
    data: { schoolId },
  });
  updates.push({ model: 'Announcement', result: announcementResult });

  for (const { model, result } of updates) {
    if (result.count > 0) {
      console.log(`Backfilled ${model}: ${result.count} rows`);
    }
  }

  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
