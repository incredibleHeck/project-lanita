import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../common/tenant/tenant.context', () => ({
  getTenantSchoolId: jest.fn(() => 'school-123'),
}));

const mockArgon2Verify = jest.fn();
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  verify: (...args: unknown[]) => mockArgon2Verify(...args),
}));

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
  profile: {
    create: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = mockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signin', () => {
    it('should throw ForbiddenException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.signin({ email: 'unknown@test.com', password: 'Pass@123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when password does not match', async () => {
      mockArgon2Verify.mockResolvedValue(false);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        passwordHash: 'hash',
        role: 'STUDENT',
      });

      await expect(
        service.signin({ email: 'user@test.com', password: 'WrongPass' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return tokens when credentials are valid', async () => {
      mockArgon2Verify.mockResolvedValue(true);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        passwordHash: 'hash',
        role: 'STUDENT',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.signin({
        email: 'user@test.com',
        password: 'Pass@123',
      });

      expect(result).toHaveProperty('accessToken', 'token');
      expect(result).toHaveProperty('refreshToken', 'token');
    });
  });

  describe('signup', () => {
    it('should throw ForbiddenException when user already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'existing',
        email: 'existing@test.com',
      });

      await expect(
        service.signup({
          email: 'existing@test.com',
          password: 'Pass@123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
