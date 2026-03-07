import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const TENANT = 'DEFAULT';

async function getAdminToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .set('X-Tenant-ID', TENANT)
    .send({ email: 'admin@heckteck.com', password: 'Admin@123' });
  return res.body.accessToken;
}

describe('Student Enrollment Flow (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should allow admin to list students', async () => {
    const res = await request(app.getHttpServer())
      .get('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-ID', TENANT)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });

  it('should allow admin to list sections', async () => {
    const res = await request(app.getHttpServer())
      .get('/sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-ID', TENANT)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should allow student to sign in and view own data', async () => {
    const studentRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .set('X-Tenant-ID', TENANT)
      .send({ email: 'student1@heckteck.com', password: 'Student@123' })
      .expect(200);

    const studentToken = studentRes.body.accessToken;
    const payload = JSON.parse(
      Buffer.from(studentToken.split('.')[1], 'base64').toString(),
    );
    const studentUserId = payload.sub;

    const portalRes = await request(app.getHttpServer())
      .get(`/portal/student/${studentUserId}/summary`)
      .set('Authorization', `Bearer ${studentToken}`)
      .set('X-Tenant-ID', TENANT)
      .expect(200);

    expect(portalRes.body).toHaveProperty('studentId');
  });
});
