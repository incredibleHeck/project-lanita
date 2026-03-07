import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const TENANT = 'DEFAULT';

async function getTeacherToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .set('X-Tenant-ID', TENANT)
    .send({ email: 'teacher1@heckteck.com', password: 'Teacher@123' });
  return res.body.accessToken;
}

describe('Grading Flow (E2E)', () => {
  let app: INestApplication;
  let teacherToken: string;
  let studentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    teacherToken = await getTeacherToken(app);

    const prisma = moduleFixture.get<PrismaService>(PrismaService);
    const student = await prisma.studentRecord.findFirst({
      where: {
        currentSection: {
          allocations: {
            some: { teacher: { email: 'teacher1@heckteck.com' } },
          },
        },
      },
    });
    studentId = student?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow teacher to get student results', async () => {
    if (!studentId) {
      console.warn('Skipping: no student in teacher sections');
      return;
    }
    const res = await request(app.getHttpServer())
      .get(`/results/student/${studentId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-Tenant-ID', TENANT)
      .expect(200);

    expect(res.body).toBeDefined();
  });
});
