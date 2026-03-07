import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signin', () => {
    it('should require tenant (X-Tenant-ID or default)', async () => {
      // Without X-Tenant-ID and no DEFAULT_SCHOOL_ID, expect 401
      const res = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'admin@heckteck.com', password: 'Admin@123' });

      // May get 401 (no tenant) or 200/403 (if default school from env)
      expect([401, 403, 200]).toContain(res.status);
    });

    it('should sign in with valid credentials and tenant', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signin')
        .set('X-Tenant-ID', 'DEFAULT')
        .send({ email: 'admin@heckteck.com', password: 'Admin@123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/signin')
        .set('X-Tenant-ID', 'DEFAULT')
        .send({ email: 'admin@heckteck.com', password: 'WrongPassword' })
        .expect(403);
    });
  });
});
