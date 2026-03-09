import { PrismaClient, UserRole, AttendanceStatus, Subject, User, StudentRecord, InvoiceStatus, PaymentMethod, Class, RoomType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding started...');

  // Step 1: Cleanup
  console.log('Cleaning up existing data...');
  await prisma.payment.deleteMany();
  await prisma.studentInvoice.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.result.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.subjectAllocation.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.term.deleteMany();
  await prisma.studentRecord.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.section.deleteMany();
  await prisma.room.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // Step 2: Create Default School
  const defaultSchool = await prisma.school.create({
    data: {
      name: 'Default School',
      code: 'DEFAULT',
      contactEmail: 'admin@school.com',
      isActive: true,
    },
  });
  console.log('Default School created: DEFAULT');

  // Step 3: Create Super Admin
  const adminPassword = await argon2.hash('Admin@123');
  const superAdmin = await prisma.user.create({
    data: {
      schoolId: defaultSchool.id,
      email: 'admin@heckteck.com',
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      profile: {
        create: {
          firstName: 'System',
          lastName: 'Administrator',
          gender: 'OTHER',
          dob: new Date('1990-01-01'),
          contactNumber: '0000000000',
          address: { city: 'Accra', country: 'Ghana' },
        },
      },
    },
  });
  console.log('Super Admin created: admin@heckteck.com');

  // Step 4: Create Academic Year
  const currentYear = await prisma.academicYear.create({
    data: {
      schoolId: defaultSchool.id,
      name: '2025/2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-31'),
      isCurrent: true,
    },
  });
  console.log('Current Academic Year created: 2025/2026');

  // Step 4b: Create Terms
  const term1 = await prisma.term.create({
    data: {
      name: 'Term 1',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-20'),
      isCurrent: false,
      academicYearId: currentYear.id,
    },
  });
  const term2 = await prisma.term.create({
    data: {
      name: 'Term 2',
      startDate: new Date('2026-01-06'),
      endDate: new Date('2026-03-28'),
      isCurrent: true,
      academicYearId: currentYear.id,
    },
  });
  await prisma.term.create({
    data: {
      name: 'Term 3',
      startDate: new Date('2026-04-13'),
      endDate: new Date('2026-07-31'),
      isCurrent: false,
      academicYearId: currentYear.id,
    },
  });
  console.log('3 Terms created for 2025/2026');

  // Step 5: Create Subjects
  const subjectColors = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#06b6d4'];
  const subjectsData = ['Mathematics', 'English', 'Science', 'History', 'Computing'];
  const createdSubjects: Subject[] = [];
  for (let i = 0; i < subjectsData.length; i++) {
    const name = subjectsData[i];
    const subject = await prisma.subject.create({
      data: {
        schoolId: defaultSchool.id,
        name,
        code: name.toUpperCase().substring(0, 4) + '101',
        isElective: false,
        color: subjectColors[i % subjectColors.length],
        isExaminable: true,
      },
    });
    createdSubjects.push(subject);
    console.log(`Subject created: ${name}`);
  }

  // Step 6: Create Classes & Sections
  const classesData = ['Grade 10', 'Grade 11'];
  const sectionsData = ['A', 'B'];
  const sectionIds: Record<string, Record<string, string>> = {};
  const createdClasses: Class[] = [];

  for (const className of classesData) {
    const cls = await prisma.class.create({
      data: {
        schoolId: defaultSchool.id,
        name: className,
        code: className.replace(' ', ''),
      },
    });
    createdClasses.push(cls);
    console.log(`Class created: ${className}`);

    sectionIds[className] = {};
    for (const sectionName of sectionsData) {
      const section = await prisma.section.create({
        data: {
          schoolId: defaultSchool.id,
          name: sectionName,
          capacity: 30,
          classId: cls.id,
        },
      });
      sectionIds[className][sectionName] = section.id;
      console.log(`Section created: ${className} - ${sectionName}`);
    }
  }

  // Step 6b: Create Rooms (for timetable generation)
  const roomNames = [
    { name: 'Room 101', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Room 102', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Room 103', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Room 104', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Room 105', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Room 106', capacity: 35, type: RoomType.CLASSROOM },
    { name: 'Lab 1', capacity: 25, type: RoomType.LAB },
    { name: 'Hall A', capacity: 100, type: RoomType.HALL },
  ];
  for (const r of roomNames) {
    await prisma.room.create({
      data: {
        schoolId: defaultSchool.id,
        name: r.name,
        capacity: r.capacity,
        type: r.type,
      },
    });
    console.log(`Room created: ${r.name}`);
  }

  // Step 7: Create Teachers
  const teacherPassword = await argon2.hash('Teacher@123');
  const teachers: User[] = [];
  for (let i = 1; i <= 5; i++) {
    const teacher = await prisma.user.create({
      data: {
        schoolId: defaultSchool.id,
        email: `teacher${i}@heckteck.com`,
        passwordHash: teacherPassword,
        role: UserRole.TEACHER,
        isActive: true,
        profile: {
          create: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            gender: 'MALE',
            dob: faker.date.birthdate(),
            contactNumber: faker.phone.number(),
            address: { city: faker.location.city() },
          },
        },
      },
    });
    teachers.push(teacher);
    console.log(`Teacher created: teacher${i}@heckteck.com`);
  }

  // Step 8: Create Allocations (for timetable generation - each section gets all 5 subjects)
  // Teacher rotation: T1,T2,T3,T4,T5 for Grade 10-A; T2,T3,T4,T5,T1 for 10-B; etc.
  const allocationData: Array<{ section: string; subjectIdx: number; teacherIdx: number }> = [];
  const sectionOrder = [
    ['Grade 10', 'A'], ['Grade 10', 'B'], ['Grade 11', 'A'], ['Grade 11', 'B'],
  ];
  for (let s = 0; s < sectionOrder.length; s++) {
    const [className, sectionName] = sectionOrder[s];
    const offset = s; // Rotate teachers per section
    for (let subj = 0; subj < 5; subj++) {
      allocationData.push({
        section: sectionIds[className][sectionName],
        subjectIdx: subj,
        teacherIdx: (offset + subj) % 5,
      });
    }
  }

  let allocationMath10A;
  for (const a of allocationData) {
    const alloc = await prisma.subjectAllocation.create({
      data: {
        sectionId: a.section,
        subjectId: createdSubjects[a.subjectIdx].id,
        teacherId: teachers[a.teacherIdx].id,
        academicYearId: currentYear.id,
      },
    });
    if (a.section === sectionIds['Grade 10']['A'] && a.subjectIdx === 0) {
      allocationMath10A = alloc;
    }
  }
  console.log(`Allocations created: ${allocationData.length} (all sections × 5 subjects)`);

  // Step 9: Create Parents
  const parentPassword = await argon2.hash('Parent@123');
  const parent1 = await prisma.user.create({
    data: {
      schoolId: defaultSchool.id,
      email: 'parent1@heckteck.com',
      passwordHash: parentPassword,
      role: UserRole.PARENT,
      isActive: true,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Smith',
          gender: 'MALE',
          dob: new Date('1980-05-15'),
          contactNumber: '+233244123456',
          address: { city: 'Accra', country: 'Ghana' },
        },
      },
    },
  });
  console.log('Parent created: parent1@heckteck.com');

  // Step 10: Create Students
  const studentPassword = await argon2.hash('Student@123');
  const studentRecords: StudentRecord[] = [];

  for (let i = 1; i <= 50; i++) {
    const sectionId = i <= 25 ? sectionIds['Grade 10']['A'] : sectionIds['Grade 11']['B'];
    const admissionNumber = `STU-2025-${i.toString().padStart(3, '0')}`;

    const studentUser = await prisma.user.create({
      data: {
        schoolId: defaultSchool.id,
        email: `student${i}@heckteck.com`,
        passwordHash: studentPassword,
        role: UserRole.STUDENT,
        isActive: true,
        profile: {
          create: {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            gender: faker.helpers.arrayElement(['MALE', 'FEMALE']),
            dob: faker.date.birthdate({ min: 14, max: 18, mode: 'age' }),
            contactNumber: faker.phone.number(),
            address: { city: faker.location.city() },
          },
        },
      },
    });

    const studentRecord = await prisma.studentRecord.create({
      data: {
        schoolId: defaultSchool.id,
        userId: studentUser.id,
        admissionNumber,
        enrollmentDate: new Date(),
        currentSectionId: sectionId,
        // Link first 3 students to parent1
        parentId: i <= 3 ? parent1.id : undefined,
      },
    });
    studentRecords.push(studentRecord);
  }
  console.log('50 Students created and assigned to sections.');
  console.log('First 3 students linked to parent1@heckteck.com');

  // Step 11: Attendance (First 5 students, Today, Math 10-A)
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    await prisma.attendanceRecord.create({
      data: {
        schoolId: defaultSchool.id,
        studentId: studentRecords[i].id,
        allocationId: allocationMath10A.id,
        date: today,
        status: AttendanceStatus.PRESENT,
        remarks: 'Seeded attendance',
      },
    });
  }
  console.log('Attendance marked for 5 students.');

  // Step 12: Results (Exam Mid-Term 1)
  const exam = await prisma.exam.create({
    data: {
      schoolId: defaultSchool.id,
      name: 'Mid-Term 1',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      academicYearId: currentYear.id,
      termId: term1.id,
      maxScore: 100,
    },
  });

  // Assign scores for first 10 students in Math
  for (let i = 0; i < 10; i++) {
    const score = faker.number.int({ min: 40, max: 100 });
    let grade = 'F';
    if (score >= 90) grade = 'A*';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';

    await prisma.result.create({
      data: {
        studentId: studentRecords[i].id,
        examId: exam.id,
        subjectId: createdSubjects[0].id, // Mathematics
        score,
        grade,
        remarks: 'Seeded result',
      },
    });
  }
  console.log('Results created for 10 students in Mid-Term 1 (Math).');

  // Step 13: Create Fee Structures
  const tuitionFee = await prisma.feeStructure.create({
    data: {
      schoolId: defaultSchool.id,
      name: 'Tuition Fee',
      amount: 2000.00,
      academicYearId: currentYear.id,
      classId: null, // Applies to all classes
    },
  });
  console.log('Fee Structure created: Tuition Fee (GHS 2,000)');

  const busFee = await prisma.feeStructure.create({
    data: {
      schoolId: defaultSchool.id,
      name: 'Bus Fee',
      amount: 500.00,
      academicYearId: currentYear.id,
      classId: null,
    },
  });
  console.log('Fee Structure created: Bus Fee (GHS 500)');

  const labFee = await prisma.feeStructure.create({
    data: {
      schoolId: defaultSchool.id,
      name: 'Lab Fee',
      amount: 200.00,
      academicYearId: currentYear.id,
      classId: createdClasses[1].id, // Only for Grade 11
    },
  });
  console.log('Fee Structure created: Lab Fee (GHS 200) - Grade 11 only');

  // Step 14: Create Sample Invoices
  const generateInvoiceNumber = (index: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(index).padStart(4, '0')}`;
  };

  const generateReceiptNumber = (index: number) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `RCP-${year}${month}${day}-${String(index).padStart(4, '0')}`;
  };

  const invoicesCreated: Array<{ invoice: { id: string }; amountPaid: number }> = [];
  for (let i = 0; i < 10; i++) {
    const student = studentRecords[i];
    const isGrade11 = i >= 25; // Simplified: first 25 are Grade 10
    const totalAmount = isGrade11 ? 2700.00 : 2500.00; // With or without lab fee

    let status: InvoiceStatus;
    let amountPaid: number;

    if (i < 3) {
      status = InvoiceStatus.PAID;
      amountPaid = totalAmount;
    } else if (i < 6) {
      status = InvoiceStatus.PARTIAL;
      amountPaid = faker.number.int({ min: 500, max: totalAmount - 100 });
    } else if (i < 8) {
      status = InvoiceStatus.PENDING;
      amountPaid = 0;
    } else {
      status = InvoiceStatus.OVERDUE;
      amountPaid = 0;
    }

    const invoice = await prisma.studentInvoice.create({
      data: {
        schoolId: defaultSchool.id,
        invoiceNumber: generateInvoiceNumber(i + 1),
        studentId: student.id,
        termId: term2.id,
        totalAmount,
        amountPaid,
        status,
        dueDate: new Date('2026-02-15'),
      },
    });
    invoicesCreated.push({ invoice, amountPaid });
  }
  console.log('10 Sample invoices created with varying statuses.');

  // Step 15: Create Sample Payments for paid/partial invoices
  let receiptIndex = 1;
  for (const { invoice, amountPaid } of invoicesCreated) {
    if (amountPaid > 0) {
      await prisma.payment.create({
        data: {
          schoolId: defaultSchool.id,
          receiptNumber: generateReceiptNumber(receiptIndex++),
          invoiceId: invoice.id,
          amount: amountPaid,
          method: faker.helpers.arrayElement([PaymentMethod.CASH, PaymentMethod.MOBILE_MONEY, PaymentMethod.BANK_TRANSFER]),
          reference: faker.helpers.arrayElement([null, `MOMO-${faker.string.alphanumeric(10).toUpperCase()}`]),
          paymentDate: faker.date.between({ from: '2026-01-15', to: '2026-03-01' }),
        },
      });
    }
  }
  console.log('Payments created for paid/partial invoices.');

  console.log('Seeding completed.');
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
