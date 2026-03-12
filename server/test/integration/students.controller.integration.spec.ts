import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

async function getAdminToken(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/signin')
    .set('X-Tenant-ID', 'DEFAULT')
    .send({ email: 'admin@heckteck.com', password: 'Admin@123' });
  return res.body.accessToken;
}

describe('StudentsController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
    adminToken = await getAdminToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /students', () => {
    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/students')
        .set('X-Tenant-ID', 'DEFAULT')
        .expect(401);
    });

    it('should return students list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', 'DEFAULT')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
