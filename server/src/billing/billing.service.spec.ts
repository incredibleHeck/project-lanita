import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const createMockPrisma = () => {
  const client = {
    studentInvoice: {
      findUnique: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    term: { findUnique: jest.fn() },
    feeStructure: { findMany: jest.fn() },
    studentRecord: { findMany: jest.fn() },
    payment: { create: jest.fn() },
  };
  (client as any).$transaction = jest.fn((cb: (tx: any) => Promise<any>) =>
    cb(client),
  );
  return client;
};

let mockPrisma: ReturnType<typeof createMockPrisma>;

describe('BillingService', () => {
  let service: BillingService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = mockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordPayment', () => {
    it('should throw NotFoundException when invoice not found', async () => {
      prisma.studentInvoice.findUnique.mockResolvedValue(null);

      await expect(
        service.recordPayment({
          invoiceId: 'invalid-id',
          amount: 100,
          method: 'CASH',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when invoice is already paid', async () => {
      prisma.studentInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: new Prisma.Decimal(1000),
        amountPaid: new Prisma.Decimal(1000),
        status: 'PAID',
      });

      await expect(
        service.recordPayment({
          invoiceId: 'inv-1',
          amount: 100,
          method: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payment exceeds balance', async () => {
      prisma.studentInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: new Prisma.Decimal(1000),
        amountPaid: new Prisma.Decimal(800),
        status: 'PARTIAL',
      });

      await expect(
        service.recordPayment({
          invoiceId: 'inv-1',
          amount: 300,
          method: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record payment and update invoice status to PAID when fully paid', async () => {
      prisma.studentInvoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        totalAmount: new Prisma.Decimal(1000),
        amountPaid: new Prisma.Decimal(800),
        status: 'PARTIAL',
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'pay-1',
        amount: 200,
        receiptNumber: 'RCP-001',
      });
      (prisma.studentInvoice.update as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        amountPaid: new Prisma.Decimal(1000),
        status: 'PAID',
      });

      const result = await service.recordPayment({
        invoiceId: 'inv-1',
        amount: 200,
        method: 'CASH',
      });

      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('invoice');
      expect(result.invoice.status).toBe('PAID');
    });
  });
});
