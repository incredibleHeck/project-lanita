import { PrismaClient, UserRole, AttendanceStatus, Subject, User, StudentRecord } from '@prisma/client';
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
  await prisma.result.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.subjectAllocation.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.studentRecord.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();

  // Step 2: Create Super Admin
  const adminPassword = await argon2.hash('Admin@123');
  const superAdmin = await prisma.user.create({
    data: {
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

  // Step 3: Create Academic Year
  const currentYear = await prisma.academicYear.create({
    data: {
      name: '2025/2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-31'),
      isCurrent: true,
    },
  });
  console.log('Current Academic Year created: 2025/2026');

  // Step 4: Create Subjects
  const subjectsData = ['Mathematics', 'English', 'Science', 'History', 'Computing'];
  const createdSubjects: Subject[] = [];
  for (const name of subjectsData) {
    const subject = await prisma.subject.create({
      data: {
        name,
        code: name.toUpperCase().substring(0, 4) + '101',
        isElective: false,
      },
    });
    createdSubjects.push(subject);
    console.log(`Subject created: ${name}`);
  }

  // Step 5: Create Classes & Sections
  const classesData = ['Grade 10', 'Grade 11'];
  const sectionsData = ['A', 'B'];
  let grade10SectionAId = '';
  let grade11SectionBId = '';

  for (const className of classesData) {
    const cls = await prisma.class.create({
      data: {
        name: className,
        code: className.replace(' ', ''),
      },
    });
    console.log(`Class created: ${className}`);

    for (const sectionName of sectionsData) {
      const section = await prisma.section.create({
        data: {
          name: sectionName,
          capacity: 30,
          classId: cls.id,
        },
      });
      console.log(`Section created: ${className} - ${sectionName}`);
      
      if (className === 'Grade 10' && sectionName === 'A') {
        grade10SectionAId = section.id;
      }
      if (className === 'Grade 11' && sectionName === 'B') {
        grade11SectionBId = section.id;
      }
    }
  }

  // Step 6: Create Teachers
  const teacherPassword = await argon2.hash('Teacher@123');
  const teachers: User[] = [];
  for (let i = 1; i <= 5; i++) {
    const teacher = await prisma.user.create({
      data: {
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

  // Step 7: Create Allocations
  // Assign Teacher 1 to Mathematics (Index 0) for Grade 10-A
  const allocationMath10A = await prisma.subjectAllocation.create({
    data: {
      sectionId: grade10SectionAId,
      subjectId: createdSubjects[0].id, // Mathematics
      teacherId: teachers[0].id, // Teacher 1
      academicYearId: currentYear.id,
    },
  });
  console.log('Allocation created: Teacher 1 -> Math -> Grade 10-A');

  // Assign Teacher 2 to English (Index 1) for Grade 10-A
  await prisma.subjectAllocation.create({
    data: {
      sectionId: grade10SectionAId,
      subjectId: createdSubjects[1].id, // English
      teacherId: teachers[1].id, // Teacher 2
      academicYearId: currentYear.id,
    },
  });
  console.log('Allocation created: Teacher 2 -> English -> Grade 10-A');

  // Step 8: Create Parents
  const parentPassword = await argon2.hash('Parent@123');
  const parent1 = await prisma.user.create({
    data: {
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

  // Step 9: Create Students
  const studentPassword = await argon2.hash('Student@123');
  const studentRecords: StudentRecord[] = [];

  for (let i = 1; i <= 50; i++) {
    const sectionId = i <= 25 ? grade10SectionAId : grade11SectionBId;
    const admissionNumber = `STU-2025-${i.toString().padStart(3, '0')}`;

    const studentUser = await prisma.user.create({
      data: {
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

  // Step 10: Attendance (First 5 students, Today, Math 10-A)
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    await prisma.attendanceRecord.create({
      data: {
        studentId: studentRecords[i].id,
        allocationId: allocationMath10A.id,
        date: today,
        status: AttendanceStatus.PRESENT,
        remarks: 'Seeded attendance',
      },
    });
  }
  console.log('Attendance marked for 5 students.');

  // Step 11: Results (Exam Mid-Term 1)
  const exam = await prisma.exam.create({
    data: {
      name: 'Mid-Term 1',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
      academicYearId: currentYear.id,
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
