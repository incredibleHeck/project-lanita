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

describe('Attendance Flow (E2E)', () => {
  let app: INestApplication;
  let teacherToken: string;
  let allocationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    teacherToken = await getTeacherToken(app);

    const prisma = moduleFixture.get<PrismaService>(PrismaService);
    const allocation = await prisma.subjectAllocation.findFirst({
      where: { teacher: { email: 'teacher1@heckteck.com' } },
    });
    allocationId = allocation?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow teacher to get attendance for allocation', async () => {
    if (!allocationId) {
      console.warn('Skipping: no allocation found for teacher1');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const res = await request(app.getHttpServer())
      .get(`/attendance/${allocationId}/${today}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .set('X-Tenant-ID', TENANT)
      .expect(200);

    expect(res.body).toBeDefined();
  });
});
